'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
};

const NAV_ITEMS = [
  { href: '/community', label: 'Member View' },
  { href: '/summary', label: 'Daily Brief' },
  { href: '/proof', label: 'POC Proof' },
  { href: '/owner', label: 'User Management' },
  { href: '/admin', label: 'Asset Management' },
];

export function TopNav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const json = (await res.json()) as { ok: boolean; data?: { user: SessionUser | null } };
        if (!cancelled && json.ok) {
          setUser(json.data?.user ?? null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  useEffect(() => {
    for (const item of NAV_ITEMS) {
      router.prefetch(item.href);
    }
    router.prefetch('/');
  }, [router]);

  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-zinc-900">Watchtower</Link>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`rounded-lg border px-3 py-1.5 font-semibold transition ${isActive
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
          {user ? (
            <>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">{user.role}</span>
              <button
                onClick={logout}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
