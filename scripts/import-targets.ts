// Import Target Entry / Target Exit prices from the SPArtans watchlist sheet
// (captured to reference/spartans-targets.csv) onto AssetRule rows.
//
// WHY THIS IS STRICT
// -----------------
// A target price written onto the wrong company silently produces false BUY and
// SELL alerts on the master watchlist, which is worse than having no targets at
// all. Ticker letters are NOT unique across exchanges and asset classes: matching
// the sheet's "BARC" (Barclays, 528p on the LSE) by symbol alone hits an asset in
// our universe priced at $0.0034, and "LON:SSE" hits one at $0.00015. A first
// pass using symbol-suffix heuristics produced 65 such mismatches out of 284.
//
// So a row is only written when the identity is CORROBORATED by evidence beyond
// the ticker:
//   1. price  - the sheet carries its own live price for each ticker. If ours and
//               the sheet's agree within PRICE_TOLERANCE, it is the same
//               instrument. This is the strongest single signal.
//   2. name   - significant-token overlap between the sheet name and ours.
// Currency must also agree when both sides state one.
//
// Everything unresolved is written to reference/targets-unresolved.csv for a human
// to review. We would rather import 200 correct targets than 284 with 65 wrong.
//
// Usage:
//   npx tsx scripts/import-targets.ts            # dry run, writes the review file
//   npx tsx scripts/import-targets.ts --apply    # writes AssetRule rows

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');

// Our snapshot and the sheet are both "live" but captured minutes or hours apart,
// so allow ordinary intraday drift while still rejecting different instruments.
const PRICE_TOLERANCE = 0.15;

// Words that carry no identifying signal when comparing company names.
const STOPWORDS = new Set([
  'inc', 'plc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'group',
  'holdings', 'holding', 'sa', 'se', 'ag', 'nv', 'n', 'v', 'ab', 'as', 'a', 's',
  'the', 'and', 'of', 'etf', 'ucits', 'trust', 'class', 'ord', 'shs', 'adr', 'publ',
  'common', 'stock', 'usd', 'gbp', 'eur', 'acc', 'plc.', 'spa', 'plcs',
]);

type SheetRow = {
  ticker: string;
  name: string;
  currency: string;
  sheetPrice: number | null;
  targetEntry: number | null;
  targetExit: number | null;
};

function tokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

function nameOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.min(ta.size, tb.size);
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(String(v).trim().replace(/[,£$]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSheet(file: string): SheetRow[] {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').slice(1);
  const rows: SheetRow[] = [];
  for (const line of lines) {
    const [ticker, name, currency, sheetPrice, targetEntry, targetExit] = line.split('|');
    if (!ticker?.trim()) continue;
    const entry = num(targetEntry);
    const exit = num(targetExit);
    if (entry == null && exit == null) continue;
    rows.push({
      ticker: ticker.trim(),
      name: (name ?? '').trim(),
      currency: (currency ?? '').trim().toUpperCase(),
      sheetPrice: num(sheetPrice),
      targetEntry: entry,
      targetExit: exit,
    });
  }
  return rows;
}

/** Candidate DB symbols for a sheet ticker. Prefixes are exchange hints, not part of the symbol. */
function candidateSymbols(ticker: string): string[] {
  const raw = ticker.trim();
  const bare = (raw.includes(':') ? raw.split(':')[1] : raw).toUpperCase();
  const dashed = bare.replace('.', '-');
  const isLondon = /^LON:/i.test(raw);
  const out = new Set<string>([bare, dashed]);
  // London tickers carry the .L suffix in our universe.
  out.add(`${bare}.L`);
  out.add(`${dashed}.L`);
  if (!isLondon) {
    // Crypto is stored with a -USD pair suffix.
    out.add(`${bare}-USD`);
  }
  return [...out];
}

type Candidate = { id: string; symbol: string; name: string; currency: string; price: number | null };

function verify(row: SheetRow, cand: Candidate): { ok: boolean; how: string; why: string } {
  // Currency disagreement is disqualifying when both sides state one.
  if (row.currency && cand.currency && row.currency !== cand.currency) {
    // GBP and GBX are the same instrument quoted in pounds vs pence.
    const gbpPair = new Set([row.currency, cand.currency]);
    if (!(gbpPair.has('GBP') && gbpPair.has('GBX'))) {
      return { ok: false, how: '', why: `currency ${row.currency} vs ${cand.currency}` };
    }
  }

  if (row.sheetPrice != null && cand.price != null && cand.price > 0) {
    const drift = Math.abs(cand.price - row.sheetPrice) / row.sheetPrice;
    if (drift <= PRICE_TOLERANCE) {
      return { ok: true, how: 'price', why: `${cand.price} vs sheet ${row.sheetPrice} (${(drift * 100).toFixed(1)}%)` };
    }
    // A confident price disagreement means a different instrument, even if the
    // name looks similar. This is the check that catches the ticker collisions.
    return {
      ok: false,
      how: '',
      why: `price ${cand.price} vs sheet ${row.sheetPrice} (${(drift * 100).toFixed(0)}% apart)`,
    };
  }

  // Narrow exception: the crypto PAIRS (`X-USD`) were re-resolved against the
  // provider by scripts/fix-asset-identity.ts, so their names now come from the
  // provider ("Bitcoin USD"), not from this sheet. That breaks the circularity
  // described below, and the sheet carries no price for its crypto rows, so the
  // name is the only evidence available. Restricted to -USD symbols on purpose.
  if (cand.symbol.toUpperCase().endsWith('-USD') && row.name && cand.name) {
    const overlap = nameOverlap(row.name, cand.name);
    if (overlap >= 0.6) {
      return { ok: true, how: 'name(crypto pair)', why: `"${row.name}" ~ "${cand.name}" (${overlap.toFixed(2)})` };
    }
    return { ok: false, how: '', why: `crypto name "${row.name}" vs "${cand.name}" (${overlap.toFixed(2)})` };
  }

  // NO NAME-ONLY FALLBACK, DELIBERATELY.
  //
  // Our asset NAMES were themselves imported from this same sheet (the universe
  // import took name from the sheet and price from the provider), so comparing
  // the two names is circular: it always agrees and proves nothing about which
  // instrument we are actually pricing. Our "BTC" is named "Bitcoin" and priced
  // $28.75; "LTC" is "Litecoin" at $41.87. A name match would have written
  // entry 60000 onto a $28 instrument, and because computeSignalState treats
  // `targetEntry > dailyHigh` as a hit, that is a PERMANENT false BUY alert.
  //
  // Price is the only independent evidence we hold, so price is required.
  if (row.name && cand.name) {
    const overlap = nameOverlap(row.name, cand.name);
    return {
      ok: false,
      how: '',
      why: `no comparable price (name overlap ${overlap.toFixed(2)} is not independent evidence)`,
    };
  }

  return { ok: false, how: '', why: 'no price on one side; cannot corroborate the ticker' };
}

async function main() {
  const file = path.join(process.cwd(), 'reference', 'spartans-targets.csv');
  const rows = parseSheet(file);

  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    select: {
      id: true,
      symbol: true,
      name: true,
      currency: true,
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 1, select: { currentPrice: true } },
    },
  });
  const bySymbol = new Map<string, Candidate>();
  for (const a of assets) {
    bySymbol.set(a.symbol.toUpperCase(), {
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      currency: a.currency,
      price: a.snapshots[0]?.currentPrice ?? null,
    });
  }

  const resolved: Array<{ row: SheetRow; cand: Candidate; how: string; why: string }> = [];
  const unresolved: string[] = ['ticker|name|targetEntry|targetExit|matchedSymbol|reason'];
  let inverted = 0;

  for (const row of rows) {
    // An exit at or below the entry is a data-entry error: it would make the asset
    // permanently signal both buy and sell. Never import one.
    if (row.targetEntry != null && row.targetExit != null && row.targetExit <= row.targetEntry) {
      inverted += 1;
      unresolved.push(`${row.ticker}|${row.name}|${row.targetEntry}|${row.targetExit}||INVERTED: exit <= entry`);
      continue;
    }

    let best: { cand: Candidate; how: string; why: string } | null = null;
    let lastReason = 'no symbol match in the active universe';
    let lastSymbol = '';

    for (const sym of candidateSymbols(row.ticker)) {
      const cand = bySymbol.get(sym);
      if (!cand) continue;
      lastSymbol = cand.symbol;
      const v = verify(row, cand);
      if (v.ok) {
        best = { cand, how: v.how, why: v.why };
        break;
      }
      lastReason = v.why;
    }

    if (best) resolved.push({ row, ...best });
    else unresolved.push(`${row.ticker}|${row.name}|${row.targetEntry ?? ''}|${row.targetExit ?? ''}|${lastSymbol}|${lastReason}`);
  }

  const withExit = resolved.filter((r) => r.row.targetExit != null).length;
  const byPrice = resolved.filter((r) => r.how === 'price').length;
  const byName = resolved.filter((r) => r.how === 'name').length;

  console.log(`sheet rows carrying a target : ${rows.length}`);
  console.log(`corroborated matches         : ${resolved.length}  (${byPrice} by price, ${byName} by name)`);
  console.log(`  ...carrying a SELL target  : ${withExit}`);
  console.log(`rejected for review          : ${unresolved.length - 1}  (of which ${inverted} inverted)`);

  const reviewPath = path.join(process.cwd(), 'reference', 'targets-unresolved.csv');
  fs.writeFileSync(reviewPath, `${unresolved.join('\n')}\n`);
  console.log(`\nreview file: ${path.relative(process.cwd(), reviewPath)}`);

  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with --apply to write AssetRule rows.');
    console.log('\nsample of what would be written:');
    for (const r of resolved.slice(0, 12)) {
      console.log(`  ${r.cand.symbol.padEnd(10)} entry ${String(r.row.targetEntry ?? '-').padEnd(9)} exit ${String(r.row.targetExit ?? '-').padEnd(9)} [${r.how}] ${r.why}`);
    }
    return;
  }

  let written = 0;
  for (const r of resolved) {
    // Additive: only fill a field the sheet actually specifies, so an existing
    // hand-set target is never blanked by an empty sheet cell.
    const data: { targetEntry?: number; targetExit?: number } = {};
    if (r.row.targetEntry != null) data.targetEntry = r.row.targetEntry;
    if (r.row.targetExit != null) data.targetExit = r.row.targetExit;
    await prisma.assetRule.upsert({
      where: { assetId: r.cand.id },
      create: { assetId: r.cand.id, ...data, note: 'Imported from the SPArtans watchlist' },
      update: data,
    });
    written += 1;
  }
  console.log(`\nwrote ${written} AssetRule rows.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
