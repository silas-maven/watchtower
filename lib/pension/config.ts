// Tax and allowance assumptions for the pension drawdown calculator.
//
// DELIBERATELY SEPARATE FROM THE MATHS. The owner's spec asks for the tax bands,
// allowances and State Pension figures to live outside the calculation logic, and
// the reason is maintenance: these change every April, and whoever updates them
// in twelve months should be editing a table of numbers, not reading through a
// projection loop trying to work out which constant is which.
//
// ⚠ THESE ARE 2025/26 FIGURES FOR ENGLAND, WALES AND NORTHERN IRELAND.
// Scotland has its own income tax bands (five, not three) and this calculator
// does NOT model them. The spec accepted that limitation for v1 on the condition
// it is disclosed, which TAX_REGION_NOTE does in the UI.
//
// Review every tax year. If the numbers below are stale the calculator will be
// confidently wrong, which is worse than being unavailable.

export const TAX_YEAR = '2025/26';

export type TaxBand = {
  /**
   * Upper bound of TAXABLE income for this band, meaning income after the
   * personal allowance has been taken off. Null for the top band.
   */
  upperBound: number | null;
  /** Rate as a percentage. */
  ratePct: number;
  label: string;
};

/**
 * Income tax bands, measured on TAXABLE income (after the personal allowance).
 *
 * ⚠ THE NUMBERS HERE ARE NOT THE ONES PEOPLE QUOTE, AND THAT IS CORRECT.
 * Everyone says the higher rate starts at £50,270, but that is the TOTAL income
 * where it starts *for someone with the full personal allowance*: 12,570 + 37,700.
 * The band itself is £37,700 wide, and the £50,270 boundary slides down as the
 * allowance tapers away above £100,000.
 *
 * Getting this wrong is not academic. Modelling the bands as total-income bounds
 * under-taxes a £130,000 income by £2,514 and makes the 60% taper zone look like
 * 50%. The tests in tests/pensionDrawdown.test.ts check both cases against
 * published HMRC figures, which is how the mistake was caught.
 *
 * The additional-rate boundary is £125,140 in both readings, because the
 * allowance is exactly zero by then, so total and taxable income coincide.
 */
export const INCOME_TAX_BANDS: TaxBand[] = [
  { upperBound: 37_700, ratePct: 20, label: 'Basic rate' },
  { upperBound: 125_140, ratePct: 40, label: 'Higher rate' },
  { upperBound: null, ratePct: 45, label: 'Additional rate' },
];

export const PERSONAL_ALLOWANCE = 12_570;

/**
 * The personal allowance is reduced by £1 for every £2 of income above this
 * threshold, reaching zero at £125,140. That taper is why the effective marginal
 * rate between £100,000 and £125,140 is 60%, which surprises people, so the UI
 * shows the allowance actually used rather than assuming the headline figure.
 */
export const PERSONAL_ALLOWANCE_TAPER_THRESHOLD = 100_000;
export const PERSONAL_ALLOWANCE_TAPER_RATE = 2; // £1 lost per £2 over

/**
 * Lump Sum Allowance. Replaced the Lifetime Allowance in April 2024 and caps the
 * total tax-free cash a person can take across all pensions in their lifetime.
 * Tax-free cash is the LOWER of 25% of the pot and what remains of this.
 */
export const LUMP_SUM_ALLOWANCE = 268_275;

/** Maximum proportion of a pot that can be taken as tax-free cash. */
export const MAX_TAX_FREE_CASH_PCT = 25;

/** Full new State Pension, 2025/26, and the age most people currently reach it. */
export const STATE_PENSION_ANNUAL = 11_973;
export const STATE_PENSION_AGE = 67;

/** Defaults for the assumption inputs, all editable by the member. */
export const DEFAULTS = {
  growthPct: 5,
  feesPct: 0.75,
  inflationPct: 2.5,
  endAge: 90,
} as const;

/** The named withdrawal strategies, plus the custom escape hatch. */
export const WITHDRAWAL_STRATEGIES = {
  conservative: { pct: 3, label: '3% Conservative' },
  balanced: { pct: 4, label: '4% Balanced' },
  higher: { pct: 5, label: '5% Higher income' },
} as const;

export type StrategyKey = keyof typeof WITHDRAWAL_STRATEGIES;

export const TAX_REGION_NOTE =
  'Income tax is calculated using England, Wales and Northern Ireland bands. Scottish rates differ and are not modelled.';

export const EDUCATIONAL_DISCLAIMER =
  'This is an educational projection, not regulated financial advice. It uses the assumptions shown, which will not match real markets. Figures are nominal unless you switch on the inflation-adjusted view. Speak to a regulated adviser before acting on any of it.';
