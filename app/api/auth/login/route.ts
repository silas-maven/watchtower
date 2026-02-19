import { z } from 'zod';
import { ok, fail } from '@/lib/api';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return fail('Invalid login payload', 400, 'INVALID_PAYLOAD');

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return fail('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
