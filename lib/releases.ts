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
    version: '2026.07.25',
    date: '2026-07-25',
    title: 'A fuller daily brief, and an optional morning email',
    summary:
      'The daily brief now separates alerts that newly triggered since yesterday from those still running, flags unusually wide trading days, and lists which of your holdings report earnings that week. Members can also opt into a morning email of their own brief.',
    feedbackDoc: '2026-07-24 WhatsApp forward (sections 6 and 7)',
    groups: [
      {
        heading: 'Daily brief',
        items: [
          {
            title: 'New alerts since yesterday, kept separate from ongoing ones',
            body: 'The brief now says plainly which buy and sell alerts newly triggered since yesterday, rather than mixing them in with alerts that have been running for days. "Since yesterday" means since midnight London time on the previous day, and the same cut-off is used for every asset, whether it trades in London, New York or continuously like crypto.',
            feedback: 'Feedback 6 (24 July)',
            href: '/app/daily-checks',
            linkLabel: 'Open Daily Checks',
          },
          {
            title: 'Unusually wide trading days, and earnings that week',
            body: 'Assets whose daily range exceeded 40% of the previous close are flagged, using the formula you specified: (high minus low) divided by previous close. Anything your holdings report that week is listed with its date. Obviously bad price data is filtered out first, so the brief does not print nonsense figures for delisted shells.',
            feedback: 'Feedback 6 (24 July)',
            href: '/app/daily-checks',
            linkLabel: 'Open Daily Checks',
          },
          {
            title: 'What the brief will not claim',
            body: 'Dividend ex-dates, rights-issue ex-dates and all-time lows are deliberately not shown, and the brief says so. The data behind them is not dependable enough: dividend dates arrive unevenly, rights issues barely at all, and an "all-time low" would really only mean the lowest price we happen to hold. Rather than quietly guess, it states that these are unavailable.',
            feedback: 'Feedback 6 (24 July)',
            href: '/app/daily-checks',
            linkLabel: 'Open Daily Checks',
          },
        ],
      },
      {
        heading: 'Email',
        items: [
          {
            title: 'Optional morning brief email',
            body: 'Members can turn on a daily email of their own brief under Account, then Preferences. It is off unless switched on, covers only the assets that member tracks, and every email carries a one-click unsubscribe that works without signing in. Each send is recorded with its outcome so failures are visible and retried, and a member can only ever receive one per day even if the job runs twice.',
            feedback: 'Feedback 7 (24 July)',
            href: '/app/account',
            linkLabel: 'Open Account',
          },
        ],
      },
      {
        heading: 'Notes for the owner',
        items: [
          {
            title: 'Action needed: the email cannot send until a provider is connected',
            body: 'The daily brief email is built and tested, but nothing will actually reach a member until an email provider key (RESEND_API_KEY) and a from-address on a domain you own are set. Until then, every attempt is recorded as "no provider configured" rather than failing quietly, so you can see it has not sent. Members can already switch the preference on in the meantime.',
            feedback: 'Setup required (25 July)',
            href: '/admin/system-jobs',
            linkLabel: 'Open System Jobs',
          },
          {
            title: 'Note: bad price data is filtered before it reaches you',
            body: 'When the wide-range check first ran against the full universe it reported a range of 553,400,848% for a delisted shell company, because the price feed returns a previous close of almost zero for dead tickers. The figures are now sanity-checked before being shown, which reduced that list from 16 entries to the 5 that are genuine. This matters more now the universe is around 900 assets rather than 14, since it includes a long tail of very small and delisted names.',
            feedback: 'Data quality (25 July)',
            href: '/app/daily-checks',
            linkLabel: 'Open Daily Checks',
          },
          {
            title: 'Note: three brief items are withheld on purpose',
            body: 'Dividend ex-dates, rights-issue ex-dates and all-time lows are not shown, and the brief says so on the page. The underlying data is not dependable: dividend dates arrive unevenly from the price provider, rights issues barely at all, and an all-time low would only really mean the lowest price we happen to hold on record. Adding them properly needs a paid corporate-actions provider and a full price-history back-fill, which are sensible things to do after beta.',
            feedback: 'Feedback 6 (24 July)',
            href: '/app/daily-checks',
            linkLabel: 'Open Daily Checks',
          },
        ],
      },
    ],
  },
  {
    version: '2026.07.24b',
    date: '2026-07-24',
    title: 'Beta blockers: holdings, brief stats, the planner and Personal Finance',
    summary:
      'Clears the 24 July beta blockers: the Daily Checks holdings summary now values your holdings live instead of showing £0, the Academy brief stat cards match the words next to them, the averaging plan is one visual with each trade defaulting 50% below the one above it, and Personal Finance is a top-level tab.',
    feedbackDoc: '2026-07-24 WhatsApp forward',
    groups: [
      {
        heading: 'Fixes',
        items: [
          {
            title: 'Holdings no longer show £0',
            body: 'Daily Checks listed your holdings but reported Invested £0 and Value £0. It was adding up two stored columns that were never filled in, while the portfolio pages worked out the value live. It now values holdings the same way the portfolio does (shares times live price, converted to £), so the two always agree. There is also a Live and Virtual toggle, so you can see either book.',
            feedback: 'Feedback 3 (24 July)',
            href: '/app/daily-checks',
            linkLabel: 'Open Daily Checks',
          },
          {
            title: 'The brief statistics match the brief',
            body: 'The Academy daily brief described one set of numbers while the cards beside it showed another, because the words were saved in the morning and the cards were recalculated as prices moved. The breadth figures are now saved with the brief and shown exactly as written, with the date they refer to.',
            feedback: 'Feedback 6 (24 July)',
            href: '/app/daily-checks',
            linkLabel: 'Open Daily Checks',
          },
        ],
      },
      {
        heading: 'Averaging plan',
        items: [
          {
            title: 'One plan visual, with sequential 50% defaults',
            body: 'The separate execution table and the duplicated "if all tranches execute" and "actual" cards are gone. There is now a single card: the amount to allocate, the tranche rows, your average entry against the current price, the total invested, the sell target, and the potential gain and value at that target. Trade 2 starts 50% below Trade 1 and Trade 3 50% below Trade 2 (so Trade 3 is 75% below Trade 1). Every price is editable, changing one re-seeds the trades below it, and a price you type yourself is never overwritten. The same visual is used on the full planner and inline on a holding.',
            feedback: 'Feedback 1 and 4 (24 July)',
            href: '/app/portfolio-tools/average-calculator',
            linkLabel: 'Open Average Planner',
          },
        ],
      },
      {
        heading: 'Navigation',
        items: [
          {
            title: 'Personal Finance is a top-level tab',
            body: 'Personal Finance has moved out of the Portfolio feature cards and into the main navigation. The mobile navigation scrolls sideways so the labels stay readable rather than being squashed.',
            feedback: 'Feedback 2 (24 July)',
            href: '/app/portfolio-tools/personal-finance',
            linkLabel: 'Open Personal Finance',
          },
        ],
      },
      {
        heading: 'Notes for the owner',
        items: [
          {
            title: 'Note: two deliberate differences from your mockup',
            body: 'First, the mockup\'s share count and average entry were not internally consistent (Trades 2 and 3 had blank allocations, yet the summary reported 86 shares), which you flagged yourself. Ours computes from the actual allocations and live exchange rates, so the numbers will not match the screenshot. Second, the percentage under Current Price is shown as your gain or loss against your average entry, rather than the mockup\'s -37.03%, which was the average measured against the current price and reads backwards for someone buying. Say the word if you would rather it mirrored the mockup exactly.',
            feedback: 'Feedback 1 and 4 (24 July)',
            href: '/app/portfolio-tools/average-calculator',
            linkLabel: 'Open Average Planner',
          },
          {
            title: 'Note: the asset universe is loaded, with a known shortfall',
            body: 'Your SPArtans watchlist is loaded: 866 of its 1,067 tickers are live and priced, alongside the macro instruments. Of the 199 that are not, 158 are rows your own sheet marks as #N/A because they have been delisted or taken over, so they no longer trade anywhere. A further 41 are named in your sheet but did not resolve; 15 of those are European listings that can be recovered on request, and the rest are genuinely dead. The full list is in reference/universe-unresolved.csv if you want to prune the sheet.',
            feedback: 'Feedback 5 (24 July)',
            href: '/app/assets',
            linkLabel: 'Open Asset Centre',
          },
        ],
      },
    ],
  },
  {
    version: '2026.07.24',
    date: '2026-07-24',
    title: 'Free vs member plans, and an investing-focused live feed',
    summary:
      'Introduces a two-tier plan: a free taster and the paid academy membership. The split is enforced on the server (not just hidden in the interface), so a free account cannot reach members-only data or tools even by other means. The master watchlist, live signals and portfolio tools are members-only; free accounts get market data, the news feed, a browsable asset list and one trade pitch. Separately, the Market Pulse feed is now pointed at investing sources.',
    feedbackDoc: '2026-07-24 WhatsApp forward (freemium and live feed)',
    groups: [
      {
        heading: 'Plans and access',
        items: [
          {
            title: 'Free taster vs paid membership',
            body: 'Free accounts get the market ticker, Weather Outside, Market Snapshot, the live news and X feed, a browsable Asset Centre and one trade pitch. The paid membership adds the curated master watchlist, live buy and sell signals, personalised watchlists, the full portfolio tools (portfolio, average planner, stress test, personal finance), the ability to request a stock and unlimited pitches. The whole member app is positioned as the paid layer; free is the doorway.',
            feedback: 'Freemium (24 July)',
            href: '/pricing',
            linkLabel: 'See the plan split',
          },
          {
            title: 'Enforced on the server, not just hidden',
            body: 'The free/paid boundary is checked on the server for every members-only page and data endpoint. A free account that navigates to, or directly calls, a members-only feature is refused the data and shown an upgrade gate. This is a hard gate, not a hidden button.',
            feedback: 'Freemium caveat: server-side gating',
            href: '/app/portfolio-tools/live-portfolio',
            linkLabel: 'Example gated tool',
          },
          {
            title: 'Upgrades are automatic, removals stay manual',
            body: 'A member is granted the paid plan automatically when Stripe reports a paid invoice or active subscription, or when you mark them paid. It is never downgraded automatically: a cancelled or unpaid subscription is flagged for you to remove access by hand, in keeping with the academy rule that access is never cut automatically. You can set a member back to free from the Members queue.',
            feedback: 'Freemium and Feedback 11',
            href: '/admin/members',
            linkLabel: 'Open Members',
          },
          {
            title: 'Trade pitches are metered',
            body: 'Each trade pitch is a real AI call, so it is metered to keep costs predictable: free accounts get one pitch, and paid members get a generous daily allowance. This prevents a runaway loop or a shared login turning into an unbounded bill, especially as the universe grows.',
            feedback: 'Freemium caveat: AI-cost metering',
            href: '/app/assets',
            linkLabel: 'Open Asset Centre',
          },
        ],
      },
      {
        heading: 'Live feed',
        items: [
          {
            title: 'Market Pulse pointed at investing sources',
            body: 'The news feed now draws from CNBC Markets, MarketWatch (real-time and top stories), Investing.com and Cointelegraph, rather than general top-news. The X panel defaults to StockTwits (native investing chatter) and can be pointed at a curated X List of investor accounts so it shows many voices in one timeline.',
            feedback: 'Live feed (24 July)',
            href: '/app',
            linkLabel: 'Open Dashboard',
          },
        ],
      },
    ],
  },
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
