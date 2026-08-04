/**
 * Full performance audit of the Watchtower read path. READ ONLY.
 *
 *   npx tsx -r dotenv/config scripts/perf-audit.ts dotenv_config_path=.env
 *
 * Extends scripts/perf-probe.ts, which timed one query and two connections. This
 * one answers the three questions that decide what to actually fix:
 *
 *   1. Which hop costs the time: the network, the pooler, or the query?
 *   2. How many SQL statements does each page-level call actually issue? A call
 *      that looks like one findMany can be several round trips, and at 80ms a
 *      round trip the count matters more than the query plan.
 *   3. Is the slow part the database working, or the wire carrying the result?
 *
 * Note both DATABASE_URL and DIRECT_URL point at pooler.supabase.com. 6543 is
 * transaction mode, 5432 is session mode. Neither is a direct connection to the
 * database host, so the gap between them cannot be distance.
 */
import { PrismaClient } from '@prisma/client';

type Timing = { label: string; ms: number; queries: number; rows?: number; kb?: number };
const results: Timing[] = [];

function stats(took: number[]) {
  const s = [...took].sort((a, b) => a - b);
  return { min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
}

async function connectionLatency(label: string, url: string, samples = 15) {
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    await client.$queryRaw`SELECT 1`; // warm, untimed
    const took: number[] = [];
    for (let i = 0; i < samples; i++) {
      const t = performance.now();
      await client.$queryRaw`SELECT 1`;
      took.push(performance.now() - t);
    }
    const { min, median, max } = stats(took);
    console.log(`  ${label}  min ${min.toFixed(0)}ms  median ${median.toFixed(0)}ms  max ${max.toFixed(0)}ms`);
  } catch (error) {
    console.log(`  ${label}  FAILED: ${(error as Error).message.split('\n')[0]}`);
  } finally {
    await client.$disconnect();
  }
}

/** A client that counts every SQL statement Prisma emits. */
function countingClient(url: string) {
  const client = new PrismaClient({ datasources: { db: { url } }, log: [{ emit: 'event', level: 'query' }] });
  const state = { count: 0, sql: [] as string[], dbMs: 0 };
  client.$on('query', (e: { query: string; duration: number }) => {
    state.count += 1;
    state.dbMs += e.duration;
    state.sql.push(e.query);
  });
  return { client, state };
}

async function measure(
  label: string,
  state: { count: number; sql: string[]; dbMs: number },
  fn: () => Promise<unknown>,
) {
  state.count = 0;
  state.sql.length = 0;
  state.dbMs = 0;
  const t = performance.now();
  const out = await fn();
  const ms = performance.now() - t;
  const rows = Array.isArray(out) ? out.length : undefined;
  const kb = out ? JSON.stringify(out).length / 1024 : undefined;
  results.push({ label, ms, queries: state.count, rows, kb });
  console.log(
    `  ${label.padEnd(42)} ${ms.toFixed(0).padStart(6)}ms  ${String(state.count).padStart(3)} queries  ` +
      `${state.dbMs.toFixed(0).padStart(5)}ms in db  ` +
      `${rows != null ? `${String(rows).padStart(4)} rows` : '         '}  ` +
      `${kb != null ? `${kb.toFixed(0).padStart(4)} KB` : ''}`,
  );
  return state.sql.slice();
}

