/**
 * Proves row level security is actually enforcing, not merely switched on.
 *
 *   npx tsx -r dotenv/config scripts/verify-rls.ts dotenv_config_path=.env
 *
 * "RLS is enabled" is not a security property on its own. What matters is whether
 * a role WITHOUT bypassrls can read the tables. This creates a throwaway role,
 * grants it SELECT on the most sensitive tables (deliberately over-granting, so
 * the test is honest), tries to read as that role, and drops it again.
 *
 * It also confirms the application's own connection is unaffected, because an
 * RLS change that silently locks the app out of its own data would be a far worse
 * outcome than the exposure it was meant to prevent.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SENSITIVE = [
  'watchtower_spa_profiles',
  'watchtower_spa_user_holdings',
  'watchtower_spa_average_plans',
  'watchtower_spa_community_posts',
  'watchtower_spa_stripe_customers',
  'watchtower_spa_payment_events',
];

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
}

async function main() {
  console.log('=== 1. RLS FLAG ON EVERY TABLE ===');
  const tables = await prisma.$queryRawUnsafe<Array<{ relname: string; rls: boolean }>>(
    `SELECT c.relname, c.relrowsecurity AS rls
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='watchtower' AND c.relkind='r' ORDER BY c.relname`,
  );
  const off = tables.filter((t) => !t.rls);
  check(`all ${tables.length} tables have RLS enabled`, off.length === 0, off.map((t) => t.relname).join(', '));

  console.log('\n=== 2. THE APPLICATION CONNECTION STILL WORKS ===');
  // If this broke, every page would 500. Worth proving, not assuming.
  const counts = {
    profiles: await prisma.profile.count(),
    assets: await prisma.asset.count({ where: { isActive: true } }),
    holdings: await prisma.userHolding.count(),
    posts: await prisma.communityPost.count(),
  };
  console.log('   ', counts);
  check('app can still read its own tables', counts.assets > 0 && counts.profiles > 0);

  console.log('\n=== 3. A ROLE WITHOUT BYPASSRLS READS NOTHING ===');
  const role = `rls_probe_${Math.random().toString(36).slice(2, 8)}`;
  let created = false;
  try {
    await prisma.$executeRawUnsafe(`CREATE ROLE ${role} NOLOGIN NOBYPASSRLS`);
    created = true;
    // `postgres` on Supabase is not a superuser, so it may only SET ROLE to a
    // role it is a member of. Without this the probe fails with 42501 and proves
    // nothing about RLS.
    await prisma.$executeRawUnsafe(`GRANT ${role} TO CURRENT_USER`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA watchtower TO ${role}`);
    // Over-grant on purpose: if the probe still reads nothing with SELECT
    // explicitly granted, the denial is coming from RLS and not from a
    // missing privilege, which is the only version of this test worth trusting.
    for (const t of SENSITIVE) {
      await prisma.$executeRawUnsafe(`GRANT SELECT ON watchtower.${t} TO ${role}`);
    }

    for (const t of SENSITIVE) {
      const rows = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
        const r = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM watchtower.${t} LIMIT 5`,
        );
        return r.length;
      });
      check(`${t.padEnd(38)} returns 0 rows to a non-bypassrls role`, rows === 0, `got ${rows}`);
    }

    // And the same role must not be able to write either.
    let wrote = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
        await tx.$executeRawUnsafe(
          `UPDATE watchtower.watchtower_spa_profiles SET "name" = 'rls-probe' WHERE true`,
        );
        wrote = true;
      });
    } catch {
      wrote = false;
    }
    check('non-bypassrls role cannot UPDATE profiles', !wrote);
  } finally {
    if (created) {
      for (const t of SENSITIVE) {
        await prisma.$executeRawUnsafe(`REVOKE ALL ON watchtower.${t} FROM ${role}`).catch(() => undefined);
      }
      await prisma.$executeRawUnsafe(`REVOKE ALL ON SCHEMA watchtower FROM ${role}`).catch(() => undefined);
      await prisma.$executeRawUnsafe(`DROP ROLE IF EXISTS ${role}`).catch(() => undefined);
      const gone = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT count(*) AS n FROM pg_roles WHERE rolname = '${role}'`,
      );
      check('probe role cleaned up', Number(gone[0].n) === 0);
    }
  }

  console.log(`\n${fail === 0 ? 'RLS IS ENFORCING' : `${fail} CHECK(S) FAILED`}  (${pass} passed)`);
  process.exitCode = fail === 0 ? 0 : 1;
}

main()
  .catch((e) => { console.error('FAILED:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
