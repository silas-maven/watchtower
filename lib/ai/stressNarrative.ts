import { z } from 'zod';
import { callJsonModel, hasLlmProvider } from '@/lib/ai/llm';
import type { StressResult } from '@/lib/stressTest';

// Plain-English narration of a deterministic stress-test result. The client's
// framing: act as an institutional Chief Risk Officer, prioritise portfolio
// management over stock selection. The model narrates OUR numbers only.

export type StressNarrative = {
  headline: string;
  probability: string;
  returnRange: string;
  drawdown: string;
  overexposure: string;
  threeChanges: string[];
  model: string;
};

const gbp = (v: number) => `£${Math.round(v).toLocaleString()}`;

export function fallbackStressNarrative(result: StressResult): StressNarrative {
  const p = result.finalValuePercentilesGBP;
  const c = result.concentration;
  const changes: string[] = [];
  if (c.topHolding && c.topHolding.weightPct > 30) {
    changes.push(`Trim ${c.topHolding.symbol} below 30% of the portfolio (currently ${c.topHolding.weightPct.toFixed(0)}%).`);
  }
  if (c.topCurrency && c.topCurrency.weightPct > 70) {
    changes.push(`Reduce ${c.topCurrency.currency} exposure (currently ${c.topCurrency.weightPct.toFixed(0)}% of the book).`);
  }
  if (c.holdingsCount > 0 && c.holdingsCount < 5) {
    changes.push(`Spread risk across more positions (currently ${c.holdingsCount}).`);
  }
  if (c.cashWeightPct < 5) changes.push('Rebuild a cash buffer of at least 5% to buy weakness.');
  if (c.portfolioBeta > 1.2) changes.push(`Lower portfolio beta (${c.portfolioBeta.toFixed(2)}) with steadier names.`);
  while (changes.length < 3) changes.push('Review position sizing against your averaging plans.');

  return {
    headline: `Starting from ${gbp(result.startValueGBP)}, the simulation ran ${result.paths.toLocaleString()} futures over ${result.horizonYears} years.`,
    probability:
      result.probMeetingGoal == null
        ? 'No goal was set, so no goal probability was computed.'
        : `${Math.round(result.probMeetingGoal * 100)}% of simulated futures met your goal.`,
    returnRange: `The middle half of outcomes lands between ${gbp(p.p25)} and ${gbp(p.p75)}; the median is ${gbp(p.p50)}. A bad run (5th percentile) ends near ${gbp(p.p5)}.`,
    drawdown: `Expect a typical worst peak-to-trough fall of about ${result.maxDrawdownPct.median.toFixed(0)}%, and around ${result.maxDrawdownPct.p90.toFixed(0)}% in rough scenarios.`,
    overexposure: [
      c.topHolding ? `Largest position: ${c.topHolding.symbol} at ${c.topHolding.weightPct.toFixed(0)}%.` : 'No holdings.',
      c.topCurrency ? `Largest currency: ${c.topCurrency.currency} at ${c.topCurrency.weightPct.toFixed(0)}%.` : '',
      `Cash: ${c.cashWeightPct.toFixed(0)}%. Portfolio beta: ${c.portfolioBeta.toFixed(2)}.`,
    ]
      .filter(Boolean)
      .join(' '),
    threeChanges: changes.slice(0, 3),
    model: 'deterministic-fallback',
  };
}

const ModelOutput = z.object({
  headline: z.string().min(1),
  probability: z.string().min(1),
  returnRange: z.string().min(1),
  drawdown: z.string().min(1),
  overexposure: z.string().min(1),
  threeChanges: z.array(z.string().min(1)).min(3).max(3),
});

const SYSTEM_PROMPT = `You are an institutional Chief Risk Officer explaining a Monte Carlo stress test of a member's portfolio in simple English. Prioritise portfolio management over stock selection. Return a strict JSON object with keys: headline (1 sentence), probability (1-2 sentences on the chance of meeting the goal), returnRange (1-2 sentences on the expected range of outcomes), drawdown (1-2 sentences on likely maximum drawdown), overexposure (2-3 sentences covering stock, currency, cash and beta concentration), threeChanges (exactly 3 short imperative strings that would improve risk-adjusted returns).
Rules: use ONLY the numbers provided; round sensibly; amounts are GBP. Never promise returns; these are simulated scenarios under stated assumptions, not predictions. Use UK English. Do not use em or en dashes.`;

export async function narrateStressTest(result: StressResult): Promise<StressNarrative> {
  if (!hasLlmProvider()) return fallbackStressNarrative(result);
  try {
    const { text, model } = await callJsonModel(SYSTEM_PROMPT, JSON.stringify(result));
    const parsed = ModelOutput.safeParse(JSON.parse(text));
    if (!parsed.success) return fallbackStressNarrative(result);
    return { ...parsed.data, model };
  } catch {
    return fallbackStressNarrative(result);
  }
}
