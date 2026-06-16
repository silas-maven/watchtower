'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#ef4444', '#f97316', '#a855f7', '#14b8a6'];
const CASH_COLOR = '#ca8a04';
const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$' };
const sym = (c: string) => SYMBOLS[c] ?? `${c} `;

export function AllocationDonut({
  items,
  cashGBP,
  displayCurrency,
  gbpRate,
}: {
  items: { symbol: string; valueGBP: number }[];
  cashGBP: number;
  displayCurrency: string;
  gbpRate: number;
}) {
  const holdings = items.filter((i) => i.valueGBP > 0).sort((a, b) => b.valueGBP - a.valueGBP);
  const data = [
    ...holdings.map((h) => ({ name: h.symbol, value: h.valueGBP })),
    ...(cashGBP > 0 ? [{ name: 'CASH', value: cashGBP }] : []),
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total <= 0) return <div className="text-sm text-muted-foreground">Add holdings to see your allocation.</div>;

  const fmt = (g: number) => `${sym(displayCurrency)}${(g * gbpRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const colorFor = (name: string, i: number) => (name === 'CASH' ? CASH_COLOR : PALETTE[i % PALETTE.length]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-56 w-full shrink-0 sm:w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={1} stroke="none">
              {data.map((d, i) => (
                <Cell key={d.name} fill={colorFor(d.name, i)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="text-lg font-black text-foreground">{fmt(total)}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorFor(d.name, i) }} />
              <span className="font-semibold text-foreground">{d.name}</span>
            </span>
            <span className="text-muted-foreground">
              <span className="font-mono text-foreground">{((d.value / total) * 100).toFixed(1)}%</span> · {fmt(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
