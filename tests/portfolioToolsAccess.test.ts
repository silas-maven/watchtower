import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PORTFOLIO_TOOLS } from '@/lib/portfolioTools';

/**
 * The freemium boundary for Portfolio tools lives in two places that must agree:
 *
 * 1. `free: true` in the registry, which drives the MEMBERS badge and the locked
 *    card state on the Portfolio index, the Dashboard toolkit and Personal Finance.
 * 2. A `layout.tsx` wrapping the route in `MemberGate`, which is the only thing
 *    that actually stops someone typing the URL.
 *
 * A mismatch is silent and costs money in one direction or trust in the other: a
 * paid tool with no gate is given away, and a free tool with a gate turns away
 * people the academy meant to attract. Pension Drawdown was both in two days,
 * gated on 4 August and opened on 5 August, so this is not hypothetical.
 *
 * Reading the route tree rather than a second hand-written list is the point.
 * A list would need updating alongside the thing it is meant to police.
 */
/** `/app/portfolio-tools/cagr` -> `<repo>/app/app/portfolio-tools/cagr`. The
 *  doubled `app` is real: the App Router directory, then the member section. */
function routeDir(href: string): string {
  return path.join(process.cwd(), 'app', ...href.split('/').filter(Boolean));
}

function gateFor(href: string): { hasLayout: boolean; usesMemberGate: boolean } {
  const layout = path.join(routeDir(href), 'layout.tsx');
  if (!existsSync(layout)) return { hasLayout: false, usesMemberGate: false };
  return { hasLayout: true, usesMemberGate: readFileSync(layout, 'utf8').includes('MemberGate') };
}

describe('portfolio tool access', () => {
  it('has tools to check', () => {
    expect(PORTFOLIO_TOOLS.length).toBeGreaterThan(0);
  });

  it('points every tool at a route that exists', () => {
    for (const tool of PORTFOLIO_TOOLS) {
      expect(existsSync(path.join(routeDir(tool.href), 'page.tsx')), tool.href).toBe(true);
    }
  });

  it('gates every paid tool behind MemberGate', () => {
    for (const tool of PORTFOLIO_TOOLS.filter((t) => !t.free)) {
      expect(gateFor(tool.href).usesMemberGate, `${tool.title} is paid but its route is not gated`).toBe(true);
    }
  });

  it('leaves every free tool ungated', () => {
    for (const tool of PORTFOLIO_TOOLS.filter((t) => t.free)) {
      expect(gateFor(tool.href).hasLayout, `${tool.title} is free but its route still has a gate`).toBe(false);
    }
  });

  it('keeps Pension Drawdown free and reachable', () => {
    const pension = PORTFOLIO_TOOLS.find((t) => t.href.endsWith('/pension-drawdown'));
    expect(pension).toBeDefined();
    expect(pension!.free).toBe(true);
    expect(pension!.personalFinance).toBe(true);
    expect(gateFor(pension!.href).hasLayout).toBe(false);
  });
});
