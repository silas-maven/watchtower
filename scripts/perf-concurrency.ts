/**
 * Concurrency behaviour of the database path. READ ONLY.
 *
 *   npx tsx -r dotenv/config scripts/perf-concurrency.ts dotenv_config_path=.env
 *
 * WHY THIS EXISTS, AND WHAT IT CORRECTS.
 *
 * An earlier run measured `connection_limit=1` with a SINGLE sequential client
 * and concluded it was a dead end because it did not help. That conclusion was
 * measured on the wrong scenario. The setting does nothing for one client, which
 * is precisely the case that was tested; it exists to stop MANY concurrent
 * serverless instances each opening a pool and exhausting the pooler's client
 * slots. With four members the distinction was academic. At several hundred it is
 * the difference between working and not.
 *
 * This measures the case the setting is actually for: rising concurrency against
 * the pooled connection, watching for the point where added concurrency stops
 * buying throughput and starts buying queue.
 *
 * Read it as: throughput should climb with concurrency and then flatten. Where it
 * flattens is the ceiling. If p95 latency climbs steeply while throughput is flat,
 * requests are queueing for a connection rather than waiting on the database.
 */
import { PrismaClient } from '@prisma/client';

type Row = { concurrency: number; totalMs: number; p50: number; p95: number; max: number; perSec: number; errors: number };

async function burst(client: PrismaClient, concurrency: number, work: (c: PrismaClient) => Promise<unknown>): Promise<Row> {
  const started = performance.now();
  const timings = await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const t = performance.now();
      try {
        await work(client);
        return performance.now() - t;
      } catch {
        return -1;
      }
    }),
  );
  const totalMs = performance.now() - started;
  const okTimings = timings.filter((t) => t >= 0).sort((a, b) => a - b);
  const errors = timings.length - okTimings.length;
  const at = (q: number) => okTimings[Math.min(okTimings.length - 1, Math.floor(okTimings.length * q))] ?? 0;
  return {
    concurrency,
    totalMs,
    p50: at(0.5),
    p95: at(0.95),
    max: okTimings[okTimings.length - 1] ?? 0,
    perSec: (okTimings.length / totalMs) * 1000,
    errors,
  };
}

/** A realistic member read: the narrowed dashboard query. */
const WORK = (c: PrismaClient) =>
  c.asset.findMany({
    where: {
      isActive: true,
      isMacro: false,
      OR: [{ rule: { targetEntry: { not: null } } }, { rule: { signalOverride: { not: null } } }],
    },
    select: {
      id: true, symbol: true, currency: true,
      rule: { select: { targetEntry: true, targetExit: true, signalOverride: true } },
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1, select: { currentPrice: true, dailyLow: true, dailyHigh: true } },
    },
  });

async function profile(label: string, url: string, levels: number[]) {
  const client = new PrismaClient({ datasources: { db: { url } } });
  console.log(`\n=== ${label} ===`);
  console.log('  conc   wall     p50      p95      max      req/s   errors');
  try {
    await client.$queryRaw`SELECT 1`; // warm
    for (const n of levels) {
      const r = await burst(client, n, WORK);
      console.log(
        `  ${String(r.concurrency).padStart(4)}  ${r.totalMs.toFixed(0).padStart(6)}ms ` +
          `${r.p50.toFixed(0).padStart(6)}ms ${r.p95.toFixed(0).padStart(6)}ms ${r.max.toFixed(0).padStart(6)}ms ` +
          `${r.perSec.toFixed(1).padStart(7)}  ${String(r.errors).padStart(6)}`,
      );
    }
  } catch (error) {
    console.log(`  FAILED: ${(error as Error).message.split('\n')[0]}`);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const pooled = process.env.DATABASE_URL!;
  const levels = [1, 5, 10, 25, 50, 100];

  console.log('Each request is the narrowed dashboard query against real data.');
  console.log('Note this runs from ONE process, so it models concurrent REQUESTS,');
  console.log('not the many-lambda-instances case, which is strictly worse.');

  await profile('pooled :6543, Prisma default pool', pooled, levels);
  await profile('pooled :6543, connection_limit=1', `${pooled}&connection_limit=1`, levels);
  await profile('pooled :6543, connection_limit=5', `${pooled}&connection_limit=5`, levels);
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exitCode = 1;
});
