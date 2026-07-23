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
    version: '2026.07.22',
    date: '2026-07-22',
    title: 'Feedback round two: pitch quality, inline plans and actions',
    summary:
      'Acts on the 22 July feedback: a rebuilt trade pitch (distinct sections, interpreted Financial Health with a traffic-light score, analyst price targets, a 3 to 5 year horizon), inline averaging plans on your holdings, Asset Centre action buttons, 5Y and Max charts, a live logo, subscription-end flagging, and a way to request a stock.',
    feedbackDoc: '2026-07-22 WhatsApp forward',
    groups: [
      {
        heading: 'Trade pitch',
        items: [
          {
            title: 'Rebuilt pitch: each section does its own job',
            body: 'Story now explains what the company does and its last 12 months; Weather Outside is confined to the macro section; Financial Health interprets the balance sheet, profitability, cash flow, leverage and bankruptcy risk with a red/amber/green traffic-light score; Key Risk is company-specific; the horizon is 3 to 5 years. You can reorder the sections, and there is a proper loading animation.',
            feedback: 'Feedback 3, 4, 6',
            href: '/app/assets',
            linkLabel: 'Open Asset Centre',
          },
          {
            title: 'Analyst price targets replace the execution section',
            body: 'The old Trade Plan (Execution) section is gone. In its place is a blended analyst price target (mean, range, implied upside and consensus), or a plain statement when there is no analyst coverage.',
            feedback: 'Feedback 5',
            href: '/assets/{assetId}?view=alerts',
            linkLabel: 'Open an asset',
          },
        ],
      },
      {
        heading: 'Portfolio and Asset Centre',
        items: [
          {
            title: 'Averaging plans open inline on your holdings',
            body: 'On the Portfolio holdings table, each holding now expands to show or create its averaging plan on the same page, with no jump to a separate screen.',
            feedback: 'Feedback 1',
            href: '/app/portfolio-tools/live-portfolio',
            linkLabel: 'Open Live Portfolio',
          },
          {
            title: 'Asset Centre action buttons',
            body: 'Every asset now has Add to watchlist, Add to portfolio (live or virtual) and Create plan buttons.',
            feedback: 'Feedback 7',
            href: '/assets/{assetId}',
            linkLabel: 'Open an asset',
          },
          {
            title: '5Y and Max chart ranges',
            body: 'Price history charts now include 5Y and Max alongside the shorter ranges.',
            feedback: 'Feedback 8',
            href: '/assets/{assetId}',
            linkLabel: 'Open an asset',
          },
          {
            title: 'Request a stock',
            body: 'Members can ask the academy to add a stock to the universe; requests land in an admin review queue.',
            feedback: 'Feedback 10',
            href: '/app/assets',
            linkLabel: 'Open Asset Centre',
          },
        ],
      },
      {
        heading: 'Brand and admin',
        items: [
          {
            title: 'Stock Pickers Academy logo, animated on the landing page',
            body: 'The real academy logo (the green up-trend arrow over the gold-to-green candlestick bars) now appears across the app in place of the plain SPA text chip. On the landing page it animates: the bars rise and the arrow draws itself in.',
            feedback: 'Feedback 9',
            href: '/app',
            linkLabel: 'Open Dashboard',
          },
          {
            title: 'Subscription-end flagging',
            body: 'When Stripe reports a subscription has ended or been cancelled, it is flagged in the Members billing queue for you to remove access manually. Access is never cut automatically.',
            feedback: 'Feedback 11',
            href: '/admin/members',
            linkLabel: 'Open Members',
          },
          {
            title: 'Stock request review queue',
            body: 'Member stock requests appear here to mark reviewed, added or declined.',
            feedback: 'Feedback 10',
            href: '/admin/assets',
            linkLabel: 'Open Stock Requests',
          },
        ],
      },
    ],
  },
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
