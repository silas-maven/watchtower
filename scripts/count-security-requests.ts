// Read-only: how many member security requests exist, and in what state.
//   npx tsx --env-file=.env scripts/count-security-requests.ts
import { prisma } from '../lib/prisma';

async function main() {
  const rows = await prisma.stockRequest.findMany({
    include: { profile: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`security requests: ${rows.length}`);
  for (const r of rows) {
    console.log(`  ${r.symbol.padEnd(10)} ${r.assetType.padEnd(10)} ${r.status.padEnd(9)} ${r.profile.email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
