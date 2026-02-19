import { computeSignalState } from '@/lib/signals/engine';

type FxRates = {
  USD: number;
  EUR: number;
};

export type SpreadsheetInputs = {
  symbol: string;
  name: string;
  currency: string;
  portfolioSize: number;
  shares: number | null;
  entryPrice: number | null;
  currentPrice: number | null;
  closeYest: number | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  low52: number | null;
  targetEntry: number | null;
  targetExit: number | null;
  fx: FxRates;
};

export type SpreadsheetDerived = {
  currentCostGBP: number | null;
  currentValueGBP: number | null;
  weightPct: number | null;
  returnPct: number | null;
  dailyChange: number | null;
  dailyChangePct: number | null;
  rangeVsYClosePct: number | null;
  priceVsYearLowPct: number | null;
  signalState: 'NONE' | 'BUY' | 'SELL' | 'BOTH';
  tradeAlertText: string;
};

export const FORMULA_COVERAGE = [
  {
    id: 'current_cost_gbp',
    label: 'Current Cost (GBP)',
    excelPattern: 'if(CCY=GBX,F*G/100,if(EUR,F*G/GBPEUR,F*G/GBPUSD))',
    output: 'currentCostGBP',
  },
  {
    id: 'current_value_gbp',
    label: 'Current Value (GBP)',
    excelPattern: 'if(CCY=GBX,D*G/100,if(EUR,D*G/GBPEUR,D*G/GBPUSD))',
    output: 'currentValueGBP',
  },
  {
    id: 'weight_pct',
    label: 'Weight %',
    excelPattern: 'H / PortfolioSize',
    output: 'weightPct',
  },
  {
    id: 'return_pct',
    label: 'Return %',
    excelPattern: 'I / H - 1',
    output: 'returnPct',
  },
  {
    id: 'daily_change_pct',
    label: 'Daily Change %',
    excelPattern: 'round(CurrentPrice / CloseYest - 1,4)',
    output: 'dailyChangePct',
  },
  {
    id: 'range_vs_close_pct',
    label: 'Range vs Yesterday Close %',
    excelPattern: 'abs(DailyHigh-DailyLow)/CloseYest',
    output: 'rangeVsYClosePct',
  },
  {
    id: 'price_vs_year_low_pct',
    label: 'Price vs Year Low %',
    excelPattern: 'CurrentPrice / low52 - 1',
    output: 'priceVsYearLowPct',
  },
  {
    id: 'trade_alert_logic',
    label: 'Trade Alert Logic',
    excelPattern: 'AND(low<=target<=high) / targetEntry>high => TRADE ALERT',
    output: 'tradeAlertText',
  },
] as const;

function toGbp(value: number | null, currency: string, fx: FxRates): number | null {
  if (value == null) return null;
  const ccy = currency.toUpperCase();
  if (ccy === 'GBP') return value;
  if (ccy === 'GBX') return value / 100;
  if (ccy === 'USD') return value / fx.USD;
  if (ccy === 'EUR') return value / fx.EUR;
  return value;
}

function pct(n: number): number {
  return n * 100;
}

function asNumber(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(6));
}

export function computeSpreadsheetDerived(input: SpreadsheetInputs): SpreadsheetDerived {
  const currentCostGBP =
    input.entryPrice != null && input.shares != null
      ? toGbp(input.entryPrice * input.shares, input.currency, input.fx)
      : null;

  const currentValueGBP =
    input.currentPrice != null && input.shares != null
      ? toGbp(input.currentPrice * input.shares, input.currency, input.fx)
      : null;

  const weightPct = currentCostGBP != null && input.portfolioSize > 0 ? pct(currentCostGBP / input.portfolioSize) : null;
  const returnPct = currentValueGBP != null && currentCostGBP ? pct(currentValueGBP / currentCostGBP - 1) : null;

  const dailyChange =
    input.currentPrice != null && input.closeYest != null ? input.currentPrice - input.closeYest : null;
  const dailyChangePct =
    input.currentPrice != null && input.closeYest ? pct(input.currentPrice / input.closeYest - 1) : null;

  const rangeVsYClosePct =
    input.dailyHigh != null && input.dailyLow != null && input.closeYest
      ? pct(Math.abs(input.dailyHigh - input.dailyLow) / input.closeYest)
      : null;

  const priceVsYearLowPct =
    input.currentPrice != null && input.low52 ? pct(input.currentPrice / input.low52 - 1) : null;

  const signalState = computeSignalState({
    dailyLow: input.dailyLow,
    dailyHigh: input.dailyHigh,
    targetEntry: input.targetEntry,
    targetExit: input.targetExit,
  });

  const alertActive = signalState !== 'NONE';
  const tradeAlertText = alertActive
    ? `TRADE ALERT - Price level hit for ${input.symbol} currently at ${input.currentPrice ?? 'N/A'} ${input.name}`
    : '';

  return {
    currentCostGBP: asNumber(currentCostGBP),
    currentValueGBP: asNumber(currentValueGBP),
    weightPct: asNumber(weightPct),
    returnPct: asNumber(returnPct),
    dailyChange: asNumber(dailyChange),
    dailyChangePct: asNumber(dailyChangePct),
    rangeVsYClosePct: asNumber(rangeVsYClosePct),
    priceVsYearLowPct: asNumber(priceVsYearLowPct),
    signalState,
    tradeAlertText,
  };
}
