import { describe, it, expect } from 'vitest';
import { MOVE_FUNDAMENTAL_TAG, leadingFundamentals } from './moveFundamentals';
import { FUNDAMENTAL_IDS, FUNDAMENTAL_TAG } from './principleAttribution';
import { MISCONCEPTION_TAGS } from '../data/misconceptionTags';

const TAG_IDS = new Set(MISCONCEPTION_TAGS.map((t) => t.id));

// THE TWO HALVES OF ONE AXIS (docs/plans/2026-09-17-computer-unification.md §0.3).
// The coach carried a NEGATIVE fundamentals vocabulary (33 ids, each filed under
// a weakness tag) and a POSITIVE one (10 ids, filed under nothing — the type
// appeared in exactly one file). So it could name what a student did wrong at 33
// levels of resolution and what they did right at one.
describe('the fundamentals vocabularies reconcile', () => {
  it('every NEGATIVE fundamental files under a real weakness tag', () => {
    for (const id of FUNDAMENTAL_IDS) {
      expect(TAG_IDS.has(FUNDAMENTAL_TAG[id]), `${id} → ${FUNDAMENTAL_TAG[id]}`).toBe(true);
    }
  });

  it('every POSITIVE fundamental files under a real weakness tag, or an honest null', () => {
    for (const [id, tag] of Object.entries(MOVE_FUNDAMENTAL_TAG)) {
      if (tag === null) continue; // not every strength is the inverse of a hole
      expect(TAG_IDS.has(tag), `${id} → ${tag} is not a MisconceptionTagId`).toBe(true);
    }
  });

  it('the null answers are DELIBERATE, not a growing backlog', () => {
    // A shrink-only ceiling. `center` has no "ceded the centre" tag and `luft`
    // is not the inverse of anything we track — mapping either would file
    // evidence under the wrong hole, which is worse than not filing it (G3).
    const nulls = Object.entries(MOVE_FUNDAMENTAL_TAG).filter(([, t]) => t === null).map(([k]) => k);
    expect(nulls.sort()).toEqual(['center', 'luft']);
  });

  it('a new positive fundamental cannot be added without deciding where it files', () => {
    // The Record over the union is the real guard (it fails to COMPILE). This
    // asserts the map is not quietly widened to a plain object with holes.
    const mapped = Object.keys(MOVE_FUNDAMENTAL_TAG).length;
    expect(mapped).toBe(10);
  });

  it('THE STRUCTURE CROSSES THE BOUNDARY — ids reach a caller, not just prose', () => {
    // The reason the positive half filed under nothing was not a missing
    // mapping: `renderStrategic` joined the computed facts into one string, so
    // every consumer got `string | null` and the id never left the module.
    // 1.e4 e5 2.Nf3 — a plain developing move.
    const funds = leadingFundamentals(
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      'Nf3',
      'white',
    );
    expect(funds.length).toBeGreaterThan(0);
    const f = funds[0];
    expect(f.id).toBeTruthy();
    expect(f.id in MOVE_FUNDAMENTAL_TAG).toBe(true);
    expect(Array.isArray(f.squares)).toBe(true);
    // all three registers survive, so a caller picks the one its surface needs
    expect(f.led && f.selfContained && f.imperative).toBeTruthy();
  });
});
