import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from '@/lib/auth';

function loginPath(nextPath: string): string {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export async function requirePageUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(loginPath(nextPath));
  }
  return user;
}

export async function requirePageRole(roles: Role[], nextPath: string): Promise<SessionUser> {
  const user = await requirePageUser(nextPath);
  if (!roles.includes(user.role)) {
    redirect('/');
  }
  return user;
}

