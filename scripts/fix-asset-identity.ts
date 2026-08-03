// Repair assets whose displayed NAME and quoted PRICE come from different
// instruments.
//
// HOW THEY GOT THAT WAY
// ---------------------
// The 2026-07-25 universe import took the NAME from the SPArtans sheet and the
// PRICE from the quote provider, resolving the bare ticker with a permissive
// fallback chain that included crypto pairs. Where a ticker means different
// things on different venues the two halves came from different instruments, so
// the member sees one company's name above another's price. Live examples:
//   BARC  "Barclays PLC"                    priced $0.0034   (a micro-cap token)
//   SSE   "Silver Spruce Resources Inc"     priced $0.00014
//   DUKE  "Duke Capital Ltd"                priced 2.19e-7
//   LTC   "Litecoin"                        priced $41.87    (LTC Properties Inc)
//   BTC   "Bitcoin"                         priced $28.75
// DUKE is also the row that produced the 553,400,848% daily range in the brief.
// That was previously treated with plausibility bounds; this is the actual cause.
//
// STRATEGY, in order of preference
// --------------------------------
//   1. RECOVER the instrument the academy meant. The stored name is the intent.
//      If a suffixed symbol resolves to an instrument whose provider name matches
//      that name, repoint the asset at it and clear the stale price history.
//        intended crypto -> SYMBOL-USD        London equity -> SYMBOL.L
//   2. ADOPT the provider name, when no alternate matches but the provider does
//      return a real name for what we price. The name stops lying about the price.
//   3. DEACTIVATE, when the row is neither correctly named nor correctly priced
//      (a junk token the academy never listed, or an unresolvable ticker).
//
// Nothing invents a price and nothing is deleted; deactivation is reversible.
//
// Usage:
//   npx tsx scripts/fix-asset-identity.ts           # dry run
//   npx tsx scripts/fix-asset-identity.ts --apply

