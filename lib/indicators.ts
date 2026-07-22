// Deterministic technical indicators for the asset detail charts and Key
// fields card. Pure functions over OHLC series ordered oldest -> newest.
// Output arrays are aligned to the input by index; positions without enough
// history are null.

export type Ohlc = { date: string; open: number; high: number; low: number; close: number };

/** Simple moving average of closes. */
export function sma(closes: Array<number>, period: number): Array<number | null> {
  const out: Array<number | null> = new Array(closes.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < closes.length; i += 1) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export type BollingerPoint = { middle: number; upper: number; lower: number };

/** Bollinger Bands over closes: SMA(period) +/- stdDevs * population std dev. */
export function bollinger(closes: Array<number>, period = 20, stdDevs = 2): Array<BollingerPoint | null> {
  const out: Array<BollingerPoint | null> = new Array(closes.length).fill(null);
  if (period <= 0) return out;
  const middles = sma(closes, period);
  for (let i = period - 1; i < closes.length; i += 1) {
    const middle = middles[i];
    if (middle == null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const d = closes[j] - middle;
      variance += d * d;
    }
    const sd = Math.sqrt(variance / period);
    out[i] = { middle, upper: middle + stdDevs * sd, lower: middle - stdDevs * sd };
  }
  return out;
}

export type StochasticPoint = { k: number; d: number };

/**
 * Slow stochastic oscillator (kPeriod, kSmoothing, dPeriod) - the academy uses
 * (8,5,5). Raw %K = 100 * (close - lowestLow) / (highestHigh - lowestLow) over
 * kPeriod bars; slow %K = SMA(raw, kSmoothing); %D = SMA(slow %K, dPeriod).
 */
export function stochastic(points: Array<Pick<Ohlc, 'high' | 'low' | 'close'>>, kPeriod = 8, kSmoothing = 5, dPeriod = 5): Array<StochasticPoint | null> {
  const n = points.length;
  const raw: Array<number | null> = new Array(n).fill(null);
  for (let i = kPeriod - 1; i < n; i += 1) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j += 1) {
      if (points[j].high > hi) hi = points[j].high;
      if (points[j].low < lo) lo = points[j].low;
    }
    const range = hi - lo;
    raw[i] = range <= 0 ? 50 : ((points[i].close - lo) / range) * 100;
  }

  const smaOverNullable = (values: Array<number | null>, period: number): Array<number | null> => {
    const out: Array<number | null> = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] == null) continue;
      let sum = 0;
      let count = 0;
      for (let j = i; j > i - period && j >= 0; j -= 1) {
        const v = values[j];
        if (v == null) { count = 0; break; }
        sum += v;
        count += 1;
      }
      if (count === period) out[i] = sum / period;
    }
    return out;
  };

  const slowK = smaOverNullable(raw, kSmoothing);
  const d = smaOverNullable(slowK, dPeriod);

  const out: Array<StochasticPoint | null> = new Array(n).fill(null);
  for (let i = 0; i < n; i += 1) {
    if (slowK[i] != null && d[i] != null) out[i] = { k: slowK[i]!, d: d[i]! };
  }
  return out;
}

/** Latest stochastic %K for the Key fields card, or null without enough bars. */
export function latestStochasticK(points: Array<Pick<Ohlc, 'high' | 'low' | 'close'>>, kPeriod = 8, kSmoothing = 5, dPeriod = 5): number | null {
  const series = stochastic(points, kPeriod, kSmoothing, dPeriod);
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i] != null) return series[i]!.k;
  }
  return null;
}
