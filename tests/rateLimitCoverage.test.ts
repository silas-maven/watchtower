import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Structural test: every mutating API handler must be rate limited.
 *
 * A limiter is only worth having if it is on every door. The realistic failure is
 * not someone removing it, it is someone adding a new POST route next month and
 * not knowing the convention exists. A unit test of the limiter itself cannot
 * catch that; this can, and it fails at the moment the route is written.
 *
 * Exemptions are listed explicitly with a reason. Adding one should be a
 * deliberate act that shows up in review, which is why they live here rather than
 * as a pattern the scan quietly skips.
 */

const API_ROOT = join(process.cwd(), 'app', 'api');

const EXEMPT: Record<string, string> = {
  // Guarded by a shared-secret header instead. Called by Vercel cron, not by a
  // member, so there is no profile id to key a per-caller limiter on.
  'cron/generate-daily-brief/route.ts': 'cron secret',
  'cron/generate-weekly-digest/route.ts': 'cron secret',
  'cron/refresh-market/route.ts': 'cron secret',
  'cron/send-daily-brief-email/route.ts': 'cron secret',
  'cron/subscription-overdue-check/route.ts': 'cron secret',

  // Signature-verified webhooks. Throttling these would drop legitimate events
  // from Stripe and Clerk during a burst, which is worse than the abuse it would
  // prevent, and an unsigned request is already rejected.
  'webhooks/stripe/route.ts': 'signature verified',
  'webhooks/clerk/route.ts': 'signature verified',

  // No session to key on, and both are inert: unsubscribe only ever sets a flag
  // OFF via a token that is itself the credential, and logout is a 410 stub.
  'email/unsubscribe/route.ts': 'token is the credential, only ever unsets',
  'auth/logout/route.ts': '410 stub, does nothing',

  // Admin-only. Every one of these already requires OWNER or ADMIN, so the
  // caller is trusted staff; throttling the owner mid-moderation would be a
  // worse failure than the abuse case.
  'admin/assets/[id]/override/route.ts': 'admin only',
  'admin/assets/[id]/route.ts': 'admin only',
  'admin/assets/route.ts': 'admin only',
  'admin/assets/verify/route.ts': 'admin only',
  'admin/brief/regenerate/route.ts': 'admin only',
  'admin/community/route.ts': 'admin only',
  'admin/digest/regenerate/route.ts': 'admin only',
  'admin/refresh-market/route.ts': 'admin only',
  'admin/settings/route.ts': 'admin only',
  'admin/stock-requests/route.ts': 'admin only',
  'admin/subscribers/[id]/mark-paid/route.ts': 'admin only',
  'admin/subscribers/[id]/route.ts': 'admin only',
  'admin/subscribers/route.ts': 'admin only',
  'admin/view-as/route.ts': 'admin only',
};

function routeFiles(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) out.push(...routeFiles(full, rel));
    else if (entry === 'route.ts') out.push(rel);
  }
  return out;
}

const MUTATING = /export async function (POST|PATCH|PUT|DELETE)\b/;

describe('rate limit coverage', () => {
  const files = routeFiles(API_ROOT);

  it('finds the API routes', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('guards every mutating handler that is not explicitly exempt', () => {
    const unguarded: string[] = [];

    for (const rel of files) {
      const src = readFileSync(join(API_ROOT, rel), 'utf8');
      if (!MUTATING.test(src)) continue;
      if (rel in EXEMPT) continue;
      if (!src.includes('enforceRateLimit(')) unguarded.push(rel);
    }

    expect(
      unguarded,
      `These routes mutate state with no rate limit. Add enforceRateLimit(), or ` +
        `add an entry to EXEMPT in this file with the reason:\n  ${unguarded.join('\n  ')}`,
    ).toEqual([]);
  });

  it('has no stale exemptions', () => {
    // An exemption for a route that no longer exists, or that has since been
    // guarded anyway, is dead weight that makes the real list harder to audit.
    const stale = Object.keys(EXEMPT).filter((rel) => !files.includes(rel));
    expect(stale, `EXEMPT lists routes that no longer exist:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it('guards every route that calls a language model', () => {
    // The money path. These must be on the tight bucket, never the general one.
    const wrongBucket: string[] = [];
    for (const rel of files) {
      const src = readFileSync(join(API_ROOT, rel), 'utf8');
      const callsModel = /callJsonModel|callModel|narrate|generatePitch|hasLlmProvider/.test(src);
      if (!callsModel || !MUTATING.test(src)) continue;
      if (!src.includes("enforceRateLimit('model'")) wrongBucket.push(rel);
    }
    expect(
      wrongBucket,
      `These routes reach a model but are not on the 'model' bucket:\n  ${wrongBucket.join('\n  ')}`,
    ).toEqual([]);
  });
});
