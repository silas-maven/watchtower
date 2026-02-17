import { NextResponse } from 'next/server';
import { watchlist } from '@/lib/mock';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const Schema = z.object({ assetId: z.string() });

function genInsight(ticker: string, tradeAlert: string) {
  const bullets = [
    `Alert state: ${tradeAlert} (from sheet)`,
    `Check: confirm entry/exit against structure, not just a number`,
    `Risk: enforce max-per-position + invalidation`,
    `Automation: include earnings + volatility + FX in daily brief`,
  ];
  return {
    summary: `${ticker}: simulated sweep summary. (No real model call.)`,
    bullets,
    confidence: Math.round(55 + Math.random() * 30),
  };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }
  const row = watchlist.find(a => a.id === parsed.data.assetId);
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Asset not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, assetId: row.id, ...genInsight(row.ticker, row.tradeAlert) });
}
