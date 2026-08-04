'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/Card';
import {
  projectDrawdown,
  type DrawdownInput,
  type TaxFreeCashChoice,
  type WithdrawalStrategy,
} from '@/lib/pension/drawdown';
import {
  DEFAULTS,
  EDUCATIONAL_DISCLAIMER,
  LUMP_SUM_ALLOWANCE,
  STATE_PENSION_AGE,
  STATE_PENSION_ANNUAL,
  TAX_REGION_NOTE,
  TAX_YEAR,
  WITHDRAWAL_STRATEGIES,
  type StrategyKey,
} from '@/lib/pension/config';

const money = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const money2 = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fieldClass =
  'mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';

function NumberField({
  label, value, onChange, step = '1', min = '0', suffix, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  step?: string; min?: string; suffix?: string; hint?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type="number" inputMode="decimal" step={step} min={min} value={value}
          onChange={(e) => onChange(e.target.value)} className={fieldClass}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>}
    </div>
  );
}

const num = (v: string, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function PensionDrawdownPage() {
  const [currentAge, setCurrentAge] = useState('55');
  const [retirementAge, setRetirementAge] = useState('65');
  const [potValue, setPotValue] = useState('400000');

  const [cashMode, setCashMode] = useState<'none' | 'max' | 'percent' | 'amount'>('max');
  const [cashPct, setCashPct] = useState('25');
  const [cashAmount, setCashAmount] = useState('100000');
  const [allowanceUsed, setAllowanceUsed] = useState('0');

  const [growthPct, setGrowthPct] = useState(String(DEFAULTS.growthPct));
  const [feesPct, setFeesPct] = useState(String(DEFAULTS.feesPct));
  const [inflationPct, setInflationPct] = useState(String(DEFAULTS.inflationPct));
  const [endAge, setEndAge] = useState(String(DEFAULTS.endAge));

  const [statePension, setStatePension] = useState(String(STATE_PENSION_ANNUAL));
  const [statePensionAge, setStatePensionAge] = useState(String(STATE_PENSION_AGE));
  const [otherIncome, setOtherIncome] = useState('0');
  const [targetInheritance, setTargetInheritance] = useState('');

  const [strategy, setStrategy] = useState<StrategyKey | 'customPct' | 'customAmount'>('balanced');
  const [customPct, setCustomPct] = useState('4');
  const [customAmount, setCustomAmount] = useState('20000');

  /** Show the projection in today's money rather than nominal pounds. */
  const [realTerms, setRealTerms] = useState(false);

  const result = useMemo(() => {
    const taxFreeCash: TaxFreeCashChoice =
      cashMode === 'none' ? { kind: 'none' }
      : cashMode === 'max' ? { kind: 'max' }
      : cashMode === 'percent' ? { kind: 'percent', pct: num(cashPct) }
      : { kind: 'amount', amount: num(cashAmount) };

    const withdrawal: WithdrawalStrategy =
      strategy === 'customPct' ? { kind: 'percent', annualPct: num(customPct) }
      : strategy === 'customAmount' ? { kind: 'amount', annualAmount: num(customAmount) }
      : { kind: 'preset', preset: strategy };

    const input: DrawdownInput = {
      currentAge: num(currentAge, 55),
      retirementAge: num(retirementAge, 65),
      potValue: num(potValue),
      taxFreeCash,
      growthPct: num(growthPct),
      feesPct: num(feesPct),
      inflationPct: num(inflationPct),
      endAge: num(endAge, 90),
      statePensionAnnual: num(statePension),
      statePensionAge: num(statePensionAge, STATE_PENSION_AGE),
      otherTaxableIncome: num(otherIncome),
      withdrawal,
      targetInheritance: targetInheritance.trim() === '' ? undefined : num(targetInheritance),
      lumpSumAllowanceUsed: num(allowanceUsed),
    };
    return projectDrawdown(input);
  }, [
    currentAge, retirementAge, potValue, cashMode, cashPct, cashAmount, allowanceUsed,
    growthPct, feesPct, inflationPct, endAge, statePension, statePensionAge, otherIncome,
    targetInheritance, strategy, customPct, customAmount,
  ]);

  const chartData = result.years.map((y) => ({
    age: y.age,
    fund: Math.round(realTerms ? y.closingFundReal : y.closingFund),
    net: Math.round(y.netIncome),
    tax: Math.round(y.tax),
  }));

  const assumptionLine =
    `${growthPct}% growth, ${feesPct}% fees, ${inflationPct}% inflation, to age ${endAge}. ` +
    `${realTerms ? "Today's money." : 'Nominal pounds.'} Tax year ${TAX_YEAR}.`;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link href="/app/portfolio-tools/personal-finance" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Personal Finance
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Pension Drawdown Calculator</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          What a pension pot turns into once you stop paying in: the tax-free cash, the income it supports, the tax on
          that income, and how long it lasts. Every assumption is yours to change and all of them are shown with the
          results.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        {/* Inputs */}
        <div className="space-y-4">
          <Card title="You">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Current age" value={currentAge} onChange={setCurrentAge} />
              <NumberField label="Retirement age" value={retirementAge} onChange={setRetirementAge} />
              <div className="sm:col-span-2">
                <NumberField label="Pension pot" value={potValue} onChange={setPotValue} step="1000" suffix="£" />
              </div>
              <NumberField label="End age to model" value={endAge} onChange={setEndAge} />
              <NumberField label="Other taxable income" value={otherIncome} onChange={setOtherIncome} step="500" suffix="£/yr" />
            </div>
          </Card>

          <Card title="Tax-free cash">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['max', 'Maximum 25%'], ['none', 'Take none'],
                  ['percent', 'Custom %'], ['amount', 'Custom £'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value} type="button" onClick={() => setCashMode(value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      cashMode === value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {cashMode === 'percent' && <NumberField label="Percentage" value={cashPct} onChange={setCashPct} step="0.5" suffix="%" />}
              {cashMode === 'amount' && <NumberField label="Amount" value={cashAmount} onChange={setCashAmount} step="1000" suffix="£" />}
              <NumberField
                label="Allowance already used"
                value={allowanceUsed} onChange={setAllowanceUsed} step="1000" suffix="£"
                hint={`Tax-free cash taken from other pensions. The Lump Sum Allowance is ${money(LUMP_SUM_ALLOWANCE)} across everything.`}
              />
            </div>
          </Card>

          <Card title="Withdrawal strategy">
            <div className="space-y-3">
              <div className="grid gap-2">
                {(Object.keys(WITHDRAWAL_STRATEGIES) as StrategyKey[]).map((key) => (
                  <button
                    key={key} type="button" onClick={() => setStrategy(key)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                      strategy === key
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {WITHDRAWAL_STRATEGIES[key].label}
                  </button>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button" onClick={() => setStrategy('customPct')}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      strategy === 'customPct' ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Custom %
                  </button>
                  <button
                    type="button" onClick={() => setStrategy('customAmount')}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      strategy === 'customAmount' ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Custom £
                  </button>
                </div>
              </div>
              {strategy === 'customPct' && <NumberField label="Annual withdrawal" value={customPct} onChange={setCustomPct} step="0.25" suffix="%" />}
              {strategy === 'customAmount' && <NumberField label="Annual withdrawal" value={customAmount} onChange={setCustomAmount} step="500" suffix="£" />}
            </div>
          </Card>

          <Card title="Assumptions">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Investment growth" value={growthPct} onChange={setGrowthPct} step="0.25" suffix="%" />
              <NumberField label="Annual fees" value={feesPct} onChange={setFeesPct} step="0.05" suffix="%" />
              <NumberField label="Inflation" value={inflationPct} onChange={setInflationPct} step="0.1" suffix="%" />
              <NumberField label="State Pension age" value={statePensionAge} onChange={setStatePensionAge} />
              <div className="sm:col-span-2">
                <NumberField label="State Pension" value={statePension} onChange={setStatePension} step="100" suffix="£/yr" />
              </div>
              <div className="sm:col-span-2">
                <NumberField
                  label="Target inheritance (optional)" value={targetInheritance} onChange={setTargetInheritance} step="1000" suffix="£"
                  hint="What you would like left at the end. Shown as a gap, never as a promise."
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <Card
            title="Results"
            right={
              <button
                type="button" onClick={() => setRealTerms((v) => !v)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                {realTerms ? "Today's money" : 'Nominal'}
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Tax-free lump sum" value={money(result.taxFreeCash)} />
              <Stat label="Drawdown fund" value={money(result.drawdownFund)} />
              <Stat label="Gross income, year 1" value={money(result.grossAnnualIncome)} />
              <Stat label="Net income, year 1" value={money(result.netAnnualIncome)} tone="emerald" />
              <Stat label="Net monthly" value={money2(result.netMonthlyIncome)} tone="emerald" />
              <Stat label="Tax, year 1" value={money(result.annualTax)} tone="rose" />
              <Stat
                label="Fund lasts to"
                value={result.fundExhaustedAtAge ? `age ${result.fundExhaustedAtAge}` : `past age ${result.projectedToAge}`}
                tone={result.fundExhaustedAtAge ? 'rose' : 'emerald'}
              />
              <Stat
                label={`Remaining at ${result.projectedToAge}`}
                value={money(realTerms ? result.remainingFundReal : result.remainingFund)}
              />
              {result.inheritanceTarget != null && (
                <Stat
                  label="Inheritance gap"
                  value={result.inheritanceShortfall === 0 ? 'Target met' : money(result.inheritanceShortfall ?? 0)}
                  tone={result.inheritanceShortfall === 0 ? 'emerald' : 'amber'}
                />
              )}
            </div>

            {result.taxFreeCashCappedBy !== 'none' && (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                {result.taxFreeCashCappedBy === 'lump-sum-allowance'
                  ? `Tax-free cash was capped by the Lump Sum Allowance of ${money(LUMP_SUM_ALLOWANCE)} across all your pensions.`
                  : 'Tax-free cash was capped at 25% of the pot.'}
              </p>
            )}

            <p className="mt-3 text-[11px] leading-4 text-muted-foreground">{assumptionLine}</p>
          </Card>

          <Card title="Fund value">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `£${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number | undefined) => money(v ?? 0)} labelFormatter={(l) => `Age ${l}`} />
                  <Area type="monotone" dataKey="fund" name={realTerms ? "Fund (today's money)" : 'Fund'} stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{assumptionLine}</p>
          </Card>

          <Card title="Income and tax">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `£${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number | undefined) => money(v ?? 0)} labelFormatter={(l) => `Age ${l}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="net" name="Net income" stroke="#10b981" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="tax" name="Tax" stroke="#f43f5e" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Income is nominal in both views; only the fund chart switches to today&rsquo;s money. {TAX_REGION_NOTE}
            </p>
          </Card>

          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-2 text-xs leading-5 text-muted-foreground">
                <p>{EDUCATIONAL_DISCLAIMER}</p>
                <p>{TAX_REGION_NOTE}</p>
                <p>
                  Each year the projection applies growth, then deducts fees, then takes the withdrawal. Withdrawals stop
                  when the fund runs out rather than going negative.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'rose' | 'amber' }) {
  const colour =
    tone === 'emerald' ? 'text-emerald-500' : tone === 'rose' ? 'text-rose-500' : tone === 'amber' ? 'text-amber-500' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold ${colour}`}>{value}</div>
    </div>
  );
}
