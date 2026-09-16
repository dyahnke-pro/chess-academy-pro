// coachDecider — THE ONE DECIDING COMPUTER (David 2026-09-16: "I want one
// unified deciding computer. Merge them if possible").
//
// Everything the coach says passes through exactly one decision, made here, in
// code (G0 — the LLM decides nothing, it only phrases what this returns).
//
// WHAT WAS MERGED. The decision used to be spread across three modules that no
// caller composed the same way twice:
//   • `narrationImportance.computeImportance` — does this MOMENT earn voice.
//   • the NEED score (N2)                     — does THIS STUDENT need it here.
//   • `factSelector.selectFacts`              — which FACTS at that moment speak.
// plus `reviewFacetRank` for the order. Three doors meant three places for a
// surface to disagree with another surface about the same board, and it is why
// `factSelector` reached review and nothing else.
//
// They are now ONE call with one result. The maths still lives in those modules
// — they are separately tested and this composes them rather than copying them
// (the CLAUDE.md rule: never add a second criticality). What changes is that
// there is a single entry point, so a new surface cannot invent its own
// composition, and so a change to the decision reaches every surface at once.
//
// THE ORDER OF THE DECISION, and why it is this order:
//   1. IMPORTANCE — is this moment worth anything at all? (rating-scaled,
//      contested-gated; a swing inside a decided game is not a moment.)
//   2. NEED — does this student need it? A line they have played correctly five
//      times is silent even when the position is interesting.
//   3. SUBSUME — collapse the facts that are one claim about one geometry.
//   4. FLOOR — sweep what is not worth saying at this moment.
//   5. ORDER — most-important-first, with the student's weaknesses raised.
// Steps 1–2 decide WHETHER, 3–5 decide WHAT. Silence at any step is a computed
// verdict with a reason attached — never an absence.
import { computeImportance, type ImportanceSignals, type ImportanceTier } from './narrationImportance';
import { selectFacts, type QuietFact } from './factSelector';
import { rankFacets } from './reviewFacetRank';
import type { WeaknessSignal } from './weaknessSignal';

/** What this student brings to the board. */
export interface StudentContext {
  rating: number;
  /** The weakness spine — raises facts about the holes they keep falling in. */
  weaknesses: readonly WeaknessSignal[];
  /** The N2 need verdict for THIS ply, when the surface computed one. Absent
   *  means "no need data" — which is NOT the same as "no need": a cold student
   *  must never meet a mute coach, so absent reads as speak. */
  need?: { speak: boolean } | null;
}

/** The facts a surface computed at this moment, with the geometry coupled from
 *  the computers that produced them (never scraped from the prose). */
export interface FactBundle {
  facts: readonly string[];
  squares: ReadonlyMap<string, readonly string[]>;
  /** Facts describing what the OPPONENT is doing TO the student. */
  incoming?: ReadonlySet<string>;
}

export interface CoachDecision {
  /** Does this moment speak at all? */
  speak: boolean;
  /** Why it does or does not — the observability trail. */
  reason: 'importance' | 'need' | 'spoken';
  tier: ImportanceTier;
  /** Moment-level weight, for ordering moments against each other. */
  rank: number;
  /** The facts that speak, most-important-first. Empty when `speak` is false. */
  spoken: string[];
  /** Every fact that did not, and why. */
  quiet: QuietFact[];
}

/**
 * THE decision. One call, one answer, every surface.
 *
 * @param signals the moment's grounded signals (engine/board, already computed)
 * @param student who is being taught
 * @param bundle  the candidate facts + their coupled geometry
 */
export function decide(
  signals: ImportanceSignals,
  student: StudentContext,
  bundle: FactBundle,
): CoachDecision {
  const importance = computeImportance(signals, student.rating);
  const base = { tier: importance.tier, rank: importance.rank };

  // 1 — THE MOMENT. `computeImportance` already applies the contested gate, so
  // a swing inside a decided game never reaches here as important.
  if (!importance.speak) {
    return { ...base, speak: false, reason: 'importance', spoken: [], quiet: bundle.facts.map((text) => ({ text, why: 'below-bar' as const })) };
  }
  // 2 — THE STUDENT. Absent need data reads as speak: a fresh install must meet
  // a teaching coach, not a mute one (the cold-start rule).
  if (student.need && !student.need.speak) {
    return { ...base, speak: false, reason: 'need', spoken: [], quiet: bundle.facts.map((text) => ({ text, why: 'below-bar' as const })) };
  }
  // 3 + 4 — WHICH FACTS. Subsumption collapses one-claim duplicates; the floor
  // sweeps trivia. The floor may never mute a ply — that was step 2's job and
  // it has already run (see `factSelector`'s BAR_BY_TIER note).
  const selection = selectFacts(
    bundle.facts,
    bundle.squares,
    importance.tier,
    student.weaknesses,
    bundle.incoming ?? new Set(),
  );
  // 5 — THE ORDER. Importance first, with the student's own holes raised.
  const spoken = rankFacets(selection.spoken, student.weaknesses);
  return { ...base, speak: true, reason: 'spoken', spoken, quiet: selection.quiet };
}
