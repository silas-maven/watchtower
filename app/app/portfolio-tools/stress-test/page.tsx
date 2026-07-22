'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/Card';
import { useToast } from '@/components/ui/ToastProvider';

type StressResult = {
  startValueGBP: number;
  horizonYears: number;
  paths: number;
  probMeetingGoal: number | null;
  finalValuePercentilesGBP: { p5: number; p25: number; p50: number; p75: number; p95: number };
  maxDrawdownPct: { median: number; p90: number };
  annualisedAssumptions: { expectedReturnPct: number; volatilityPct: number; riskFreePct: number };
  concentration: {
    topHolding: { symbol: string; weightPct: number } | null;
    topCurrency: { currency: string; weightPct: number } | null;
    cashWeightPct: number;
    portfolioBeta: number;
    holdingsCount: number;
  };
};

type Narrative = {
  headline: string;
  probability: string;
  returnRange: string;
  drawdown: string;
  overexposure: string;
  threeChanges: string[];
  model: string;
};

const gbp = (v: number) => `£${Math.round(v).toLocaleString()}`;

export default function StressTestPage() {
  const { pushToast } = useToast();
  const [scope, setScope] = useState<'live' | 'virtual' | 'both'>('live');
  const [target, setTarget] = useState('');
  const [years, setYears] = useState('10');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<StressResult | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);

  async function run() {
    if (running) return;
    setRunning(true);
    setResult(null);
    setNarrative(null);
    try {
      const res = await fetch('/api/ai/stress-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope,
          targetValueGBP: target.trim() === '' ? null : Number(target),
          horizonYears: Number(years) || 10,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        setResult(j.data.result);
        setNarrative(j.data.narrative);
      } else {
        pushToast(j.error?.message ?? 'Could not run the stress test', 'error');
      }
    } catch {
      pushToast('Could not run the stress test', 'error');
    } finally {
      setRunning(false);
    }
  }

  const selectClass = 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none';

  return (
    <div className="space-y-8 pb-12">
      <div>
        <Link href="/app/portfolio-tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Portfolio
        </Link>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <ShieldAlert className="h-7 w-7 text-rose-500" /> Portfolio Stress Test
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          A Monte Carlo simulation of thousands of possible futures for your portfolio, with the results explained
          in simple English. Educational analysis under stated assumptions, not financial advice.
        </p>
      </div>

      <Card title="Set up the test">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portfolio</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={`mt-1 block ${selectClass}`}>
              <option value="live">Live portfolio</option>
              <option value="virtual">Virtual portfolio</option>
              <option value="both">Both combined</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Goal value (£, optional)</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" placeholder="e.g. 50000" className={`mt-1 block w-36 ${selectClass}`} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Horizon (years)</label>
            <input value={years} onChange={(e) => setYears(e.target.value)} inputMode="numeric" className={`mt-1 block w-24 ${selectClass}`} />
          </div>
          <button
            onClick={run}
            disabled={running}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {running ? 'Simulating…' : 'Run stress test'}
          </button>
        </div>
      </Card>

      {running && (
        <Card title="Running">
          <div className="py-6 text-center text-sm text-muted-foreground">
            Simulating thousands of market futures and preparing the plain-English read…
          </div>
        </Card>
      )}

      {result && narrative && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card title="Goal probability">
              <div className="text-2xl font-black text-foreground">
                {result.probMeetingGoal == null ? '—' : `${Math.round(result.probMeetingGoal * 100)}%`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">of {result.paths.toLocaleString()} simulated futures</div>
            </Card>
            <Card title="Median outcome">
              <div className="text-2xl font-black text-foreground">{gbp(result.finalValuePercentilesGBP.p50)}</div>
              <div className="mt-1 text-xs text-muted-foreground">from {gbp(result.startValueGBP)} over {result.horizonYears} years</div>
            </Card>
            <Card title="Range (25th to 75th)">
              <div className="text-lg font-bold text-foreground">{gbp(result.finalValuePercentilesGBP.p25)} to {gbp(result.finalValuePercentilesGBP.p75)}</div>
              <div className="mt-1 text-xs text-muted-foreground">bad run (5th): {gbp(result.finalValuePercentilesGBP.p5)}</div>
            </Card>
            <Card title="Likely max drawdown">
              <div className="text-2xl font-black text-rose-500">{result.maxDrawdownPct.median.toFixed(0)}%</div>
              <div className="mt-1 text-xs text-muted-foreground">rough scenarios: {result.maxDrawdownPct.p90.toFixed(0)}%</div>
            </Card>
          </div>

          <Card title="Chief Risk Officer read">
            <div className="space-y-4 text-sm leading-6 text-foreground">
              <p className="font-semibold">{narrative.headline}</p>
              <p><span className="font-bold text-primary">Goal:</span> {narrative.probability}</p>
              <p><span className="font-bold text-primary">Range of outcomes:</span> {narrative.returnRange}</p>
              <p><span className="font-bold text-primary">Drawdown:</span> {narrative.drawdown}</p>
              <p><span className="font-bold text-primary">Overexposure:</span> {narrative.overexposure}</p>
              <div>
                <div className="font-bold text-primary">Three changes to improve risk-adjusted returns:</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {narrative.threeChanges.map((c) => <li key={c}>{c}</li>)}
                </ol>
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Assumptions: risk-free {result.annualisedAssumptions.riskFreePct.toFixed(1)}%, expected return {result.annualisedAssumptions.expectedReturnPct.toFixed(1)}%/yr, volatility {result.annualisedAssumptions.volatilityPct.toFixed(1)}%/yr, portfolio beta {result.concentration.portfolioBeta.toFixed(2)}.
              Simulated scenarios are illustrations, not predictions or advice. Model: {narrative.model}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
