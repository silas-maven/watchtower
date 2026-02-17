import { NextResponse } from 'next/server';
import { getAsset } from '@/lib/mock';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const Schema = z.object({ assetId: z.string() });

function genInsight(symbol: string, changePct: number) {
  const tone = changePct >= 0 ? 'constructive' : 'cautious';
  const bullets = [
    `Bias: ${tone} (mock AI)`,
    `Trigger: watch nearest level + confirmation candle`,
    `Risk: define invalidation and size accordingly`,
    `Plan: throttle alerts to avoid spam`,
  ];
  return {
    summary: `${symbol}: ${tone} setup. This is simulated AI output (no real model call).`,
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
  const asset = getAsset(parsed.data.assetId);
  if (!asset) {
    return NextResponse.json({ ok: false, error: 'Asset not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, assetId: asset.id, ...genInsight(asset.symbol, asset.changePct) });
}
