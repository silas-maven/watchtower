import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { callJsonModel, hasLlmProvider } from '@/lib/ai/llm';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';
import { getMacroTiles, weatherInputsFromTiles } from '@/lib/market/macro';
import { classifyWeather, type WeatherReading } from '@/lib/market/weather';
import { fetchYahooCompanyData, fetchYahooOhlc } from '@/lib/market/yahoo';
import { toQuoteSymbol } from '@/lib/market/symbols';
import { bollinger, latestStochasticK, sma } from '@/lib/indicators';
import { marketCapLabel } from '@/lib/marketCap';
import { scoreFinancialHealth, type HealthScore } from '@/lib/finance/health';

// Trade pitch generator built on the academy's "Trade Idea Interview Checklist".
// Deterministic facts are computed here (signal state, direction, indicators,
// financial-health score, analyst targets); the model only narrates them, one
// section at a time, with strict separation so "weather" never bleeds into other
// sections. Falls back to a plain template when no provider works.

export type PitchSection = { title: string; body: string };

export type AnalystTargets = {
  covered: boolean;
  mean: number | null;
  high: number | null;
  low: number | null;
  count: number | null;
  recommendation: string | null;
  upsidePct: number | null;
};

export type Pitch = {
  symbol: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sections: PitchSection[];
  financialHealth: HealthScore | null;
  analystTargets: AnalystTargets | null;
  model: string;
};

// Section 9 is now "Analyst Price Targets" (was "Trade Plan (Execution)").
const SECTION_TITLES = [
  'Story',
  'Weather Outside',
  'Direction',
  'Sector & Relative Value',
  'Technical Analysis',
  'Financial Health',
  'Strongest Reasons',
  'Key Risk / Threat',
  'Analyst Price Targets',
  'Time Horizon',
] as const;

// The academy's stance: this is a multi-year investing framework, not a trade.
const TIME_HORIZON = '3 to 5 years';

type PitchInputs = {
  symbol: string;
  name: string;
  currency: string;
  assetType: string;
  reason: string | null;
  businessSummary: string | null;
  industry: string | null;
  currentPrice: number | null;
  dailyChangePct: number | null;
  priceChange12moPct: number | null;
  low52: number | null;
  high52: number | null;
  signalState: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  weather: WeatherReading;
  timeHorizon: string;
  metrics: {
    marketCap: string;
    pe: number | null;
    sectorPE: number | null;
    beta: number | null;
    dividendYield: number | null;
    nextEarningsDate: string | null;
    revenueGrowth: number | null;
    earningsGrowth: number | null;
  };
  technicals: {
    stochastic855: number | null;
    priceVsMa50: string | null;
    priceVsMa200: string | null;
    bollingerPosition: string | null;
  };
  financialHealth: HealthScore | null;
  analystTargets: AnalystTargets;
  held: boolean;
};

function vsLabel(price: number | null, level: number | null): string | null {
  if (price == null || level == null || level <= 0) return null;
  const pct = ((price - level) / level) * 100;
  return `${pct >= 0 ? 'above' : 'below'} by ${Math.abs(pct).toFixed(1)}%`;
}

