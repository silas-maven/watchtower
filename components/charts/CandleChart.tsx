'use client';

import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type Time,
} from 'lightweight-charts';
import { useTheme } from 'next-themes';

export type OverlaySeries = {
  id: string;
  color: string;
  width?: number;
  dashed?: boolean;
  points: Array<{ time: string; value: number }>;
};

export type AlertLine = { price: number; color: string; title: string; dashed?: boolean };

export type LowerPaneSeries = {
  series: OverlaySeries[];
  // Horizontal guide levels (e.g. stochastic 20/80), drawn on the first series.
  guides?: number[];
};

/**
 * Theme-aware lightweight-charts wrapper: candlesticks (or a close line when
 * candles are toggled off), overlay lines (MAs, Bollinger), horizontal alert
 * price lines, and an optional lower indicator pane (stochastics).
 */
export function CandleChart({
  data,
  overlays = [],
  priceLines = [],
  lowerPane,
  showCandles = true,
  height = 380,
}: {
  data: Array<{ date: string; open: number; high: number; low: number; close: number }>;
  overlays?: OverlaySeries[];
  priceLines?: AlertLine[];
  lowerPane?: LowerPaneSeries;
  showCandles?: boolean;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || data.length === 0) return;

    const dark = resolvedTheme !== 'light';
    const text = dark ? '#a1a1aa' : '#52525b';
    const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const border = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: text,
        attributionLogo: false,
        panes: { separatorColor: border, enableResize: false },
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border },
      crosshair: { horzLine: { labelBackgroundColor: '#ca8a04' }, vertLine: { labelBackgroundColor: '#ca8a04' } },
      autoSize: true,
    });
    chartRef.current = chart;

    const mainSeries = showCandles
      ? chart.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#f43f5e',
          borderUpColor: '#10b981',
          borderDownColor: '#f43f5e',
          wickUpColor: '#10b981',
          wickDownColor: '#f43f5e',
        })
      : chart.addSeries(LineSeries, { color: '#ca8a04', lineWidth: 2, priceLineVisible: false });

    if (showCandles) {
      mainSeries.setData(
        data.map((d) => ({ time: d.date as Time, open: d.open, high: d.high, low: d.low, close: d.close })),
      );
    } else {
      mainSeries.setData(data.map((d) => ({ time: d.date as Time, value: d.close })));
    }

    for (const overlay of overlays) {
      const series = chart.addSeries(LineSeries, {
        color: overlay.color,
        lineWidth: (overlay.width ?? 1) as 1 | 2 | 3 | 4,
        lineStyle: overlay.dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData(overlay.points.map((p) => ({ time: p.time as Time, value: p.value })));
    }

    for (const line of priceLines) {
      mainSeries.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: 1,
        lineStyle: line.dashed === false ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
        title: line.title,
      });
    }

    if (lowerPane && lowerPane.series.length > 0) {
      let first = true;
      for (const s of lowerPane.series) {
        const series = chart.addSeries(
          LineSeries,
          {
            color: s.color,
            lineWidth: (s.width ?? 1) as 1 | 2 | 3 | 4,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          },
          1,
        );
        series.setData(s.points.map((p) => ({ time: p.time as Time, value: p.value })));
        if (first) {
          for (const guide of lowerPane.guides ?? []) {
            series.createPriceLine({
              price: guide,
              color: border,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: false,
              title: '',
            });
          }
          first = false;
        }
      }
      const panes = chart.panes();
      if (panes.length > 1) {
        panes[0].setStretchFactor(3);
        panes[1].setStretchFactor(1);
      }
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, overlays, priceLines, lowerPane, showCandles, height, resolvedTheme]);

  if (data.length === 0) {
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">No price history available.</div>;
  }

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
