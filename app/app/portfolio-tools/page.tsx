import Link from 'next/link';
import { requirePageUser } from '@/lib/server/pageAuth';
import { BlurFade } from '@/components/ui/blur-fade';
import { Calculator, CheckSquare, History, ArrowLeft, ArrowRight, Wallet, Briefcase } from 'lucide-react';

export default async function PortfolioToolsPage() {
  await requirePageUser('/app/portfolio-tools');

  const tools = [
    {
      href: '/app/portfolio-tools/live-portfolio',
      icon: Briefcase,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      title: 'Live Portfolio',
      description: 'Your real holdings, valued against live prices. Track invested cost, current value, profit and return across your own positions, separate from the academy list.',
    },
    {
      href: '/app/portfolio-tools/virtual-portfolio',
      icon: Wallet,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      title: 'Virtual Portfolio',
      description: 'Paper-trade the master watchlist. Add positions with live prices, set your portfolio size and per-stock budget, and watch invested value, return, cash, liquidation value and profit update in real time.',
    },
    {
      href: '/app/portfolio-tools/average-calculator',
      icon: Calculator,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      title: 'Average Planner',
      description: 'Split your budget into deterministic entry tranches. Models staged buys from the workbook, initial position, second buy, third buy, and calculates your resulting average entry price.',
    },
    {
      href: '/app/portfolio-tools/due-diligence',
      icon: CheckSquare,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      title: 'Due Diligence Checklist',
      description: 'Score assets on 8 fundamental criteria — revenue growth, margins, debt, moat, management, shareholder return, macro tailwinds, and valuation — to arrive at a Conviction Score.',
    },
    {
      href: '/app/portfolio-tools/trade-journal',
      icon: History,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      title: 'Trade Journal',
      description: 'Log closed positions, track realized profit & loss, and monitor your all-time win rate. Your personal trophy cabinet for every trade you make.',
    },
  ];

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <BlurFade delay={0.1}>
        <div className="mb-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">SPA Method</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Portfolio Tools</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Everything from the workbook — averaging calculator, due diligence checklist, and trade journal — reimagined as interactive tools.
          </p>
        </div>
      </BlurFade>

      <div className="grid gap-6">
        {tools.map((tool, idx) => (
          <BlurFade key={tool.href} delay={0.15 + idx * 0.1}>
            <Link
              href={tool.href}
              className="group flex items-start gap-6 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:bg-muted/50 hover:shadow-lg hover:border-primary/30"
            >
              <div className={`shrink-0 rounded-xl ${tool.iconBg} p-4`}>
                <tool.icon className={`h-7 w-7 ${tool.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-foreground">{tool.title}</h2>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
              </div>
            </Link>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}
