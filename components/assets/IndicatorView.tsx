'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CandleChart, type OverlaySeries } from '@/components/charts/CandleChart';
import { bollinger, sma, stochastic, type Ohlc } from '@/lib/indicators';

type Timeframe = '1d' | '1wk' | '1mo';

const TIMEFRAMES: Array<{ value: Timeframe; label: string }> = [
  { value: '1d', label: 'Daily' },
  { value: '1wk', label: 'Weekly' },
  { value: '1mo', label: 'Monthly' },
];

const COLORS = {
  bollinger: '#3b82f6',
  ma50: '#f97316',
  ma200: '#8b5cf6',
  stochK: '#3b82f6',
  stochD: '#f97316',
};

function Toggle({ label, color, checked, onChange }: { label: string; color?: string; checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="flex items-center gap-2 text-sm text-foreground">
      {color && <span className="inline-block h-0.5 w-4 rounded" style={{ background: color }} />}
      <span>{label}</span>
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? 'bg-primary' : 'bg-muted'}`}>
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition" style={{ transform: checked ? 'translateX(18px)' : 'translateX(4px)' }} />
      </span>
    </button>
  );
}

/**
 * Indicator view: candles + Bollinger(20,2) + 50/200 MA overlays with a
 * stochastics (8,5,5) lower pane. Defaults per client feedback: Bollinger and
 * Stochastics on entry; candlesticks on; MAs toggleable.
 */
export function IndicatorView({ assetId }: { assetId: string }) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [points, setPoints] = useState<Ohlc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCandles, setShowCandles] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showMa50, setShowMa50] = useState(false);
  const [showMa200, setShowMa200] = useState(false);

  const loadPoints = useCallback(async () => {
    setLoading(true);
    try {
      const range = timeframe === '1d' ? '1y' : '5y';
      const res = await fetch(`/api/assets/${assetId}/history?range=${range}&interval=${timeframe}&full=1`, { cache: 'no-store' });
      const j = await res.json();
      if (j.ok) setPoints(j.data.points ?? []);
    } catch {
      /* keep previous points */
    } finally {
      setLoading(false);
    }
  }, [assetId, timeframe]);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  const closes = useMemo(() => points.map((p) => p.close), [points]);

  const overlays = useMemo(() => {
    const out: OverlaySeries[] = [];
    const toSeries = (id: string, color: string, values: Array<number | null>, width = 1, dashed = false): OverlaySeries => ({
      id,
      color,
      width,
      dashed,
      points: values.flatMap((v, i) => (v == null ? [] : [{ time: points[i].date, value: v }])),
    });
    if (showBollinger && closes.length >= 20) {
      const bands = bollinger(closes, 20, 2);
      out.push(toSeries('bb-upper', COLORS.bollinger, bands.map((b) => b?.upper ?? null)));
      out.push(toSeries('bb-lower', COLORS.bollinger, bands.map((b) => b?.lower ?? null)));
      out.push(toSeries('bb-mid', COLORS.bollinger, bands.map((b) => b?.middle ?? null), 1, true));
    }
    if (showMa50 && closes.length >= 50) out.push(toSeries('ma50', COLORS.ma50, sma(closes, 50), 2));
    if (showMa200 && closes.length >= 200) out.push(toSeries('ma200', COLORS.ma200, sma(closes, 200), 2));
    return out;
  }, [points, closes, showBollinger, showMa50, showMa200]);

  const lowerPane = useMemo(() => {
    if (points.length < 16) return undefined;
    const stoch = stochastic(points, 8, 5, 5);
    return {
      guides: [20, 80],
      series: [
        { id: 'stoch-k', color: COLORS.stochK, width: 2 as const, points: stoch.flatMap((s, i) => (s == null ? [] : [{ time: points[i].date, value: s.k }])) },
        { id: 'stoch-d', color: COLORS.stochD, points: stoch.flatMap((s, i) => (s == null ? [] : [{ time: points[i].date, value: s.d }])) },
      ],
    };
  }, [points]);

  const latestStoch = useMemo(() => {
    if (!lowerPane) return null;
    const k = lowerPane.series[0].points.at(-1)?.value ?? null;
    const d = lowerPane.series[1].points.at(-1)?.value ?? null;
    return k == null || d == null ? null : { k, d };
  }, [lowerPane]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-muted/20 px-4 py-2.5">
          <Toggle label="Bollinger Bands (20,2)" color={COLORS.bollinger} checked={showBollinger} onChange={() => setShowBollinger((v) => !v)} />
          <Toggle label="50-day MA" color={COLORS.ma50} checked={showMa50} onChange={() => setShowMa50((v) => !v)} />
          <Toggle label="200-day MA" color={COLORS.ma200} checked={showMa200} onChange={() => setShowMa200((v) => !v)} />
          <Toggle label="Candlesticks" checked={showCandles} onChange={() => setShowCandles((v) => !v)} />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                timeframe === tf.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid h-96 place-items-center text-sm text-muted-foreground">Loading chart…</div>
      ) : (
        <CandleChart data={points} overlays={overlays} lowerPane={lowerPane} showCandles={showCandles} height={460} />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>
          Stochastics (8,5,5)
          {latestStoch && (
            <>
              {' '}· <span style={{ color: COLORS.stochK }}>%K {latestStoch.k.toFixed(2)}</span> · <span style={{ color: COLORS.stochD }}>%D {latestStoch.d.toFixed(2)}</span>
            </>
          )}
        </span>
        <span>Indicators recalculate automatically when the timeframe changes.</span>
      </div>
    </div>
  );
}
