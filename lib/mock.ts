export type AssetType = 'Stock' | 'ETF' | 'Commodity' | 'Crypto';

export type LevelRule = {
  id: string;
  label: string;
  type: 'BUY_ZONE' | 'SELL_ZONE' | 'INVALIDATION' | 'INFO';
  price: number;
  note?: string;
};

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  currency: 'USD' | 'GBP' | 'EUR';
  tags: string[];
  price: number;
  changePct: number;
  updatedAt: string;
  levels: LevelRule[];
};

export const assets: Asset[] = [
  {
    id: 'nvda',
    symbol: 'NVDA',
    name: 'NVIDIA',
    type: 'Stock',
    currency: 'USD',
    tags: ['AI', 'Mega-cap', 'Momentum'],
    price: 728.42,
    changePct: 1.8,
    updatedAt: new Date().toISOString(),
    levels: [
      { id: 'nvda-b1', label: 'Buy zone', type: 'BUY_ZONE', price: 705, note: 'Prior consolidation + VWAP area' },
      { id: 'nvda-s1', label: 'Trim zone', type: 'SELL_ZONE', price: 760, note: 'If extended > 2σ' },
      { id: 'nvda-i1', label: 'Invalidation', type: 'INVALIDATION', price: 670, note: 'Breakdown below structure' },
    ],
  },
  {
    id: 'spy',
    symbol: 'SPY',
    name: 'S&P 500 ETF',
    type: 'ETF',
    currency: 'USD',
    tags: ['Index', 'Core'],
    price: 512.18,
    changePct: -0.4,
    updatedAt: new Date().toISOString(),
    levels: [
      { id: 'spy-b1', label: 'Buy zone', type: 'BUY_ZONE', price: 502, note: 'Pullback to support' },
      { id: 'spy-s1', label: 'Risk-off', type: 'SELL_ZONE', price: 520, note: 'If rejects and rolls over' },
    ],
  },
  {
    id: 'xau',
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    type: 'Commodity',
    currency: 'USD',
    tags: ['Macro', 'Hedge'],
    price: 2036.5,
    changePct: 0.2,
    updatedAt: new Date().toISOString(),
    levels: [
      { id: 'xau-b1', label: 'Buy zone', type: 'BUY_ZONE', price: 2008, note: 'Demand zone' },
      { id: 'xau-s1', label: 'Take profit', type: 'SELL_ZONE', price: 2065, note: 'Upper range' },
    ],
  },
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'Crypto',
    currency: 'USD',
    tags: ['Risk', 'Volatile'],
    price: 52120,
    changePct: 2.6,
    updatedAt: new Date().toISOString(),
    levels: [
      { id: 'btc-b1', label: 'Buy zone', type: 'BUY_ZONE', price: 50500, note: 'Higher low area' },
      { id: 'btc-s1', label: 'Take profit', type: 'SELL_ZONE', price: 54500, note: 'Range high' },
      { id: 'btc-i1', label: 'Invalidation', type: 'INVALIDATION', price: 48200 },
    ],
  },
];

export type Alert = {
  id: string;
  time: string;
  assetId: string;
  symbol: string;
  kind: 'ENTER_BUY_ZONE' | 'ENTER_SELL_ZONE' | 'BREAK_INVALIDATION' | 'INFO';
  price: number;
  level?: number;
};

export function getAsset(id: string) {
  return assets.find(a => a.id === id);
}

export function mockAlerts(): Alert[] {
  const now = Date.now();
  return [
    {
      id: 'a1',
      time: new Date(now - 1000 * 60 * 14).toISOString(),
      assetId: 'nvda',
      symbol: 'NVDA',
      kind: 'ENTER_BUY_ZONE',
      price: 707.2,
      level: 705,
    },
    {
      id: 'a2',
      time: new Date(now - 1000 * 60 * 38).toISOString(),
      assetId: 'xau',
      symbol: 'XAUUSD',
      kind: 'ENTER_SELL_ZONE',
      price: 2062.1,
      level: 2065,
    },
  ];
}
