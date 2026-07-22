import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { SignUpButton } from '@clerk/nextjs';
import { ArrowRight, Activity, ListChecks, LineChart, ShieldCheck, Newspaper, Target, ChevronRight } from 'lucide-react';

import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { HeroBackground } from '@/components/marketing/HeroBackground';
import { Reveal } from '@/components/marketing/Reveal';

export const metadata = {
  title: 'Stock Pickers Academy — the watchlist, rebuilt',
  description:
    'A members-only operating layer for Stock Pickers Academy: a curated master watchlist, deterministic buy and sell signals, personal sublists, portfolio tools and a daily brief.',
};

const features = [
  { title: 'Curated master watchlist', body: 'One academy-managed list of stocks, ETFs and crypto, priced live and kept current. Members see everything, the academy controls what is on it.', icon: LineChart },
  { title: 'Deterministic signals', body: 'Buy and sell alerts come from target entry and exit levels set by the academy. The maths is fixed and repeatable, not a black box.', icon: Target },
  { title: 'Your own sublists', body: 'Build as many personal lists as you like from the master watchlist, and get a daily read on just the assets you track.', icon: ListChecks },
  { title: 'Portfolio tools', body: 'A virtual portfolio, an averaging planner, a due diligence checklist and a trade journal, all carried over from the original workbook.', icon: Activity },
  { title: 'Daily and weekly briefs', body: 'A plain-English summary of what entered a buy zone, what hit exit, and what moved, with a weekly digest for the academy owner.', icon: Newspaper },
  { title: 'Membership you control', body: 'Billing runs through Stripe. A missed payment raises an alert for review. Access is only ever changed by the academy, never automatically.', icon: ShieldCheck },
];

const steps = [
  { n: '01', title: 'The academy sets the levels', body: 'Each asset gets a target entry and target exit. These are the only inputs that decide a signal.' },
  { n: '02', title: 'Live prices do the rest', body: 'Prices refresh through the day. When a level is met, the asset moves into a buy or sell zone automatically.' },
  { n: '03', title: 'You act with context', body: 'The daily brief tells you what changed and why. The AI explains the state, it never decides the trade.' },
];

export default async function LandingPage() {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <MarketingNav signedIn={signedIn} />

      {/* Hero */}
      <section className="relative">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-16 text-center lg:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Private members beta
          </div>

          <h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-bold leading-[1.02] tracking-tight text-foreground md:text-7xl">
            The SPA watchlist, rebuilt for daily decisions.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Stock Pickers Academy ran on one heavy spreadsheet. This is the same method as a proper platform: a live master watchlist, clear buy and sell zones, personal sublists and a daily brief.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {signedIn ? (
              <Link href="/app" className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">
                Open the app <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <SignUpButton mode="modal" forceRedirectUrl="/app" signInForceRedirectUrl="/app">
                <button className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">
                  Join the academy <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </SignUpButton>
            )}
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-muted">
              See pricing <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* From spreadsheet to platform */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Reveal className="rounded-3xl border border-border bg-card/60 p-8 backdrop-blur md:p-12">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-primary">From spreadsheet to platform</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">The method stays. The friction goes.</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The blotter held target levels, daily ranges, 52-week context, averaging maths and trade alerts across hundreds of formulas. Every one of those calculations now runs server-side, in real time, for the whole community.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Live', 'GBP-normalised pricing across stocks, ETFs and crypto'],
                ['Deterministic', 'The same signal logic the workbook used, server-side'],
                ['Shared', 'One master list, many personal sublists'],
                ['Controlled', 'Access managed by the academy, never auto-cut'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-sm font-bold text-primary">{k}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-12">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">Everything the community needs in one place</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 transition hover:border-primary/30 hover:bg-muted/30">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-5 text-lg font-bold text-foreground">{f.title}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How alerts work */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Reveal>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-primary">How the signals work</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Rules decide the signal. AI only explains it.</h2>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <div className="text-4xl font-black text-primary/30">{s.n}</div>
                <div className="mt-3 text-lg font-bold text-foreground">{s.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Reveal className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center md:p-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Join the academy and trade with the whole picture.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Membership is £50 a month. The full SPArtan Investing eCourse is available as a one-time purchase inside the members area.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {signedIn ? (
              <Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">Open the app <ArrowRight className="h-4 w-4" /></Link>
            ) : (
              <SignUpButton mode="modal" forceRedirectUrl="/app" signInForceRedirectUrl="/app">
                <button className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">Join the academy <ArrowRight className="h-4 w-4" /></button>
              </SignUpButton>
            )}
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">See what is included</Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </main>
  );
}
