import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { visibleOffers, type AcademyOffer } from '@/lib/academyOffers';
import { getSetting } from '@/lib/server/settings';

function OfferCard({ offer }: { offer: AcademyOffer }) {
  return (
    <a
      href={offer.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col rounded-2xl border p-5 transition hover:border-primary/60 ${
        offer.recommended ? 'border-primary/40 bg-primary/[0.04]' : 'border-border bg-card'
      }`}
    >
      {offer.recommended && (
        <div className="mb-2 w-fit rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          Most take these together
        </div>
      )}
      <div className="font-bold text-foreground">{offer.title}</div>
      <div className="mt-1 flex-1 text-sm text-muted-foreground">{offer.blurb}</div>
      <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
        {offer.cta}
        <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      {/* Say where the link goes. A member who expects to stay in the app and
          lands on a checkout somewhere else has been ambushed. */}
      <div className="mt-1 text-[11px] text-muted-foreground">Opens {offer.destination}</div>
    </a>
  );
}

/**
 * The academy's own products and services. Shown to everyone including free
 * profiles, because this is the shop front rather than a member benefit.
 */
export async function AcademyOffers() {
  const hidden = await getSetting('academy_offers_hidden');
  const offers = visibleOffers(hidden);
  if (offers.length === 0) return null;

  return (
    <Card title="More from the academy">
      <p className="mb-4 text-sm text-muted-foreground">
        The mentoring club, the course, and time with the academy directly. These are run outside this app, so each one opens in a new tab.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </Card>
  );
}
