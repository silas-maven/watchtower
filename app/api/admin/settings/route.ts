import { Role } from '@prisma/client';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { fromCaughtError } from '@/lib/route';
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

const MacroValue = z.object({
  value: z.number().nullable(),
  changePct: z.number().nullable(),
  asOf: z.string().nullable(),
});

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

    // Boolean toggles and manual macro readings are editable here; numeric and
    // list settings are managed by their own feature surfaces.
    if (BOOLEAN_KEYS.includes(key)) {
      if (typeof value !== 'boolean') return fail('Expected a boolean value', 400, 'INVALID_VALUE');
      await setSetting(key, value as never, actor.id);
    } else if (MACRO_KEYS.includes(key)) {
      const macro = MacroValue.safeParse(value);
      if (!macro.success) return fail('Expected { value, changePct, asOf }', 400, 'INVALID_VALUE');
      await setSetting(key, macro.data as never, actor.id);
    } else {
      return fail('Setting is not editable here', 400, 'NOT_EDITABLE');
    }
    const settings = await getSettings();
    return ok({ settings });
  } catch (error) {
    return fromCaughtError(error);
  }
}
