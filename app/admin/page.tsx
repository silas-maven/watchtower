'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { watchlist as mockAssets } from '@/lib/mock';

export default function AdminPage() {
  const [selected, setSelected] = useState(mockAssets[0]?.id);
  const asset = useMemo(() => mockAssets.find(a => a.id === selected), [selected]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Admin (mock)</h1>
        <p className="mt-1 text-sm text-zinc-600">
          UI-only: this visualises the “backend inputs” requirement. No DB/auth in this mock.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Select asset">
          <select
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {mockAssets.map(a => (
              <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>
            ))}
          </select>
          <div className="mt-2 text-xs text-zinc-500">In a real build this would be role-gated (admin only).</div>
        </Card>

        <div className="lg:col-span-2">
          <Card title="Edit levels (mock)">
            {!asset ? (
              <div className="text-sm text-zinc-600">No asset selected.</div>
            ) : (
              <div className="space-y-3">
                {asset.levels.map(l => (
                  <div key={l.id} className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-zinc-600">Label</div>
                      <div className="text-sm font-semibold">{l.label}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-600">Type</div>
                      <div className="text-sm font-semibold">{l.type.replaceAll('_',' ')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-600">Price</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                        defaultValue={String(l.price)}
                        readOnly
                      />
                    </div>
                    {l.note && (
                      <div className="sm:col-span-3">
                        <div className="text-xs text-zinc-600">Note</div>
                        <div className="text-sm text-zinc-700">{l.note}</div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="text-xs text-zinc-500">
                  Inputs are read-only in this mock. Real build: editable + saved to DB + triggers alert evaluation.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
