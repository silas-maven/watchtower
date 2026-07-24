import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// One-click unsubscribe. Deliberately requires no sign-in (the token in the
// email is the authorisation) and only ever turns the flag OFF, so a leaked or
// crawled link cannot be used to subscribe anyone or read their data.
async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  const result = await prisma.profile.updateMany({
    where: { emailUnsubToken: token },
    data: { dailyBriefEmail: false },
  });
  return result.count > 0;
}

function page(body: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title></head>
<body style="margin:0;background:#f9fafb;font:400 16px/1.6 system-ui,sans-serif;color:#111827">
<div style="max-width:520px;margin:64px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
<div style="font:700 18px system-ui,sans-serif">Stock Pickers Academy</div>${body}</div></body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

// Mail clients POST here for RFC 8058 one-click unsubscribe.
export async function POST(req: Request) {
  const done = await unsubscribe(new URL(req.url).searchParams.get('token'));
  return NextResponse.json({ ok: done });
}

export async function GET(req: Request) {
  const done = await unsubscribe(new URL(req.url).searchParams.get('token'));
  return page(
    done
      ? '<p>You have been unsubscribed from the daily brief email. You can turn it back on any time under Account.</p>'
      : '<p>That unsubscribe link is not valid. You can manage the daily brief email under Account.</p>',
  );
}
