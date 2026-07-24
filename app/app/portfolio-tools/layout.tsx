import type { ReactNode } from 'react';
import { getEntitlements } from '@/lib/entitlements';
import { Paywall } from '@/components/Paywall';

// Server-side hard gate for the whole Portfolio Tools section (portfolios,
// average planner, stress test, personal finance, due diligence, trade journal).
// Runs before any client page below it, so a FREE-tier profile gets the upgrade
// gate and never the tool. The tool APIs are independently gated too (defence in
// depth), so this cannot be bypassed by calling the endpoints directly.
export default async function PortfolioToolsLayout({ children }: { children: ReactNode }) {
  const { paid } = await getEntitlements();
  if (!paid) {
    return (
      <Paywall
        title="Portfolio tools are a members feature"
        message="Your portfolio, the average planner, the stress test and the personal finance tool are part of the paid membership."
      />
    );
  }
  return <>{children}</>;
}
