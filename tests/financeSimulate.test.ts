import { describe, expect, it } from 'vitest';
import { runFinanceSimulation, type FinanceInputs } from '@/lib/finance/simulate';

const base: FinanceInputs = {
  age: 30,
  monthlyIncome: 4000,
  monthlyExpenses: 2500,
  savings: 10000,
  investments: 20000,
  pension: 15000,
  debts: [{ name: 'Loan', balance: 5000, aprPct: 6 }],
  homeValue: null,
  monthlyInvesting: 500,
  goalTargetAmount: 500000,
  goalTargetAge: 60,
};

describe('runFinanceSimulation', () => {
  it('is deterministic for identical inputs', () => {
    expect(runFinanceSimulation(base)).toEqual(runFinanceSimulation(base));
  });

  it('computes exact emergency months and saving rate', () => {
    const r = runFinanceSimulation(base);
    expect(r.emergencyMonths).toBe(4);
    expect(r.savingRatePct).toBe(37.5);
    expect(r.totalDebt).toBe(5000);
    expect(r.weightedDebtAprPct).toBe(6);
  });

  it('probabilities are in range and wealth percentiles ordered', () => {
    const r = runFinanceSimulation(base);
    for (const p of [r.probNeverRunOut, r.probRetireBy60, r.probGoal!]) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    const w = r.wealthAt60PercentilesGBP;
    expect(w.p10).toBeLessThanOrEqual(w.p50);
    expect(w.p50).toBeLessThanOrEqual(w.p90);
  });

  it('a healthy saver rarely runs out; overspending is punished', () => {
    const saver = runFinanceSimulation(base);
    expect(saver.probNeverRunOut).toBeGreaterThan(0.9);

    const overspender = runFinanceSimulation({ ...base, monthlyExpenses: 4500, savings: 2000, monthlyInvesting: 0 });
    expect(overspender.probNeverRunOut).toBeLessThan(saver.probNeverRunOut);
    expect(overspender.wealthAt60PercentilesGBP.p50).toBeLessThan(saver.wealthAt60PercentilesGBP.p50);
  });

  it('a more ambitious goal is less likely', () => {
    const modest = runFinanceSimulation({ ...base, goalTargetAmount: 200000 });
    const ambitious = runFinanceSimulation({ ...base, goalTargetAmount: 2000000 });
    expect(modest.probGoal!).toBeGreaterThan(ambitious.probGoal!);
  });

  it('no structured goal means no goal probability', () => {
    expect(runFinanceSimulation({ ...base, goalTargetAmount: null }).probGoal).toBeNull();
  });
});
