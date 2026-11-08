import { describe, it, expect } from 'vitest';
import { pickReviewSubmission } from './review-submission-pick.mjs';

describe('which review submission a version goes on', () => {
  it('never reuses a finished submission, even one that held the version (4.0.8, 2026-11-08)', () => {
    const subs = [
      { id: 'empty-open', state: 'READY_FOR_REVIEW', hasVersion: false },
      { id: 'pulled', state: 'COMPLETE', hasVersion: true },
    ];
    expect(pickReviewSubmission(subs)?.id).toBe('empty-open');
  });

  it('a cancelling or finished submission alone means create a new one', () => {
    expect(pickReviewSubmission([
      { id: 'a', state: 'COMPLETE', hasVersion: true },
      { id: 'b', state: 'CANCELING', hasVersion: false },
    ])).toBeNull();
  });

  it('an open submission that already holds the version wins', () => {
    expect(pickReviewSubmission([
      { id: 'empty', state: 'READY_FOR_REVIEW', hasVersion: false },
      { id: 'rejected', state: 'UNRESOLVED_ISSUES', hasVersion: true },
    ])?.id).toBe('rejected');
  });

  it('the submission just cancelled is skipped', () => {
    expect(pickReviewSubmission([{ id: 'x', state: 'READY_FOR_REVIEW', hasVersion: true }], 'x')).toBeNull();
  });
});
