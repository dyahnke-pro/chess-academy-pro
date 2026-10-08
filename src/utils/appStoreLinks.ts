/**
 * The App Store listing — ONE id, so the share link and the review link can
 * never point at two different apps.
 */
export const APP_STORE_ID = '6776418777';

/** The public listing, for sharing with a friend. */
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/** Opens the App Store app straight on the write-a-review screen (Apple's
 *  documented `action=write-review`). The itms-apps scheme hands off to the
 *  App Store app instead of loading the listing in a web view. */
export const APP_STORE_WRITE_REVIEW_URL = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
