import Link from 'next/link';
import { Role } from '@prisma/client';
import { Card } from '@/components/Card';
import { AssetOperationsPanel } from '@/components/AssetOperationsPanel';
import { AssetCatalogManager } from '@/components/AssetCatalogManager';
import { MacroSettingsPanel } from '@/components/MacroSettingsPanel';
import { StockRequestsPanel } from '@/components/StockRequestsPanel';
import { HelpTip } from '@/components/ui/HelpTip';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { computeSignalState, effectiveSignalState } from '@/lib/signals/engine';
import { getFormulaParityProof } from '@/lib/server/formulaParity';
import { BlurFade } from '@/components/ui/blur-fade';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function AdminPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin');

  const [assets, parity] = await Promise.all([
    prisma.asset.findMany({
      where: { isActive: true },
      include: {
        rule: true,
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
      },
      orderBy: { symbol: 'asc' },
      take: 200,
    }).catch(() => []),
    getFormulaParityProof().catch(() => ({ sampleAsset: null, formulas: [] })),
  ]);

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.1}>
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition">← Admin</Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">Asset Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the master asset list, amend asset details, update targets, and run signal operations.
        </p>
      </div>
      </BlurFade>

      <Card title="Asset Operations">
        <AssetOperationsPanel />
      </Card>

      <Card title="Macro Readings (manual)">
        <MacroSettingsPanel />
      </Card>

      <Card title="Stock Requests">
        <StockRequestsPanel />
      </Card>

      <Card
        title={
          <span>
            Spreadsheet Function Proof
            <HelpTip text="Shows implemented spreadsheet-style functions and live sample outputs for one asset." />
          </span>
        }
      >
        <div className="text-xs text-muted-foreground mb-3">
          {parity.sampleAsset
            ? `Sample asset: ${parity.sampleAsset.symbol} (${parity.sampleAsset.name})`
            : 'No sample asset loaded.'}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3">Function</th>
                <th className="py-2 pr-3">Excel Pattern</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Sample Value</th>
              </tr>
            </thead>
            <tbody>
              {parity.formulas.map((f) => (
                <tr key={f.id} className="border-b border-border/50 align-top">
                  <td className="py-2 pr-3 font-semibold text-foreground">{f.label}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{f.excelPattern}</td>
                  <td className="py-2 pr-3">
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      {f.implemented ? 'Implemented' : 'Missing'}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{f.sampleValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Master Watchlist Editor">
        <AssetCatalogManager
          initialAssets={assets.map((asset) => {
            const snapshot = asset.snapshots[0];
            const computed = computeSignalState({
              dailyLow: snapshot?.dailyLow ?? null,
              dailyHigh: snapshot?.dailyHigh ?? null,
              targetEntry: asset.rule?.targetEntry ?? null,
              targetExit: asset.rule?.targetExit ?? null,
            });
            return {
              id: asset.id,
              symbol: asset.symbol,
              name: asset.name,
              reason: asset.reason,
              assetType: asset.assetType,
              currency: asset.currency,
              quoteSymbol: asset.quoteSymbol ?? null,
              isActive: asset.isActive,
              targetEntry: asset.rule?.targetEntry ?? null,
              targetExit: asset.rule?.targetExit ?? null,
              signalState: effectiveSignalState(computed, asset.rule?.signalOverride),
              override: asset.rule?.signalOverride ?? 'AUTO',
              currentPrice: snapshot?.currentPrice ?? null,
              dailyLow: snapshot?.dailyLow ?? null,
              dailyHigh: snapshot?.dailyHigh ?? null,
              source: snapshot?.source ?? null,
              fetchError: snapshot?.fetchError ?? null,
            };
          })}
        />
      </Card>
    </div>
  );
}