export async function buildPitchInputs(assetId: string, profileId: string): Promise<PitchInputs | null> {
  const [asset, holdings, tiles] = await Promise.all([
    prisma.asset.findUnique({
      where: { id: assetId },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    }),
    prisma.userHolding.findMany({ where: { profileId, assetId }, select: { shares: true } }),
    getMacroTiles().catch(() => new Map()),
  ]);
  if (!asset) return null;

  const latest = asset.snapshots[0] ?? null;
  const computed = computeSignalState({
    dailyLow: latest?.dailyLow ?? null,
    dailyHigh: latest?.dailyHigh ?? null,
    targetEntry: asset.rule?.targetEntry ?? null,
    targetExit: asset.rule?.targetExit ?? null,
  });
  const signalState = effectiveSignalState(computed, asset.rule?.signalOverride);
  // Direction is derived from the deterministic signal engine, never the model.
  const direction = signalState === 'BUY' ? 'BULLISH' : signalState === 'SELL' ? 'BEARISH' : 'NEUTRAL';

  const price = latest?.currentPrice ?? null;
  const quoteSymbol = toQuoteSymbol(asset);

  // Technicals + a 12-month price change for the Story, from the OHLC source the
  // charts use; company data + fundamentals from quoteSummary. Run in parallel.
  const [ohlc, company] = await Promise.all([
    fetchYahooOhlc(quoteSymbol, '1y', '1d').catch(() => []),
    fetchYahooCompanyData(quoteSymbol).catch(() => null),
  ]);

  let stochastic855: number | null = null;
  let bollingerPosition: string | null = null;
  let priceChange12moPct: number | null = null;
  let ma50 = asset.ma50;
  if (ohlc.length >= 20) {
    stochastic855 = latestStochasticK(ohlc);
    const closes = ohlc.map((p) => p.close);
    const band = bollinger(closes, 20, 2).at(-1);
    const last = closes.at(-1);
    if (band && last != null) {
      bollingerPosition =
        last >= band.upper ? 'at or above the upper band' : last <= band.lower ? 'at or below the lower band' : 'inside the bands';
    }
    if (ma50 == null) ma50 = sma(closes, 50).at(-1) ?? null;
    const first = closes[0];
    if (first != null && first > 0 && last != null) priceChange12moPct = ((last - first) / first) * 100;
  }

  const analyst = company?.analyst ?? { targetMean: null, targetHigh: null, targetLow: null, numberOfAnalysts: null, recommendationKey: null };
  const covered = (analyst.numberOfAnalysts ?? 0) > 0 && analyst.targetMean != null;
  const analystTargets: AnalystTargets = {
    covered,
    mean: analyst.targetMean,
    high: analyst.targetHigh,
    low: analyst.targetLow,
    count: analyst.numberOfAnalysts,
    recommendation: analyst.recommendationKey,
    upsidePct: covered && price != null && price > 0 && analyst.targetMean != null ? ((analyst.targetMean - price) / price) * 100 : null,
  };

  // Financial-health score merges the Asset's stored ratios with the live pull.
  const h = company?.health;
  const financialHealth = h
    ? scoreFinancialHealth({
        profitMargin: h.profitMargin,
        returnOnEquity: h.returnOnEquity,
        operatingMargin: h.operatingMargin,
        revenueGrowth: h.revenueGrowth,
        earningsGrowth: h.earningsGrowth,
        freeCashflow: h.freeCashflow,
        operatingCashflow: h.operatingCashflow,
        totalCash: h.totalCash,
        totalDebt: h.totalDebt,
        ebitda: h.ebitda,
        debtToEquity: h.debtToEquity ?? asset.debtToEquity,
        quickRatio: h.quickRatio ?? asset.quickRatio,
        currentRatio: h.currentRatio ?? asset.currentRatio,
      })
    : null;

  return {
    symbol: asset.symbol,
    name: asset.name,
    currency: asset.currency,
    assetType: asset.assetType,
    reason: asset.reason,
    businessSummary: company?.businessSummary ?? null,
    industry: company?.industry ?? null,
    currentPrice: price,
    dailyChangePct: latest?.dailyChangePct ?? null,
    priceChange12moPct,
    low52: asset.low52,
    high52: asset.high52,
    signalState,
    direction,
    weather: classifyWeather(weatherInputsFromTiles(tiles)),
    timeHorizon: TIME_HORIZON,
    metrics: {
      marketCap: marketCapLabel(asset.marketCap, asset.currency),
      pe: asset.pe,
      sectorPE: asset.sectorPE,
      beta: asset.beta,
      dividendYield: asset.dividendYield,
      nextEarningsDate: asset.nextEarningsDate?.toISOString().slice(0, 10) ?? null,
      revenueGrowth: h?.revenueGrowth ?? null,
      earningsGrowth: h?.earningsGrowth ?? null,
    },
    technicals: {
      stochastic855,
      priceVsMa50: vsLabel(price, ma50),
      priceVsMa200: vsLabel(price, asset.ma200),
      bollingerPosition,
    },
    financialHealth,
    analystTargets,
    held: holdings.some((h) => (h.shares ?? 0) > 0),
  };
}

