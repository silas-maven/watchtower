import { describe, expect, it } from 'vitest';
import { cascadePrices, seedTranches, newTranche } from '@/components/portfolio/AveragePlanEditor';

// The 24 July feedback fixes the tranche defaults: Trade 2 sits 50% below
// Trade 1 and Trade 3 50% below Trade 2 (sequential, so Trade 3 is 75% below
// Trade 1), all editable, with a manual edit pinning that tranche.
describe('averaging-plan tranche defaults', () => {
  it('seeds the client example: 92.96 -> 46.48 -> 23.24', () => {
    const seeded = seedTranches(92.96);
    expect(seeded.map((t) => t.price)).toEqual(['92.96', '46.48', '23.24']);
  });

  it('makes Trade 3 sit 75% below Trade 1', () => {
    const [t1, , t3] = seedTranches(100);
    const drop = (Number(t1.price) - Number(t3.price)) / Number(t1.price);
    expect(drop).toBeCloseTo(0.75, 10);
  });

  it('re-seeds downstream defaults when an upstream price changes', () => {
    const seeded = seedTranches(100);
    const edited = cascadePrices([{ ...seeded[0], price: '80', priceTouched: true }, seeded[1], seeded[2]]);
    expect(edited.map((t) => t.price)).toEqual(['80', '40', '20']);
  });

  it('never overwrites a price the member typed', () => {
    const seeded = seedTranches(100);
    // The member pins Trade 2 at 60, then changes Trade 1.
    const pinned = [
      { ...seeded[0], price: '200', priceTouched: true },
      { ...seeded[1], price: '60', priceTouched: true },
      seeded[2],
    ];
    const result = cascadePrices(pinned);
    expect(result[1].price).toBe('60'); // pinned, untouched by the cascade
    expect(result[2].price).toBe('30'); // still follows its own parent (60)
  });

  it('leaves prices blank until a base price exists', () => {
    const empty = cascadePrices([newTranche(), newTranche(), newTranche()]);
    expect(empty.map((t) => t.price)).toEqual(['', '', '']);
  });

  it('cascades a newly added tranche from the one above it', () => {
    const seeded = seedTranches(92.96);
    const withFourth = cascadePrices([...seeded, newTranche()]);
    expect(withFourth[3].price).toBe('11.62');
  });
});
