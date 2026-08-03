/**
 * The paid side of the product, and the words used to explain each part of it.
 *
 * Deliberately dependency-free so client components can import the copy without
 * dragging Prisma and the auth layer into the browser bundle. The entitlement
 * decisions themselves live in lib/entitlements.ts, which re-exports this.
 *
 * The copy is centralised because it is load-bearing: the academy treats the
 * indicator set behind the SPArtan Indicator View as proprietary, so no message
 * a non-paying member can read may name the individual indicators. Keeping every
 * upgrade message in one map is what makes that rule checkable.
 */
export const MEMBER_FEATURES = {
  signals: {
    title: 'Buy and sell signals are a members feature',
    message:
      'The academy signal on every asset, and the alerts that fire when one triggers, are part of the paid membership. The watchlist itself stays open to you.',
  },
  watchlistTools: {
    title: 'Watchlist tools are a members feature',
    message:
      'Building your own sublists on top of the master watchlist, and the alerts around them, are part of the paid membership.',
  },
  indicatorView: {
    title: 'The SPArtan Indicator View is a members feature',
    message: 'The SPArtan Indicator View comes with the paid membership, alongside the academy buy and sell signals.',
  },
  portfolio: {
    title: 'Portfolio tools are a members feature',
    message:
      'Your portfolio, the average planner, the stress test, due diligence and the trade journal are part of the paid membership.',
  },
  briefSignals: {
    title: 'The signal sections are a members feature',
    message: 'Active signals and the daily alert counts are part of the paid membership.',
  },
  pitch: {
    title: 'Trade pitches are a members feature',
    message: 'The free plan includes one trade pitch a month. Paid members generate them on demand.',
  },
} as const;

export type MemberFeature = keyof typeof MEMBER_FEATURES;
