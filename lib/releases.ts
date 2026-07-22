// Release notes shown to admins in-app (/admin/releases). Single source of
// truth: each item ties a shipped change back to the client feedback section it
// came from, and links to where it lives in the app so the owner can click
// straight to it. Deep links that target a specific asset use {assetId}, which
// the page replaces with a live sample asset (falling back to the Asset Centre).

export type ReleaseItem = {
  title: string;
  body: string;
  feedback: string; // e.g. "Feedback A" -> section in the 2026-07-19 doc
  href: string; // may contain {assetId}
  linkLabel: string;
};

export type ReleaseGroup = { heading: string; items: ReleaseItem[] };

export type Release = {
  version: string;
  date: string; // ISO date
  title: string;
  summary: string;
  feedbackDoc: string; // human reference to the source feedback
  groups: ReleaseGroup[];
};

export const RELEASES: Release[] = [
  {
    version: '2026.07',
    date: '2026-07-21',
    title: 'Client feedback round: research workspace upgrade',
    summary:
      'Implements the 19 July feedback in full: richer asset detail, indicator charts and price alerts, an asset library with classes and filters, a live market ticker, the Weather Outside dashboard, a trade pitch generator, and two AI portfolio tools.',
    feedbackDoc: '2026-07-19 WhatsApp feedback',
    groups: [
      {
        heading: 'Asset detail',
        items: [
          {
            title: 'Expanded Key fields card',
            body: 'Added Market Cap with course-table size labels, renamed PE to P/E Ratio, and added Sector P/E, 50d and 200d moving averages, quick, current and D/E ratios, next earnings date, dividend yield and a colour-coded Stochastic (8,5,5).',
            feedback: 'Feedback A',
            href: '/assets/{assetId}',
            linkLabel: 'Open an asset',
          },
          {
            title: 'Indicator view with candlesticks',
            body: 'New chart view with candlesticks, Bollinger Bands (20,2), 50d and 200d moving averages and a Stochastics panel. Daily, Weekly and Monthly timeframes recalculate automatically, with on/off toggles per indicator.',
            feedback: 'Feedback B',
            href: '/assets/{assetId}?view=indicator',
            linkLabel: 'Open Indicator view',
          },
          {
            title: 'Price alerts view',
            body: 'Buy and sell alert cards with labelled lines on the chart, multi-tranche buy alerts from the averaging plan, your live/virtual position summary with unrealised P/L, the Spartan signal badge, a tranche tracker and the last alert triggered.',
            feedback: 'Feedback C',
            href: '/assets/{assetId}?view=alerts',
            linkLabel: 'Open Price alerts',
          },
        ],
      },
      {
        heading: 'Asset Centre and Watchlists',
        items: [
          {
            title: 'Asset Class and Product columns, plus filters',
            body: 'Both tables now show Asset Class and Product, with filters for buy/sell/both alerts, currency and market-cap size, and a fast-access link to the Master Watchlist.',
            feedback: 'Feedback D',
            href: '/app/assets',
            linkLabel: 'Open Asset Centre',
          },
          {
            title: 'Average Planner: manual tranche amounts',
            body: 'Each tranche now has its own editable allocation. Split evenly is a button that pre-fills equal amounts, and every tranche stays editable afterwards.',
            feedback: 'Feedback I',
            href: '/app/portfolio-tools/average-calculator',
            linkLabel: 'Open Average Planner',
          },
        ],
      },
      {
        heading: 'Navigation and dashboard',
        items: [
          {
            title: 'Live market ticker and renamed navigation',
            body: 'A live market ticker runs across the top of every page (each item clickable through to the Asset Centre), and navigation matches your mockup: Dashboard, Asset Centre and Portfolio.',
            feedback: 'Feedback E and J',
            href: '/app',
            linkLabel: 'Open Dashboard',
          },
          {
            title: 'Weather Outside and Market Snapshot',
            body: 'The dashboard opens with the Weather Outside panel (Sunny, Mixed, Stormy or Frosty, judged from live macro data) and a Market Snapshot grid that expands from two rows to three via View full market dashboard.',
            feedback: 'Feedback F',
            href: '/app',
            linkLabel: 'Open Dashboard',
          },
        ],
      },
      {
        heading: 'AI tools',
        items: [
          {
            title: 'Generate pitch',
            body: 'A Generate pitch button on every Asset Centre row and on the Price alerts view produces a 90-second pitch across all ten sections of your Trade Idea Interview Checklist. The numbers are computed by the platform; the AI only narrates them.',
            feedback: 'Feedback K',
            href: '/app/assets',
            linkLabel: 'Open Asset Centre',
          },
          {
            title: 'Portfolio Stress Test',
            body: 'Runs a Monte Carlo simulation over your live or virtual portfolio: probability of meeting your goal, expected range of returns, likely maximum drawdown and overexposure by stock, currency and cash, with a plain-English Chief Risk Officer read.',
            feedback: 'Feedback G',
            href: '/app/portfolio-tools/stress-test',
            linkLabel: 'Open Stress Test',
          },
          {
            title: 'Personal Finance',
            body: 'A private CFO-style tool: enter your income, expenses, savings, debts and goals to simulate thousands of financial futures, with your emergency runway, biggest risks and the changes that matter most.',
            feedback: 'Feedback H',
            href: '/app/portfolio-tools/personal-finance',
            linkLabel: 'Open Personal Finance',
          },
        ],
      },
      {
        heading: 'Market data',
        items: [
          {
            title: 'BOE Base Rate and Sector P/E now auto-update',
            body: 'The BOE Base Rate auto-updates from the free Bank of England feed, and Sector P/E auto-populates from the sector ETFs (a US-sector benchmark). The UK 10Y Gilt and iTraxx 5Y have no free feed and stay manual. All are managed under Macro Readings.',
            feedback: 'Feedback L and section 10 of the roundup',
            href: '/admin/assets',
            linkLabel: 'Open Macro Readings',
          },
        ],
      },
    ],
  },
];

export function resolveHref(href: string, sampleAssetId: string | null): string {
  if (!href.includes('{assetId}')) return href;
  if (sampleAssetId) return href.replace('{assetId}', sampleAssetId);
  // No live asset to point at: fall back to the Asset Centre.
  return '/app/assets';
}
