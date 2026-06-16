// One-off: remove all seeded demo accounts (@watchtower.demo) and their data.
// Every Profile relation is onDelete Cascade/SetNull, so deleting the profile
// clears holdings, watchlists, portfolios, plans, and the subscription mirror.
// Run: npx tsx --env-file=.env scripts/cleanup-demo-data.ts
import { prisma } from '../lib/prisma';

async function main() {
  const demo = await prisma.profile.findMany({
    where: { email: { endsWith: '@watchtower.demo' } },
    select: { id: true, email: true, role: true },
  });

  if (demo.length === 0) {
    console.log('No @watchtower.demo profiles found. Nothing to delete.');
    return;
  }

  console.log(`Deleting ${demo.length} demo profile(s):`);
  for (const d of demo) console.log(`  - ${d.email} (${d.role})`);

  const res = await prisma.profile.deleteMany({ where: { email: { endsWith: '@watchtower.demo' } } });
  console.log(`Deleted ${res.count} profile(s); dependent rows cascaded.`);

  const remaining = await prisma.profile.count({ where: { email: { endsWith: '@watchtower.demo' } } });
  console.log(`Remaining @watchtower.demo profiles: ${remaining}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
