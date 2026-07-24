import { AccessState, MemberTier, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { APP_TIMEZONE, appBaseUrl } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { hasEmailProvider, sendEmail } from '@/lib/email/send';
import { getMemberBrief, type MemberBrief } from '@/lib/server/memberBrief';
import { getBriefHighlights, type BriefHighlights } from '@/lib/server/briefHighlights';
import { startOfDayInTimeZone } from '@/lib/time';

// Daily personalised brief email (2026-07-24 feedback, section 7).
//
// Opt-in only (Profile.dailyBriefEmail, default false), paid members only, and
// one send per member per brief day enforced by a unique key on EmailDelivery,
// so a double-run of the cron cannot double-send. A failed send is recorded with
// its error and retried on the next run; a successful one is never resent.

export const DAILY_BRIEF_EMAIL_KIND = 'daily_brief';
const MAX_ATTEMPTS = 3;

export type SendDailyBriefResult = {
  eligible: number;
  sent: number;
  failed: number;
  skipped: number;
  providerConfigured: boolean;
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

/** Exported for preview and tests. */
export function renderEmail(input: {
  name: string;
  brief: MemberBrief;
  highlights: BriefHighlights;
  briefDate: string;
  unsubscribeUrl: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { brief, highlights } = input;
  const subject = `Your daily brief, ${input.briefDate}`;

  const lines: string[] = [];
  lines.push(brief.headline);
  if (highlights.newBuy.length > 0) lines.push(`New buy alerts since yesterday: ${highlights.newBuy.map((a) => a.symbol).join(', ')}.`);
  if (highlights.newSell.length > 0) lines.push(`New sell alerts since yesterday: ${highlights.newSell.map((a) => a.symbol).join(', ')}.`);
  if (highlights.newBuy.length === 0 && highlights.newSell.length === 0) lines.push('No new buy or sell alerts since yesterday.');
  if (highlights.extremeRange.length > 0) {
    lines.push(`Wide daily ranges: ${highlights.extremeRange.slice(0, 5).map((r) => `${r.symbol} ${r.rangePct.toFixed(1)}%`).join(', ')}.`);
  }
  if (highlights.earningsThisWeek.length > 0) {
    lines.push(`Earnings this week: ${highlights.earningsThisWeek.slice(0, 8).map((r) => `${r.symbol} (${r.date})`).join(', ')}.`);
  }

  const section = (title: string, body: string) =>
    `<tr><td style="padding:14px 0;border-top:1px solid #e5e7eb"><div style="font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">${esc(title)}</div><div style="font:400 15px/1.6 system-ui,sans-serif;color:#111827;margin-top:6px">${body}</div></td></tr>`;

  const chips = (items: Array<{ symbol: string }>) =>
    items.length === 0
      ? '<span style="color:#6b7280">None.</span>'
      : items.map((a) => `<span style="display:inline-block;padding:2px 8px;margin:2px 4px 2px 0;border:1px solid #e5e7eb;border-radius:999px;font:600 13px system-ui,sans-serif">${esc(a.symbol)}</span>`).join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
<tr><td>
  <div style="font:700 18px/1.3 system-ui,sans-serif;color:#111827">Stock Pickers Academy</div>
  <div style="font:400 13px/1.4 system-ui,sans-serif;color:#6b7280;margin-top:2px">Your daily brief, ${esc(input.briefDate)}</div>
  <div style="font:400 15px/1.6 system-ui,sans-serif;color:#111827;margin-top:16px">${esc(brief.headline)}</div>
</td></tr>
${section('New buy alerts since yesterday', chips(highlights.newBuy))}
${section('New sell alerts since yesterday', chips(highlights.newSell))}
${section('Still active', `Buy: ${chips(highlights.stillActiveBuy)}<br>Sell: ${chips(highlights.stillActiveSell)}`)}
${
  highlights.extremeRange.length > 0
    ? section(
        'Wide daily ranges (over 40% of previous close)',
        highlights.extremeRange.slice(0, 5).map((r) => `${esc(r.symbol)} <span style="color:#6b7280">${r.rangePct.toFixed(1)}%</span>`).join('<br>'),
      )
    : ''
}
${
  highlights.earningsThisWeek.length > 0
    ? section('Earnings this week', highlights.earningsThisWeek.slice(0, 8).map((r) => `${esc(r.symbol)} <span style="color:#6b7280">${esc(r.date)}</span>`).join('<br>'))
    : ''
}
<tr><td style="padding-top:18px;border-top:1px solid #e5e7eb">
  <a href="${esc(input.appUrl)}/app/daily-checks" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font:600 14px system-ui,sans-serif;padding:10px 16px;border-radius:8px">Open your brief</a>
</td></tr>
<tr><td style="padding-top:16px">
  <div style="font:400 12px/1.5 system-ui,sans-serif;color:#6b7280">
    Educational analysis, not financial advice. Signals are deterministic; the summary explains them, it does not decide them.<br>
    Times are ${esc(APP_TIMEZONE)}. <a href="${esc(input.unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a>.
  </div>
</td></tr>
</table></body></html>`;

  const text = `Stock Pickers Academy - your daily brief, ${input.briefDate}

${lines.join('\n')}

Open your brief: ${input.appUrl}/app/daily-checks

Educational analysis, not financial advice.
Unsubscribe: ${input.unsubscribeUrl}`;

  return { subject, html, text };
}

export async function sendDailyBriefEmails(forDate = new Date()): Promise<SendDailyBriefResult> {
  const sendDate = startOfDayInTimeZone(forDate, APP_TIMEZONE);
  const briefDate = sendDate.toISOString().slice(0, 10);
  const appUrl = appBaseUrl();
  const providerConfigured = hasEmailProvider();

  // Opted in, active, and paid. The brief email is a members feature.
  const recipients = await prisma.profile.findMany({
    where: {
      dailyBriefEmail: true,
      accessState: AccessState.ACTIVE,
      OR: [{ tier: MemberTier.MEMBER }, { role: { in: [Role.OWNER, Role.ADMIN] } }],
    },
    select: { id: true, email: true, name: true, emailUnsubToken: true },
  });

  const result: SendDailyBriefResult = {
    eligible: recipients.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    providerConfigured,
  };
  if (recipients.length === 0) return result;

  for (const profile of recipients) {
    // Idempotency: one row per member per day. A prior SENT row means skip; a
    // prior FAILED row is retried until MAX_ATTEMPTS.
    const existing = await prisma.emailDelivery.findUnique({
      where: { profileId_kind_sendDate: { profileId: profile.id, kind: DAILY_BRIEF_EMAIL_KIND, sendDate } },
    });
    if (existing?.status === 'SENT' || (existing?.attempts ?? 0) >= MAX_ATTEMPTS) {
      result.skipped += 1;
      continue;
    }

    try {
      const brief = await getMemberBrief(profile.id);
      // Scope the highlights to what this member actually tracks.
      const trackedIds = await prisma.userWatchlistItem.findMany({
        where: { watchlist: { profileId: profile.id } },
        select: { assetId: true },
      });
      const assetIds = [...new Set(trackedIds.map((t) => t.assetId))];
      if (assetIds.length === 0) {
        // Nothing tracked means nothing to say; do not send an empty email.
        result.skipped += 1;
        continue;
      }
      const highlights = await getBriefHighlights(forDate, assetIds);

      // Mint a stable unsubscribe token on first use.
      let token = profile.emailUnsubToken;
      if (!token) {
        token = randomUUID();
        await prisma.profile.update({ where: { id: profile.id }, data: { emailUnsubToken: token } });
      }
      const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?token=${token}`;

      const { subject, html, text } = renderEmail({
        name: profile.name,
        brief,
        highlights,
        briefDate,
        unsubscribeUrl,
        appUrl,
      });

      const delivery = await prisma.emailDelivery.upsert({
        where: { profileId_kind_sendDate: { profileId: profile.id, kind: DAILY_BRIEF_EMAIL_KIND, sendDate } },
        update: { attempts: { increment: 1 }, subject },
        create: { profileId: profile.id, kind: DAILY_BRIEF_EMAIL_KIND, sendDate, subject, attempts: 1 },
      });

      const outcome = await sendEmail({ to: profile.email, subject, html, text, unsubscribeUrl });
      if (outcome.ok) {
        await prisma.emailDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SENT', providerId: outcome.providerId, sentAt: new Date(), error: null },
        });
        result.sent += 1;
      } else {
        await prisma.emailDelivery.update({
          where: { id: delivery.id },
          data: { status: 'FAILED', error: outcome.error.slice(0, 500) },
        });
        result.failed += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error('[sendDailyBriefEmail] failed for', profile.email, error);
    }
  }

  return result;
}
