import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { BillingPanel } from '@/components/BillingPanel';
import { BlurFade } from '@/components/ui/blur-fade';
import { requirePageUser } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requirePageUser('/app/account');

  const [customer, mirror] = await Promise.all([
    prisma.stripeCustomer.findUnique({ where: { profileId: user.id } }).catch(() => null),
    prisma.subscriptionMirror.findUnique({ where: { profileId: user.id } }).catch(() => null),
  ]);

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Account</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Your account</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Identity is handled by your sign-in. The academy mirrors your profile, role and access state here.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <Card title="Profile">
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Name</div>
              <div className="mt-1 font-semibold text-foreground">{user.name}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</div>
              <div className="mt-1 font-semibold text-foreground">{user.email}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Role</div>
              <div className="mt-1"><Badge tone="blue">{user.role}</Badge></div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Access</div>
              <div className="mt-1"><Badge tone={user.accessState === 'ACTIVE' ? 'emerald' : 'amber'}>{user.accessState}</Badge></div>
            </div>
          </div>
        </Card>
      </BlurFade>

      <BlurFade delay={0.15}>
        <Card title="Membership and billing">
          <BillingPanel
            hasCustomer={customer != null}
            membershipStatus={mirror?.status ?? null}
            currentPeriodEnd={mirror?.currentPeriodEnd ? mirror.currentPeriodEnd.toISOString().slice(0, 10) : null}
            membershipPriceLabel="£50 / month"
            ecoursePriceLabel="£1,000 one-time"
          />
        </Card>
      </BlurFade>
    </div>
  );
}
