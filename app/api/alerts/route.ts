import { NextResponse } from 'next/server';
import { mockAlerts } from '@/lib/mock';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, alerts: mockAlerts() });
}
