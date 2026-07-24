// Import the SPArtans watchlist universe (reference/spartans-watchlist.csv) into
// the Asset table, resolving each ticker against Yahoo so the app prices it.
//
//   Dry run (resolve + report, writes nothing):
//     npx tsx --env-file=.env scripts/import-universe.ts
//   Apply:
//     npx tsx --env-file=.env scripts/import-universe.ts --apply
//   Options:
//     --limit=N   only process the first N rows (useful for a quick check)
//
// Resolution: a bare ticker is tried first, then the crypto pair (TICKER-USD),
// then the London listing (TICKER.L). The winning symbol is stored as
// quoteSymbol, so the refresh job prices the asset without re-resolving. Rows
// that resolve to nothing are reported and skipped rather than created as dead
// assets. Idempotent: upserts on Asset.symbol, and never deactivates anything.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AssetType } from '@prisma/client';
import YahooFinance from 'yahoo-finance2';
import { prisma } from '../lib/prisma';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

type Row = { ticker: string; name: string };
type Resolved = {
  ticker: string;
  csvName: string;
  quoteSymbol: string;
  name: string;
  assetType: AssetType;
  currency: string;
};

const CHUNK = 100;

function readCsv(limit: number | null): Row[] {
  const file = path.join(process.cwd(), 'reference', 'spartans-watchlist.csv');
  const lines = readFileSync(file, 'utf8').trim().split('\n').slice(1);
  const rows: Row[] = [];
  for (const line of lines) {
    const comma = line.indexOf(',');
    const ticker = (comma === -1 ? line : line.slice(0, comma)).trim().toUpperCase();
    const name = comma === -1 ? '' : line.slice(comma + 1).trim();
    if (!ticker) continue;
    // Skip anything that is not a plausible ticker (stray notes, blanks).
    if (!/^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(ticker)) continue;
    rows.push({ ticker, name: name === '#N/A' ? '' : name });
  }
  return limit ? rows.slice(0, limit) : rows;
}

/** Map Yahoo's quoteType onto our AssetType. */
function assetTypeFor(quoteType: string | null, symbol: string): AssetType {
  switch ((quoteType ?? '').toUpperCase()) {
    case 'CRYPTOCURRENCY':
      return AssetType.CRYPTO;
    case 'ETF':
    case 'MUTUALFUND':
      return AssetType.ETF;
    case 'INDEX':
      return AssetType.INDEX;
    case 'CURRENCY':
      return AssetType.FOREX;
    case 'FUTURE':
      return AssetType.COMMODITY;
    case 'EQUITY':
      return AssetType.STOCK;
    default:
      return symbol.endsWith('-USD') ? AssetType.CRYPTO : AssetType.OTHER;
  }
}

type RawQuote = { symbol: string; quoteType: string | null; currency: string | null; name: string | null; price: number | null };

