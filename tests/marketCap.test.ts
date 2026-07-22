import { describe, expect, it } from 'vitest';
import { formatMarketCap, marketCapBand, marketCapLabel } from '@/lib/marketCap';

describe('marketCapBand', () => {
  it('classifies US bands per the course table', () => {
    expect(marketCapBand(250_000_000, 'USD')).toBeNull(); // below Small
    expect(marketCapBand(300_000_000, 'USD')).toBe('Small');
    expect(marketCapBand(1_999_999_999, 'USD')).toBe('Small');
    expect(marketCapBand(2_000_000_000, 'USD')).toBe('Mid');
    expect(marketCapBand(10_000_000_000, 'USD')).toBe('Large');
    expect(marketCapBand(100_000_000_000, 'USD')).toBe('Mega');
  });

  it('classifies UK bands per the course table (GBP and GBX)', () => {
    expect(marketCapBand(29_000_000, 'GBP')).toBeNull();
    expect(marketCapBand(30_000_000, 'GBP')).toBe('Small');
    expect(marketCapBand(50_000_000, 'GBX')).toBe('Mid');
    expect(marketCapBand(500_000_000, 'GBP')).toBe('Large');
    expect(marketCapBand(20_000_000_000, 'GBX')).toBe('Mega');
    expect(marketCapBand(19_999_999_999, 'GBP')).toBe('Large');
  });

  it('handles missing values', () => {
    expect(marketCapBand(null, 'USD')).toBeNull();
    expect(marketCapBand(0, 'USD')).toBeNull();
  });
});

describe('formatMarketCap', () => {
  it('formats compact figures with the right symbol', () => {
    expect(formatMarketCap(1_940_000_000_000, 'USD')).toBe('$1.94tn');
    expect(formatMarketCap(750_000_000, 'GBP')).toBe('£750m');
    expect(formatMarketCap(12_400_000_000, 'USD')).toBe('$12.4bn');
    expect(formatMarketCap(null, 'USD')).toBe('—');
  });
});

describe('marketCapLabel', () => {
  it('appends the band in brackets', () => {
    expect(marketCapLabel(12_400_000_000, 'USD')).toBe('$12.4bn (Large)');
    expect(marketCapLabel(40_000_000, 'GBP')).toBe('£40.0m (Small)');
    expect(marketCapLabel(null, 'USD')).toBe('—');
  });
});