async function main() {
  const pooled = process.env.DATABASE_URL!;
  const session = process.env.DIRECT_URL!;

  console.log('=== 1. CONNECTION LATENCY (same host, different pooler mode) ===');
  await connectionLatency('transaction pool :6543', pooled);
  await connectionLatency('session pool     :5432', session);

  const { client, state } = countingClient(pooled);
  await client.$queryRaw`SELECT 1`; // warm

  console.log('\n=== 2. TABLE SIZES ===');
  console.log('  assets active non-macro:', await client.asset.count({ where: { isActive: true, isMacro: false } }));
  console.log('  assets total           :', await client.asset.count());
  console.log('  asset snapshots        :', await client.assetSnapshot.count());
  console.log('  signal events          :', await client.signalEvent.count());

  console.log('\n=== 3. PAGE-LEVEL CALLS (cold, one run each) ===');

  // The dashboard's heaviest call, as written today.
  const dashSql = await measure('dashboard: 815 assets + latest snap', state, () =>
    client.asset.findMany({
      where: { isActive: true, isMacro: false },
      select: {
        id: true, symbol: true, name: true, reason: true, assetType: true, currency: true,
        rule: { select: { targetEntry: true, targetExit: true, signalOverride: true } },
        snapshots: {
          orderBy: { capturedAt: 'desc' }, take: 1,
          select: { currentPrice: true, dailyChangePct: true, dailyLow: true, dailyHigh: true },
        },
      },
      orderBy: { symbol: 'asc' },
    }),
  );

  // The Asset Centre and briefHighlights variant: full include, every column.
  await measure('assets page: 815 full include', state, () =>
    client.asset.findMany({
      where: { isActive: true, isMacro: false },
      include: { rule: true, snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } },
      orderBy: { symbol: 'asc' },
    }),
  );

  // What the dashboard actually needs, if filtered in SQL instead of JS.
  await measure('dashboard: BUY/BOTH only (proposed)', state, () =>
    client.asset.findMany({
      where: {
        isActive: true, isMacro: false,
        snapshots: { some: { signalState: { in: ['BUY', 'BOTH'] } } },
      },
      select: {
        id: true, symbol: true, name: true, currency: true,
        rule: { select: { targetEntry: true } },
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 1, select: { currentPrice: true, dailyChangePct: true, signalState: true } },
      },
      take: 50,
    }),
  );

  console.log('\n=== 4. THE SQL PRISMA ACTUALLY EMITS FOR THE DASHBOARD CALL ===');
  dashSql.forEach((q, i) => console.log(`  [${i + 1}] ${q.slice(0, 260)}${q.length > 260 ? ' ...' : ''}`));

  console.log('\n=== 5. IS IT THE DB OR THE WIRE? ===');
  // Same row count, almost no payload: isolates transfer cost from query cost.
  const t1 = performance.now();
  const c = await client.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM watchtower.watchtower_spa_assets WHERE "isActive" = true AND "isMacro" = false`,
  );
  console.log(`  count(*) over the same 815 rows: ${(performance.now() - t1).toFixed(0)}ms (n=${c[0].n})`);

  // Server-side timing of the exact nested-snapshot pattern, via EXPLAIN.
  const plan = await client.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
    `EXPLAIN (ANALYZE, BUFFERS, TIMING)
     SELECT DISTINCT ON (s."assetId") s."assetId", s."currentPrice", s."capturedAt"
     FROM watchtower.watchtower_spa_asset_snapshots s
     JOIN watchtower.watchtower_spa_assets a ON a.id = s."assetId"
     WHERE a."isActive" = true AND a."isMacro" = false
     ORDER BY s."assetId", s."capturedAt" DESC`,
  );
  console.log('\n  EXPLAIN ANALYZE, latest-snapshot-per-asset:');
  plan.forEach((r) => console.log('   ', r['QUERY PLAN']));

  console.log('\n=== 6. INDEX PRESENT IN THE DATABASE (not just the schema file)? ===');
  const idx = await client.$queryRawUnsafe<Array<{ indexname: string; indexdef: string }>>(
    `SELECT indexname, indexdef FROM pg_indexes
     WHERE schemaname='watchtower' AND tablename='watchtower_spa_asset_snapshots'`,
  );
  idx.forEach((r) => console.log(`  ${r.indexname}: ${r.indexdef.replace(/.*USING /, 'USING ')}`));

  await client.$disconnect();

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`  ${r.label.padEnd(42)} ${r.ms.toFixed(0).padStart(6)}ms  ${String(r.queries).padStart(3)} queries`);
  }
}

main().catch((e) => {
  console.error('AUDIT FAILED:', e);
  process.exitCode = 1;
});
