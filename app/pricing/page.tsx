import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { SignUpButton } from '@clerk/nextjs';
import { Check, ArrowRight } from 'lucide-react';

import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Reveal } from '@/components/marketing/Reveal';

export const metadata = {
  title: 'Pricing — Stock Pickers Academy',
  description: 'Membership is £50 a month. The SPArtan Investing eCourse is a one-time purchase. Checkout opens inside the members area.',
};

const membershipFeatures = [
  'The full curated master watchlist, priced live',
  'Deterministic buy and sell signals',
  'Unlimited personal sublists',
  'Daily brief tailored to what you track',
  'Virtual portfolio, averaging planner, due diligence and trade journal',
  'Markets news feed and academy updates',
];

const ecourseFeatures = [
  'The complete SPArtan Investing method, start to finish',
  'The thinking behind the watchlist and the levels',
  'Position sizing, averaging and risk',
  'Lifetime access to the course material',
  'One-time purchase, no subscription',
];

const faqs = [
  ['Do I need the eCourse to use the membership?', 'No. Membership gives you the live watchlist, signals and tools on its own. The eCourse is a separate, deeper dive into the method for those who want it.'],
  ['How do the buy and sell signals work?', 'The academy sets a target entry and exit level for each asset. When the live price meets a level, the asset moves into a buy or sell zone. The logic is fixed, so the same inputs always give the same signal.'],
  ['Will my access be cut if a payment fails?', 'No. A failed payment raises an alert for the academy to review. A person decides what happens next. Your access is never removed automatically.'],
  ['Is this financial advice?', 'No. The platform organises information and surfaces signals from rules the academy sets. It does not tell you what to buy or sell, and it never promises a result.'],
  ['How do I pay?', 'Billing is handled securely by Stripe. Once you join, checkout for both membership and the eCourse opens inside the members area.'],
];

function JoinButton({ signedIn, label }: { signedIn: boolean; label: string }) {
  if (signedIn) {
    return (
      <Link href="/app/account" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">
        {label} <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <SignUpButton mode="modal">
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">
        {label} <ArrowRight className="h-4 w-4" />
      </button>
    </SignUpButton>
  );
}

export default async function PricingPage() {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(202,138,4,0.10),_transparent_55%)]" />
      <MarketingNav signedIn={signedIn} />

      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-12 pt-12 text-center lg:pt-16">
        <Reveal>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Pricing</div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">Simple, member-first pricing</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            One membership for the live platform. An optional one-time course for the full method. Checkout opens inside the members area once you join.
          </p>
        </Reveal>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="relative flex h-full flex-col rounded-3xl border border-primary/30 bg-card p-8">
              <div className="absolute right-6 top-6 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Most popular</div>
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Membership</div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-5xl font-black tracking-tight text-foreground">£50</span>
                <span className="mb-1.5 text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">The live academy platform, in full.</p>
              <ul className="mt-6 flex-1 space-y-3">
                {membershipFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8"><JoinButton signedIn={signedIn} label={signedIn ? 'Start membership' : 'Join the academy'} /></div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-8">
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">SPArtan Investing eCourse</div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-5xl font-black tracking-tight text-foreground">£1,000</span>
                <span className="mb-1.5 text-sm text-muted-foreground">one-time</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">The complete method, taught end to end.</p>
              <ul className="mt-6 flex-1 space-y-3">
                {ecourseFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8"><JoinButton signedIn={signedIn} label={signedIn ? 'Buy the eCourse' : 'Join to purchase'} /></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-20">
        <Reveal>
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">Common questions</h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {faqs.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.05}>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-sm font-bold text-foreground">{q}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
