'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { useToast } from '@/components/ui/ToastProvider';

type Debt = { name: string; balance: string; aprPct: string };

type FinanceResult = {
  emergencyMonths: number;
  savingRatePct: number;
  probNeverRunOut: number;
  probRetireBy60: number;
  probGoal: number | null;
  medianFiAge: number | null;
  wealthAt60PercentilesGBP: { p10: number; p50: number; p90: number };
  paths: number;
  horizonYears: number;
  assumptions: { inflationPct: number; salaryGrowthPct: number; investmentReturnPct: number; investmentVolPct: number; shockChancePerMonthPct: number };
};

type Narrative = {
  headline: string;
  goals: string;
  emergencyFund: string;
  biggestRisks: string;
  savingEnough: string;
  financialIndependence: string;
  threeChanges: string[];
  model: string;
};

const gbp = (v: number) => `£${Math.round(v).toLocaleString()}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function PersonalFinancePage() {
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    age: '30',
    monthlyIncome: '',
    monthlyExpenses: '',
    savings: '',
    investments: '',
    pension: '',
    homeValue: '',
    monthlyInvesting: '',
    goal: '',
    goalTargetAmount: '',
    goalTargetAge: '',
  });
  const [debts, setDebts] = useState<Debt[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FinanceResult | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);

  // Prefill from the saved inputs.
  useEffect(() => {
    fetch('/api/me/personal-finance', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const s = j.ok ? j.data.inputs : null;
        if (!s) return;
        setForm({
          age: s.age != null ? String(s.age) : '30',
          monthlyIncome: s.monthlyIncome != null ? String(s.monthlyIncome) : '',
          monthlyExpenses: s.monthlyExpenses != null ? String(s.monthlyExpenses) : '',
          savings: s.savings != null ? String(s.savings) : '',
          investments: s.investments != null ? String(s.investments) : '',
          pension: s.pension != null ? String(s.pension) : '',
          homeValue: s.homeValue != null ? String(s.homeValue) : '',
          monthlyInvesting: s.monthlyInvesting != null ? String(s.monthlyInvesting) : '',
          goal: s.goal ?? '',
          goalTargetAmount: '',
          goalTargetAge: '',
        });
        if (Array.isArray(s.debts)) {
          setDebts(
            (s.debts as Array<{ name?: string; balance?: number; aprPct?: number }>).map((d) => ({
              name: d.name ?? '',
              balance: d.balance != null ? String(d.balance) : '',
              aprPct: d.aprPct != null ? String(d.aprPct) : '',
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function run() {
    if (running) return;
    const num = (v: string) => (v.trim() === '' ? 0 : Number(v) || 0);
    if (num(form.monthlyIncome) <= 0 || num(form.monthlyExpenses) <= 0) {
      pushToast('Enter at least your monthly income and expenses.', 'error');
      return;
    }
    setRunning(true);
    setResult(null);
    setNarrative(null);
    try {
      const res = await fetch('/api/ai/personal-finance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          age: Math.round(num(form.age)) || 30,
          monthlyIncome: num(form.monthlyIncome),
          monthlyExpenses: num(form.monthlyExpenses),
          savings: num(form.savings),
          investments: num(form.investments),
          pension: num(form.pension),
          debts: debts
            .filter((d) => Number(d.balance) > 0)
            .map((d) => ({ name: d.name || 'Debt', balance: Number(d.balance), aprPct: Number(d.aprPct) || 0 })),
          homeValue: form.homeValue.trim() === '' ? null : num(form.homeValue),
          monthlyInvesting: num(form.monthlyInvesting),
          goal: form.goal.trim() === '' ? null : form.goal.trim(),
          goalTargetAmount: form.goalTargetAmount.trim() === '' ? null : num(form.goalTargetAmount),
          goalTargetAge: form.goalTargetAge.trim() === '' ? null : Math.round(num(form.goalTargetAge)),
        }),
      });
      const j = await res.json();
      if (j.ok) {
        setResult(j.data.result);
        setNarrative(j.data.narrative);
      } else {
        pushToast(j.error?.message ?? 'Could not run the analysis', 'error');
      }
    } catch {
      pushToast('Could not run the analysis', 'error');
    } finally {
      setRunning(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';

  const fields: Array<{ key: keyof typeof form; label: string; placeholder?: string }> = [
    { key: 'age', label: 'Age' },
    { key: 'monthlyIncome', label: 'Monthly income (£)' },
    { key: 'monthlyExpenses', label: 'Monthly expenses (£)' },
    { key: 'savings', label: 'Cash savings (£)' },
    { key: 'investments', label: 'Investments (£)' },
    { key: 'pension', label: 'Pension (£)' },
    { key: 'homeValue', label: 'Home value (£, optional)' },
    { key: 'monthlyInvesting', label: 'Monthly investing (£)' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <Link href="/app/portfolio-tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Portfolio
        </Link>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <PiggyBank className="h-7 w-7 text-blue-500" /> Personal Finance
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your CFO-style check-up: simulate thousands of possible financial futures from your own numbers.
          Everything stays private to your account. Educational analysis, not regulated financial advice.
        </p>
      </div>

      <Card title="Your numbers">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input value={form[f.key]} onChange={set(f.key)} inputMode="decimal" placeholder={f.placeholder} className={inputClass} />
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Debts and interest rates</label>
            <button
              onClick={() => setDebts((d) => [...d, { name: '', balance: '', aprPct: '' }])}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add debt
            </button>
          </div>
          {debts.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No debts entered.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {debts.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input value={d.name} onChange={(e) => setDebts((p) => p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} placeholder="Name (e.g. credit card)" className="w-44 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                  <input value={d.balance} onChange={(e) => setDebts((p) => p.map((x, idx) => (idx === i ? { ...x, balance: e.target.value } : x)))} inputMode="decimal" placeholder="Balance £" className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                  <input value={d.aprPct} onChange={(e) => setDebts((p) => p.map((x, idx) => (idx === i ? { ...x, aprPct: e.target.value } : x)))} inputMode="decimal" placeholder="APR %" className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                  <button onClick={() => setDebts((p) => p.filter((_, idx) => idx !== i))} aria-label="Remove debt" className="text-rose-500 transition hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_180px_140px]">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financial goal</label>
            <input value={form.goal} onChange={set('goal')} placeholder="e.g. retire at 60, or buy a house in five years" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Goal amount (£, optional)</label>
            <input value={form.goalTargetAmount} onChange={set('goalTargetAmount')} inputMode="numeric" placeholder="e.g. 500000" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">By age (optional)</label>
            <input value={form.goalTargetAge} onChange={set('goalTargetAge')} inputMode="numeric" placeholder="e.g. 60" className={inputClass} />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={run}
            disabled={running}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {running ? 'Simulating…' : 'Run CFO analysis'}
          </button>
        </div>
      </Card>

      {running && (
        <Card title="Running">
          <div className="py-6 text-center text-sm text-muted-foreground">
            Simulating thousands of financial futures and preparing the plain-English read…
          </div>
        </Card>
      )}

      {result && narrative && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card title="Goal probability">
              <div className="text-2xl font-black text-foreground">{result.probGoal == null ? '—' : pct(result.probGoal)}</div>
              <div className="mt-1 text-xs text-muted-foreground">of {result.paths.toLocaleString()} futures</div>
            </Card>
            <Card title="Emergency fund">
              <div className="text-2xl font-black text-foreground">{result.emergencyMonths} months</div>
              <div className="mt-1 text-xs text-muted-foreground">of expenses in cash</div>
            </Card>
            <Card title="Never run out">
              <div className="text-2xl font-black text-emerald-500">{pct(result.probNeverRunOut)}</div>
              <div className="mt-1 text-xs text-muted-foreground">chance of never depleting funds</div>
            </Card>
            <Card title="FI by 60">
              <div className="text-2xl font-black text-foreground">{pct(result.probRetireBy60)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {result.medianFiAge != null ? `median FI age ~${Math.round(result.medianFiAge)}` : 'FI = 25x annual expenses'}
              </div>
            </Card>
          </div>

          <Card title="CFO read">
            <div className="space-y-4 text-sm leading-6 text-foreground">
              <p className="font-semibold">{narrative.headline}</p>
              <p><span className="font-bold text-primary">Goals:</span> {narrative.goals}</p>
              <p><span className="font-bold text-primary">Emergency fund:</span> {narrative.emergencyFund}</p>
              <p><span className="font-bold text-primary">Biggest risks:</span> {narrative.biggestRisks}</p>
              <p><span className="font-bold text-primary">Saving enough?</span> {narrative.savingEnough}</p>
              <p><span className="font-bold text-primary">Financial independence:</span> {narrative.financialIndependence}</p>
              <div>
                <div className="font-bold text-primary">Three changes with the biggest impact:</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {narrative.threeChanges.map((c) => <li key={c}>{c}</li>)}
                </ol>
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Wealth at 60 (10th / median / 90th percentile): {gbp(result.wealthAt60PercentilesGBP.p10)} / {gbp(result.wealthAt60PercentilesGBP.p50)} / {gbp(result.wealthAt60PercentilesGBP.p90)}.
              Assumptions: inflation {result.assumptions.inflationPct}%, salary growth {result.assumptions.salaryGrowthPct}%, investment return {result.assumptions.investmentReturnPct}%/yr with {result.assumptions.investmentVolPct}% volatility, random expense shocks.
              Simulated scenarios are illustrations under stated assumptions, not predictions or regulated advice. Model: {narrative.model}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
