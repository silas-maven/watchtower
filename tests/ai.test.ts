import { describe, expect, it } from 'vitest';
import { buildFallbackBrief } from '@/lib/ai/dailyBrief';

describe('buildFallbackBrief', () => {
  it('returns deterministic summary schema', () => {
    const brief = buildFallbackBrief({
      buy: ['AAPL'],
      sell: ['TSLA'],
      newToday: ['AAPL'],
      droppedOff: [],
    });

    expect(brief.summary.length).toBeGreaterThan(0);
    expect(brief.buy).toEqual(['AAPL']);
    expect(brief.sell).toEqual(['TSLA']);
    expect(Array.isArray(brief.insights)).toBe(true);
    expect(brief.model).toBe('deterministic-fallback');
  });
});
