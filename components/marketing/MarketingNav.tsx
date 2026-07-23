'use client';

import Link from 'next/link';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ThemeToggle';

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/spa-logo.svg" alt="Stock Pickers Academy" className="h-11 w-11" />
        <div>
          <div className="font-bold tracking-tight text-foreground">Stock Pickers Academy</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Asset intelligence</div>
        </div>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/pricing" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:inline-flex">
          Pricing
        </Link>
        <ThemeToggle />
        {signedIn ? (
          <Link href="/app" className="rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:opacity-90">Open app</Link>
        ) : (
          <>
            <SignInButton mode="modal" forceRedirectUrl="/app" signUpForceRedirectUrl="/app">
              <button className="hidden rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-muted sm:inline-flex">Member sign in</button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/app" signInForceRedirectUrl="/app">
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110">Join the academy</button>
            </SignUpButton>
          </>
        )}
      </div>
    </header>
  );
}
