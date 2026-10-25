/**
 * openingProducts — which App Store product unlocks which opening (David
 * 2026-10-25: openings sold à la carte, $0.99 each).
 *
 * A leaf over `opening-products.json`, the ONE list the app and the App Store
 * script (`scripts/ci/asc-opening-iaps.mjs`) both read. Ownership is never a
 * local flag: it is read off the store's own record of what was bought
 * (RevenueCat's `nonSubscriptionTransactions`), mapped back through this table.
 */
import openingProductsData from '../data/opening-products.json';

export interface OpeningProduct {
  openingId: string;
  /** The App Store product id. Permanent — Apple never lets one be reused. */
  productId: string;
  kind: 'masterclass' | 'gambit' | 'pro';
  /** Store display name (≤ 30 characters). */
  name: string;
  /** Store description (≤ 45 characters). */
  description: string;
}

export const OPENING_PRODUCTS: readonly OpeningProduct[] = openingProductsData.products as OpeningProduct[];

const byOpening = new Map(OPENING_PRODUCTS.map((p) => [p.openingId, p]));
const byProduct = new Map(OPENING_PRODUCTS.map((p) => [p.productId, p]));

/** The product that unlocks `openingId`, or null when it is not for sale. */
export function openingProductFor(openingId: string): OpeningProduct | null {
  return byOpening.get(openingId) ?? null;
}

/** The openings a list of purchased product ids unlocks. Ids that are not
 *  opening products (the subscription, anything else) are ignored. Pure. */
export function openingsOwnedBy(productIds: readonly string[]): string[] {
  const owned = new Set<string>();
  for (const id of productIds) {
    const p = byProduct.get(id);
    if (p) owned.add(p.openingId);
  }
  return [...owned];
}
