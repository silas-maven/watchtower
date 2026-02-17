export type AssetType = 'Stock' | 'ETF' | 'Commodity' | 'Crypto';

export type PortfolioConfig = {
  currency: 'GBP' | 'USD' | 'EUR';
  portfolioSize: number;
  maxPerStock: number;
  minEntry: number;
  targetHoldings: number;
  noEtfsOrReits: boolean;
};

export type WatchRow = {
  id: string;
  ticker: string;
  name: string;
  reason: string;
  assetType: AssetType;
  ccy: 'USD' | 'GBP' | 'EUR' | 'GBX';

  // prices
  currentPrice: number | null;
  entryPrice: number | null; // Trading212/Freetrade
  avgEntryPrice: number | null;
  shares: number | null;

  // derived
  currentCostGBP: number | null;
  currentValueGBP: number | null;
  weightPct: number | null;
  returnPct: number | null;

  // daily
  dailyChangePct: number | null;
  dailyChange: number | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  rangeVsYClosePct: number | null;

  // stats
  beta: number | null;
  low52: number | null;
  high52: number | null;
  volumeAvg: number | null;
  pe: number | null;
  marketCap: number | null;

  // alerts/targets
  targetEntryForAveraging: number | null;
  targetExit: number | null;
  tradeAlert: 'BUY' | 'SELL' | 'NONE';

  tags: string[];
  updatedAt: string;

  // mock sparkline series
  series30d: { day: number; price: number }[];
};

export const portfolioConfig: PortfolioConfig = {
  currency: 'GBP',
  portfolioSize: 5000,
  maxPerStock: 1000,
  minEntry: 300,
  targetHoldings: 5,
  noEtfsOrReits: true,
};

function mkSeries(base: number) {
  return Array.from({ length: 30 }).map((_, i) => {
    const noise = (Math.sin(i / 4) + Math.random() - 0.5) * (base * 0.04);
    return { day: i + 1, price: Math.max(0.01, base + noise - (15 - i) * (base * 0.003)) };
  });
}

// Mock watchlist rows based on the portfolio blotter style
export const watchlist: WatchRow[] = [
  {
    id: 'spce',
    ticker: 'SPCE',
    name: 'Virgin Galactic Holdings Inc',
    reason: 'Speculative; momentum / narrative',
    assetType: 'Stock',
    ccy: 'USD',
    currentPrice: 2.52,
    entryPrice: 3.8,
    avgEntryPrice: 3.8,
    shares: 120,
    currentCostGBP: 360,
    currentValueGBP: 240,
    weightPct: 4.8,
    returnPct: -33.3,
    dailyChangePct: 1.2,
    dailyChange: 0.03,
    dailyHigh: 2.6,
    dailyLow: 2.45,
    rangeVsYClosePct: 6.5,
    beta: 2.1,
    low52: 2.1,
    high52: 8.9,
    volumeAvg: 12000000,
    pe: null,
    marketCap: 900000000,
    targetEntryForAveraging: 2.3,
    targetExit: 4.2,
    tradeAlert: 'NONE',
    tags: ['High beta'],
    updatedAt: new Date().toISOString(),
    series30d: mkSeries(2.52),
  },
  {
    id: 'jmia',
    ticker: 'JMIA',
    name: 'Jumia Technologies AG - ADR',
    reason: 'Watch for breakout / volume return',
    assetType: 'Stock',
    ccy: 'USD',
    currentPrice: 9.34,
    entryPrice: null,
    avgEntryPrice: null,
    shares: null,
    currentCostGBP: null,
    currentValueGBP: null,
    weightPct: null,
    returnPct: null,
    dailyChangePct: -0.6,
    dailyChange: -0.06,
    dailyHigh: 9.6,
    dailyLow: 9.1,
    rangeVsYClosePct: 5.4,
    beta: 1.4,
    low52: 4.8,
    high52: 14.3,
    volumeAvg: 2100000,
    pe: null,
    marketCap: 1100000000,
    targetEntryForAveraging: 8.5,
    targetExit: 12.8,
    tradeAlert: 'BUY',
    tags: ['Watch'],
    updatedAt: new Date().toISOString(),
    series30d: mkSeries(9.34),
  },
  {
    id: 'rgb',
    ticker: 'RGB',
    name: 'Russell Inv Australian Government Bond ETF',
    reason: 'Defensive ballast (older sheet allowed ETFs)',
    assetType: 'ETF',
    ccy: 'USD',
    currentPrice: 19.02,
    entryPrice: 18.5,
    avgEntryPrice: 18.5,
    shares: 30,
    currentCostGBP: 450,
    currentValueGBP: 465,
    weightPct: 9.3,
    returnPct: 3.3,
    dailyChangePct: 0.1,
    dailyChange: 0.02,
    dailyHigh: 19.1,
    dailyLow: 18.9,
    rangeVsYClosePct: 1.1,
    beta: 0.2,
    low52: 17.9,
    high52: 20.4,
    volumeAvg: 160000,
    pe: null,
    marketCap: null,
    targetEntryForAveraging: 18.6,
    targetExit: 20.0,
    tradeAlert: 'NONE',
    tags: ['Defensive'],
    updatedAt: new Date().toISOString(),
    series30d: mkSeries(19.02),
  },
  {
    id: 'kodk',
    ticker: 'KODK',
    name: 'Eastman Kodak Co',
    reason: 'Mean reversion / catalyst watch',
    assetType: 'Stock',
    ccy: 'USD',
    currentPrice: 7.73,
    entryPrice: 8.1,
    avgEntryPrice: 8.1,
    shares: 50,
    currentCostGBP: 320,
    currentValueGBP: 300,
    weightPct: 6.0,
    returnPct: -6.2,
    dailyChangePct: 2.0,
    dailyChange: 0.15,
    dailyHigh: 7.8,
    dailyLow: 7.5,
    rangeVsYClosePct: 4.0,
    beta: 1.7,
    low52: 3.8,
    high52: 11.8,
    volumeAvg: 900000,
    pe: 22.1,
    marketCap: 600000000,
    targetEntryForAveraging: 7.2,
    targetExit: 9.5,
    tradeAlert: 'SELL',
    tags: ['Catalyst'],
    updatedAt: new Date().toISOString(),
    series30d: mkSeries(7.73),
  },
];

export type DailyBrief = {
  date: string;
  buy: string[];
  sell: string[];
  newToday: string[];
  droppedOff: string[];
  notes: string[];
};

export function mockDailyBrief(): DailyBrief {
  return {
    date: new Date().toISOString().slice(0, 10),
    buy: watchlist.filter(r => r.tradeAlert === 'BUY').map(r => r.ticker),
    sell: watchlist.filter(r => r.tradeAlert === 'SELL').map(r => r.ticker),
    newToday: ['JMIA'],
    droppedOff: ['SPCE'],
    notes: [
      'High-volatility names flagged first; confirm with structure + invalidation.',
      'Earnings calendar + FX exposure should be in the daily sweep (real build).',
    ],
  };
}
