// The academy's own products and services, sold off-platform (Whop, Acuity,
// Linktree). One registry so the member-facing panel and the admin visibility
// controls cannot drift apart, the way the Dashboard tool list once did.
//
// These are OUTBOUND links only. Nothing here takes a payment inside the app;
// the member leaves for Whop or Acuity and the academy fulfils it there. That
// keeps the app clear of handling money for products it does not deliver.

export type AcademyOffer = {
  id: string;
  title: string;
  /** One line the member reads before deciding to click. */
  blurb: string;
  href: string;
  cta: string;
  /** Where the member is going, said plainly, so the jump is never a surprise. */
  destination: string;
  /**
   * Offers the owner may hide. The membership, the eCourse and the newsletter
   * are the standing shop front; the two booked services can be switched off
   * when the owner has no capacity for them.
   */
  canHide: boolean;
  /** The pair the owner says most people take together. */
  recommended?: boolean;
};

export const ACADEMY_OFFERS: AcademyOffer[] = [
  {
    id: 'mentoring-club',
    title: 'Spartan Mentoring Club',
    blurb: 'The WhatsApp group and watchlist subscription, alongside other experts.',
    href: 'https://whop.com/spartan-mentoring-club',
    cta: 'Join the club',
    destination: 'Whop',
    canHide: false,
    recommended: true,
  },
  {
    id: 'ecourse',
    title: 'The eCourse',
    blurb: 'The strategy behind the academy, taught in full. Ten years of using it, and a pension taken up tenfold.',
    href: 'https://whop.com/checkout/plan_HfYpR5k2RoQ8G/',
    cta: 'Take the course',
    destination: 'Whop',
    canHide: false,
    recommended: true,
  },
  {
    id: 'mentoring-1to1',
    title: 'One to one mentoring',
    blurb: 'Work through your own portfolio and plan directly with the academy.',
    href: 'https://app.acuityscheduling.com/catalog/594c872f/?productId=2045732&clearCart=true',
    cta: 'Book mentoring',
    destination: 'Acuity Scheduling',
    canHide: true,
  },
  {
    id: 'one-off-call',
    title: 'A one off discussion',
    blurb: 'A single session for a specific question, with no ongoing commitment.',
    href: 'https://bookings-stockpickers.as.me/?appointmentType=14109043',
    cta: 'Book a call',
    destination: 'Acuity Scheduling',
    canHide: true,
  },
  {
    id: 'newsletter',
    title: 'The newsletter',
    blurb: 'Everything the academy publishes, in one place.',
    href: 'https://linktr.ee/stockpickers',
    cta: 'Subscribe',
    destination: 'Linktree',
    canHide: true,
  },
];

/** The owner's stated common path: the club and the course taken together. */
export const PAIRED_OFFER_IDS = ACADEMY_OFFERS.filter((o) => o.recommended).map((o) => o.id);

export function visibleOffers(hiddenIds: string[]): AcademyOffer[] {
  const hidden = new Set(hiddenIds);
  // An offer that cannot be hidden stays visible even if a stale setting names
  // it, so the shop front can never be switched off entirely by accident.
  return ACADEMY_OFFERS.filter((offer) => !offer.canHide || !hidden.has(offer.id));
}
