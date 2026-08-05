import { Calculator, CheckSquare, History, Wallet, Briefcase, ShieldAlert, PiggyBank, Percent, TrendingUp, Landmark } from 'lucide-react';

// SINGLE SOURCE OF TRUTH for the Portfolio Tools.
//
// This exists because the list used to be written out by hand in two places: the
// /app/portfolio-tools index and the "Portfolio Toolkit" grid on the Dashboard.
// When the Stress Test (19 Jul) and Personal Finance (20 Jul) were added, only
// the index was updated, so from the Dashboard, the member's usual route, those
// two tools were invisible and looked like they had been removed. Anything that
// lists the tools MUST map over this array so the two can never drift again.

export type PortfolioTool = {
  href: string;
  icon: typeof Calculator;
  iconBg: string;
  iconColor: string;
  title: string;
  /** Full copy for the Portfolio index page. */
  description: string;
  /** One-line copy for compact grids (Dashboard). */
  short: string;
  /**
   * True for the tools the academy gives away (owner's instruction, 2 Aug 2026):
   * personal finance and the two calculators are lead generation, not product.
   * Everything else in this list needs a paid membership, and each of those has
   * its own layout.tsx gate so the route cannot be reached by typing the URL.
   */
  free?: true;
  /**
   * Also surfaced on the Personal Finance page, not only under Portfolio tools.
   * The owner circled Compound Interest and CAGR in the 4 August screenshots and
   * asked for the calculators to live where people actually look for them; the
   * pension calculator joins them because it is the same kind of thing.
   */
  personalFinance?: true;
};

export const PORTFOLIO_TOOLS: PortfolioTool[] = [
  {
    href: '/app/portfolio-tools/live-portfolio',
    icon: Briefcase,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    title: 'Live Portfolio',
    description:
      'Your real holdings, valued against live prices. Track invested cost, current value, profit and return across your own positions, separate from the academy list.',
    short: 'Your real holdings, valued live.',
  },
  {
    href: '/app/portfolio-tools/virtual-portfolio',
    icon: Wallet,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    title: 'Virtual Portfolio',
    description:
      'Paper-trade the master watchlist. Add positions with live prices, set your portfolio size and per-stock budget, and watch invested value, return, cash, liquidation value and profit update in real time.',
    short: 'Paper-trade the master watchlist.',
  },
  {
    href: '/app/portfolio-tools/average-calculator',
    icon: Calculator,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Average Planner',
    description:
      'Split your budget into deterministic entry tranches. Models staged buys from the workbook, initial position, second buy, third buy, and calculates your resulting average entry price.',
    short: 'Split budget into entry tranches.',
  },
  {
    href: '/app/portfolio-tools/stress-test',
    icon: ShieldAlert,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-500',
    title: 'Portfolio Stress Test',
    description:
      'Run a Monte Carlo simulation over your live or virtual portfolio: probability of meeting your goal, expected range of outcomes, likely maximum drawdown, and where you are overexposed, explained in plain English.',
    short: 'Monte Carlo your portfolio against your goal.',
  },
  {
    href: '/app/portfolio-tools/personal-finance',
    icon: PiggyBank,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    title: 'Personal Finance',
    description:
      'Your CFO-style check-up. Enter income, expenses, savings, debts and goals, then simulate thousands of financial futures to see your emergency runway, biggest risks and the changes that matter most.',
    short: 'CFO-style check-up on your money.',
    free: true,
  },
  {
    href: '/app/portfolio-tools/compound-interest',
    icon: TrendingUp,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Compound Interest',
    description:
      'What a pot becomes over time, with or without regular top-ups. Set the rate, how often it compounds, and how often you pay in, then read the year-by-year breakdown of what came from your money and what came from growth.',
    short: 'Grow a pot over time, year by year.',
    free: true,
    personalFinance: true,
  },
  {
    href: '/app/portfolio-tools/cagr',
    icon: Percent,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    title: 'CAGR Calculator',
    description:
      'The annual growth rate behind a result. Give a starting value, an ending value and a number of years, and get the compound annual rate, the total return, and how long the same rate would take to reach a target.',
    short: 'The yearly rate behind a result.',
    free: true,
    personalFinance: true,
  },
  {
    href: '/app/portfolio-tools/pension-drawdown',
    icon: Landmark,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
    title: 'Pension Drawdown',
    description:
      'What a pension pot turns into once you stop paying in. Set the tax-free cash, the withdrawal strategy and your growth, fee and inflation assumptions, then see the income it supports, the tax on it, and the age the fund runs to.',
    short: 'Income, tax and how long a pot lasts.',
    /**
     * Free. The 4 August spec asked for this one behind the paywall; the owner
     * reversed that on 5 August after seeing the MEMBERS badge on the Personal
     * Finance page. It sits with the other give-away calculators now, which is
     * also where it belongs commercially: it runs entirely in the browser and
     * costs nothing to serve.
     */
    free: true,
    personalFinance: true,
  },
  {
    href: '/app/portfolio-tools/due-diligence',
    icon: CheckSquare,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    title: 'Due Diligence Checklist',
    description:
      'Score assets on 8 fundamental criteria — revenue growth, margins, debt, moat, management, shareholder return, macro tailwinds, and valuation — to arrive at a Conviction Score.',
    short: 'Score assets to a Conviction Score.',
  },
  {
    href: '/app/portfolio-tools/trade-journal',
    icon: History,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    title: 'Trade Journal',
    description:
      'Log closed positions, track realized profit & loss, and monitor your all-time win rate. Your personal trophy cabinet for every trade you make.',
    short: 'Log closed trades and win rate.',
  },
];
