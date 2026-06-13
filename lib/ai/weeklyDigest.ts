import { SignalState } from '@prisma/client';
import { APP_TIMEZONE } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { callJsonModel, hasLlmProvider } from '@/lib/ai/llm';
import { getSetting } from '@/lib/server/settings';
import { getDailySignalSummary } from '@/lib/server/signals';
import { startOfDayInTimeZone } from '@/lib/time';

export type WeeklyDigestSection = { title: string; lines: string[] };

export type WeeklyDigestPayload = {
  summary: string;
  sections: WeeklyDigestSection[];
  model: string;
  isFallback: boolean;
  generationError: string | null;
};

function startOfWeek(date: Date, timezone: string): Date {
  const dayStart = startOfDayInTimeZone(date, timezone);
  const weekday = (dayStart.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(dayStart.getTime() - weekday * 24 * 60 * 60 * 1000);
}

async function collectWeekly(now: Date) {
  const weekStart = startOfWeek(now, APP_TIMEZONE);
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [events, newMembers, activeProfiles, overdue, openAlerts, signalSummary] = await Promise.all([
    prisma.signalEvent.findMany({
      where: { occurredAt: { gte: windowStart } },
      include: { asset: { select: { symbol: true } } },
      orderBy: { occurredAt: 'desc' },
    }),
    prisma.profile.count({ where: { role: 'MEMBER', createdAt: { gte: windowStart } } }),
    prisma.profile.count({ where: { role: 'MEMBER', lastSeenAt: { gte: windowStart } } }),
    prisma.subscriptionMirror.count({ where: { status: 'OVERDUE' } }),
    prisma.billingAlert.count({ where: { status: 'OPEN' } }),
    getDailySignalSummary(),
  ]);

  const entered = new Set<string>();
  const exited = new Set<string>();
  for (const event of events) {
    if (event.toState !== SignalState.NONE && event.fromState === SignalState.NONE) entered.add(event.asset.symbol);
    if (event.toState === SignalState.NONE && event.fromState !== SignalState.NONE) exited.add(event.asset.symbol);
  }

  return { weekStart, events, entered, exited, newMembers, activeProfiles, overdue, openAlerts, signalSummary };
}

type WeeklyData = Awaited<ReturnType<typeof collectWeekly>>;

function buildFallback(data: WeeklyData): WeeklyDigestPayload {
  const m = data.signalSummary.market;
  const sections: WeeklyDigestSection[] = [
    {
      title: 'Signal activity (7 days)',
      lines: [
        `${data.events.length} signal transitions recorded.`,
        data.entered.size > 0 ? `Entered signal zones: ${[...data.entered].sort().join(', ')}.` : 'No new signal entries this week.',
        data.exited.size > 0 ? `Left signal zones: ${[...data.exited].sort().join(', ')}.` : 'No signals dropped off this week.',
      ],
    },
    {
      title: 'Current state',
      lines: [
        `${m.activeSignals} active signals across ${m.totalAssets} tracked assets.`,
        `Buy-side now: ${data.signalSummary.buy.length > 0 ? data.signalSummary.buy.join(', ') : 'none'}.`,
        `Sell-side now: ${data.signalSummary.sell.length > 0 ? data.signalSummary.sell.join(', ') : 'none'}.`,
      ],
    },
    {
      title: 'Community',
      lines: [
        `${data.newMembers} new ${data.newMembers === 1 ? 'member' : 'members'} joined.`,
        `${data.activeProfiles} ${data.activeProfiles === 1 ? 'member was' : 'members were'} active in the last 7 days.`,
      ],
    },
    {
      title: 'Billing',
      lines: [
        `${data.overdue} ${data.overdue === 1 ? 'subscription is' : 'subscriptions are'} overdue.`,
        `${data.openAlerts} open billing ${data.openAlerts === 1 ? 'alert needs' : 'alerts need'} review.`,
        'Access is never changed automatically. Review and act from the Members hub.',
      ],
    },
  ];

  const summary = `This week: ${data.events.length} signal transitions, ${data.entered.size} new entries, ${data.exited.size} drop-offs. ${data.newMembers} new members, ${data.activeProfiles} active. ${data.overdue} overdue ${data.overdue === 1 ? 'account' : 'accounts'}.`;

  return { summary, sections, model: 'deterministic-fallback', isFallback: true, generationError: null };
}

export async function generateWeeklyDigest(now = new Date()): Promise<WeeklyDigestPayload & { weekStart: Date }> {
  const data = await collectWeekly(now);
  const fallback = buildFallback(data);

  const enabled = await getSetting('weekly_digest_enabled');
  if (!enabled) {
    return { ...fallback, weekStart: data.weekStart, generationError: 'Weekly digest disabled by admin setting.' };
  }

  if (!hasLlmProvider()) {
    const message = 'No AI provider configured (set OPENROUTER_API_KEY or OPENAI_API_KEY); using deterministic digest.';
    console.error(`[weeklyDigest] ${message}`);
    return { ...fallback, weekStart: data.weekStart, generationError: message };
  }

  try {
    const { text, model } = await callJsonModel(
      'You are the operations analyst for a private investing community. Summarise the week for the owner in plain UK English. Do not give trading advice or predict prices. Return a strict JSON object with keys: summary (string), sections (array of objects each with title (string) and lines (string[])). Keep it factual and brief.',
      JSON.stringify({
        signalTransitions: data.events.length,
        entered: [...data.entered],
        exited: [...data.exited],
        currentBuy: data.signalSummary.buy,
        currentSell: data.signalSummary.sell,
        market: data.signalSummary.market,
        newMembers: data.newMembers,
        activeMembers: data.activeProfiles,
        overdue: data.overdue,
        openBillingAlerts: data.openAlerts,
      }),
    );

    if (!text) return { ...fallback, weekStart: data.weekStart, generationError: 'The model returned an empty digest.' };
    const parsed = JSON.parse(text) as Partial<WeeklyDigestPayload>;
    if (!parsed.summary || !Array.isArray(parsed.sections)) {
      return { ...fallback, weekStart: data.weekStart, generationError: 'The model digest failed validation.' };
    }
    return {
      summary: parsed.summary,
      sections: parsed.sections as WeeklyDigestSection[],
      model,
      isFallback: false,
      generationError: null,
      weekStart: data.weekStart,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[weeklyDigest] AI generation failed:', message);
    return { ...fallback, weekStart: data.weekStart, generationError: message };
  }
}

export async function persistWeeklyDigest(now = new Date()): Promise<WeeklyDigestPayload> {
  const payload = await generateWeeklyDigest(now);
  await prisma.weeklyDigest.upsert({
    where: { weekStart_timezone: { weekStart: payload.weekStart, timezone: APP_TIMEZONE } },
    update: {
      summary: payload.summary,
      sections: payload.sections,
      model: payload.model,
      isFallback: payload.isFallback,
      generationError: payload.generationError,
      generatedAt: new Date(),
    },
    create: {
      weekStart: payload.weekStart,
      timezone: APP_TIMEZONE,
      summary: payload.summary,
      sections: payload.sections,
      model: payload.model,
      isFallback: payload.isFallback,
      generationError: payload.generationError,
    },
  });
  return payload;
}