/** Chunked raw quote lookup; unknown symbols are simply absent from the map. */
async function lookup(symbols: string[]): Promise<Map<string, RawQuote>> {
  const out = new Map<string, RawQuote>();
  const unique = [...new Set(symbols)].filter(Boolean);
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    try {
      const res = await yahooFinance.quote(chunk, {}, { validateResult: false });
      const rows = Array.isArray(res) ? res : [res];
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const symbol = typeof r.symbol === 'string' ? r.symbol.toUpperCase() : null;
        if (!symbol) continue;
        const price = typeof r.regularMarketPrice === 'number' ? r.regularMarketPrice : null;
        // A symbol with no price is not tradeable data; treat it as unresolved.
        if (price == null) continue;
        out.set(symbol, {
          symbol,
          quoteType: typeof r.quoteType === 'string' ? r.quoteType : null,
          currency: typeof r.currency === 'string' ? r.currency.toUpperCase() : null,
          name:
            (typeof r.longName === 'string' && r.longName) ||
            (typeof r.shortName === 'string' && r.shortName) ||
            null,
          price,
        });
      }
    } catch (error) {
      console.warn(`  chunk ${i / CHUNK + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.stdout.write(`\r  resolved ${out.size} so far (${Math.min(i + CHUNK, unique.length)}/${unique.length} tried)   `);
  }
  process.stdout.write('\n');
  return out;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

  const rows = readCsv(limit);
  console.log(`Universe rows: ${rows.length} (${rows.filter((r) => !r.name).length} with no name in the sheet)\n`);

  const resolved = new Map<string, Resolved>();
  const pending = new Map<string, Row>(rows.map((r) => [r.ticker, r]));

  // Three passes, each trying a different symbol shape for whatever is left.
  const passes: Array<{ label: string; candidate: (t: string) => string }> = [
    { label: 'plain ticker', candidate: (t) => t },
    { label: 'crypto pair (-USD)', candidate: (t) => `${t}-USD` },
    { label: 'London listing (.L)', candidate: (t) => `${t}.L` },
    // LSE class shares are written BT.A in the sheet but BT-A.L by Yahoo.
    { label: 'London class share (BT.A -> BT-A.L)', candidate: (t) => `${t.replace(/\./g, '-')}.L` },
  ];

  for (const pass of passes) {
    if (pending.size === 0) break;
    console.log(`Pass: ${pass.label} (${pending.size} outstanding)`);
    const candidates = new Map<string, string>(); // candidate symbol -> ticker
    for (const ticker of pending.keys()) candidates.set(pass.candidate(ticker), ticker);

    const found = await lookup([...candidates.keys()]);
    for (const [candidate, ticker] of candidates) {
      const hit = found.get(candidate);
      if (!hit) continue;
      const row = pending.get(ticker)!;
      resolved.set(ticker, {
        ticker,
        csvName: row.name,
        quoteSymbol: hit.symbol,
        // Prefer the sheet's name (the academy's own wording), fall back to Yahoo.
        name: row.name || hit.name || ticker,
        assetType: assetTypeFor(hit.quoteType, hit.symbol),
        currency: hit.currency ?? 'USD',
      });
      pending.delete(ticker);
    }
    console.log(`  matched ${found.size}, still outstanding ${pending.size}\n`);
  }

  const byType = new Map<string, number>();
  for (const r of resolved.values()) byType.set(r.assetType, (byType.get(r.assetType) ?? 0) + 1);

  // Most unresolved tickers are the ones the sheet itself could not name
  // (delisted or renamed), which is expected rather than a coverage gap.
  const unresolvedUnnamed = [...pending.values()].filter((r) => !r.name).length;

  console.log('--- Resolution summary ---');
  console.log(`Resolved   : ${resolved.size}/${rows.length} (${((resolved.size / rows.length) * 100).toFixed(1)}%)`);
  console.log(`Unresolved : ${pending.size} (${unresolvedUnnamed} of these are unnamed "#N/A" rows in the sheet)`);
  console.log('By type    :', Object.fromEntries([...byType].sort((a, b) => b[1] - a[1])));
  console.log('Unresolved sample:', [...pending.keys()].slice(0, 25).join(', '));

  // Write the full unresolved list so the academy can review or correct it.
  const reportPath = path.join(process.cwd(), 'reference', 'universe-unresolved.csv');
  writeFileSync(
    reportPath,
    ['ticker,name_in_sheet', ...[...pending.values()].map((r) => `${r.ticker},${r.name || '#N/A'}`)].join('\n') + '\n',
  );
  console.log(`Unresolved list written to ${path.relative(process.cwd(), reportPath)}`);

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to write these to the database.');
    return;
  }

  console.log('\nWriting to the database...');
  let created = 0;
  let updated = 0;
  for (const r of resolved.values()) {
    const existing = await prisma.asset.findUnique({ where: { symbol: r.ticker } });
    if (existing) {
      await prisma.asset.update({
        where: { symbol: r.ticker },
        data: {
          quoteSymbol: r.quoteSymbol,
          assetType: r.assetType,
          currency: r.currency,
          // Keep any name an admin has curated; only fill a blank one.
          ...(existing.name && existing.name !== r.ticker ? {} : { name: r.name }),
        },
      });
      updated += 1;
    } else {
      await prisma.asset.create({
        data: {
          symbol: r.ticker,
          quoteSymbol: r.quoteSymbol,
          name: r.name,
          assetType: r.assetType,
          currency: r.currency,
          isMacro: false,
          isActive: true,
        },
      });
      created += 1;
    }
    if ((created + updated) % 100 === 0) process.stdout.write(`\r  written ${created + updated}/${resolved.size}   `);
  }
  process.stdout.write('\n');

  const total = await prisma.asset.count({ where: { isMacro: false, isActive: true } });
  console.log(`Created ${created}, updated ${updated}. Member-facing assets now: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
