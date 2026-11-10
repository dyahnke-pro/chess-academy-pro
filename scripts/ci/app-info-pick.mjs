// Which App Store app info a script reads or writes.
//
// An app has a LIVE app info (frozen, the one on sale) and, while a version is
// being prepared or reviewed, one in PREPARATION. The age rating, category and
// name/subtitle a submission carries live on the one in preparation. Five
// scripts each picked it with their own test, and they disagreed: readiness
// skipped only READY_FOR_DISTRIBUTION, so on 2026-11-10 it read the live 4.0.7
// app info (state READY_FOR_SALE) and reported Apple's new age-rating answers
// blank, while the write script had filled them on the 4.0.8 one.
//
// Apple reports the state as `state` (current) or `appStoreState` (older).

/** States of an app info that is on sale and cannot be edited. */
export const LIVE_APP_INFO_STATES = new Set([
  'READY_FOR_DISTRIBUTION', 'READY_FOR_SALE', 'REPLACED_WITH_NEW_INFO',
]);

/** @param {{attributes?: {state?: string, appStoreState?: string}}} info */
export function appInfoState(info) {
  return info?.attributes?.state ?? info?.attributes?.appStoreState ?? null;
}

/**
 * The app info in preparation, or null when every one is live.
 * @param {Array<{id: string, attributes?: {state?: string, appStoreState?: string}}>} infos
 */
export function pickEditableAppInfo(infos) {
  return (infos || []).find((i) => {
    const s = appInfoState(i);
    return s !== null && !LIVE_APP_INFO_STATES.has(s);
  }) ?? null;
}

/**
 * The app info a submission will carry: the one in preparation, else the live one.
 * @param {Array<{id: string, attributes?: {state?: string, appStoreState?: string}}>} infos
 */
export function pickSubmissionAppInfo(infos) {
  return pickEditableAppInfo(infos) ?? (infos || [])[0] ?? null;
}
