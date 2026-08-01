'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/Card';
import { compoundInterest, type CompoundContributionTiming } from '@/lib/growth';

const FREQUENCIES: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Yearly' },
  { value: 2, label: 'Half-yearly' },
  { value: 4, label: 'Quarterly' },
  { value: 12, label: 'Monthly' },
  { value: 52, label: 'Weekly' },
  { value: 365, label: 'Daily' },
];

const money = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fieldClass =
  'mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';

function NumberField({
  label,
  value,
  onChange,
  step = '1',
  min = '0',
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  min?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input type="number" inputMode="decimal" step={step} min={min} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export default function CompoundInterestPage() {
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('20');
  const [compounds, setCompounds] = useState(12);
  const [contribution, setContribution] = useState('250');
  const [contributionsPerYear, setContributionsPerYear] = useState(12);
  const [timing, setTiming] = useState<CompoundContributionTiming>('end');

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const result = useMemo(
    () =>
      compoundInterest({
        principal: num(principal),
        annualRatePct: num(rate),
        years: num(years),
        compoundsPerYear: compounds,
        contribution: num(contribution),
        contributionsPerYear,
        contributionTiming: timing,
      }),
    [principal, rate, years, compounds, contribution, contributionsPerYear, timing],
  );

  const growthShare = result.finalBalance > 0 ? (result.totalInterest / result.finalBalance) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link href="/app/portfolio-tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Portfolio
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Compound Interest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What a pot becomes over time. Everything here is arithmetic on the numbers you type in, not a forecast of any holding.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card title="Your numbers">
          <div className="space-y-4">
            <NumberField label="Starting amount" value={principal} onChange={setPrincipal} step="100" suffix="£" />
            <NumberField label="Annual rate" value={rate} onChange={setRate} step="0.1" suffix="%" />
            <NumberField label="Years" value={years} onChange={setYears} step="1" />

            <div>
              <label className={labelClass}>Compounds</label>
              <select value={compounds} onChange={(e) => setCompounds(Number(e.target.value))} className={fieldClass}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <NumberField label="Regular deposit" value={contribution} onChange={setContribution} step="10" suffix="£" />

            <div>
              <label className={labelClass}>Deposit frequency</label>
              <select value={contributionsPerYear} onChange={(e) => setContributionsPerYear(Number(e.target.value))} className={fieldClass}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Deposits go in</label>
              <div className="mt-1 flex gap-1 rounded-lg border border-border bg-background p-0.5">
                {(['end', 'start'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTiming(t)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                      timing === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'end' ? 'End of period' : 'Start of period'}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Paying in at the start earns an extra period of growth on every deposit.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="What you end up with">
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Final balance</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-foreground 2xl:text-2xl">{money(result.finalBalance)}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">You paid in</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-foreground 2xl:text-2xl">{money(result.totalPaidIn)}</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Growth</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-foreground 2xl:text-2xl">{money(result.totalInterest)}</div>
              </div>
            </div>
            {result.finalBalance > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                {growthShare >= 50
                  ? `Growth makes up ${growthShare.toFixed(0)}% of the final balance, so more of it comes from time than from what you put in.`
                  : `Growth makes up ${growthShare.toFixed(0)}% of the final balance. Most of it is still the money you paid in.`}
              </p>
            )}
          </Card>

          <Card title="Year by year">
            {result.schedule.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Set a number of years above to see the breakdown.</div>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4">Year</th>
                      <th className="py-2 pr-4">Opening</th>
                      <th className="py-2 pr-4">Paid in</th>
                      <th className="py-2 pr-4">Growth</th>
                      <th className="py-2 pr-4">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((row) => (
                      <tr key={row.year} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-semibold text-foreground">{row.year}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{money(row.openingBalance)}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{money(row.contributions)}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-emerald-500">{money(row.interest)}</td>
                        <td className="py-2 pr-4 font-mono text-xs font-semibold text-foreground">{money(row.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
