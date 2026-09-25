// learnFundamentalNarration — NAME THE FUNDAMENTAL as the student plays, LIVE
// (David 2026-09-07: "Learn it needs to be added into the narration").
//
// Post-game review already leads a flagged move's beat with the fundamental it
// neglected (the DNA register — principleAttribution → principleVoice). This
// brings the SAME thing to the LEARN board, in the moment: when the student
// just played a slip, the coach's running commentary names the fundamental
// FIRST, then the concrete drawback the backward-look already computed follows
// as supporting evidence — exactly the review ordering (David 2026-09-05: "the
// fundamental flaw stated first and then the other computer narration
// following it as supporting evidence").
//
// PURE. No engine, no model, no I/O — G0 by construction. The ATTRIBUTION is
// `liveFundamental.attributeLiveFundamental` (C4) — the one live computer,
// shared with `positionFacts`, so the id the decision weighs and the id this
// sentence names can never disagree. This module owns only the VOICE: the
// rendered verdict and the recurrence clause.

import { type FundamentalId } from './principleAttribution';
import { attributeLiveFundamental, LEARN_FUNDAMENTAL_CP_FLOOR, type LiveFundamentalReads } from './liveFundamental';
import { renderFundamentalVerdict } from './principleVoice';
import { fundamentalRecurrenceLine } from './fundamentalRecurrence';
import type { WeaknessSignal } from './weaknessSignal';

export { LEARN_FUNDAMENTAL_CP_FLOOR };

export interface LearnFundamentalInput extends LiveFundamentalReads {
  /**
   * THE GAME BEING PLAYED, so its own rows are never counted as a prior game
   * (C4). Learn's live capture writes `misconceptionTags` rows mid-game with
   * this id, and `useWeaknessSignals` reloads the spine on
   * `weaknessModelChanged` — so by the second slip of one game the spine
   * already carried THIS game, and "you've walked into this before" was
   * spoken on a first occurrence. REQUIRED, `null` only when the surface
   * genuinely has no game id: a new caller must answer, not inherit the
   * self-count.
   */
  currentGameId: string | null;
}

export interface LearnFundamental {
  id: FundamentalId;
  tag: string;
  /** Spoken-ready verdict — full the first time this game, a short stem after
   *  (the shared `seen` set makes the walk accumulate instead of nag). */
  verdict: string;
  /** The loop, out loud (WO-LOOP-01): "you've walked into this before — the
   *  third game now, the last one against X". Null on a fresh record, an
   *  unmatched fundamental, a repeat within this game, or a fundamental whose
   *  only recorded games are THIS one. Present tense — the live register,
   *  never the review's. */
  recurrence: string | null;
  /** The square the fundamental is about, when it names one (the loose piece,
   *  the rim knight) — so a caller can tell when its own evidence line is the
   *  same fact (re-walk 1380, 24.Bg5: "the bishop on g5 hangs" and "that left
   *  your bishop on g5 hanging" in one breath). */
  square: string | null;
}

/**
 * The fundamental the student's just-played move neglected, ready to speak, or
 * null when nothing attributes (a clean move, a move whose slip has no nameable
 * fundamental, or an unparseable position). `seen` is the per-GAME set of
 * fundamentals already spoken in full — pass the same set across a game so a
 * repeated fundamental comes back in a short stem.
 */
export function learnFundamentalVerdict(
  input: LearnFundamentalInput,
  seen: Set<FundamentalId>,
  /** The student's spine, joined — absent means a cold student (no recurrence). */
  studentWeaknesses: readonly WeaknessSignal[] = [],
): LearnFundamental | null {
  const attrs = attributeLiveFundamental(input);
  if (attrs.length === 0) return null;

  // First appearance THIS game → the recurrence clause may follow the full
  // verdict; a repeat within the game already got its short stem and says
  // nothing about other games twice.
  const firstThisGame = !seen.has(attrs[0].id);
  const verdict = renderFundamentalVerdict(attrs.slice(0, 1), {
    ply: input.historySans.length,
    seen,
  });
  if (!verdict.trim()) return null;
  const recurrence = firstThisGame
    ? fundamentalRecurrenceLine({
      ids: [attrs[0].id],
      signals: studentWeaknesses,
      register: 'live',
      seenLabels: new Set(),
      currentGameId: input.currentGameId,
    })
    : null;
  const sq = attrs[0].facts.square;
  return { id: attrs[0].id, tag: attrs[0].tag, verdict, recurrence, square: typeof sq === 'string' ? sq : null };
}
