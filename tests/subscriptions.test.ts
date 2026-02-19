import { describe, expect, it } from 'vitest';
import { computeOverdueStage } from '@/lib/subscriptions/overdue';

describe('computeOverdueStage', () => {
  const now = new Date('2026-02-19T12:00:00.000Z');

  it('returns 0 when not overdue', () => {
    expect(computeOverdueStage(new Date('2026-02-19T00:00:00.000Z'), now)).toBe(0);
  });

  it('returns stage 1 at D+1', () => {
    expect(computeOverdueStage(new Date('2026-02-18T00:00:00.000Z'), now)).toBe(1);
  });

  it('returns stage 2 at D+3', () => {
    expect(computeOverdueStage(new Date('2026-02-16T00:00:00.000Z'), now)).toBe(2);
  });

  it('returns stage 3 for long overdue', () => {
    expect(computeOverdueStage(new Date('2026-02-01T00:00:00.000Z'), now)).toBe(3);
  });
});
