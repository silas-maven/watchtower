// Read-only: what the sell-signal mirror clause changes on the live universe.
//
// The fix makes a sell fire when the whole day traded ABOVE the exit target,
// mirroring the existing buy rule for a day spent entirely below the entry
// target. Assets already above their sell target will therefore flip from NONE
// to SELL on the first refresh after deploy, and each flip emits a SignalEvent.
// Worth knowing the size of that burst before shipping it.
//
//   npx tsx --env-file=.env scripts/audit-signal-change.ts
import { SignalState } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { computeSignalState } from '../lib/signals/engine';

/** The engine exactly as it behaved before the mirror clause was added. */
function computeOld(input: {
  dailyLow: number | null;
  dailyHigh: number | null;
  targetEntry: number | null;
  targetExit: number | null;
}): SignalState {
  const { dailyLow, dailyHigh, targetEntry, targetExit } = input;
  const hasRange = dailyLow != null && dailyHigh != null;
  const entryHit =
    targetEntry != null &&
    ((hasRange && dailyLow <= targetEntry && targetEntry <= dailyHigh) || (dailyHigh != null && targetEntry > dailyHigh));
  const exitHit = targetExit != null && hasRange && dailyLow <= targetExit && targetExit <= dailyHigh;
  if (entryHit && exitHit) return SignalState.BOTH;
  if (entryHit) return SignalState.BUY;
  if (exitHit) return SignalState.SELL;
  return SignalState.NONE;
}

async function main() {
  const assets = await prisma.asset.findMany({
    where: { isMacro: false, isActive: true },
    select: {
      symbol: true,
      name: true,
      currency: true,
      rule: { select: { targetEntry: true, targetExit: true } },
      snapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
        select: { dailyLow: true, dailyHigh: true, currentPrice: true, signalState: true },
      },
    },
  });

  const withEntry = assets.filter((a) => a.rule?.targetEntry != null).length;
  const withExit = assets.filter((a) => a.rule?.targetExit != null).length;
  console.log(`active assets      : ${assets.length}`);
  console.log(`with a buy target  : ${withEntry}`);
  console.log(`with a sell target : ${withExit}\n`);

  const before = new Map<string, number>();
  const after = new Map<string, number>();
  const changed: Array<{ symbol: string; name: string; from: SignalState; to: SignalState; detail: string }> = [];

  for (const a of assets) {
    const snap = a.snapshots[0];
    const input = {
      dailyLow: snap?.dailyLow ?? null,
      dailyHigh: snap?.dailyHigh ?? null,
      targetEntry: a.rule?.targetEntry ?? null,
      targetExit: a.rule?.targetExit ?? null,
    };
    const from = computeOld(input);
    const to = computeSignalState(input);
    before.set(from, (before.get(from) ?? 0) + 1);
    after.set(to, (after.get(to) ?? 0) + 1);
    if (from !== to) {
      changed.push({
        symbol: a.symbol,
        name: a.name,
        from,
        to,
        detail: `price ${snap?.currentPrice ?? '?'} range ${snap?.dailyLow ?? '?'}-${snap?.dailyHigh ?? '?'} exit ${input.targetExit} ${a.currency}`,
      });
    }
  }

  const states: SignalState[] = [SignalState.NONE, SignalState.BUY, SignalState.SELL, SignalState.BOTH];
  console.log('state distribution (computed from the latest snapshot):');
  console.log(`  ${'state'.padEnd(6)} ${'before'.padStart(6)} ${'after'.padStart(6)}`);
  for (const s of states) {
    console.log(`  ${s.padEnd(6)} ${String(before.get(s) ?? 0).padStart(6)} ${String(after.get(s) ?? 0).padStart(6)}`);
  }

  console.log(`\n${changed.length} asset(s) change state, so that many SignalEvents fire on the next refresh:`);
  for (const c of changed.slice(0, 40)) {
    console.log(`  ${c.symbol.padEnd(12)} ${c.from} -> ${c.to}   ${c.name.slice(0, 30).padEnd(30)} ${c.detail}`);
  }
  if (changed.length > 40) console.log(`  ...and ${changed.length - 40} more`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
