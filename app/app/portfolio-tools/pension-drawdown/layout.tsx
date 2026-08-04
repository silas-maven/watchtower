import type { ReactNode } from 'react';
import { MemberGate } from '@/components/MemberGate';

// Paid tool. The owner's 4 August spec asks for this one to be freemium-gated
// "using the existing server-side entitlement/paywall pattern rather than a
// visual-only lock", which is exactly what MemberGate does: it runs in a
// layout, so the check happens before any child renders and typing the URL does
// not get past it.
//
// Note this sits alongside the two FREE calculators (compound interest, CAGR),
// which is why the gate is per-tool here rather than on the section.
export default function Layout({ children }: { children: ReactNode }) {
  return <MemberGate feature="portfolio">{children}</MemberGate>;
}
