export const APP_VERSION = '1.0.0';
export const BUILD_DATE = '2026-03-07';
export const BETA_MODE: boolean = false;

/** Detect iOS (iPhone/iPad/iPod) including iPadOS 13+ (reports as Macintosh) */
export const IS_IOS: boolean =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
