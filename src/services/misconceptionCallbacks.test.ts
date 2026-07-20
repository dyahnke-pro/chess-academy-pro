import { describe, it, expect } from 'vitest';
import { composeCallbackLine } from './misconceptionCallbacks';
import { listMisconceptionTags } from '../services/misconceptionService';

// "We've talked about this" (David 2026-07-11). Count + recency are computed
// from the records; the line is null on a first occurrence — a coach doesn't
// call back to something that never happened.

const TAG = listMisconceptionTags().find((t) => t.id !== 'other')!.id;
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

describe('composeCallbackLine', () => {
  it('is silent on the first occurrence', () => {
    expect(composeCallbackLine(TAG, [{ createdAt: NOW, counted: true }], NOW)).toBeNull();
    expect(composeCallbackLine(TAG, [], NOW)).toBeNull();
  });

  it('calls back on a repeat with the computed count + recency', () => {
    const line = composeCallbackLine(
      TAG,
      [{ createdAt: NOW - 2 * DAY, counted: true }, { createdAt: NOW, counted: true }],
      NOW,
    );
    expect(line).toContain("We've seen this before");
    expect(line).toContain('the second time');
    expect(line).toContain('2 days ago');
  });

  it('counts a third occurrence and phrases same-day recency', () => {
    const line = composeCallbackLine(
      TAG,
      [
        { createdAt: NOW - 30 * DAY, counted: true },
        { createdAt: NOW - DAY / 2, counted: true },
        { createdAt: NOW, counted: true },
      ],
      NOW,
    );
    expect(line).toContain('the third time');
    expect(line).toContain('earlier today');
  });

  it('ignores non-counted (display-only) records', () => {
    const line = composeCallbackLine(
      TAG,
      [{ createdAt: NOW - DAY, counted: false }, { createdAt: NOW, counted: true }],
      NOW,
    );
    expect(line).toBeNull();
  });

  it('returns null for an unknown tag (never invents a label)', () => {
    expect(
      composeCallbackLine('not-a-real-tag', [{ createdAt: NOW - DAY, counted: true }, { createdAt: NOW, counted: true }], NOW),
    ).toBeNull();
  });

  it('never calls back on the "other"/uncategorized holding pen (David 2026-07-19)', () => {
    // Two distinct opening slips both land in `other`; counting them as one
    // recurring "pattern" and voicing the internal label "uncategorized" is a
    // bug. The catch-all is a review queue, not a real misconception.
    expect(
      composeCallbackLine('other', [{ createdAt: NOW - DAY, counted: true }, { createdAt: NOW, counted: true }], NOW),
    ).toBeNull();
  });
});
