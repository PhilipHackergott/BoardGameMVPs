import { describe, it, expect } from 'vitest';
import { effectiveUnitPrice, BASE_UNIT_PRICE } from '../../src/engine';
import { mkCompany } from './_helpers';

describe('effective unit price', () => {
  it('is $10 by default', () => {
    expect(effectiveUnitPrice(mkCompany(0))).toBe(BASE_UNIT_PRICE);
  });

  it('reproduces the rulebook example: 2 price managers + 1 discount = $5', () => {
    expect(effectiveUnitPrice(mkCompany(0, { pricing: { price: 2, discount: 1, luxury: 0 } }))).toBe(5);
  });

  it('a luxury manager adds $10', () => {
    expect(effectiveUnitPrice(mkCompany(0, { pricing: { price: 0, discount: 0, luxury: 1 } }))).toBe(20);
  });

  it('the "First to lower prices" milestone removes a further $1', () => {
    expect(effectiveUnitPrice(mkCompany(0, { lowerPrices: true }))).toBe(9);
    expect(
      effectiveUnitPrice(mkCompany(0, { pricing: { price: 1, discount: 0, luxury: 0 }, lowerPrices: true })),
    ).toBe(8);
  });
});
