import { prisma } from '@/lib/prisma';

/**
 * Typed platform settings backed by the watchtower_spa_platform_settings table.
 * Every key has a default so reads never throw on a missing row, and callers get
 * a stable shape. Add new keys here so the whole app shares one source of truth.
 */
// Manually-maintained macro readings for instruments with no free live feed
// (BOE base rate, UK 10Y gilt, iTraxx 5Y). Admin edits these; a real API can
// replace each reader in lib/market/macro.ts later without touching callers.
export type ManualMacroValue = { value: number | null; changePct: number | null; asOf: string | null };

const EMPTY_MACRO: ManualMacroValue = { value: null, changePct: null, asOf: null };

export const SETTING_DEFAULTS = {
  ai_briefs_enabled: true,
  weekly_digest_enabled: true,
  ai_member_brief_enabled: true,
  alert_delivery_enabled: false,
  portfolio_size_gbp: 5000,
  news_feed_urls: [] as string[],
  news_x_handle: 'MarketWatch',
  macro_boe_base_rate: EMPTY_MACRO,
  macro_uk_10y_gilt: EMPTY_MACRO,
  macro_itraxx_5y: EMPTY_MACRO,
  // Auto-fetched BOE rate (from the BoE IADB feed). The admin's manual
  // macro_boe_base_rate value, when set, overrides this.
  macro_boe_base_rate_auto: EMPTY_MACRO,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K];

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row && row.value != null) return row.value as SettingValue<K>;
  } catch {
    // table/row may not exist in some environments; fall back to default
  }
  return SETTING_DEFAULTS[key];
}

export async function getSettings(): Promise<typeof SETTING_DEFAULTS> {
  try {
    const rows = await prisma.platformSetting.findMany({
      where: { key: { in: Object.keys(SETTING_DEFAULTS) } },
    });
    const merged = { ...SETTING_DEFAULTS };
    for (const row of rows) {
      if (row.value != null && row.key in merged) {
        (merged as Record<string, unknown>)[row.key] = row.value;
      }
    }
    return merged;
  } catch {
    return { ...SETTING_DEFAULTS };
  }
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  updatedById?: string,
): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: value as object, updatedById },
    create: { key, value: value as object, updatedById },
  });
}
