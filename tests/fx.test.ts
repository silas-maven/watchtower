import { describe, expect, it } from 'vitest';
import { toGbp } from '@/lib/market/fx';

describe('toGbp', () => {
  const rates = { USD: 1.25, EUR: 1.15 };

  it('converts USD to GBP', () => {
    expect(toGbp(125, 'USD', rates)).toBeCloseTo(100, 5);
  });

  it('converts EUR to GBP', () => {
    expect(toGbp(115, 'EUR', rates)).toBeCloseTo(100, 5);
  });

  it('converts GBX to GBP by dividing by 100', () => {
    expect(toGbp(250, 'GBX', rates)).toBeCloseTo(2.5, 5);
  });
});
