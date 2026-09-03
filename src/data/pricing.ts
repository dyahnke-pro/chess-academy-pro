// THE ONE PLACE A PRICE IS WRITTEN DOWN.
//
// 🚨 WHY THIS EXISTS. The paywall itself never hardcodes a price — it renders
// `priceString` straight off the store, so a tier change in App Store Connect
// reaches it with no build. That is correct and this file does not touch it.
//
// But two LEGAL pages state the price in prose: the Terms of Service and the
// Support page. Those do not come from the store, so a price change silently
// leaves them wrong — a consumer-facing inaccuracy about what a paying customer
// is charged, on the page Apple review reads. The Terms page even carried a
// comment asking a human to "keep the subscription terms in sync with the live
// offering", which is a note where a constant should be.
//
// So both pages read from here, and `pricingCopy.test.ts` fails the build if a
// dollar amount reappears in their prose.
//
// 🔒 THIS FILE IS DOWNSTREAM OF THE STORE, NOT THE SOURCE OF IT. Apple decides
// what a customer is actually charged; these values only describe it. Changing
// them does NOT change anyone's bill, and they must not be edited ahead of the
// App Store Connect change — Terms that understate the real charge are worse
// than Terms that are merely out of date. Order: set the tiers in App Store
// Connect, confirm they are live, then update this file.
//
// 🚨 AND THAT ORDERING IS EXACTLY HOW THIS FILE WENT WRONG. The tiers moved on
// 2026-08-24 (7.99→3.99, 79.99→34.99, applied and confirmed by the ASC API,
// existing subscribers migrated down). Nobody came back and did the second
// half. For ten days the Terms page told customers they were charged $7.99
// while Apple billed them $3.99, and every test stayed green — because a gate
// that only checks these constants against EACH OTHER cannot see that they no
// longer describe the store.
//
// So the loop is closed at the only place it can be: `asc-set-sub-price.mjs`
// reads the live price from Apple and fails if it disagrees with the values
// below. That check runs where the credentials are, needs no argument to be
// right, and turns a dry run into a drift detector. Run it (workflow "ASC —
// set subscription price", apply=no) after any tier change, and whenever you
// want to know these numbers are still true.
//
// Live as of 2026-09-03, verified against the App Store Connect API.

/** Monthly plan, as displayed in prose. Must match the live App Store tier. */
export const PRICE_MONTHLY = '$3.99';

/** Annual plan, as displayed in prose. Must match the live App Store tier. */
export const PRICE_YEARLY = '$34.99';

/** Free-trial length for new subscribers, as displayed in prose. */
export const TRIAL_DAYS = 7;
