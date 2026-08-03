/**
 * Latency probe for the Watchtower database path.
 *
 * Written 3 Aug 2026 while chasing "the app is slow". It exists because the
 * interesting question is not "is the database far away" but "which hop is
 * actually costing the time", and those are answered by different numbers.
 *
 *   npx tsx -r dotenv/config scripts/perf-probe.ts dotenv_config_path=.env.local
 *
 * Read it like this:
 *   - direct :5432 median ~= raw network round trip to the database.
 *   - pooled :6543 median much higher than direct => the pooler is the problem,
 *     not the distance. Queuing for a server connection looks exactly like this:
 *     a low minimum with a long tail.
 *   - both high and roughly equal => it really is distance, and the fix is to
 *     move the functions to the database's region.
 *
 * Run it from a deployed function as well as from a laptop before drawing a
 * conclusion: a laptop in London and a lambda in Washington are not measuring
 * the same journey.
 */
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAssetsForDashboard } from '@/lib/server/dashboard';

async function latency(label: string, url: string, samples = 15) {
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    await client.$queryRaw`SELECT 1`; // warm the connection, do not time it
    const took: number[] = [];
    for (let i = 0; i < samples; i++) {
      const t = Date.now();
      await client.$queryRaw`SELECT 1`;
      took.push(Date.now() - t);
    }
    took.sort((a, b) => a - b);
    console.log(
      `${label}  min ${took[0]}ms  median ${took[Math.floor(samples / 2)]}ms  max ${took[samples - 1]}ms`,
    );
  } catch (error) {
    console.log(`${label}  FAILED: ${(error as Error).message.split('\n')[0]}`);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  await latency('pooled :6543 (pgbouncer) ', process.env.DATABASE_URL!);
  await latency('direct :5432             ', process.env.DIRECT_URL!);

  console.log('\nrow counts:', {
    activeNonMacro: await prisma.asset.count({ where: { isActive: true, isMacro: false } }),
    allAssets: await prisma.asset.count(),
    snapshots: await prisma.assetSnapshot.count(),
    profiles: await prisma.profile.count(),
  });

  // The dashboard's heaviest call. It loads the whole tradable universe on every
  // page view and then filters it down to a handful of rows in JavaScript.
  const t = Date.now();
  const rows = await getAssetsForDashboard();
  console.log(
    `\ngetAssetsForDashboard(): ${Date.now() - t}ms for ${rows.length} rows, ` +
      `${(JSON.stringify(rows).length / 1024).toFixed(0)} KB serialised`,
  );
}

main().finally(() => prisma.$disconnect());
