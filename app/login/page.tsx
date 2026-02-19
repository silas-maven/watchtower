import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { LoginForm } from '@/app/login/LoginForm';

export const dynamic = 'force-dynamic';

function sanitizeNextPath(candidate?: string): string {
  if (!candidate) return '/';
  if (!candidate.startsWith('/')) return '/';
  if (candidate.startsWith('//')) return '/';
  return candidate;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = sanitizeNextPath(nextValue);

  if (user) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto max-w-md pt-8">
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
