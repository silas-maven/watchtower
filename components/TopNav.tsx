'use client';

import Link from 'next/link';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { Activity, Bell, BriefcaseBusiness, Calculator, ChartCandlestick, Gauge, LayoutDashboard, Settings, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { SessionUser } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavUser = Pick<SessionUser, 'name' | 'email' | 'role' | 'accessState'> | null;

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const memberItems: NavItem[] = [
  { href: '/app', label: 'Command Centre', icon: LayoutDashboard },
  { href: '/app/daily-checks', label: 'Daily Checks', icon: Activity },
  { href: '/app/watchlists', label: 'Watchlists', icon: Bell },
  { href: '/app/assets', label: 'Asset Library', icon: ChartCandlestick },
  { href: '/app/portfolio-tools', label: 'Portfolio Tools', icon: Calculator },
  { href: '/app/account', label: 'Account', icon: Settings },
];

const adminItems: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: Gauge },
  { href: '/admin/assets', label: 'Assets', icon: BriefcaseBusiness },
  { href: '/admin/members', label: 'Members', icon: UsersRound },
  { href: '/admin/analytics', label: 'Analytics', icon: Activity },
  { href: '/admin/ai-briefs', label: 'AI Briefs', icon: Sparkles },
  { href: '/admin/system-jobs', label: 'System Jobs', icon: ShieldCheck },
];

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/app' && href !== '/admin' && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      prefetch
      className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
      <span>{label}</span>
    </Link>
  );
}

export function TopNav({ children, initialUser }: { children: React.ReactNode; initialUser: NavUser }) {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const isAuthPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
  const isMarketingPage = pathname === '/' || pathname === '/pricing';

  if (isAuthPage || isMarketingPage) return <>{children}</>;

  const role = initialUser?.role ?? 'MEMBER';
  const canAdmin = role === 'OWNER' || role === 'ADMIN';

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-y-auto border-r border-border bg-card/95 px-4 py-5 shadow-2xl backdrop-blur-xl lg:block">
        <Link href="/app" className="group flex items-center gap-3 px-1">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md">SPA</div>
          <div>
            <div className="text-sm font-bold tracking-tight text-foreground">Stock Pickers Academy</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Investment console</div>
          </div>
        </Link>

        <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Session</div>
          <div className="mt-1.5 truncate text-sm font-semibold text-foreground">{initialUser?.name ?? 'Signed out'}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{initialUser?.email ?? 'Use sign in to continue'}</div>
          <div className="mt-2 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
            {initialUser ? `${initialUser.role} / ${initialUser.accessState}` : 'PUBLIC'}
          </div>
        </div>

        <nav className="mt-5 space-y-5">
          <section>
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Member</div>
            <div className="space-y-1">{memberItems.map((item) => <NavLink key={item.href} {...item} />)}</div>
          </section>
          {canAdmin && (
            <section>
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Admin</div>
              <div className="space-y-1">{adminItems.map((item) => <NavLink key={item.href} {...item} />)}</div>
            </section>
          )}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl lg:pl-72">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="lg:hidden">
            <Link href="/app" className="font-bold tracking-tight text-foreground">SPA</Link>
          </div>
          <div className="hidden text-sm font-medium text-muted-foreground lg:block">
            {canAdmin ? 'Admin and member workspaces are separated.' : 'Member workspace'}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {canAdmin && <Link href="/admin" className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted">Admin</Link>}
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground transition hover:brightness-110">Sign in</button>
              </SignInButton>
            )}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
          {memberItems.map((item) => <NavLink key={item.href} {...item} />)}
          {canAdmin && adminItems.map((item) => <NavLink key={item.href} {...item} />)}
        </div>
      </header>

      <main className="relative px-4 py-6 lg:pl-[19.5rem] lg:pr-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
