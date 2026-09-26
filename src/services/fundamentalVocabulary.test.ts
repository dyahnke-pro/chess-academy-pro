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
    //
    // `promotion` joined them on 2026-09-19 for the same reason, stated
    // positively: the weakness tags name HABITS NEGLECTED, and promoting a
    // pawn is a thing the student DID. There is no "failed to promote"
    // misconception to drill, so any tag here would be a lie about what the
    // evidence shows. An id belongs in this list only when mapping it would
    // file evidence WRONG — never when nobody got round to choosing.
    const nulls = Object.entries(MOVE_FUNDAMENTAL_TAG).filter(([, t]) => t === null).map(([k]) => k);
    expect(nulls.sort()).toEqual(['center', 'luft', 'promotion']);
  });

  it('a new positive fundamental cannot be added without deciding where it files', () => {
    // The Record over the union is the real guard (it fails to COMPILE). This
    // asserts the map is not quietly widened to a plain object with holes.
    //
    // 10 → 11 on 2026-09-19: `promotion` was added after a user heard a pawn
    // reaching the 8th rank narrated as "pushes your passed pawn". It files
    // under NULL on purpose — a promotion is a thing DONE, not a habit
    // neglected, so there is no misconception to drill it as. Moving this
    // number is the deliberate act the gate exists to force; it should only
    // ever change in a commit that says which way the new id files.
    //
    // 11 → 12 on 2026-09-24: `open-diagonal` (a pawn move that frees a
    // home-square bishop — d3 opens c1, g3 prepares the fianchetto). It files
    // under `neglected-development`: a bishop left blocked behind its own pawn
    // IS an undeveloped bishop, the same habit from the other side.
    //
    // 12 → 13 on 2026-09-24: `tempo` (a pawn that kicks a piece — 9.f4 against
    // …Ne5). It files under `tempo-handed`: gaining a tempo is the same habit
    // as handing one over, from the other side.
    //
    // 13 → 18 on 2026-09-25: the opening ideas past develop/center (review
    // audit, Carlsen–Caruana Ruy: six owed plies silent). `attack-defender` →
    // `no-plan`, `keep-working` → `misplaced-piece`, `prepare-break` →
    // `mistimed-pawn-break`, `development-complete` → `neglected-development`,
    // `rook-behind-pawn` → `passive-rook` — each the same habit from the other
    // side.
    const mapped = Object.keys(MOVE_FUNDAMENTAL_TAG).length;
    expect(mapped).toBe(19);
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
