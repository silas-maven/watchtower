// One-off repair: the macro Bitcoin row (symbol BTCUSD, isMacro) was switched
// off by the 27 July identity sweep, which quoted its internal symbol instead of
// its quoteSymbol and concluded the provider would not price it. The Weather /
// Market Snapshot tile has read as a dash ever since. The cause is fixed in
// scripts/fix-asset-identity.ts and scripts/audit-asset-identity.ts (both now
// skip isMacro rows); this restores the row itself.
//
// Deliberately narrow: it touches one row, only if that row is a macro row that
// is currently inactive, and it reports what it found either way.
import { prisma } from '../lib/prisma';

async function main() {
  const row = await prisma.asset.findUnique({
    where: { symbol: 'BTCUSD' },
    select: { id: true, symbol: true, name: true, isMacro: true, isActive: true, quoteSymbol: true },
  });

  if (!row) {
    console.log('No BTCUSD row found. Nothing to do; re-seed with scripts/seed-macro-assets.ts.');
    return;
  }
  console.log('before:', JSON.stringify(row));

  if (!row.isMacro) {
    console.log('REFUSING: BTCUSD is not a macro row. Not touching it.');
    return;
  }
  if (row.isActive) {
    console.log('Already active. Nothing to do.');
    return;
  }

  await prisma.asset.update({ where: { id: row.id }, data: { isActive: true } });
  const after = await prisma.asset.findUnique({
    where: { id: row.id },
    select: { symbol: true, isActive: true, quoteSymbol: true },
  });
  console.log('after :', JSON.stringify(after));
  console.log('The tile will fill in on the next market refresh.');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
