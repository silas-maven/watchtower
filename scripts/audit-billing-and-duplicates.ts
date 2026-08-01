// Read-only: two questions the owner asked.
//   1. Is the watchlist protected against duplicates?
//   2. Is payment-based access actually wired to Stripe, and what is live?
//
//   npx tsx --env-file=.env scripts/audit-billing-and-duplicates.ts
import { prisma } from '../lib/prisma';

async function main() {
  // ---- Duplicates -------------------------------------------------------
  const assets = await prisma.asset.findMany({
    select: { id: true, symbol: true, name: true, quoteSymbol: true, isActive: true, isMacro: true },
  });

  const active = assets.filter((a) => a.isActive && !a.isMacro);
  console.log(`assets: ${assets.length} total, ${active.length} active member-facing, ${assets.filter((a) => !a.isActive).length} inactive\n`);

  // Same instrument tracked under two different rows. The unique constraint is
  // on `symbol`, but two different symbols can point at the same quoteSymbol,
  // which is the same instrument priced twice.
  const byQuote = new Map<string, string[]>();
  for (const a of active) {
    if (!a.quoteSymbol) continue;
    const key = a.quoteSymbol.toUpperCase();
    byQuote.set(key, [...(byQuote.get(key) ?? []), a.symbol]);
  }
  const dupQuote = [...byQuote.entries()].filter(([, syms]) => syms.length > 1);
  console.log(`same quoteSymbol under more than one asset row: ${dupQuote.length}`);
  for (const [q, syms] of dupQuote.slice(0, 20)) console.log(`  ${q} <- ${syms.join(', ')}`);

  // Near-duplicate symbols: BARC vs BARC.L is the same company twice.
  const bare = new Map<string, string[]>();
  for (const a of active) {
    const key = a.symbol.replace(/\.(L|DE|PA|AS|MI|SW|TO|AX|HK)$/i, '').replace(/-USD$/i, '').toUpperCase();
    bare.set(key, [...(bare.get(key) ?? []), a.symbol]);
  }
  const dupBare = [...bare.entries()].filter(([, syms]) => syms.length > 1);
  console.log(`\nsame ticker with and without an exchange suffix: ${dupBare.length}`);
  for (const [k, syms] of dupBare.slice(0, 20)) console.log(`  ${k} -> ${syms.join(', ')}`);

  // Identical names under different symbols.
  const byName = new Map<string, string[]>();
  for (const a of active) {
    const key = a.name.trim().toLowerCase();
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), a.symbol]);
  }
  const dupName = [...byName.entries()].filter(([, syms]) => syms.length > 1);
  console.log(`\nidentical names under different symbols: ${dupName.length}`);
  for (const [n, syms] of dupName.slice(0, 20)) console.log(`  "${n}" -> ${syms.join(', ')}`);

  // ---- Billing ----------------------------------------------------------
  const [events, customers, mirrors, alerts, tiers] = await Promise.all([
    prisma.paymentEvent.count(),
    prisma.stripeCustomer.count(),
    prisma.subscriptionMirror.findMany({ select: { status: true, stripeSubscriptionId: true, stripeStatus: true, currentPeriodEnd: true, profile: { select: { email: true } } } }),
    prisma.billingAlert.count(),
    prisma.profile.groupBy({ by: ['tier'], _count: true }),
  ]);

  console.log('\n--- billing ---');
  console.log(`Stripe webhook events ever received : ${events}`);
  console.log(`profiles linked to a Stripe customer: ${customers}`);
  console.log(`billing alerts raised               : ${alerts}`);
  console.log(`tiers: ${tiers.map((t) => `${t.tier}=${t._count}`).join(', ')}`);
  console.log('subscription mirrors:');
  for (const m of mirrors) {
    console.log(`  ${m.profile.email.padEnd(32)} ${m.status.padEnd(8)} stripeSub=${m.stripeSubscriptionId ?? 'none'} stripeStatus=${m.stripeStatus ?? 'none'} until=${m.currentPeriodEnd?.toISOString().slice(0, 10) ?? '-'}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