import fs from 'node:fs';
import path from 'node:path';
import YahooFinance from 'yahoo-finance2';
import { AssetType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// The coins the academy actually lists, from the crypto block at the top of the
// SPArtans sheet. A REVIEWED list on purpose: a heuristic is what produced this
// mess, and "-USD exists" is true for a great many tickers that are not coins
// (IBM-USD resolves to an IBM derivatives product).
const INTENDED_CRYPTO = new Set(['BTC', 'ETH', 'LTC', 'XRP', 'ADA', 'BNB', 'SOL', 'AVAX', 'LINK', 'RNDR', 'FET', 'DOGE']);

const STOPWORDS = new Set([
  'inc', 'plc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'group',
  'holdings', 'holding', 'sa', 'se', 'ag', 'nv', 'ab', 'as', 'the', 'and', 'of',
  'etf', 'ucits', 'trust', 'class', 'ord', 'shs', 'adr', 'publ', 'common', 'stock',
  'usd', 'gbp', 'eur', 'acc', 'spa', 'index', 'fund', 'shares',
]);

function tokens(name: string): Set<string> {
  return new Set(
    name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

function overlap(a: string, b: string): number {
  const ta = tokens(a); const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.min(ta.size, tb.size);
}

/** A provider "name" that is only digits is the provider failing to resolve the ticker. */
const isJunkName = (name: string): boolean => /^\d+$/.test(name.trim());

type Quote = { name: string; price: number | null; currency: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Distinguishes "the provider says this ticker is X" from "the lookup failed".
 * That difference decides whether an asset may be deactivated, so a throttled
 * request must never be mistaken for a ticker that does not exist.
 */
async function quote(symbol: string): Promise<{ ok: true; quote: Quote | null } | { ok: false }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const q = (await yahooFinance.quote(symbol)) as unknown as Record<string, unknown> | null;
      if (!q) return { ok: true, quote: null };
      const name = String(q.longName ?? q.shortName ?? q.displayName ?? '').trim();
      if (!name) return { ok: true, quote: null };
      return {
        ok: true,
        quote: {
          name,
          price: typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : null,
          currency: q.currency ? String(q.currency) : null,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // "not found" is a real answer; anything else is treated as a failed lookup.
      if (/not found|No data found|invalid/i.test(msg)) return { ok: true, quote: null };
      await sleep(400 * (attempt + 1));
    }
  }
  return { ok: false };
}

type Recover = { kind: 'recover'; symbol: string; newSymbol: string; ours: string; providerName: string; price: number | null; currency: string | null; assetType: AssetType; why: string };
type Adopt = { kind: 'adopt'; symbol: string; ours: string; providerName: string; price: number | null };
type Deactivate = { kind: 'deactivate'; symbol: string; ours: string; reason: string };
type Action = Recover | Adopt | Deactivate;

function currencyFor(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const up = raw.toUpperCase();
  return up === 'GBP' ? 'GBX' : up;
}

async function main() {
  const taken = new Set(
    (await prisma.asset.findMany({ select: { symbol: true } })).map((a) => a.symbol.toUpperCase()),
  );
  const actions: Action[] = [];
  const seen = new Set<string>();
  const review: string[] = [];

  // ---- Pass 1: the coins the academy lists must be the -USD pair -------------
  const cryptoCandidates = await prisma.asset.findMany({
    where: { isActive: true, isMacro: false, symbol: { in: [...INTENDED_CRYPTO] } },
    select: { symbol: true, name: true },
  });
  for (const a of cryptoCandidates) {
    const target = `${a.symbol.toUpperCase()}-USD`;
    if (taken.has(target)) {
      actions.push({ kind: 'deactivate', symbol: a.symbol, ours: a.name, reason: `duplicate of ${target}, which we already hold` });
      seen.add(a.symbol);
      continue;
    }
    const res = await quote(target);
    if (!res.ok || !res.quote) continue;
    actions.push({
      kind: 'recover', symbol: a.symbol, newSymbol: target, ours: a.name,
      providerName: res.quote.name, price: res.quote.price, currency: res.quote.currency,
      assetType: AssetType.CRYPTO, why: 'listed coin, must be the USD pair',
    });
    seen.add(a.symbol);
  }

  // ---- Pass 2: equities wrongly priced through a "-USD" quoteSymbol ----------
  //
  // THE ROOT CAUSE. The universe import used `${ticker}-USD` as a resolution
  // fallback. A crypto token exists for very nearly every short ticker, so that
  // fallback essentially never failed, and it silently captured real equities:
  //   EB   "Eventbrite"          -> EB-USD   at $0.0000042  (NYSE:EB is ~$4.49)
  //   KERN "Kering SA"           -> KERN-USD at $1.80
  //   GWS  "Great-West Lifeco"   -> GWS-USD  at $36,113
  // The repair is to drop the bad override and price the bare ticker, which is
  // usually the listing the academy meant. Only if that fails do we try London,
  // and only if THAT fails is the row genuinely a token nobody asked for.
  // isMacro is excluded here and in every other pass. The macro instruments
  // behind the Weather / Market Snapshot tiles legitimately carry an internal
  // symbol with the provider ticker in quoteSymbol, and Bitcoin's is BTC-USD.
  // Without this filter, this pass tried to price the bare symbol "BTCUSD",
  // failed, concluded the row was a stray token and deactivated it on 27 July.
  // The tile then read as a dash on the member Dashboard until 3 August.
  const tokenPriced = await prisma.asset.findMany({
    where: { isActive: true, isMacro: false, quoteSymbol: { endsWith: '-USD' } },
    select: { symbol: true, name: true },
  });
  for (const a of tokenPriced) {
    if (seen.has(a.symbol) || INTENDED_CRYPTO.has(a.symbol.toUpperCase())) continue;
    seen.add(a.symbol);

    const bare = a.symbol.toUpperCase();
    // Score BOTH candidates and take the better one. Taking the first that clears
    // the bar picked "Black Box Corporation" for BBOX (overlap exactly 0.50) over
    // the correct "Tritax Big Box" on BBOX.L.
    const options: Array<{ sym: string; why: string }> = [
      { sym: bare, why: 'dropped the bad -USD override' },
      ...(taken.has(`${bare}.L`) ? [] : [{ sym: `${bare}.L`, why: 'equity recovered on the London listing' }]),
    ];

    let best: { sym: string; why: string; q: Quote; score: number } | null = null;
    let lookupFailed = false;
    for (const opt of options) {
      const res = await quote(opt.sym);
      if (!res.ok) { lookupFailed = true; continue; }
      const q = res.quote;
      // A recovery with no price fixes nothing, so require one.
      if (!q || isJunkName(q.name) || q.price == null) continue;
      const score = overlap(a.name, q.name);
      if (score >= 0.5 && (!best || score > best.score)) best = { sym: opt.sym, why: opt.why, q, score };
    }

    if (best) {
      actions.push({
        kind: 'recover', symbol: a.symbol, newSymbol: best.sym, ours: a.name,
        providerName: best.q.name, price: best.q.price, currency: best.q.currency,
        assetType: best.sym.endsWith('.L') ? AssetType.STOCK : AssetType.STOCK,
        why: `${best.why} (name ${best.score.toFixed(2)})`,
      });
      continue;
    }

    if (lookupFailed) {
      // Never retire an asset because the provider was unreachable.
      review.push(`${a.symbol}|${a.name}|provider lookup failed; left untouched, re-run to retry`);
      continue;
    }

    actions.push({ kind: 'deactivate', symbol: a.symbol, ours: a.name, reason: 'priced as a token; no equity listing resolves' });
  }

  // ---- Pass 3: the remaining name/price mismatches from the audit ------------
  const reportPath = path.join(process.cwd(), 'reference', 'asset-identity-mismatches.csv');
  if (fs.existsSync(reportPath)) {
    const rows = fs.readFileSync(reportPath, 'utf8').trim().split('\n').slice(1)
      .map((l) => { const [symbol, ours, theirs, price] = l.split('|'); return { symbol, ours, theirs, price }; });
    for (const r of rows) {
      if (seen.has(r.symbol)) continue;
      const alt = `${r.symbol.replace(/\.L$/i, '').toUpperCase()}.L`;
      if (alt.toUpperCase() !== r.symbol.toUpperCase() && !taken.has(alt.toUpperCase())) {
        const res = await quote(alt);
        const q = res.ok ? res.quote : null;
        if (q && !isJunkName(q.name) && q.price != null && overlap(r.ours, q.name) >= 0.5) {
          actions.push({
            kind: 'recover', symbol: r.symbol, newSymbol: alt, ours: r.ours,
            providerName: q.name, price: q.price, currency: q.currency,
            assetType: AssetType.STOCK, why: 'London listing recovered',
          });
          seen.add(r.symbol);
          continue;
        }
        if (!res.ok) { review.push(`${r.symbol}|${r.ours}|provider lookup failed; left untouched`); seen.add(r.symbol); continue; }
      }
      if (!r.theirs || isJunkName(r.theirs)) {
        actions.push({ kind: 'deactivate', symbol: r.symbol, ours: r.ours, reason: r.theirs ? `provider returned "${r.theirs}"` : 'provider returned no name' });
      } else {
        actions.push({ kind: 'adopt', symbol: r.symbol, ours: r.ours, providerName: r.theirs, price: r.price ? Number(r.price) : null });
      }
      seen.add(r.symbol);
    }
  }

  const recover = actions.filter((a): a is Recover => a.kind === 'recover');
  const adopt = actions.filter((a): a is Adopt => a.kind === 'adopt');
  const deact = actions.filter((a): a is Deactivate => a.kind === 'deactivate');

  console.log(`RECOVER intended instrument : ${recover.length}`);
  for (const a of recover) console.log(`   ${a.symbol.padEnd(9)} -> ${a.newSymbol.padEnd(11)} "${a.providerName.slice(0, 34)}" @ ${a.price ?? '?'} ${a.currency ?? ''}  [${a.why}]`);
  console.log(`\nADOPT provider name         : ${adopt.length}`);
  for (const a of adopt) console.log(`   ${a.symbol.padEnd(9)} "${a.ours.slice(0, 26)}" -> "${a.providerName.slice(0, 32)}"`);
  console.log(`\nDEACTIVATE                  : ${deact.length}`);
  for (const a of deact.slice(0, 40)) console.log(`   ${a.symbol.padEnd(9)} "${a.ours.slice(0, 30)}" (${a.reason})`);
  if (deact.length > 40) console.log(`   ...and ${deact.length - 40} more`);

  const log = ['action|symbol|newSymbol|storedName|providerName|price|reason'];
  for (const a of recover) log.push(`recover|${a.symbol}|${a.newSymbol}|${a.ours}|${a.providerName}|${a.price ?? ''}|${a.why}`);
  for (const a of adopt) log.push(`adopt|${a.symbol}||${a.ours}|${a.providerName}|${a.price ?? ''}|name adopted`);
  for (const a of deact) log.push(`deactivate|${a.symbol}||${a.ours}|||${a.reason}`);
  for (const r of review) log.push(`review|${r.split('|')[0]}||${r.split('|')[1]}|||${r.split('|')[2]}`);
  const outPath = path.join(process.cwd(), 'reference', 'asset-identity-repairs.csv');
  fs.writeFileSync(outPath, `${log.join('\n')}\n`);
  console.log(`\nLEFT FOR REVIEW (lookup failed)  : ${review.length}`);
  console.log(`full plan: ${path.relative(process.cwd(), outPath)}`);

  if (!APPLY) { console.log('\nDRY RUN. Re-run with --apply.'); return; }

  for (const a of recover) {
    const asset = await prisma.asset.findUnique({ where: { symbol: a.symbol }, select: { id: true } });
    if (!asset) continue;
    // Every stored snapshot was priced from the WRONG instrument, so the history
    // and any signals derived from it must go with it.
    await prisma.assetSnapshot.deleteMany({ where: { assetId: asset.id } });
    await prisma.signalEvent.deleteMany({ where: { assetId: asset.id } });
    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        symbol: a.newSymbol, quoteSymbol: a.newSymbol, name: a.providerName,
        assetType: a.assetType, ...(currencyFor(a.currency) ? { currency: currencyFor(a.currency) } : {}),
      },
    });
  }
  console.log(`\nrecovered ${recover.length} (stale snapshots + signal events cleared)`);

  for (const a of adopt) await prisma.asset.updateMany({ where: { symbol: a.symbol }, data: { name: a.providerName } });
  console.log(`renamed ${adopt.length}`);

  if (deact.length > 0) {
    const res = await prisma.asset.updateMany({ where: { symbol: { in: deact.map((d) => d.symbol) } }, data: { isActive: false } });
    console.log(`deactivated ${res.count}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
