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

    // Only boolean toggles are exposed through this admin route for now; numeric
    // and list settings are managed by their own feature surfaces.
    if (!BOOLEAN_KEYS.includes(key)) return fail('Setting is not editable here', 400, 'NOT_EDITABLE');
    if (typeof value !== 'boolean') return fail('Expected a boolean value', 400, 'INVALID_VALUE');

    await setSetting(key, value, actor.id);
    const settings = await getSettings();
    return ok({ settings });
  } catch (error) {
    return fromCaughtError(error);
  }
}
