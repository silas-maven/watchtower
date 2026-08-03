// Read-only diagnostic for the macro instrument rows behind the Weather /
// Market Snapshot tiles. Written for the "Bitcoin shows a dash" report, then
// widened to check whether the 27 July identity sweep damaged the others: it
// quotes by Asset.symbol, but macro rows hold an internal symbol and keep the
// real ticker in quoteSymbol.
import { prisma } from '../lib/prisma';
import { MACRO_INSTRUMENTS } from '../lib/market/macro';

async function main() {
  const rows = await prisma.asset.findMany({
    where: { isMacro: true },
    select: { symbol: true, name: true, quoteSymbol: true, isActive: true, updatedAt: true },
    orderBy: { symbol: 'asc' },
  });
  const bySymbol = new Map(rows.map((r) => [r.symbol, r]));

  console.log('key       symbol     expected name          stored name            quoteSymbol  active');
  for (const inst of MACRO_INSTRUMENTS) {
    const r = bySymbol.get(inst.symbol);
    if (!r) {
      console.log(`${inst.key.padEnd(9)} ${inst.symbol.padEnd(10)} MISSING ROW`);
      continue;
    }
    const nameOk = r.name === inst.label;
    const quoteOk = r.quoteSymbol === inst.quoteSymbol;
    console.log(
      `${inst.key.padEnd(9)} ${inst.symbol.padEnd(10)} ${inst.label.padEnd(22)} ${r.name.slice(0, 22).padEnd(22)} ${(r.quoteSymbol ?? '-').padEnd(12)} ${r.isActive}` +
        `${nameOk ? '' : '   <-- NAME CHANGED'}${quoteOk ? '' : '   <-- QUOTE SYMBOL WRONG'}`,
    );
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
