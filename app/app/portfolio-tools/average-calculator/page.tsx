'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { BlurFade } from '@/components/ui/blur-fade';
import { Calculator, ArrowLeft, TrendingDown } from 'lucide-react';

const CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD'] as const;
const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$' };

function fmt(n: number, isCurrency = true) {
  if (isNaN(n) || !isFinite(n)) return '—';
  return isCurrency
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function AveragePriceCalculator() {
  const [budget, setBudget] = useState<string>('1500');
  const [currentPrice, setCurrentPrice] = useState<string>('100');
  const [drop1, setDrop1] = useState<string>('10');
  const [drop2, setDrop2] = useState<string>('20');
  const [currency, setCurrency] = useState<string>('GBP');
  const sym = SYMBOLS[currency] ?? '';

  useEffect(() => {
    fetch('/api/me/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'AVERAGE_PLAN_CREATE', path: '/app/portfolio-tools/average-calculator' }) }).catch(() => null);
    // Default the planner currency to the member's base currency.
    fetch('/api/me/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (j.ok && j.data?.baseCurrency) setCurrency(j.data.baseCurrency); })
      .catch(() => null);
  }, []);
  
  // Tranche splits based on typical spreadsheet logic (e.g. 33%, 33%, 34%)
  const split1 = 0.33;
  const split2 = 0.33;
  const split3 = 0.34;

  const numBudget = parseFloat(budget) || 0;
  const numPrice = parseFloat(currentPrice) || 0;
  const numDrop1 = parseFloat(drop1) || 0;
  const numDrop2 = parseFloat(drop2) || 0;

  // Prices
  const price1 = numPrice;
  const price2 = numPrice * (1 - numDrop1 / 100);
  const price3 = numPrice * (1 - numDrop2 / 100);

  // Shares bought per tranche
  const shares1 = (numBudget * split1) / price1;
  const shares2 = (numBudget * split2) / price2;
  const shares3 = (numBudget * split3) / price3;

  // Cumulative tracking
  const cumShares1 = shares1;
  const cumCost1 = numBudget * split1;
  const avg1 = cumShares1 > 0 ? cumCost1 / cumShares1 : 0;

  const cumShares2 = shares1 + shares2;
  const cumCost2 = cumCost1 + (numBudget * split2);
  const avg2 = cumShares2 > 0 ? cumCost2 / cumShares2 : 0;

  const cumShares3 = shares1 + shares2 + shares3;
  const cumCost3 = cumCost2 + (numBudget * split3);
  const avg3 = cumShares3 > 0 ? cumCost3 / cumShares3 : 0;

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <BlurFade delay={0.1}>
        <div className="mb-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3"><Calculator className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Average Planner</h1>
            <p className="mt-1 text-sm text-muted-foreground">Digitized Virtual Average Price Calculator from the spreadsheet.</p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div className="grid gap-6 md:grid-cols-12">
          {/* Inputs */}
          <div className="md:col-span-4 space-y-4">
            <Card title="Input Parameters">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{SYMBOLS[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Total Budget ({sym})</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Current/Target Entry Price</label>
                  <input 
                    type="number" 
                    value={currentPrice} 
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tranche 2 Drop %</label>
                    <input 
                      type="number" 
                      value={drop1} 
                      onChange={(e) => setDrop1(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tranche 3 Drop %</label>
                    <input 
                      type="number" 
                      value={drop2} 
                      onChange={(e) => setDrop2(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Results */}
          <div className="md:col-span-8 space-y-4">
            <Card title="Execution Plan">
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Tranche</th>
                      <th className="px-4 py-3 font-semibold">Allocation</th>
                      <th className="px-4 py-3 font-semibold">Entry Price</th>
                      <th className="px-4 py-3 font-semibold text-right">Shares</th>
                      <th className="px-4 py-3 font-semibold text-right text-primary">New Avg Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    <tr className="hover:bg-muted/20 transition">
                      <td className="px-4 py-4"><span className="font-bold">#1 (Initial)</span></td>
                      <td className="px-4 py-4">{sym}{fmt(numBudget * split1)} <span className="text-xs text-muted-foreground ml-1">({split1 * 100}%)</span></td>
                      <td className="px-4 py-4 font-mono">{sym}{fmt(price1)}</td>
                      <td className="px-4 py-4 font-mono text-right">{fmt(shares1, false)}</td>
                      <td className="px-4 py-4 font-mono font-bold text-primary text-right">{sym}{fmt(avg1)}</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition">
                      <td className="px-4 py-4"><span className="font-bold">#2 (-{numDrop1}%)</span></td>
                      <td className="px-4 py-4">{sym}{fmt(numBudget * split2)} <span className="text-xs text-muted-foreground ml-1">({split2 * 100}%)</span></td>
                      <td className="px-4 py-4 font-mono">{sym}{fmt(price2)}</td>
                      <td className="px-4 py-4 font-mono text-right">{fmt(shares2, false)}</td>
                      <td className="px-4 py-4 font-mono font-bold text-primary text-right flex items-center justify-end gap-1"><TrendingDown className="h-3 w-3" /> {sym}{fmt(avg2)}</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition">
                      <td className="px-4 py-4"><span className="font-bold">#3 (-{numDrop2}%)</span></td>
                      <td className="px-4 py-4">{sym}{fmt(numBudget * split3)} <span className="text-xs text-muted-foreground ml-1">({split3 * 100}%)</span></td>
                      <td className="px-4 py-4 font-mono">{sym}{fmt(price3)}</td>
                      <td className="px-4 py-4 font-mono text-right">{fmt(shares3, false)}</td>
                      <td className="px-4 py-4 font-mono font-bold text-primary text-right flex items-center justify-end gap-1"><TrendingDown className="h-3 w-3" /> {sym}{fmt(avg3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
                <div>
                  <div className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Final Position</div>
                  <div className="text-xs text-emerald-500/70 mt-1">If all three tranches are executed.</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-500">{sym}{fmt(avg3)}</div>
                  <div className="text-sm font-mono text-emerald-500/80 mt-0.5">{fmt(cumShares3, false)} total shares</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
