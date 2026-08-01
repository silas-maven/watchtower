// Close the stale payment_overdue alerts left over from testing.
//
// These were raised by the local overdue sweep against subscription period-end
// dates that no longer exist: every mirror now has currentPeriodEnd = null, so
// the sweep skips them and nothing will ever close these on its own. They are
// not evidence of a real billing problem, and 24 open alerts on 4 members buries
// anything genuine.
//
// Only closes alerts whose member is NOT currently overdue, so a real problem is
// never quietly resolved.
//
//   npx tsx --env-file=.env scripts/resolve-stale-billing-alerts.ts           # dry run
//   npx tsx --env-file=.env scripts/resolve-stale-billing-alerts.ts --apply
import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');

async function main() {
  const open = await prisma.billingAlert.findMany({
    where: { status: 'OPEN' },
    include: { profile: { select: { email: true, subscriptionMirror: true } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`open billing alerts: ${open.length}`);

  const stale = open.filter((a) => {
    const mirror = a.profile?.subscriptionMirror;
    // Keep anything for a member who is genuinely overdue right now, or who has
    // a live period end the sweep is still tracking.
    if (!mirror) return true;
    if (mirror.status === SubscriptionStatus.OVERDUE) return false;
    if (mirror.currentPeriodEnd) return false;
    return true;
  });

  const byType = new Map<string, number>();
  for (const a of stale) byType.set(a.type, (byType.get(a.type) ?? 0) + 1);
  console.log(`stale (no live period end, not currently overdue): ${stale.length}`);
  for (const [type, n] of byType) console.log(`  ${type}: ${n}`);
  console.log(`keeping open: ${open.length - stale.length}`);

  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with --apply to close them.');
    return;
  }

  const res = await prisma.billingAlert.updateMany({
    where: { id: { in: stale.map((a) => a.id) } },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  console.log(`\nclosed ${res.count} alert(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
