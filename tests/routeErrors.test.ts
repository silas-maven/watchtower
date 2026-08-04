import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromCaughtError } from '@/lib/route';

async function body(res: Response) {
  return (await res.json()) as { ok: boolean; error: { code: string; message: string } };
}

describe('fromCaughtError', () => {
  beforeEach(() => {
    // The unhandled branch logs deliberately. Silence it so a passing run is not
    // full of scary stack traces, but keep the spy so the logging is asserted.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['UNAUTHENTICATED', 401],
    ['FORBIDDEN', 403],
    ['ACCESS_SUSPENDED', 403],
    ['PAYWALL', 402],
  ])('maps the coded error %s to %i', async (code, status) => {
    const res = fromCaughtError(new Error(code));
    expect(res.status).toBe(status);
    expect((await body(res)).error.code).toBe(code);
  });

  it('never echoes an unexpected error message back to the caller', async () => {
    // The exact shape of a Prisma failure: it names the table and the column.
    const leaky = new Error(
      'Invalid `prisma.profile.findUnique()` invocation: Unique constraint failed on the fields: (`email`) in watchtower_spa_profiles',
    );

    const res = fromCaughtError(leaky);
    const payload = await body(res);

    expect(res.status).toBe(500);
    expect(payload.error.code).toBe('INTERNAL_ERROR');
    for (const secret of ['prisma', 'watchtower_spa_profiles', 'Unique constraint', 'email']) {
      expect(payload.error.message).not.toContain(secret);
    }
  });

  it('reports a server fault as 500, not 400', async () => {
    // The old behaviour returned 400 for everything unrecognised, which told
    // clients to stop retrying something that was actually our outage, and made
    // genuine incidents look like client mistakes in the logs.
    expect(fromCaughtError(new Error('connect ECONNREFUSED 10.0.0.1:5432')).status).toBe(500);
    expect(fromCaughtError('a thrown string').status).toBe(500);
    expect(fromCaughtError(undefined).status).toBe(500);
  });

  it('gives the caller a reference and logs it server side', async () => {
    const res = fromCaughtError(new Error('boom'));
    const message = (await body(res)).error.message;

    const ref = message.match(/reference ([a-z0-9]+)/)?.[1];
    expect(ref, `no reference in: ${message}`).toBeTruthy();

    // The same reference must reach the server log, or it cannot be traced.
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).toContain(ref!);
  });

  it('does not reuse the same reference across errors', async () => {
    const refOf = async (e: unknown) =>
      (await body(fromCaughtError(e))).error.message.match(/reference ([a-z0-9]+)/)?.[1];
    expect(await refOf(new Error('one'))).not.toBe(await refOf(new Error('two')));
  });

  it('treats a message that merely mentions a code as unhandled', async () => {
    // Matching on substring rather than equality would let any upstream error
    // text containing "FORBIDDEN" masquerade as an auth decision.
    const res = fromCaughtError(new Error('upstream said FORBIDDEN while fetching quotes'));
    expect(res.status).toBe(500);
    expect((await body(res)).error.code).toBe('INTERNAL_ERROR');
  });
});
