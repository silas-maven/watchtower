// SINGLE SOURCE OF TRUTH for the advertised membership price.
//
// It was written out by hand in four places (home page CTA, pricing metadata,
// pricing card, account panel). The owner raised it from £50 to £99 on 5 August
// 2026 and three of the four would have been easy to miss, which on a pricing
// page means quoting a member one figure and charging another.
//
// Dependency-free on purpose so client components can import it.

export const MEMBERSHIP_PRICE_GBP = 99;

/** "£99" — for the big number on the pricing card, where "/ month" is separate. */
export const MEMBERSHIP_PRICE = `£${MEMBERSHIP_PRICE_GBP}`;

/** "£99 / month" — for the account panel. */
export const MEMBERSHIP_PRICE_LABEL = `${MEMBERSHIP_PRICE} / month`;

/** "£99 a month" — for running prose. */
export const MEMBERSHIP_PRICE_PROSE = `${MEMBERSHIP_PRICE} a month`;

/**
 * ⚠ THIS IS DISPLAY COPY ONLY. It does not change what anyone is charged.
 *
 * The amount actually taken is whatever the payment provider's price object says,
 * reached through STRIPE_MEMBERSHIP_PRICE_ID (see app/api/stripe/checkout). A
 * mismatch between this number and that price is invisible in the app and only
 * shows up on someone's card statement, so when this changes, the price in the
 * provider dashboard has to change with it.
 */
export const MEMBERSHIP_PRICE_IS_DISPLAY_ONLY = true;
