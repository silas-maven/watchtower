import type { ReactNode } from 'react';
import { getEntitlements } from '@/lib/entitlements';
import { Paywall } from '@/components/Paywall';
import { MEMBER_FEATURES, type MemberFeature } from '@/lib/memberFeatures';

/**
 * Server-side hard gate for a whole route. Renders the upgrade page instead of
 * the children when the profile is not entitled to the named feature.
 *
 * Used from a route's layout.tsx so the check runs before any child page, client
 * or server, and cannot be reached by typing the URL. The APIs behind each tool
 * are gated independently (defence in depth), so this is the visible half.
 */
export async function MemberGate({ feature, children }: { feature: MemberFeature; children: ReactNode }) {
  const { paid } = await getEntitlements();
  if (!paid) {
    const { title, message } = MEMBER_FEATURES[feature];
    return <Paywall title={title} message={message} />;
  }
  return <>{children}</>;
}
