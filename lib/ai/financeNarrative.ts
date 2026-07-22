import { z } from 'zod';
import { callJsonModel, hasLlmProvider } from '@/lib/ai/llm';
import type { FinanceResult } from '@/lib/finance/simulate';

// CFO-style narration of the deterministic personal-finance simulation
// (client prompt: "Act as my personal Chief Financial Officer... explain
// everything in simple English"). The model narrates OUR numbers only.

export type FinanceNarrative = {
  headline: string;
  goals: string;
  emergencyFund: string;
  biggestRisks: string;
  savingEnough: string;
  financialIndependence: string;
  threeChanges: string[];
  model: string;
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const gbp = (v: number) => `£${Math.round(v).toLocaleString()}`;

export function fallbackFinanceNarrative(result: FinanceResult, goalText: string | null): FinanceNarrative {
  const changes: string[] = [];
  if (result.emergencyMonths < 6) changes.push(`Grow your emergency fund towards 6 months of expenses (currently ${result.emergencyMonths} months).`);
  if (result.weightedDebtAprPct != null && result.weightedDebtAprPct > 7) changes.push(`Clear the ${result.weightedDebtAprPct}% APR debt first; it outpaces expected investment returns.`);
  if (result.savingRatePct < 20) changes.push(`Lift your saving rate above 20% (currently ${result.savingRatePct}%).`);
  changes.push('Automate monthly investing so contributions never depend on willpower.');
  changes.push('Review expenses annually; inflation quietly compounds against you.');

  return {
    headline: `Simulated ${result.paths.toLocaleString()} financial futures over ${result.horizonYears} years.`,
    goals:
      result.probGoal != null
        ? `${pct(result.probGoal)} of simulated futures reached your goal${goalText ? ` (${goalText})` : ''}.`
        : `No structured goal was set${goalText ? `; your stated goal: ${goalText}` : ''}.`,
    emergencyFund: `You hold about ${result.emergencyMonths} months of expenses in cash. ${result.emergencyMonths >= 6 ? 'That is a solid buffer.' : 'Under 6 months leaves you exposed to shocks.'}`,
    biggestRisks: [
      result.probNeverRunOut < 0.95 ? `In ${pct(1 - result.probNeverRunOut)} of futures you run out of accessible money at some point.` : 'Running out of money is rare in the simulations.',
      result.totalDebt > 0 ? `Debt of ${gbp(result.totalDebt)}${result.weightedDebtAprPct != null ? ` at ~${result.weightedDebtAprPct}% APR` : ''} drags on wealth building.` : '',
      'Unexpected expenses are modelled as random shocks; a thin cash buffer makes them dangerous.',
    ]
      .filter(Boolean)
      .join(' '),
    savingEnough: `Your saving rate is about ${result.savingRatePct}% of income. Median wealth at 60 lands near ${gbp(result.wealthAt60PercentilesGBP.p50)} (10th to 90th percentile: ${gbp(result.wealthAt60PercentilesGBP.p10)} to ${gbp(result.wealthAt60PercentilesGBP.p90)}).`,
    financialIndependence:
      result.medianFiAge != null
        ? `The median simulated future reaches financial independence (25x annual expenses) around age ${Math.round(result.medianFiAge)}. Chance of being there by 60: ${pct(result.probRetireBy60)}.`
        : `Most simulated futures do not reach financial independence (25x annual expenses) within the horizon. Chance by 60: ${pct(result.probRetireBy60)}.`,
    threeChanges: changes.slice(0, 3),
    model: 'deterministic-fallback',
  };
}

const ModelOutput = z.object({
  headline: z.string().min(1),
  goals: z.string().min(1),
  emergencyFund: z.string().min(1),
  biggestRisks: z.string().min(1),
  savingEnough: z.string().min(1),
  financialIndependence: z.string().min(1),
  threeChanges: z.array(z.string().min(1)).min(3).max(3),
});

const SYSTEM_PROMPT = `You are acting as a member's personal Chief Financial Officer, explaining a Monte Carlo scenario analysis of their finances in simple English with practical recommendations rather than technical jargon. Return a strict JSON object with keys: headline (1 sentence), goals (probability of reaching their goals), emergencyFund (months of emergency savings and what that means), biggestRisks (2-3 sentences), savingEnough (whether they are saving enough, referencing the saving rate and wealth-at-60 range), financialIndependence (how quickly they could become financially independent), threeChanges (exactly 3 short imperative strings for the biggest improvements to their long-term outlook).
Rules: use ONLY the numbers provided; amounts are GBP; round sensibly. These are simulated scenarios under stated assumptions, never promises. This is educational analysis, not regulated financial advice. Use UK English. Do not use em or en dashes.`;

export async function narrateFinance(result: FinanceResult, goalText: string | null): Promise<FinanceNarrative> {
  if (!hasLlmProvider()) return fallbackFinanceNarrative(result, goalText);
  try {
    const { text, model } = await callJsonModel(SYSTEM_PROMPT, JSON.stringify({ ...result, statedGoal: goalText }));
    const parsed = ModelOutput.safeParse(JSON.parse(text));
    if (!parsed.success) return fallbackFinanceNarrative(result, goalText);
    return { ...parsed.data, model };
  } catch {
    return fallbackFinanceNarrative(result, goalText);
  }
}
