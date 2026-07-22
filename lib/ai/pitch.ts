import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { callJsonModel, hasLlmProvider } from '@/lib/ai/llm';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';
import { getMacroTiles, weatherInputsFromTiles } from '@/lib/market/macro';
import { classifyWeather, type WeatherReading } from '@/lib/market/weather';
import { fetchYahooOhlc } from '@/lib/market/yahoo';
import { toQuoteSymbol } from '@/lib/market/symbols';
import { bollinger, latestStochasticK, sma } from '@/lib/indicators';
import { marketCapLabel } from '@/lib/marketCap';

// Trade pitch generator built on the academy's 10-section "Trade Idea
// Interview Checklist" (90-second pitch framework). Deterministic facts are
// computed here (signal state, direction, trade levels, indicators); the model
// only narrates them. Falls back to a plain template when no provider works.

export type PitchSection = { title: string; body: string };

export type Pitch = {
  symbol: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sections: PitchSection[];
  model: string;
};

const SECTION_TITLES = [
  'Story',
  'Weather Outside',
  'Direction',
  'Sector & Relative Value',
  'Technical Analysis',
  'Financial Health',
  'Strongest Reasons',
  'Key Risk / Threat',
  'Trade Plan (Execution)',
  'Time Horizon',
] as const;

type PitchInputs = {
  symbol: string;
  name: string;
  currency: string;
  assetType: string;
  reason: string | null;
  currentPrice: number | null;
  dailyChangePct: number | null;
  low52: number | null;
  high52: number | null;
  signalState: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  targetEntry: number | null;
  targetExit: number | null;
  planTranches: Array<{ price: number; executed: boolean }>;
  weather: WeatherReading;
  metrics: {
    marketCap: string;
    pe: number | null;
    sectorPE: number | null;
    beta: number | null;
    dividendYield: number | null;
    quickRatio: number | null;
    currentRatio: number | null;
    debtToEquity: number | null;
    nextEarningsDate: string | null;
  };
  technicals: {
    stochastic855: number | null;
    ma50: number | null;
    ma200: number | null;
    priceVsMa50: string | null;
    priceVsMa200: string | null;
    bollingerPosition: string | null;
  };
  held: boolean;
};

function vsLabel(price: number | null, level: number | null): string | null {
  if (price == null || level == null || level <= 0) return null;
  const pct = ((price - level) / level) * 100;
  return `${pct >= 0 ? 'above' : 'below'} by ${Math.abs(pct).toFixed(1)}%`;
}

