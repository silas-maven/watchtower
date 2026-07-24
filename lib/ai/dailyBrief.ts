import { APP_TIMEZONE } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { callJsonModel, hasLlmProvider } from '@/lib/ai/llm';
import { getDailySignalSummary } from '@/lib/server/signals';
import { EXTREME_RANGE_PCT, getBriefHighlights, type BriefHighlights } from '@/lib/server/briefHighlights';
import { getSetting } from '@/lib/server/settings';
import { startOfDayInTimeZone } from '@/lib/time';

// The breadth numbers the narrative was written against. Persisted with the
// brief so the stat cards can render the same snapshot the prose describes.
export type DailyBriefStats = {
  totalAssets: number;
  activeSignals: number;
  advancers: number;
  decliners: number;
  flat: number;
  avgChangePct: number;
};

export type DailyBriefPayload = {
  summary: string;
  buy: string[];
  sell: string[];
  newToday: string[];
  droppedOff: string[];
  insights: string[];
  stats: DailyBriefStats | null;
  /** Section-6 additions; deterministic, persisted alongside the narrative. */
  highlights: BriefHighlights | null;
  model: string;
  isFallback: boolean;
  generationError: string | null;
};

export function buildFallbackBrief(input: {
  buy: string[];
  sell: string[];
  newToday: string[];
  droppedOff: string[];
  market?: {
    totalAssets: number;
    activeSignals: number;
    advancers: number;
    decliners: number;
    flat: number;
    avgChangePct: number;
    topGainers: Array<{ symbol: string; assetType: string; changePct: number }>;
    topLosers: Array<{ symbol: string; assetType: string; changePct: number }>;
    byAssetType: Array<{ assetType: string; total: number; activeSignals: number; buySignals: number; sellSignals: number }>;
  };
  highlights?: BriefHighlights | null;
}): DailyBriefPayload {
  const insights: string[] = [];
  insights.push(`Active BUY signals: ${input.buy.length}. Active SELL signals: ${input.sell.length}.`);
  if (input.newToday.length > 0) insights.push(`New signal entries today: ${input.newToday.join(', ')}.`);
  if (input.droppedOff.length > 0) insights.push(`Dropped from signal zones today: ${input.droppedOff.join(', ')}.`);

  // Section-6 additions. Newly triggered is stated separately from still active.
  const h = input.highlights;
  if (h) {
    if (h.newBuy.length > 0) {
      insights.push(`New buy alerts since yesterday: ${h.newBuy.map((a) => a.symbol).join(', ')}.`);
    }
    if (h.newSell.length > 0) {
      insights.push(`New sell alerts since yesterday: ${h.newSell.map((a) => a.symbol).join(', ')}.`);
    }
    if (h.newBuy.length === 0 && h.newSell.length === 0) {
      insights.push('No new buy or sell alerts since yesterday; the active signals are carried over.');
    }
    if (h.extremeRange.length > 0) {
      insights.push(
        `Extreme daily ranges (over ${EXTREME_RANGE_PCT}% of the previous close): ${h.extremeRange
          .slice(0, 5)
          .map((r) => `${r.symbol} (${r.rangePct.toFixed(1)}%)`)
          .join(', ')}.`,
      );
    }
    if (h.earningsThisWeek.length > 0) {
      insights.push(
        `Reporting earnings this week: ${h.earningsThisWeek.slice(0, 8).map((r) => `${r.symbol} (${r.date})`).join(', ')}.`,
      );
    }
  }
  if (input.market) {
    insights.push(
      `Market breadth: ${input.market.advancers} advancing, ${input.market.decliners} declining, ${input.market.flat} flat. Avg change ${input.market.avgChangePct.toFixed(2)}%.`,
    );
    if (input.market.topGainers.length > 0) {
      insights.push(
        `Top gainers: ${input.market.topGainers.map((r) => `${r.symbol} (${r.changePct.toFixed(2)}%)`).join(', ')}.`,
      );
    }
    if (input.market.topLosers.length > 0) {
      insights.push(
        `Top losers: ${input.market.topLosers.map((r) => `${r.symbol} (${r.changePct.toFixed(2)}%)`).join(', ')}.`,
      );
    }
    const strongestType = [...input.market.byAssetType].sort((a, b) => b.activeSignals - a.activeSignals)[0];
    if (strongestType) {
      insights.push(
        `Most active class: ${strongestType.assetType} with ${strongestType.activeSignals} active signals out of ${strongestType.total} tracked.`,
      );
    }
  }
  if (insights.length < 4) insights.push('Check high-volatility assets first and validate targets before action.');

  return {
    summary: `Daily brief: ${input.buy.length} buy-side and ${input.sell.length} sell-side active signals across the watchlist.${input.market ? ` ${input.market.activeSignals} total active signals out of ${input.market.totalAssets} assets.` : ''}`,
    buy: input.buy,
    sell: input.sell,
    newToday: input.newToday,
    droppedOff: input.droppedOff,
    insights: insights.slice(0, 6),
    stats: input.market
      ? {
          totalAssets: input.market.totalAssets,
          activeSignals: input.market.activeSignals,
          advancers: input.market.advancers,
          decliners: input.market.decliners,
          flat: input.market.flat,
          avgChangePct: input.market.avgChangePct,
        }
      : null,
    highlights: input.highlights ?? null,
    model: 'deterministic-fallback',
    isFallback: true,
    generationError: null,
  };
}

