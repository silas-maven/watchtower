import { Role } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
import { ACADEMY_OFFERS } from '@/lib/academyOffers';
import { getSettings, setSetting, SETTING_DEFAULTS, type SettingKey } from '@/lib/server/settings';

export const runtime = 'nodejs';

const BOOLEAN_KEYS: SettingKey[] = [
  'ai_briefs_enabled',
  'weekly_digest_enabled',
  'ai_member_brief_enabled',
  'alert_delivery_enabled',
];

// Manually-maintained macro readings (no free live feed). Value shape is
// { value, changePct, asOf }; nulls allowed so a reading can be cleared.
const MACRO_KEYS: SettingKey[] = ['macro_boe_base_rate', 'macro_uk_10y_gilt', 'macro_itraxx_5y'];
const NEWS_FEED_KEY: SettingKey = 'news_feed_urls';
const NEWS_X_HANDLE_KEY: SettingKey = 'news_x_handle';
const NEWS_X_LIST_KEY: SettingKey = 'news_x_list_url';
const OFFERS_HIDDEN_KEY: SettingKey = 'academy_offers_hidden';

// Only offers the registry marks as hideable may be switched off, so the
// membership, the course and the newsletter cannot be hidden by a bad payload.
const HIDEABLE_OFFER_IDS = ACADEMY_OFFERS.filter((o) => o.canHide).map((o) => o.id);
const HiddenOffers = z.array(z.string()).max(20).refine(
  (ids) => ids.every((id) => HIDEABLE_OFFER_IDS.includes(id)),
  'Only the bookable services can be hidden',
);

const MacroValue = z.object({
  value: z.number().nullable(),
  changePct: z.number().nullable(),
  asOf: z.string().nullable(),
});

const NewsFeedUrls = z.array(z.string().url().refine((url) => new URL(url).protocol === 'https:', 'RSS URLs must use HTTPS')).max(10);
const XHandle = z.string().trim().regex(/^[A-Za-z0-9_]{1,15}$/, 'Enter an X handle without @ (up to 15 letters, numbers, or underscores).');
const XListUrl = z
  .string()
  .trim()
  .refine((value) => {
    if (value === '') return true;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'x.com' || url.hostname.endsWith('.x.com') || url.hostname === 'twitter.com' || url.hostname.endsWith('.twitter.com')) && /\/lists\//.test(url.pathname);
    } catch {
      return false;
    }
  }, 'Enter a public HTTPS X/Twitter List URL, or leave it blank.');

const Schema = z.object({
  key: z.enum(Object.keys(SETTING_DEFAULTS) as [SettingKey, ...SettingKey[]]),
  value: z.unknown(),
});

export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);
    const settings = await getSettings();
    return ok({ settings });
  } catch (error) {
    return fromCaughtError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');

    const { key, value } = parsed.data;

    // Boolean toggles, manual macro readings, and the reviewed Market Pulse
    // source settings are editable here. Other settings remain internal.
    if (BOOLEAN_KEYS.includes(key)) {
      if (typeof value !== 'boolean') return fail('Expected a boolean value', 400, 'INVALID_VALUE');
      await setSetting(key, value as never, actor.id);
    } else if (MACRO_KEYS.includes(key)) {
      const macro = MacroValue.safeParse(value);
      if (!macro.success) return fail('Expected { value, changePct, asOf }', 400, 'INVALID_VALUE');
      await setSetting(key, macro.data as never, actor.id);
    } else if (key === NEWS_FEED_KEY) {
      const feeds = NewsFeedUrls.safeParse(value);
      if (!feeds.success) return fail('Enter up to 10 valid HTTPS RSS URLs.', 400, 'INVALID_VALUE');
      await setSetting(key, feeds.data as never, actor.id);
    } else if (key === NEWS_X_HANDLE_KEY) {
      const handle = XHandle.safeParse(value);
      if (!handle.success) return fail(handle.error.issues[0]?.message ?? 'Invalid X handle', 400, 'INVALID_VALUE');
      await setSetting(key, handle.data as never, actor.id);
    } else if (key === NEWS_X_LIST_KEY) {
      const listUrl = XListUrl.safeParse(value);
      if (!listUrl.success) return fail(listUrl.error.issues[0]?.message ?? 'Invalid X List URL', 400, 'INVALID_VALUE');
      await setSetting(key, listUrl.data as never, actor.id);
    } else if (key === OFFERS_HIDDEN_KEY) {
      const hidden = HiddenOffers.safeParse(value);
      if (!hidden.success) return fail('Expected a list of hideable offer ids', 400, 'INVALID_VALUE');
      await setSetting(key, hidden.data as never, actor.id);
    } else {
      return fail('Setting is not editable here', 400, 'NOT_EDITABLE');
    }
    const settings = await getSettings();
    return ok({ settings });
  } catch (error) {
    return fromCaughtError(error);
  }
}