export async function buildPitchInputs(assetId: string, profileId: string): Promise<PitchInputs | null> {
  const [asset, holdings, plan, tiles] = await Promise.all([
    prisma.asset.findUnique({
      where: { id: assetId },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    }),
    prisma.userHolding.findMany({ where: { profileId, assetId }, select: { shares: true } }),
    prisma.averagePlan.findFirst({
      where: { profileId, assetId },
      orderBy: { updatedAt: 'desc' },
      include: { tranches: { orderBy: { orderIndex: 'asc' } } },
    }),
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

  // Technicals from the same OHLC source the charts use.
  let stochastic855: number | null = null;
  let bollingerPosition: string | null = null;
  try {
    const points = await fetchYahooOhlc(toQuoteSymbol(asset), '6mo', '1d');
    if (points.length >= 20) {
      stochastic855 = latestStochasticK(points);
      const closes = points.map((p) => p.close);
      const band = bollinger(closes, 20, 2).at(-1);
      const last = closes.at(-1);
      if (band && last != null) {
        bollingerPosition =
          last >= band.upper ? 'at/above the upper band' : last <= band.lower ? 'at/below the lower band' : 'inside the bands';
      }
      if (asset.ma50 == null) asset.ma50 = sma(closes, 50).at(-1) ?? null;
    }
  } catch {
    /* technicals stay null */
  }

  return {
    symbol: asset.symbol,
    name: asset.name,
    currency: asset.currency,
    assetType: asset.assetType,
    reason: asset.reason,
    currentPrice: price,
    dailyChangePct: latest?.dailyChangePct ?? null,
    low52: asset.low52,
    high52: asset.high52,
    signalState,
    direction,
    targetEntry: asset.rule?.targetEntry ?? null,
    targetExit: asset.rule?.targetExit ?? null,
    planTranches: (plan?.tranches ?? []).map((t) => ({ price: t.price, executed: t.executed })),
    weather: classifyWeather(weatherInputsFromTiles(tiles)),
    metrics: {
      marketCap: marketCapLabel(asset.marketCap, asset.currency),
      pe: asset.pe,
      sectorPE: asset.sectorPE,
      beta: asset.beta,
      dividendYield: asset.dividendYield,
      quickRatio: asset.quickRatio,
      currentRatio: asset.currentRatio,
      debtToEquity: asset.debtToEquity,
      nextEarningsDate: asset.nextEarningsDate?.toISOString().slice(0, 10) ?? null,
    },
    technicals: {
      stochastic855,
      ma50: asset.ma50,
      ma200: asset.ma200,
      priceVsMa50: vsLabel(price, asset.ma50),
      priceVsMa200: vsLabel(price, asset.ma200),
      bollingerPosition,
    },
    held: holdings.some((h) => (h.shares ?? 0) > 0),
  };
}

const n = (v: number | null | undefined, dp = 2) => (v == null ? 'n/a' : v.toFixed(dp));

function fallbackPitch(inputs: PitchInputs): Pitch {
  const t = inputs.technicals;
  const m = inputs.metrics;
  const tranches = inputs.planTranches.length
    ? ` Averaging tranches at ${inputs.planTranches.map((x) => n(x.price)).join(', ')}.`
    : '';
  const bodies = [
    `${inputs.symbol} (${inputs.name}) trades at ${n(inputs.currentPrice)} ${inputs.currency}, ${n(inputs.dailyChangePct)}% on the day, within a 52-week range of ${n(inputs.low52)} to ${n(inputs.high52)}.${inputs.reason ? ` Academy note: ${inputs.reason}` : ''}`,
    `${inputs.weather.title}: ${inputs.weather.line1} Market Mood: ${inputs.weather.mood}.`,
    `${inputs.direction.charAt(0) + inputs.direction.slice(1).toLowerCase()} based on the current signal state (${inputs.signalState}).`,
    `P/E ${n(m.pe)} versus sector P/E ${n(m.sectorPE)}. Beta ${n(m.beta)}.`,
    `Stochastic (8,5,5) at ${n(t.stochastic855)}. Price ${t.priceVsMa50 ?? 'n/a'} vs the 50-day MA and ${t.priceVsMa200 ?? 'n/a'} vs the 200-day MA; ${t.bollingerPosition ?? 'Bollinger position unavailable'}.`,
    `Quick ratio ${n(m.quickRatio)}, current ratio ${n(m.currentRatio)}, D/E ${n(m.debtToEquity)}, dividend yield ${m.dividendYield == null ? 'n/a' : `${n(m.dividendYield)}%`}. Next earnings: ${m.nextEarningsDate ?? 'n/a'}.`,
    `Signal state ${inputs.signalState} with defined entry/exit levels; market cap ${m.marketCap}.`,
    `Momentum and macro conditions can change quickly; confirm levels and financial health before acting. Next earnings (${m.nextEarningsDate ?? 'n/a'}) is a known catalyst risk.`,
    `Entry alert ${n(inputs.targetEntry)}, exit target ${n(inputs.targetExit)} (${inputs.currency}).${tranches} Set your own stop and position size against portfolio limits.`,
    `Position trade (weeks to months), reviewed as signals update.`,
  ];
  return {
    symbol: inputs.symbol,
    direction: inputs.direction,
    sections: SECTION_TITLES.map((title, i) => ({ title, body: bodies[i] })),
    model: 'deterministic-fallback',
  };
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
  tradePlan: z.string().min(1),
  timeHorizon: z.string().min(1),
});

const SYSTEM_PROMPT = `You are writing a 90-second trade pitch for Stock Pickers Academy members, following their Trade Idea Interview Checklist. Return a strict JSON object with keys: story, weatherOutside, direction, sectorRelativeValue, technicalAnalysis, financialHealth, strongestReasons, keyRisk, tradePlan, timeHorizon. Each value is 1-3 punchy sentences (strongestReasons may name the top 1-2 conviction reasons).
Rules: use ONLY the numbers provided in the input; never invent prices, ratios or dates; if a number is null, say it is unavailable rather than guessing. The stance in "direction" MUST match the provided direction field. Never promise returns or predict prices; frame everything as analysis, not advice. Use UK English. Do not use em or en dashes.`;

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
      d.tradePlan,
      d.timeHorizon,
    ];
    return {
      symbol: inputs.symbol,
      direction: inputs.direction,
      sections: SECTION_TITLES.map((title, i) => ({ title, body: bodies[i] })),
      model,
    };
  } catch {
    return fallbackPitch(inputs);
  }
}
