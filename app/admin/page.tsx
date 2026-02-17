'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { watchlist as mockAssets, portfolioConfig } from '@/lib/mock';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function AdminPage() {
  const [selected, setSelected] = useState(mockAssets[0]?.id);
  const asset = useMemo(() => mockAssets.find(a => a.id === selected), [selected]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Admin (mock)</h1>
        <p className="mt-1 text-sm text-zinc-600">
          UI-only: this visualises the owner/admin inputs that replace spreadsheet editing. No DB/auth in this mock.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Portfolio settings (from sheet)">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-600">Portfolio size</span><span className="font-semibold">£{fmt(portfolioConfig.portfolioSize)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Max per stock</span><span className="font-semibold">£{fmt(portfolioConfig.maxPerStock)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Min entry</span><span className="font-semibold">£{fmt(portfolioConfig.minEntry)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">Target holdings</span><span className="font-semibold">{portfolioConfig.targetHoldings}</span></div>
            <div className="flex justify-between"><span className="text-zinc-600">No ETFs/REITs</span><span className="font-semibold">{portfolioConfig.noEtfsOrReits ? 'Yes' : 'No'}</span></div>
          </div>
          <div className="mt-3 text-xs text-zinc-500">In a real build this would be editable and stored server-side.</div>
        </Card>

        <Card title="Select asset">
          <select
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {mockAssets.map(a => (
              <option key={a.id} value={a.id}>{a.ticker} — {a.name}</option>
            ))}
          </select>
          <div className="mt-2 text-xs text-zinc-500">In a real build this would be role-gated.</div>
        </Card>

        <div className="lg:col-span-1" />

        <div className="lg:col-span-3">
          <Card title="Edit targets + trade alert (mock)">
            {!asset ? (
              <div className="text-sm text-zinc-600">No asset selected.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-xs text-zinc-600">Ticker</div>
                    <div className="text-sm font-semibold">{asset.ticker}</div>
                    <div className="mt-1 text-xs text-zinc-600">{asset.name}</div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="text-xs text-zinc-600">Target entry for averaging</div>
                    <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" readOnly value={asset.targetEntryForAveraging ?? ''} />
                    <div className="mt-3 text-xs text-zinc-600">Target exit</div>
                    <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" readOnly value={asset.targetExit ?? ''} />
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="text-xs text-zinc-600">Trade alert</div>
                    <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" readOnly value={asset.tradeAlert} />
                    <div className="mt-2 text-xs text-zinc-500">Real build: dropdown + audit trail + notify members.</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="text-xs text-zinc-600">Reason / notes</div>
                    <textarea className="mt-1 h-36 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" readOnly value={asset.reason || ''} />
                    <div className="mt-2 text-xs text-zinc-500">Real build: editable, versioned notes per asset.</div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-xs text-zinc-600">Automation hooks (planned)</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-zinc-700 space-y-1">
                      <li>When tradeAlert changes → add to daily brief + push notification</li>
                      <li>When price enters target bands → create “signal event”</li>
                      <li>Exception report if missing targets / missing data</li>
                    </ul>
                  </div>
                </div>

                <div className="md:col-span-2 text-xs text-zinc-500">
                  This mock is read-only. The goal is to show what admin inputs replace spreadsheet editing.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
