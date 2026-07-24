import { optionalEnv } from '@/lib/env';

// Minimal Resend-backed sender. Deliberately dependency-free (one fetch) and
// degrades safely: with no RESEND_API_KEY set, hasEmailProvider() is false and
// nothing is sent, exactly like the AI provider layer. Callers must record the
// outcome so a missing provider is visible rather than silent.

export type EmailResult =
  | { ok: true; providerId: string | null }
  | { ok: false; error: string };

export function hasEmailProvider(): boolean {
  return Boolean(optionalEnv('RESEND_API_KEY'));
}

/** From address, e.g. "Stock Pickers Academy <brief@your-domain>". */
export function emailFrom(): string {
  return optionalEnv('EMAIL_FROM') ?? 'Stock Pickers Academy <onboarding@resend.dev>';
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** RFC 8058 one-click unsubscribe target. */
  unsubscribeUrl?: string;
}): Promise<EmailResult> {
  const key = optionalEnv('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'No email provider configured (set RESEND_API_KEY).' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: emailFrom(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        // Mail clients surface these as a native unsubscribe control, which
        // keeps us out of spam folders and honours the opt-out properly.
        ...(input.unsubscribeUrl
          ? {
              headers: {
                'List-Unsubscribe': `<${input.unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }
          : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
    }
    const json = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, providerId: json?.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
