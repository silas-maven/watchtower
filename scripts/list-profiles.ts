// Read-only: list every profile with its role, tier and access state.
// Used to diagnose admin-access issues.
//   npx tsx --env-file=.env scripts/list-profiles.ts
import { prisma } from '../lib/prisma';

async function main() {
  const rows = await prisma.profile.findMany({
    select: {
      email: true,
      name: true,
      role: true,
      tier: true,
      accessState: true,
      clerkUserId: true,
      createdAt: true,
      lastSeenAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const r of rows) {
    console.log(
      [
        r.email.padEnd(34),
        r.role.padEnd(6),
        r.tier.padEnd(8),
        r.accessState.padEnd(9),
        r.clerkUserId ? `clerk:${r.clerkUserId.slice(0, 14)}` : 'NO-CLERK-ID   ',
        `created ${r.createdAt.toISOString().slice(0, 10)}`,
        `seen ${r.lastSeenAt?.toISOString().slice(0, 10) ?? '-'}`,
      ].join(' | '),
    );
  }
  console.log(`\ntotal ${rows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
