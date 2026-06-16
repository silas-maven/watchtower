// Spartan Strategy derivation. Kept separate from lib/signals/engine.ts: the
// signal engine is the academy-wide deterministic BUY/SELL state; this is the
// per-member next-buy / sell-target driven by a holding's averaging plan.
import { computeAveragingPlan, type FxRates } from '@/lib/portfolio';

export type TrancheLite = { orderIndex: number; price: number; executed: boolean; budgetGBP: number | null };

export type PlanLite = {
  currency: string;
  basePrice: number | null;
  targetSellPrice: number | null;
  tranches: TrancheLite[];
};

/** Next planned buy = lowest-orderIndex tranche not yet executed. Null if all executed / no plan. */
export function nextBuyPrice(plan: PlanLite | null): number | null {
  if (!plan) return null;
  const pending = plan.tranches.filter((t) => !t.executed).sort((a, b) => a.orderIndex - b.orderIndex);
  return pending.length > 0 ? pending[0].price : null;
}

/** Sell target is the plan's target sell price. */
export function sellTarget(plan: PlanLite | null): number | null {
  return plan?.targetSellPrice ?? null;
}

/** Implied drop % from Trade 1 (base) to a tranche price. 100->60 = 40, 100->40 = 60. */
export function impliedDropPct(basePrice: number | null, tranchePrice: number | null): number | null {
  if (basePrice == null || tranchePrice == null || !(basePrice > 0)) return null;
  return ((basePrice - tranchePrice) / basePrice) * 100;
}

/** Weight % = holdingValue / (holdingsValue + cash) * 100. Cash is its own slice. */
export function weightPct(holdingValueGBP: number | null, holdingsValuePlusCashGBP: number): number | null {
  if (holdingValueGBP == null || !(holdingsValuePlusCashGBP > 0)) return null;
  return (holdingValueGBP / holdingsValuePlusCashGBP) * 100;
}

/**
 * Sync executed tranches -> holding shares + average price (in the asset's quote
 * currency). Reuses computeAveragingPlan on executed tranches only, so the
 * round/GBX maths lives in one place. Only tranches with a budget contribute.
 */
export function syncHoldingFromExecutedTranches(
  plan: PlanLite,
  fx: FxRates,
): { shares: number; averagePrice: number | null; investedGBP: number } {
  const executed = plan.tranches.filter((t) => t.executed && t.budgetGBP != null && t.budgetGBP > 0);
  const result = computeAveragingPlan(
    executed.map((t) => ({ budgetGBP: t.budgetGBP as number, targetPrice: t.price })),
    plan.currency,
    fx,
  );
  return { shares: result.totalShares, averagePrice: result.averagePrice, investedGBP: result.totalCostGBP };
}

/** Effective next-buy: from the plan when Spartan is on, else the manual value. */
export function effectiveNextBuy(
  h: { spartanEnabled: boolean; manualNextBuyPrice: number | null },
  plan: PlanLite | null,
): number | null {
  return h.spartanEnabled ? nextBuyPrice(plan) : h.manualNextBuyPrice;
}

/** Effective sell target: from the plan when Spartan is on, else the manual value. */
export function effectiveSellTarget(
  h: { spartanEnabled: boolean; manualSellTarget: number | null },
  plan: PlanLite | null,
): number | null {
  return h.spartanEnabled ? sellTarget(plan) : h.manualSellTarget;
}

/** Map a Prisma plan (+tranches) to the lite shape used by the helpers above. */
export function toPlanLite(plan: {
  currency: string;
  basePrice: number | null;
  targetSellPrice: number | null;
  tranches: { orderIndex: number; price: number; executed: boolean; budgetGBP: number | null }[];
} | null | undefined): PlanLite | null {
  if (!plan) return null;
  return {
    currency: plan.currency,
    basePrice: plan.basePrice,
    targetSellPrice: plan.targetSellPrice,
    tranches: plan.tranches.map((t) => ({ orderIndex: t.orderIndex, price: t.price, executed: t.executed, budgetGBP: t.budgetGBP })),
  };
}
