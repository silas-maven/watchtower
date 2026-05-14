import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from '@/lib/auth';

function signInPath(nextPath: string): string {
  return `/sign-in?redirect_url=${encodeURIComponent(nextPath)}`;
}

export async function requirePageUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(signInPath(nextPath));
  if (user.accessState !== 'ACTIVE') redirect('/app/account?access=suspended');
  return user;
}

export async function requirePageRole(roles: Role[], nextPath: string): Promise<SessionUser> {
  const user = await requirePageUser(nextPath);
  if (!roles.includes(user.role)) redirect('/app');
  return user;
}
