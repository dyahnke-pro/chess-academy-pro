// THE ONE PLACE A PRICE IS WRITTEN DOWN.
//
// 🚨 WHY THIS EXISTS (David 2026-08-16, deciding to move to $4.99/mo).
//
// The paywall itself never hardcodes a price — it renders `priceString`
// straight off the store, so a tier change in App Store Connect reaches it with
// no build. That is correct and this file does not touch it.
//
// But two LEGAL pages stated the price in prose: the Terms of Service
// ("$7.99 per month or $79.99 per year") and the Support page. Those do not
// come from the store, so a price change silently leaves them wrong — a
// consumer-facing inaccuracy about what a paying customer is charged, on the
// page Apple review reads. The Terms page even carried a comment asking a human
// to "keep the subscription terms in sync with the live offering", which is a
// note where a constant should be.
//
// So both pages now read from here, and `pricingCopy.test.ts` fails the build
// if a dollar amount reappears in their prose.
//
// 🔒 THIS FILE IS DOWNSTREAM OF THE STORE, NOT THE SOURCE OF IT. Apple decides
// what a customer is actually charged; these values only describe it. Changing
// them does NOT change anyone's bill, and they must not be edited ahead of the
// App Store Connect change — Terms that understate the real charge are worse
// than Terms that are merely out of date. Order: set the tiers in App Store
// Connect, confirm they are live, then update this file.

/** Monthly plan, as displayed in prose. Must match the live App Store tier. */
export const PRICE_MONTHLY = '$7.99';

/** Annual plan, as displayed in prose. Must match the live App Store tier. */
export const PRICE_YEARLY = '$79.99';

/** Free-trial length for new subscribers, as displayed in prose. */
export const TRIAL_DAYS = 7;
