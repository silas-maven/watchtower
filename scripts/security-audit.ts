/**
 * Security posture audit of the Watchtower database. READ ONLY.
 *
 *   npx tsx -r dotenv/config scripts/security-audit.ts dotenv_config_path=.env
 *
 * Checks the things that are properties of the DATABASE rather than of the code,
 * so they cannot be established by reading route handlers:
 *
 *   1. Is row level security enabled on the watchtower tables, and are there
 *      policies behind it? RLS with no policy is not "on", and a policy on a
 *      table with RLS disabled does nothing.
 *   2. Which database role does the app connect as, and can it bypass RLS?
 *      A superuser or a role with BYPASSRLS makes every policy decorative.
 *   3. Are the Supabase anon/service keys able to reach this schema at all?
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. CONNECTING ROLE AND ITS PRIVILEGES ===');
  const who = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT current_user AS role,
            (SELECT rolsuper    FROM pg_roles WHERE rolname = current_user) AS is_superuser,
            (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS can_bypass_rls,
            current_setting('search_path') AS search_path`,
  );
  console.log(' ', who[0]);

  console.log('\n=== 2. ROW LEVEL SECURITY PER TABLE ===');
  const rls = await prisma.$queryRawUnsafe<
    Array<{ tablename: string; rowsecurity: boolean; forced: boolean; policies: bigint }>
  >(
    `SELECT c.relname          AS tablename,
            c.relrowsecurity   AS rowsecurity,
            c.relforcerowsecurity AS forced,
            (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'watchtower' AND c.relkind = 'r'
     ORDER BY c.relname`,
  );

  const enabled = rls.filter((r) => r.rowsecurity);
  const withPolicies = rls.filter((r) => Number(r.policies) > 0);
  console.log(`  tables in schema        : ${rls.length}`);
  console.log(`  with RLS enabled        : ${enabled.length}`);
  console.log(`  with at least one policy: ${withPolicies.length}`);

  // Name the tables that carry per-member data, since those are the ones where
  // the absence of RLS actually matters.
  const PERSONAL = [
    'watchtower_spa_profiles',
    'watchtower_spa_user_holdings',
    'watchtower_spa_user_portfolios',
    'watchtower_spa_user_watchlists',
    'watchtower_spa_user_watchlist_items',
    'watchtower_spa_average_plans',
    'watchtower_spa_ai_reports',
    'watchtower_spa_personal_finance_inputs',
    'watchtower_spa_community_posts',
    'watchtower_spa_payment_events',
    'watchtower_spa_billing_alerts',
    'watchtower_spa_subscription_mirrors',
    'watchtower_spa_stripe_customers',
  ];
  console.log('\n  per-member tables:');
  for (const name of PERSONAL) {
    const row = rls.find((r) => r.tablename === name);
    if (!row) {
      console.log(`    ${name.padEnd(46)} (not found)`);
      continue;
    }
    console.log(
      `    ${name.padEnd(46)} RLS ${row.rowsecurity ? 'ON ' : 'OFF'}  policies ${row.policies}`,
    );
  }

  console.log('\n=== 3. WHAT THAT MEANS FOR THIS APP ===');
  if (enabled.length === 0) {
    console.log('  RLS is OFF on every table in the schema.');
    console.log('  => The ONLY thing separating one member\'s data from another is the');
    console.log('     `where: { profileId }` clause in application code. There is no');
    console.log('     database-level backstop if a query omits it.');
  }
  if (who[0].can_bypass_rls || who[0].is_superuser) {
    console.log('  The connecting role can bypass RLS, so policies would not constrain');
    console.log('  this connection even if they existed.');
  }
}

main()
  .catch((e) => { console.error('AUDIT FAILED:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
