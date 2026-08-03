import type { ReactNode } from 'react';
import { MemberGate } from '@/components/MemberGate';

// Per-tool gate. The section as a whole is no longer members-only: Personal
// Finance and the two calculators are free (owner's instruction, 2 Aug 2026),
// so the gate sits on each paid tool rather than on the shared layout above.
export default function Layout({ children }: { children: ReactNode }) {
  return <MemberGate feature="portfolio">{children}</MemberGate>;
}
