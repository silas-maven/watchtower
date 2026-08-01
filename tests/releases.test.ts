import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RELEASES } from '@/lib/releases';

/**
 * The release notes are the owner's view of what shipped, and every item carries
 * a deep link they are invited to click. A link to a route that does not exist
 * is worse than no link, so the hrefs are checked against the actual app tree
 * rather than trusted.
 */
function routeExists(href: string): boolean {
  const [pathname] = href.split(/[?#]/);
  const clean = pathname.replace(/\/$/, '') || '/';
  // {assetId} is substituted at render time with a live asset.
  const segments = clean.split('/').filter(Boolean).map((s) => (s === '{assetId}' ? '[id]' : s));
  const dir = path.join(process.cwd(), 'app', ...segments);
  return ['page.tsx', 'page.ts'].some((f) => existsSync(path.join(dir, f)));
}

describe('release notes', () => {
  it('has at least one release', () => {
    expect(RELEASES.length).toBeGreaterThan(0);
  });

  it('uses unique version strings', () => {
    const versions = RELEASES.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('is ordered newest first', () => {
    const dates = RELEASES.map((r) => new Date(r.date).getTime());
    for (let i = 1; i < dates.length; i += 1) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('has a parseable date on every release', () => {
    for (const r of RELEASES) {
      expect(Number.isNaN(new Date(r.date).getTime()), `${r.version} has an unparseable date`).toBe(false);
    }
  });

  it('has at least one group with at least one item on every release', () => {
    for (const r of RELEASES) {
      expect(r.groups.length, `${r.version} has no groups`).toBeGreaterThan(0);
      for (const g of r.groups) {
        expect(g.items.length, `${r.version} / ${g.heading} has no items`).toBeGreaterThan(0);
      }
    }
  });

  it('links every item at a route that actually exists', () => {
    const broken: string[] = [];
    for (const r of RELEASES) {
      for (const g of r.groups) {
        for (const item of g.items) {
          if (!routeExists(item.href)) broken.push(`${r.version}: "${item.title}" -> ${item.href}`);
        }
      }
    }
    expect(broken, `release notes link at routes that do not exist:\n${broken.join('\n')}`).toEqual([]);
  });

  it('gives every item a link label and a feedback reference', () => {
    for (const r of RELEASES) {
      for (const g of r.groups) {
        for (const item of g.items) {
          expect(item.linkLabel.trim(), `${r.version} / ${item.title}`).not.toBe('');
          expect(item.feedback.trim(), `${r.version} / ${item.title}`).not.toBe('');
        }
      }
    }
  });

  it('keeps the copy free of em and en dashes, per the house style', () => {
    const offenders: string[] = [];
    for (const r of RELEASES) {
      const blobs = [r.title, r.summary, ...r.groups.flatMap((g) => [g.heading, ...g.items.flatMap((i) => [i.title, i.body])])];
      for (const blob of blobs) {
        if (/[—–]/.test(blob)) offenders.push(`${r.version}: ${blob.slice(0, 60)}`);
      }
    }
    expect(offenders, `dashes found:\n${offenders.join('\n')}`).toEqual([]);
  });
});