function parseModelOutput(text: string, model: string, fallback: DailyBriefPayload): DailyBriefPayload {
  try {
    const parsed = JSON.parse(text) as Partial<DailyBriefPayload>;
    if (!parsed.summary || !Array.isArray(parsed.insights)) return fallback;
    return {
      summary: parsed.summary,
      buy: Array.isArray(parsed.buy) ? parsed.buy : fallback.buy,
      sell: Array.isArray(parsed.sell) ? parsed.sell : fallback.sell,
      newToday: Array.isArray(parsed.newToday) ? parsed.newToday : fallback.newToday,
      droppedOff: Array.isArray(parsed.droppedOff) ? parsed.droppedOff : fallback.droppedOff,
      insights: parsed.insights,
      // Stats and highlights are computed deterministically in code, never taken
      // from the model.
      stats: fallback.stats,
      highlights: fallback.highlights,
      model,
      isFallback: false,
      generationError: null,
    };
  } catch {
    return fallback;
  }
}

const DAILY_BRIEF_SYSTEM =
  'You are a financial watchlist analyst. Return a strict JSON object with keys: summary (string), buy (string[]), sell (string[]), newToday (string[]), droppedOff (string[]), insights (string[]). ' +
  'Insights must lead with any new buy or sell alerts since yesterday (from newAlertsSinceYesterday), stating clearly that they are NEWLY triggered as opposed to still active, then cover extreme daily ranges, earnings due this week, market breadth and top movers where the data is provided. ' +
  'Use only the figures given. Never state a dividend date, a rights issue or an all-time low: those are listed in doNotClaim because the data is not reliable. ' +
  'Use UK English. Do not give trading advice or predict prices.';

export async function generateDailyBrief(forDate = new Date()): Promise<DailyBriefPayload> {
  const [signal, highlights] = await Promise.all([
    getDailySignalSummary(forDate.toISOString().slice(0, 10)),
    getBriefHighlights(forDate).catch(() => null),
  ]);
  const fallback = buildFallbackBrief({ ...signal, highlights });

  const enabled = await getSetting('ai_briefs_enabled');
  if (!enabled) {
    return { ...fallback, generationError: 'AI briefs disabled by admin setting.' };
  }

  if (!hasLlmProvider()) {
    const message = 'No AI provider configured (set OPENROUTER_API_KEY or OPENAI_API_KEY); using deterministic fallback.';
    console.error(`[dailyBrief] ${message}`);
    return { ...fallback, generationError: message };
  }

  try {
    // The model must see the section-6 additions or it cannot narrate them. It
    // only ever rephrases these figures; the rendered brief reads the structured
    // `highlights` object, so the prose can never invent or contradict them.
    const modelInput = {
      ...signal,
      newAlertsSinceYesterday: highlights
        ? {
            since: highlights.since,
            timezone: highlights.timezone,
            newBuy: highlights.newBuy.map((a) => a.symbol),
            newSell: highlights.newSell.map((a) => a.symbol),
            stillActiveBuyCount: highlights.stillActiveBuy.length,
            stillActiveSellCount: highlights.stillActiveSell.length,
          }
        : null,
      extremeDailyRanges: highlights?.extremeRange.slice(0, 5).map((r) => ({ symbol: r.symbol, rangePct: Number(r.rangePct.toFixed(1)) })) ?? [],
      earningsThisWeek: highlights?.earningsThisWeek.slice(0, 10).map((r) => ({ symbol: r.symbol, date: r.date })) ?? [],
      doNotClaim: highlights?.unavailable ?? [],
    };
    const { text, model } = await callJsonModel(DAILY_BRIEF_SYSTEM, JSON.stringify(modelInput));
    if (!text) {
      const message = 'The model returned an empty response; using deterministic fallback.';
      console.error(`[dailyBrief] ${message}`);
      return { ...fallback, generationError: message };
    }
    return parseModelOutput(text, model, fallback);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[dailyBrief] AI generation failed:', message);
    return { ...fallback, generationError: message };
  }
}

export async function persistDailyBrief(forDate = new Date()): Promise<DailyBriefPayload> {
  const briefDate = startOfDayInTimeZone(forDate, APP_TIMEZONE);
  const payload = await generateDailyBrief(forDate);

  await prisma.dailyBrief.upsert({
    where: {
      briefDate_timezone: {
        briefDate,
        timezone: APP_TIMEZONE,
      },
    },
    update: {
      summary: payload.summary,
      buy: payload.buy,
      sell: payload.sell,
      newToday: payload.newToday,
      droppedOff: payload.droppedOff,
      insights: payload.insights,
      stats: payload.stats ?? undefined,
      highlights: payload.highlights ?? undefined,
      model: payload.model,
      isFallback: payload.isFallback,
      generationError: payload.generationError,
      generatedAt: new Date(),
    },
    create: {
      briefDate,
      timezone: APP_TIMEZONE,
      summary: payload.summary,
      buy: payload.buy,
      sell: payload.sell,
      newToday: payload.newToday,
      droppedOff: payload.droppedOff,
      insights: payload.insights,
      stats: payload.stats ?? undefined,
      highlights: payload.highlights ?? undefined,
      model: payload.model,
      isFallback: payload.isFallback,
      generationError: payload.generationError,
    },
  });

  return payload;
}
