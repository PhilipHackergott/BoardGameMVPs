// Effective unit price for a chain at Dinnertime.
//
// Rulebook: "The standard unit price of each good is $10. This unit price will be different if the
// chain has one or more price managers (−$1), discount managers (−$3), or a luxury manager (+$10)."
// The "First to lower prices" milestone permanently lowers the chain's unit price by a further $1.
// Bonuses (CFO, "First X marketed") do NOT change the unit price — they are added per item later.

import type { Company } from './types';

export const BASE_UNIT_PRICE = 10;

export function effectiveUnitPrice(c: Company): number {
  return (
    BASE_UNIT_PRICE -
    c.pricing.price * 1 -
    c.pricing.discount * 3 +
    c.pricing.luxury * 10 -
    (c.lowerPrices ? 1 : 0)
  );
}