const n = (v: number | null | undefined, dp = 2) => (v == null ? 'n/a' : v.toFixed(dp));
const growth = (v: number | null | undefined) => (v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`);

function analystSentence(a: AnalystTargets, currency: string): string {
  if (!a.covered) return 'No analyst coverage is available for this stock.';
  const parts = [`Blended analyst target ${n(a.mean)} ${currency} across ${a.count} analysts (range ${n(a.low)} to ${n(a.high)}).`];
  if (a.upsidePct != null) parts.push(`That implies ${a.upsidePct >= 0 ? 'upside' : 'downside'} of ${Math.abs(a.upsidePct).toFixed(1)}% versus the current price.`);
  if (a.recommendation) parts.push(`Consensus rating: ${a.recommendation.replace(/_/g, ' ')}.`);
  return parts.join(' ');
}

function healthSentence(h: HealthScore | null): string {
  if (!h) return 'Financial health data is unavailable for this stock.';
  const worst = h.dimensions.filter((d) => d.rating === 'red').map((d) => d.label);
  const strong = h.dimensions.filter((d) => d.rating === 'green').map((d) => d.label);
  const parts = [`Overall financial health scores ${h.score} out of 100 (${h.overall === 'green' ? 'strong' : h.overall === 'amber' ? 'mixed' : 'weak'}).`];
  if (strong.length) parts.push(`Strengths: ${strong.join(', ')}.`);
  if (worst.length) parts.push(`Concerns: ${worst.join(', ')}.`);
  parts.push(h.dimensions.map((d) => d.detail).join(' '));
  return parts.join(' ');
}

function fallbackPitch(inputs: PitchInputs): Pitch {
  const t = inputs.technicals;
  const m = inputs.metrics;
  const story = inputs.businessSummary
    ? `${inputs.name} (${inputs.symbol})${inputs.industry ? `, in ${inputs.industry},` : ''} ${firstSentences(inputs.businessSummary, 2)} Over the last 12 months the shares are ${inputs.priceChange12moPct == null ? 'broadly flat' : `${inputs.priceChange12moPct >= 0 ? 'up' : 'down'} ${Math.abs(inputs.priceChange12moPct).toFixed(0)}%`}, with revenue growth ${growth(m.revenueGrowth)} and earnings growth ${growth(m.earningsGrowth)}.`
    : `${inputs.name} (${inputs.symbol}) is ${inputs.priceChange12moPct == null ? 'broadly flat' : `${inputs.priceChange12moPct >= 0 ? 'up' : 'down'} ${Math.abs(inputs.priceChange12moPct).toFixed(0)}%`} over the last 12 months. Revenue growth ${growth(m.revenueGrowth)}, earnings growth ${growth(m.earningsGrowth)}.`;
  const bodies = [
    story,
    `${inputs.weather.title}: ${inputs.weather.line1} Market Mood: ${inputs.weather.mood}.`,
    `${inputs.direction.charAt(0) + inputs.direction.slice(1).toLowerCase()} based on the current academy signal state (${inputs.signalState}).`,
    `Trades on a P/E of ${n(m.pe)} versus a sector P/E of ${n(m.sectorPE)}. Beta ${n(m.beta)}, dividend yield ${m.dividendYield == null ? 'n/a' : `${n(m.dividendYield)}%`}, market cap ${m.marketCap}.`,
    `Stochastic (8,5,5) at ${n(t.stochastic855)}. Price ${t.priceVsMa50 ?? 'n/a'} vs the 50-day MA and ${t.priceVsMa200 ?? 'n/a'} vs the 200-day MA; ${t.bollingerPosition ?? 'Bollinger position unavailable'}.`,
    healthSentence(inputs.financialHealth),
    `Signal state ${inputs.signalState}; ${inputs.direction.toLowerCase()} stance. ${inputs.financialHealth && inputs.financialHealth.overall !== 'red' ? 'Financial health is not a blocker.' : 'Weigh the financial-health concerns above.'}`,
    `Company-specific risk: ${inputs.financialHealth?.dimensions.find((d) => d.rating === 'red')?.detail ?? `watch the next earnings date (${m.nextEarningsDate ?? 'n/a'})`}. Beta ${n(m.beta)} sets how much it moves with the market.`,
    analystSentence(inputs.analystTargets, inputs.currency),
    `Investment horizon: ${inputs.timeHorizon}. This is a multi-year thesis, reviewed as fundamentals and signals update.`,
  ];
  return {
    symbol: inputs.symbol,
    direction: inputs.direction,
    sections: SECTION_TITLES.map((title, i) => ({ title, body: bodies[i] })),
    financialHealth: inputs.financialHealth,
    analystTargets: inputs.analystTargets,
    model: 'deterministic-fallback',
  };
}

function firstSentences(text: string, count: number): string {
  const parts = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s/).slice(0, count);
  return parts.join(' ').trim();
}

const ModelOutput = z.object({
  story: z.string().min(1),
  weatherOutside: z.string().min(1),
  direction: z.string().min(1),
  sectorRelativeValue: z.string().min(1),
  technicalAnalysis: z.string().min(1),
  financialHealth: z.string().min(1),
  strongestReasons: z.string().min(1),
  keyRisk: z.string().min(1),
  analystTargets: z.string().min(1),
  timeHorizon: z.string().min(1),
});

const SYSTEM_PROMPT = `You are writing a trade pitch for Stock Pickers Academy members, following their Trade Idea Interview Checklist. Return a strict JSON object with keys: story, weatherOutside, direction, sectorRelativeValue, technicalAnalysis, financialHealth, strongestReasons, keyRisk, analystTargets, timeHorizon. Each value is 1 to 4 sentences.

Each section has a STRICT, separate responsibility. Do not repeat content across sections:
- story: Explain what the company actually does (from businessSummary) and summarise what has happened to the business and the share price over the last 12 months (use priceChange12moPct, revenueGrowth, earningsGrowth). Do NOT mention the macro weather here.
- weatherOutside: The macro backdrop ONLY, from the weather field. This is the ONLY section allowed to discuss the market weather/macro mood.
- direction: State the stance. It MUST match the provided direction field exactly.
- sectorRelativeValue: Valuation versus the sector, using pe vs sectorPE, plus beta and dividend yield.
- technicalAnalysis: The chart read from the technicals field only.
- financialHealth: Interpret the financialHealth score and its dimensions. Say whether the balance sheet, profitability, cash flow, leverage and bankruptcy risk are good, weak, improving or concerning. Do NOT just list numbers; explain what they mean. Do NOT mention the macro weather.
- strongestReasons: The top 1 to 2 conviction reasons, company-specific.
- keyRisk: The single biggest COMPANY-SPECIFIC risk. Do NOT default to the macro weather.
- analystTargets: Summarise the analystTargets field. If covered is false, state plainly that there is no analyst coverage.
- timeHorizon: State the investment horizon exactly as given in the timeHorizon field (a multi-year thesis).

Rules: use ONLY the numbers and facts provided in the input; never invent prices, ratios, dates or analyst figures; if a value is null, say it is unavailable rather than guessing. Never promise returns or predict prices; frame everything as analysis, not advice. Use UK English. Do not use em or en dashes.`;

export async function generatePitch(inputs: PitchInputs): Promise<Pitch> {
  if (!hasLlmProvider()) return fallbackPitch(inputs);
  try {
    const { text, model } = await callJsonModel(SYSTEM_PROMPT, JSON.stringify(inputs));
    const parsed = ModelOutput.safeParse(JSON.parse(text));
    if (!parsed.success) return fallbackPitch(inputs);
    const d = parsed.data;
    const bodies = [
      d.story,
      d.weatherOutside,
      d.direction,
      d.sectorRelativeValue,
      d.technicalAnalysis,
      d.financialHealth,
      d.strongestReasons,
      d.keyRisk,
      d.analystTargets,
      d.timeHorizon,
    ];
    return {
      symbol: inputs.symbol,
      direction: inputs.direction,
      sections: SECTION_TITLES.map((title, i) => ({ title, body: bodies[i] })),
      financialHealth: inputs.financialHealth,
      analystTargets: inputs.analystTargets,
      model,
    };
  } catch {
    return fallbackPitch(inputs);
  }
}
