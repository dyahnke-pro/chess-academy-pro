import { describe, it, expect } from 'vitest';
import { resolveCourseAccess, isChapterUnlockedByAccess } from './courseEntitlement';

describe('resolveCourseAccess', () => {
  it('grants full access when the gate is dormant (today)', () => {
    expect(resolveCourseAccess(false, false, false)).toEqual({ full: true, previewOnly: false });
  });
  it('Pro unlocks the full course', () => {
    expect(resolveCourseAccess(true, true, false)).toEqual({ full: true, previewOnly: false });
  });
  it('owning the course (à-la-carte) unlocks it', () => {
    expect(resolveCourseAccess(true, false, true)).toEqual({ full: true, previewOnly: false });
  });
  it('paywalls removed — full access even with the gate on (David 2026-06-17)', () => {
    expect(resolveCourseAccess(true, false, false)).toEqual({ full: true, previewOnly: false });
  });
});

describe('isChapterUnlockedByAccess', () => {
  it('full access unlocks every chapter', () => {
    const a = { full: true, previewOnly: false };
    expect(isChapterUnlockedByAccess(1, a)).toBe(true);
    expect(isChapterUnlockedByAccess(7, a)).toBe(true);
  });
  it('preview opens only chapter 1', () => {
    const a = { full: false, previewOnly: true };
    expect(isChapterUnlockedByAccess(1, a)).toBe(true);
    expect(isChapterUnlockedByAccess(2, a)).toBe(false);
  });
});
