// Pay-per-class gating SEAM (David 2026-06-15: "build the per-course gating seam
// only; the purchase model is decided AFTER it's built"). No purchase flow here —
// just the chokepoint the UI consults, dormant until VITE_PAYWALL_ENABLED flips.
//
// Model: a free PREVIEW (the quick-starter — chapter 1) is always open; the FULL
// course (later chapters + their sublines) needs access. Access = gate dormant OR
// the user is Pro OR the course is individually owned (à-la-carte). `ownedCourseIds`
// is empty until a purchase flow lands, so today nothing is gated.

export interface CourseAccess {
  /** Full course unlocked (all chapters + sublines). */
  full: boolean;
  /** Only the free preview (chapter 1) is open. */
  previewOnly: boolean;
}

/** How many leading chapters are free when a course is preview-only. */
export const FREE_PREVIEW_CHAPTERS = 1;

/** Pure resolver — testable without the build flag / store.
 *  PAYWALLS REMOVED (David 2026-06-17): everything is unlocked for everyone —
 *  every course, chapter, and subline is open. The args are ignored so no
 *  caller can re-gate it without changing this one function. */
export function resolveCourseAccess(_gateEnabled: boolean, _isPro: boolean, _owned: boolean): CourseAccess {
  return { full: true, previewOnly: false };
}

/** Is a given chapter (1-based) unlocked under this access level? The free
 *  preview opens the first FREE_PREVIEW_CHAPTERS; full access opens everything. */
export function isChapterUnlockedByAccess(chapterN: number, access: CourseAccess): boolean {
  return access.full || chapterN <= FREE_PREVIEW_CHAPTERS;
}
