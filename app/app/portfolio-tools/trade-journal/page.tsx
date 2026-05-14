import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { BlurFade } from '@/components/ui/blur-fade';
import { History, ArrowLeft, TrendingUp, Trophy } from 'lucide-react';
import { requirePageUser } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/Badge';

export const dynamic = 'force-dynamic';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function TradeJournal() {
  const profile = await requirePageUser('/app/portfolio-tools/trade-journal');
  
  const closedPositions = await prisma.closedPosition.findMany({
    where: { profileId: profile.id },
    include: { asset: true },
    orderBy: { closedAt: 'desc' },
  });

  const totalRealizedProfit = closedPositions.reduce((acc, pos) => acc + (pos.profitGBP ?? 0), 0);
  const winningTrades = closedPositions.filter(p => (p.profitGBP ?? 0) > 0).length;
  const winRate = closedPositions.length > 0 ? (winningTrades / closedPositions.length) * 100 : 0;

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      <BlurFade delay={0.1}>
        <div className="mb-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3"><History className="h-6 w-6 text-emerald-500" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Trade Journal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Log your historical closed positions and track realized gains.</p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <Trophy className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Realized Profit</div>
                <div className={`text-4xl font-black font-mono tracking-tighter ${totalRealizedProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {totalRealizedProfit >= 0 ? '+' : '-'}£{fmt(Math.abs(totalRealizedProfit))}
                </div>
              </div>
            </div>
          </Card>
          <Card title="Win Rate">
            <div className="text-3xl font-bold font-mono text-foreground">{winRate.toFixed(0)}%</div>
            <div className="mt-1 text-sm text-muted-foreground">{winningTrades} winning trades out of {closedPositions.length}</div>
          </Card>
        </div>
      </BlurFade>

      <BlurFade delay={0.3}>
        <Card title="Closed Positions History" right={<Badge tone="zinc">{closedPositions.length} entries</Badge>}>
          {closedPositions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No trades logged yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                Once you close a position and realize profit/loss, it will appear here. The manual logging form is coming soon.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Asset</th>
                      <th className="px-4 py-3 font-semibold">Date Closed</th>
                      <th className="px-4 py-3 font-semibold text-right">Investment</th>
                      <th className="px-4 py-3 font-semibold text-right">Avg Entry</th>
                      <th className="px-4 py-3 font-semibold text-right">Exit Price</th>
                      <th className="px-4 py-3 font-semibold text-right">Realized Profit</th>
                      <th className="px-4 py-3 font-semibold text-right">Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {closedPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-muted/20 transition">
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground">{pos.asset.symbol}</div>
                          <div className="text-xs text-muted-foreground">{pos.asset.name}</div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{pos.closedAt.toLocaleDateString()}</td>
                        <td className="px-4 py-4 font-mono text-right">£{fmt(pos.investmentValueGBP)}</td>
                        <td className="px-4 py-4 font-mono text-right">{fmt(pos.averageEntryPrice)}</td>
                        <td className="px-4 py-4 font-mono text-right">{fmt(pos.exitPrice)}</td>
                        <td className={`px-4 py-4 font-mono font-bold text-right ${(pos.profitGBP ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {(pos.profitGBP ?? 0) >= 0 ? '+' : '-'}£{fmt(Math.abs(pos.profitGBP ?? 0))}
                        </td>
                        <td className={`px-4 py-4 font-mono font-bold text-right ${(pos.returnPct ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {(pos.returnPct ?? 0) >= 0 ? '+' : ''}{fmt(pos.returnPct)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </BlurFade>
    </div>
  );
}
