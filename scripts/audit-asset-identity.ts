// Audit asset IDENTITY: does the name we display match the instrument we price?
//
// The 2026-07-25 universe import took the NAME from the SPArtans sheet and the
// PRICE from the quote provider using the bare ticker. Where a ticker means
// different things on different venues, those two came from different
// instruments, and the member sees one company's name above another's price.
// Confirmed live: "Bitcoin" priced at $28.75, "Litecoin" at $41.87.
//
// The provider knows the name of whatever it just priced, so that is the
// authority here. We compare it with our stored name and report the disagreements.
//
// Usage:
//   npx tsx scripts/audit-asset-identity.ts            # report only
//   npx tsx scripts/audit-asset-identity.ts --fix      # adopt the provider name
//   npx tsx scripts/audit-asset-identity.ts --fix --deactivate-unpriced

import fs from 'node:fs';
import path from 'node:path';
import YahooFinance from 'yahoo-finance2';
import { prisma } from '../lib/prisma';

const FIX = process.argv.includes('--fix');
const DEACTIVATE = process.argv.includes('--deactivate-unpriced');
const CHUNK = 100;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const STOPWORDS = new Set([
  'inc', 'plc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'group',
  'holdings', 'holding', 'sa', 'se', 'ag', 'nv', 'ab', 'as', 'the', 'and', 'of',
  'etf', 'ucits', 'trust', 'class', 'ord', 'shs', 'adr', 'publ', 'common', 'stock',
  'usd', 'gbp', 'eur', 'acc', 'spa', 'plc.', 'index', 'fund', 'shares',
]);

function tokens(name: string): Set<string> {
  return new Set(
    name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

function overlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.min(ta.size, tb.size);
}

// Below this, the stored name and the priced instrument are treated as different
// companies. Names legitimately vary in wording ("Nike Inc" vs "NIKE, Inc."), so
// the bar is deliberately loose; it is only meant to catch genuine mismatches.
const MATCH_THRESHOLD = 0.34;

type Row = { symbol: string; ours: string; theirs: string; price: number | null; score: number };

async function main() {
  // Macro rows are excluded on purpose. They carry an internal symbol (BTCUSD,
  // SPX500, GOLD) and keep the provider ticker in quoteSymbol, but this audit
  // quotes by symbol. On 27 July that mismatch put BTCUSD in the "provider will
  // not quote it" bucket and --deactivate switched it off, which is why Bitcoin
  // showed a dash on the member Dashboard for a week. The others survived only
  // because their internal symbols happen to be real tickers of other things.
  const assets = await prisma.asset.findMany({
    where: { isActive: true, isMacro: false },
    select: { id: true, symbol: true, name: true, assetType: true },
    orderBy: { symbol: 'asc' },
  });
  console.log(`auditing ${assets.length} active member-facing assets against the price provider...`);

  const mismatches: Row[] = [];
  const unpriced: string[] = [];
  let agreed = 0;

  for (let i = 0; i < assets.length; i += CHUNK) {
    const batch = assets.slice(i, i + CHUNK);
    let quotes: Array<Record<string, unknown>> = [];
    try {
      const res = await yahooFinance.quote(batch.map((a) => a.symbol));
      quotes = (Array.isArray(res) ? res : [res]) as Array<Record<string, unknown>>;
    } catch {
      // Fall back to one-at-a-time so a single bad symbol cannot blind the batch.
      for (const a of batch) {
        try {
          const q = await yahooFinance.quote(a.symbol);
          if (q) quotes.push(q as unknown as Record<string, unknown>);
        } catch { /* unresolvable; reported as unpriced below */ }
      }
    }

    const bySymbol = new Map(quotes.map((q) => [String(q.symbol ?? '').toUpperCase(), q]));
    for (const a of batch) {
      const q = bySymbol.get(a.symbol.toUpperCase());
      if (!q) { unpriced.push(a.symbol); continue; }
      const theirs = String(q.longName ?? q.shortName ?? q.displayName ?? '').trim();
      const price = typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : null;
      if (!theirs) { unpriced.push(a.symbol); continue; }
      const score = overlap(a.name, theirs);
      if (score < MATCH_THRESHOLD) mismatches.push({ symbol: a.symbol, ours: a.name, theirs, price, score });
      else agreed += 1;
    }
    process.stdout.write(`  ${Math.min(i + CHUNK, assets.length)}/${assets.length}\r`);
  }

  console.log(`\n\nname agrees with the priced instrument : ${agreed}`);
  console.log(`NAME MISMATCH (wrong instrument)       : ${mismatches.length}`);
  console.log(`no quote returned                      : ${unpriced.length}`);

  mismatches.sort((a, b) => a.score - b.score);
  const out = ['symbol|storedName|providerName|providerPrice|score'];
  for (const m of mismatches) out.push(`${m.symbol}|${m.ours}|${m.theirs}|${m.price ?? ''}|${m.score.toFixed(2)}`);
  const reviewPath = path.join(process.cwd(), 'reference', 'asset-identity-mismatches.csv');
  fs.writeFileSync(reviewPath, `${out.join('\n')}\n`);
  console.log(`\nreport: ${path.relative(process.cwd(), reviewPath)}`);

  console.log('\nworst 25:');
  for (const m of mismatches.slice(0, 25)) {
    console.log(`  ${m.symbol.padEnd(10)} ours="${m.ours.slice(0, 28)}" provider="${m.theirs.slice(0, 30)}" @ ${m.price ?? '?'}`);
  }

  if (!FIX) {
    console.log('\nREPORT ONLY. Re-run with --fix to adopt the provider name for mismatches.');
    return;
  }

  // The provider name describes the instrument we actually price and show, so
  // adopting it makes name and price consistent. This is the conservative fix:
  // it never invents a price and never silently drops an asset.
  let renamed = 0;
  for (const m of mismatches) {
    await prisma.asset.updateMany({ where: { symbol: m.symbol }, data: { name: m.theirs } });
    renamed += 1;
  }
  console.log(`\nrenamed ${renamed} assets to match the instrument being priced.`);

  if (DEACTIVATE && unpriced.length > 0) {
    const res = await prisma.asset.updateMany({ where: { symbol: { in: unpriced } }, data: { isActive: false } });
    console.log(`deactivated ${res.count} assets the provider will not quote.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
