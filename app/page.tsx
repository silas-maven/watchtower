import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { ArrowRight, BellRing, Brain, ChartCandlestick, ChevronRight, LockKeyhole, ShieldCheck, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

import { Particles } from '@/components/ui/particles';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { MagicCard } from '@/components/ui/magic-card';
import { BorderBeam } from '@/components/ui/border-beam';
import { BlurFade } from '@/components/ui/blur-fade';
import { WordFadeIn } from '@/components/ui/word-fade-in';
import { ThemeToggle } from '@/components/ThemeToggle';

const proofPoints = [
  ['Buy-zone discipline', 'Target entry and exit levels stay deterministic.'],
  ['Spreadsheet parity', 'Daily change, range, volatility and 52-week context.'],
  ['Admin control', 'Missed payment alerts never auto-remove members.'],
];

const features = [
  { title: 'Daily SPA checks', body: 'What is popping, what is dropping, what entered a buy zone, and what hit exit targets.', icon: ChartCandlestick },
  { title: 'Personal watchlists', body: 'Members narrow the full academy list into the assets they care about without losing market-wide alerts.', icon: BellRing },
  { title: 'AI briefing layer', body: 'AI turns deterministic signal data into clear market notes and member-ready summaries.', icon: Brain },
  { title: 'Controlled access', body: 'Stripe informs billing state; admins decide whether to pause, reactivate, or remove access.', icon: ShieldCheck },
];

function PrimaryAction({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return <Link href="/app" className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">Open SPA <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>;
  }
  return <SignUpButton mode="modal"><button className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">Request member access <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></button></SignUpButton>;
}

export default async function LandingPage() {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Animated Particles Background (Gold to work on both themes) */}
      <Particles
        className="absolute inset-0 z-0 opacity-40"
        quantity={150}
        ease={80}
        color="#ca8a04"
        refresh
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background to-transparent z-0" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md">SPA</div>
          <div>
            <div className="font-bold tracking-tight text-foreground">Stock Pickers Academy</div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Asset intelligence</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {signedIn ? (
            <>
              <Link href="/admin" className="hidden rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-muted sm:inline-flex">Admin</Link>
              <Link href="/app" className="rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-muted-foreground">Open app</Link>
            </>
          ) : (
            <>
              <SignInButton mode="modal"><button className="hidden rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-muted sm:inline-flex">Member sign in</button></SignInButton>
              <SignInButton mode="modal"><button className="hidden rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary backdrop-blur transition hover:bg-primary/20 sm:inline-flex"><LockKeyhole className="mr-2 h-4 w-4" /> Admin login</button></SignInButton>
              <SignUpButton mode="modal"><button className="rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:bg-muted-foreground">Join waitlist</button></SignUpButton>
            </>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pt-24">
        <div>
          <BlurFade delay={0.1}>
            <div className="z-10 flex min-h-8 items-center justify-start">
              <div className="inline-flex rounded-full border border-primary/20 bg-primary/5 backdrop-blur transition-all ease-in hover:cursor-pointer hover:bg-primary/10">
                <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out text-primary uppercase tracking-[0.2em] text-xs font-bold">
                  ✨ Private beta
                </AnimatedShinyText>
              </div>
            </div>
          </BlurFade>
          
          <div className="mt-7 max-w-4xl">
            <WordFadeIn 
              words="The SPA watchlist, rebuilt for serious daily decisions."
              className="text-left text-6xl font-bold leading-[0.95] tracking-tight text-foreground md:text-7xl lg:text-8xl"
            />
          </div>
          
          <BlurFade delay={0.3}>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
              A premium operating layer for Stock Pickers Academy: live asset intelligence, personal watchlists, buy/sell zones, portfolio tools, admin access control, and AI-generated daily context.
            </p>
          </BlurFade>
          
          <BlurFade delay={0.4}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <PrimaryAction signedIn={signedIn} />
              <Link href={signedIn ? '/admin' : '/sign-in'} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-muted">Admin portal <ChevronRight className="h-4 w-4" /></Link>
            </div>
          </BlurFade>
          
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {proofPoints.map(([title, body], idx) => (
              <BlurFade key={title} delay={0.5 + idx * 0.1}>
                <div className="h-full rounded-2xl border border-border bg-card p-4 shadow-sm backdrop-blur transition hover:bg-muted/50">
                  <div className="text-sm font-semibold text-foreground">{title}</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>

        <BlurFade delay={0.5} className="relative group">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-primary/10 blur-3xl transition duration-1000 group-hover:bg-primary/20" />
          <div className="relative rounded-[2rem] border border-border bg-card p-4 shadow-2xl backdrop-blur-xl overflow-hidden">
            {/* Animated Border Beam */}
            <BorderBeam size={250} duration={12} delay={9} colorFrom="var(--primary)" colorTo="var(--background)" />
            
            <div className="rounded-[1.5rem] border border-border bg-muted/30 p-5 text-foreground">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Today’s operating brief</div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Signal command centre</h2>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">Live rules</div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-background p-4 shadow-sm border border-border"><TrendingDown className="h-5 w-5 text-emerald-500" /><div className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Buy zone</div><div className="text-4xl font-bold tracking-tight text-foreground">12</div></div>
                <div className="rounded-2xl bg-background p-4 shadow-sm border border-border"><TrendingUp className="h-5 w-5 text-rose-500" /><div className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Sell zone</div><div className="text-4xl font-bold tracking-tight text-foreground">4</div></div>
                <div className="rounded-2xl bg-primary/10 p-4 shadow-sm border border-primary/20"><BellRing className="h-5 w-5 text-primary" /><div className="mt-4 text-xs font-semibold uppercase text-primary">Watched</div><div className="text-4xl font-bold tracking-tight text-foreground">37</div></div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><span>Watchlist movement</span><span>GBP normalized</span></div>
                <div className="mt-4 space-y-3">
                  {[
                    ['AAPL', 'Entry level touched', '+1.8%', 'BUY', 'emerald'],
                    ['BTC', 'Volatility threshold', '-3.4%', 'WATCH', 'slate'],
                    ['VUSA', '52-week range check', '+0.6%', 'HOLD', 'slate'],
                  ].map(([symbol, label, move, state, color]) => (
                    <div key={symbol} className="grid grid-cols-[4rem_1fr_4rem_4.5rem] items-center gap-3 rounded-xl bg-card px-3 py-2 text-sm border border-border transition hover:bg-muted">
                      <div className="font-bold text-foreground">{symbol}</div>
                      <div className="text-muted-foreground">{label}</div>
                      <div className={move.startsWith('+') ? 'font-mono font-semibold text-emerald-500' : 'font-mono font-semibold text-rose-500'}>{move}</div>
                      <div className={`rounded-full px-2 py-1 text-center text-[10px] font-bold border ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>{state}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-4 px-5 pb-20 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <BlurFade key={feature.title} delay={0.2 + idx * 0.1} inView>
              <MagicCard className="flex-col h-full p-6 shadow-xl transition hover:cursor-default" gradientColor="var(--muted)">
                <Icon className="h-6 w-6 text-primary" />
                <div className="mt-5 font-bold text-foreground text-lg">{feature.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </MagicCard>
            </BlurFade>
          );
        })}
      </section>
    </main>
  );
}
