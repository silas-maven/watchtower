'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/Card';
import { cagr, totalReturnPct, yearsToTarget } from '@/lib/growth';

const money = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${n.toFixed(2)}%`;

const fieldClass =
  'mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';

export default function CagrPage() {
  const [start, setStart] = useState('10000');
  const [end, setEnd] = useState('25000');
  const [years, setYears] = useState('7');
  const [target, setTarget] = useState('50000');

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const startV = num(start);
  const endV = num(end);
  const yearsV = num(years);
  const targetV = num(target);

  const rate = useMemo(() => cagr(startV, endV, yearsV), [startV, endV, yearsV]);
  const total = useMemo(() => totalReturnPct(startV, endV), [startV, endV]);
  const toTarget = useMemo(() => (rate == null ? null : yearsToTarget(endV, targetV, rate)), [rate, endV, targetV]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link href="/app/portfolio-tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Portfolio
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">CAGR Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The compound annual growth rate behind a result: the steady yearly rate that would have taken the starting value to the ending one.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card title="Your numbers">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Starting value</label>
              <input type="number" inputMode="decimal" step="100" min="0" value={start} onChange={(e) => setStart(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Ending value</label>
              <input type="number" inputMode="decimal" step="100" min="0" value={end} onChange={(e) => setEnd(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Years</label>
              <input type="number" inputMode="decimal" step="0.5" min="0" value={years} onChange={(e) => setYears(e.target.value)} className={fieldClass} />
            </div>
            <div className="border-t border-border pt-4">
              <label className={labelClass}>Optional: a target to reach</label>
              <input type="number" inputMode="decimal" step="100" min="0" value={target} onChange={(e) => setTarget(e.target.value)} className={fieldClass} />
              <p className="mt-1.5 text-[11px] text-muted-foreground">How long the same rate would take to get from the ending value to this.</p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="The rate behind it">
            {rate == null ? (
              // Say why rather than printing a number that means nothing. A CAGR
              // from a starting value of zero is infinite, not impressive.
              <div className="rounded-2xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                {startV <= 0
                  ? 'A growth rate needs a starting value above zero. Growing from nothing has no annual rate.'
                  : yearsV <= 0
                    ? 'Set a number of years above zero. A rate needs a period to be spread over.'
                    : 'Enter a starting value, an ending value and a number of years.'}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CAGR</div>
                    <div className={`mt-1 text-xl font-bold tabular-nums 2xl:text-2xl ${rate >= 0 ? 'text-foreground' : 'text-rose-500'}`}>{pct(rate)}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">a year</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total return</div>
                    <div className={`mt-1 text-xl font-bold tabular-nums 2xl:text-2xl ${(total ?? 0) >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                      {total == null ? '—' : pct(total)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">over {yearsV} year{yearsV === 1 ? '' : 's'}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gain</div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-foreground 2xl:text-2xl">{money(endV - startV)}</div>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  {money(startV)} to {money(endV)} over {yearsV} year{yearsV === 1 ? '' : 's'} is the same as growing{' '}
                  <span className="font-semibold text-foreground">{pct(rate)}</span> every year. CAGR smooths the path: the real journey will
                  have been bumpier than a steady rate suggests.
                </p>
              </>
            )}
          </Card>

          {rate != null && rate > 0 && toTarget != null && (
            <Card title="Reaching your target">
              <p className="text-sm text-muted-foreground">
                At {pct(rate)} a year, going from {money(endV)} to {money(targetV)} takes{' '}
                <span className="font-semibold text-foreground">
                  {toTarget === 0 ? 'no time, you are already there' : `${toTarget.toFixed(1)} years`}
                </span>
                .
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
