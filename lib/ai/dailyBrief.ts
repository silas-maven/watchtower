import OpenAI from 'openai';
import { APP_TIMEZONE, OPENAI_MODEL, optionalEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { getDailySignalSummary } from '@/lib/server/signals';
import { startOfDayInTimeZone } from '@/lib/time';

export type DailyBriefPayload = {
  summary: string;
  buy: string[];
  sell: string[];
  newToday: string[];
  droppedOff: string[];
  insights: string[];
  model: string;
  isFallback: boolean;
};

export function buildFallbackBrief(input: {
  buy: string[];
  sell: string[];
  newToday: string[];
  droppedOff: string[];
  market?: {
    totalAssets: number;
    activeSignals: number;
    advancers: number;
    decliners: number;
    flat: number;
    avgChangePct: number;
    topGainers: Array<{ symbol: string; assetType: string; changePct: number }>;
    topLosers: Array<{ symbol: string; assetType: string; changePct: number }>;
    byAssetType: Array<{ assetType: string; total: number; activeSignals: number; buySignals: number; sellSignals: number }>;
  };
}): DailyBriefPayload {
  const insights: string[] = [];
  insights.push(`Active BUY signals: ${input.buy.length}. Active SELL signals: ${input.sell.length}.`);
  if (input.newToday.length > 0) insights.push(`New signal entries today: ${input.newToday.join(', ')}.`);
  if (input.droppedOff.length > 0) insights.push(`Dropped from signal zones today: ${input.droppedOff.join(', ')}.`);
  if (input.market) {
    insights.push(
      `Market breadth: ${input.market.advancers} advancing, ${input.market.decliners} declining, ${input.market.flat} flat. Avg change ${input.market.avgChangePct.toFixed(2)}%.`,
    );
    if (input.market.topGainers.length > 0) {
      insights.push(
        `Top gainers: ${input.market.topGainers.map((r) => `${r.symbol} (${r.changePct.toFixed(2)}%)`).join(', ')}.`,
      );
    }
    if (input.market.topLosers.length > 0) {
      insights.push(
        `Top losers: ${input.market.topLosers.map((r) => `${r.symbol} (${r.changePct.toFixed(2)}%)`).join(', ')}.`,
      );
    }
    const strongestType = [...input.market.byAssetType].sort((a, b) => b.activeSignals - a.activeSignals)[0];
    if (strongestType) {
      insights.push(
        `Most active class: ${strongestType.assetType} with ${strongestType.activeSignals} active signals out of ${strongestType.total} tracked.`,
      );
    }
  }
  if (insights.length < 4) insights.push('Check high-volatility assets first and validate targets before action.');

  return {
    summary: `Daily brief: ${input.buy.length} buy-side and ${input.sell.length} sell-side active signals across the watchlist.${input.market ? ` ${input.market.activeSignals} total active signals out of ${input.market.totalAssets} assets.` : ''}`,
    buy: input.buy,
    sell: input.sell,
    newToday: input.newToday,
    droppedOff: input.droppedOff,
    insights: insights.slice(0, 6),
    model: 'deterministic-fallback',
    isFallback: true,
  };
}

function parseModelOutput(text: string, fallback: DailyBriefPayload): DailyBriefPayload {
  try {
    const parsed = JSON.parse(text) as Partial<DailyBriefPayload>;
    if (!parsed.summary || !Array.isArray(parsed.insights)) return fallback;
    return {
      summary: parsed.summary,
      buy: Array.isArray(parsed.buy) ? parsed.buy : fallback.buy,
      sell: Array.isArray(parsed.sell) ? parsed.sell : fallback.sell,
      newToday: Array.isArray(parsed.newToday) ? parsed.newToday : fallback.newToday,
      droppedOff: Array.isArray(parsed.droppedOff) ? parsed.droppedOff : fallback.droppedOff,
      insights: parsed.insights,
      model: OPENAI_MODEL,
      isFallback: false,
    };
  } catch {
    return fallback;
  }
}

export async function generateDailyBrief(forDate = new Date()): Promise<DailyBriefPayload> {
  const signal = await getDailySignalSummary(forDate.toISOString().slice(0, 10));
  const fallback = buildFallbackBrief(signal);

  const apiKey = optionalEnv('OPENAI_API_KEY');
  if (!apiKey) {
    return fallback;
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content:
            'You are a financial watchlist analyst. Return strict JSON with keys: summary, buy, sell, newToday, droppedOff, insights. Insights must include market breadth, top movers, and asset-class observations when data is provided.',
        },
        {
          role: 'user',
          content: JSON.stringify(signal),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'daily_brief',
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              buy: { type: 'array', items: { type: 'string' } },
              sell: { type: 'array', items: { type: 'string' } },
              newToday: { type: 'array', items: { type: 'string' } },
              droppedOff: { type: 'array', items: { type: 'string' } },
              insights: { type: 'array', items: { type: 'string' } },
            },
            required: ['summary', 'insights'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const text = response.output_text?.trim();
    if (!text) return fallback;
    return parseModelOutput(text, fallback);
  } catch {
    return fallback;
  }
}

export async function persistDailyBrief(forDate = new Date()): Promise<DailyBriefPayload> {
  const briefDate = startOfDayInTimeZone(forDate, APP_TIMEZONE);
  const payload = await generateDailyBrief(forDate);

  await prisma.dailyBrief.upsert({
    where: {
      briefDate_timezone: {
        briefDate,
        timezone: APP_TIMEZONE,
      },
    },
    update: {
      summary: payload.summary,
      buy: payload.buy,
      sell: payload.sell,
      newToday: payload.newToday,
      droppedOff: payload.droppedOff,
      insights: payload.insights,
      model: payload.model,
      isFallback: payload.isFallback,
      generatedAt: new Date(),
    },
    create: {
      briefDate,
      timezone: APP_TIMEZONE,
      summary: payload.summary,
      buy: payload.buy,
      sell: payload.sell,
      newToday: payload.newToday,
      droppedOff: payload.droppedOff,
      insights: payload.insights,
      model: payload.model,
      isFallback: payload.isFallback,
    },
  });

  return payload;
}
