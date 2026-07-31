import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../db/schema';
import { loadEcoData } from '../../services/dataLoader';
import { findOpeningByPgnPrefix, getOpeningMoves } from '../../services/openingDetectionService';
import { fuzzyMatchOpening } from '../../services/openingFuzzyMatcher';
import { searchOpenings } from '../../services/openingService';

// Regression for "the learn lesson stops after selecting a line to
// learn/fork in the road" (David 2026-07-31).
//
// The walkthrough's Deep-dive tiles resolve a CANONICAL opening name from the
// DB (findOpeningByPgnPrefix) and then handed that name to handleSubmit as if
// the student had TYPED it. The free-text router re-guessed the intent from
// the prose and lost it two different ways, both reproduced below:
//
//   1. the bare-name tier caps at 60 chars, and a real Alapin sub-variation
//      name is 69 — so `requestedName` stayed null and the input fell through
//      to the brain, which answered "I can't verify that precisely from
//      grounded data right now" with the walkthrough auto-paused behind it;
//   2. even under the cap, the fuzzy matcher scores a long compound name
//      below autoAccept and bounces the student to a "did you mean…" picker.
//
// Only (1) actually fired for this name — the matcher round-trips it fine
// (pinned below). (2) is guarded anyway because a code-resolved name should
// never be re-guessed at all.
//
// The fix is `handleSubmit(query, { teachIntent: true })`: an intent the CODE
// resolved is never re-derived from its own prose. These assertions pin the
// failure condition (so a future tweak to the cap can't silently make the old
// laundering look safe) and prove the name the tile hands over really does
// resolve to a teachable line.
describe('walkthrough Deep-dive routing (teachIntent)', () => {
  // The Alapin fork David tapped: 1.e4 c5 2.c3 — the branch panel's canonical
  // lookup lands on a long, comma-separated sub-variation name.
  const ALAPIN_FORK = ['e4', 'c5', 'c3'];
  const BARE_NAME_CAP = 60;

  beforeAll(async () => {
    await db.delete();
    await db.open();
    await loadEcoData();
  }, 60000);

  it('a Deep-dive tile resolves a canonical DB name', () => {
    const canon = findOpeningByPgnPrefix(ALAPIN_FORK);
    expect(canon?.canonicalName).toMatch(/Alapin/i);
  });

  it('the exact name that dead-ended is longer than the bare-name cap', () => {
    // The literal string the production audit captured as the chat `ask`.
    const asked = 'Sicilian Defense: Alapin Variation, Barmen Defense, Endgame Variation';
    expect(asked.length).toBeGreaterThan(BARE_NAME_CAP);
    // …and it is a REAL opening, which is exactly why routing it to the brain
    // was wrong rather than a polite refusal.
    expect(getOpeningMoves(asked) ?? []).not.toHaveLength(0);
  });

  it('fuzzy round-trips this exact name, so the cap was the ONLY dead-end', () => {
    // Documenting the boundary of the bug: the matcher is NOT at fault here —
    // handed the exact canonical string it auto-accepts straight back. That is
    // why the fix targets the intent gate, not the matcher. (teachIntent also
    // skips fuzzy, but as a "don't re-guess what code resolved" guard for
    // future callers, not because this name mis-resolved.)
    const asked = 'Sicilian Defense: Alapin Variation, Barmen Defense, Endgame Variation';
    const fuzzy = fuzzyMatchOpening(asked);
    expect(fuzzy.autoAccept).toBe(true);
    expect(fuzzy.candidates[0]?.canonicalName).toBe(asked);
  });

  it('the resolved name reaches a teachable line (so teachIntent has somewhere to land)', async () => {
    const canon = findOpeningByPgnPrefix(ALAPIN_FORK);
    expect(canon).toBeTruthy();
    const name = canon!.canonicalName;
    const moves = getOpeningMoves(name) ?? (await searchOpenings(name))[0]?.pgn?.trim().split(/\s+/);
    expect(moves?.length ?? 0).toBeGreaterThanOrEqual(ALAPIN_FORK.length);
  }, 60000);
});
