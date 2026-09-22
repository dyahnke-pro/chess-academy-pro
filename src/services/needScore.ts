// needScore — THE STUDENT TERM of narration importance (unified-coach N2,
// CLAUDE.md "NARRATION IS SELECTED BY THE STUDENT'S COMPUTED NEED", David
// 2026-09-15: "Make it algo based. Narrate where the data tells us the user
// needs narration/teaching.").
//
// A ply earns teaching when THIS student's own data says so — not because it is
// an opening ply (the retired R2 "≥80% of opening plies get a why"), not because
// the model felt like it (G0). Five terms, every one computed from the
// student's record:
//
//   need = bookDepartureHere (35/55) + weaknessMatch (≤55) + unfamiliarity (≤50)
//        + openingResultDeficit (≤40) + onCausalThread (35)     — bar: 50
//
// Cold start (< COLD_START_GAMES fully-analysed games): the data terms are all
// zero, so a PRIOR keyed on the rating band stands in and the coach TEACHES —
// a fresh install never meets a mute coach. The prior fades as games arrive.
//
// One deliberate deviation from the plan's first draft (§3.2 said "threshold
// reuses criticalityThresholds"): that bar is in CENTIPAWNS and grows for
// weaker players (200 at <1000), which would make a beginner need MORE evidence
// to hear teaching — backwards. Need lives on its own 0–100 scale with a fixed
// bar; the rating enters only through the terms' own computers
// (`bookDepartureIsCostly`). This is still the student
// term of ONE importance filter, not a second criticality: it gates the quiet
// per-ply teaching beat only; a swing / must-defend / mate speaks on its own
// importance regardless of need.
//
// Pure. No I/O. The context is loaded once per game by `loadStudentNeedContext`
// (surface side) and handed in — the selector and the review walk both consume
// this same function (invariant: one computer set).

import type { WeaknessSignal } from './weaknessSignal';
import { matchClauseKind, matchFundamental, matchTacticPattern, matchTag, boostFor, MAX_WEAKNESS_BOOST } from './weaknessSignal';
import { bookDepartureIsCostly, type BookDepartureRow } from './bookDepartureWeakness';
import type { TacticPatternType } from '../types/tacticTypes';
import { capabilityProven, HELD_FOR_PROVEN, type CapabilityProfile } from './capabilityEvidence';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { emitNeedScore } from './coachDecisionEvents';

/** Below this many fully-analysed games the student has no data — the prior teaches. */
export const COLD_START_GAMES = 5;
/** A ply speaks when its need clears this (0–100). */
export const NEED_THRESHOLD = 50;
/** Correct repetitions of a line after which it is familiar enough to be silent. */
export const FAMILIAR_REPS = 5;

export interface StudentNeedContext {
  rating: number;
  /** Fully-analysed games on record (cold start below COLD_START_GAMES). */
  gamesPlayed: number;
  /** The student's weakness signals (empty = no known holes). */
  signals: readonly WeaknessSignal[];
  /** The student's book departures (all openings; matched by opening here). */
  bookDepartures: readonly BookDepartureRow[];
  /** This game's opening, when known — scopes departures + results. */
  openingId?: string | null;
  /** Correct (book/good) repetitions of this exact line prefix by this student,
   *  per ply index (0-based). Missing/undefined = never seen. */
  lineReps?: ReadonlyArray<number>;
  /** The student's score share (0–1) in this opening, and overall. Null when
   *  fewer than a handful of games back either number. */
  openingScore?: number | null;
  overallScore?: number | null;
  /**
   * THE POSITIVE HALF — what this student has PROVEN they can do.
   *
   * 🚨 Required, and empty is a real answer. Until 2026-09-18 this module
   * mentioned the capability model THREE TIMES IN PROSE and read it ZERO times:
   * `coldStartPrior`'s own comment justifies its value "under the capability
   * model", and nothing was ever connected. A doc comment describing a system
   * that does not exist is the same defect as a comment describing a flag that
   * means something else — both were found the same night.
   *
   * ABSENT FROM THE MAP MEANS UNKNOWN — never mastery, never a hole.
   */
  capabilities: CapabilityProfile;
}

/** The empty context — a brand-new student. Every data term is zero; the
 *  cold-start prior carries the coach. */
export function coldStudent(rating = DEFAULT_STUDENT_RATING): StudentNeedContext {
  return { rating, gamesPlayed: 0, signals: [], bookDepartures: [], capabilities: new Map() };
}

export interface NeedPlyInput {
  /** 1-based ply. */
  ply: number;
  /** Is this the student's own move? (Need is only ever computed for those.) */
  studentMove: boolean;
  /** The computed concept of the ply (a landed / available tactic), when any. */
  conceptId?: TacticPatternType | null;
  /**
   * THE FUNDAMENTAL THIS MOVE BROKE — the `FundamentalId` `attributePrinciples`
   * proved on THIS ply, or null when nothing was attributed.
   *
   * 🚨 REQUIRED, and `null` is a real answer, for the same reason `clauseKind`
   * is (below) and `momentBoost` is on the door: an OPTIONAL student term is a
   * lane's licence to forget the student, and this repo has now found four
   * lanes that took it.
   *
   * WHY IT IS ITS OWN ROUTE AND NOT A CLAUSE KIND. `matchClauseKind('fundamental')`
   * answers with the student's most-pressing POSITIONAL hole — any row in the
   * bucket. So the coach could say "you left a piece loose AGAIN" (the recurrence
   * line, which joins exactly via `matchFundamental`) while the computer that
   * decided how much that moment was worth had matched some unrelated structural
   * note. One sentence, two joins, two different holes. This is the finest key
   * the record carries — the same `fundamental:<id>` rows the Fundamentals tab
   * counts (`getFundamentalCounts` / `weaknessSpine.aggregateFundamentals` read
   * the SAME `misconceptionTags.fundamentalId`), so the heat map the student
   * SEES and the need the decider COMPUTES are now the same number.
   *
   * It is a plain string, not `FundamentalId`, to keep this leaf from importing
   * `principleAttribution` (a 1,278-line board computer) for a key it only ever
   * compares. `matchFundamental` does the same.
   */
  fundamentalId: string | null;
  /**
   * The positionFacts clause kind the ply's teaching would carry
   * ('fundamental' / 'structure-plan' / 'must-defend' / 'convert' / …).
   *
   * 🚨 REQUIRED, and `null` is a real answer — a caller must DECIDE rather than
   * inherit a silent default. It was optional until 2026-09-18 and the live
   * lane (`positionFacts`) simply never passed it, which made `weaknessTerm`
   * — the largest term in the score, 55 against a 50 bar — structurally dead
   * on every live surface. A student with a persistent hole, on a line they
   * knew, scored 0 and the coach said nothing.
   *
   * This is the half of the weakness join that `conceptId` cannot cover:
   * `matchTacticPattern` reaches TACTICAL holes, while the positional,
   * structural and endgame ones are only reachable through `matchClauseKind`.
   * A caller supplying only `conceptId` is blind to the second kind.
   */
  clauseKind: string | null;
  /** The ply lies on the game's causal thread (selector `onThread`). */
  onThread?: boolean;
  /**
   * WHAT THE BOARD ASKED at this ply, from `capabilitiesPosed` — the same
   * computer that WRITES the green record, used in the other direction. That is
   * the dual-use rule, and it is why no fourth fact-to-hole mapping is authored
   * here: the join is computed from the board, not typed into a table.
   *
   * 🚨 POSED, not "shown". These are ungated by how the student answered,
   * because the two terms below need opposite things from them:
   *  • `capabilityTerm` (GREEN) also requires `playedCleanly` — a move that
   *    dropped a pawn demonstrates nothing.
   *  • `weaknessTerm` needs only that the question was ASKED. A known hole is
   *    most live on the plies the student got WRONG, so filtering by clean play
   *    would blind the coach exactly where it should speak.
   *
   * This used to be a pre-filtered `capabilityTags` list, which hid the guard
   * inside whichever list a caller happened to be handed — two vocabularies for
   * one idea, the shape the rot rule bans. One list, one visible guard.
   *
   * Empty/absent ⇒ the board posed no question we can name.
   */
  posedTags?: readonly MisconceptionTagId[];
  /** Was the move clean enough to DEMONSTRATE a capability
   *  (`movePlayedCleanly`)? Only the green term reads it. */
  playedCleanly?: boolean;
}

export interface NeedVerdict {
  /** 0–100. */
  score: number;
  speak: boolean;
  /** Which terms fired, for the facts trail / the coverage audit. */
  reasons: string[];
  /** True when the cold-start prior (not data) decided. */
  prior: boolean;
}

/**
 * THE COLD START ASSUMES THE STUDENT KNOWS NOTHING (David 2026-09-17: "Teach
 * from what we are building now. From move one. The most liberal narration
 * pattern. Assuming the user knows nothing." + "Not elo based. I want it to be
 * capabilities of our system.").
 *
 * This used to be a rating LADDER — 70/62/55/threshold by band. Two things were
 * wrong with that. It read an ELO, which is the axis David rejected; and the
 * ELO it read is, for any student who never imported games, the profile default
 * of 800 for life (see the plan doc §4) — so the "band" was not measuring
 * anything about the student at all.
 *
 * Under the capability model a cold student has NO evidence: every capability is
 * UNKNOWN, which is not mastery and not a hole. The honest response to unknown
 * is to teach it, so the prior is the ceiling for everyone, with no parameter to
 * get wrong.
 *
 * WHY THIS CANNOT FLOOD THE STUDENT, and it is structural rather than lucky:
 *  • NEED IS A VETO, NEVER A PROMOTER. `coachDecider.decide` gates on importance
 *    FIRST and only then consults need, which can only return silent. Maxing the
 *    prior therefore stops need from vetoing a cold student — it cannot open a
 *    moment importance already closed, so Play stays the pure playing surface
 *    its contract requires.
 *  • THE BOARD RATIONS THE BREADTH. Teaching every unknown capability does not
 *    mean teaching 25 things: only the one or two the position in front of the
 *    student actually demonstrates can fire at all.
 *  • WITHIN A PLY, `factSelector` collapses same-claim facts and the 7 bare
 *    clause kinds are one-per-ply by construction.
 *  • ACROSS PLIES, `alreadySaid` carries the say-once set forward.
 */
export function coldStartPrior(): number {
  return 100;
}

/** 0–1: how much of this line the student has already played correctly. */
export function familiarity(reps: number | undefined): number {
  if (!reps || reps <= 0) return 0;
  return Math.min(1, reps / FAMILIAR_REPS);
}

function departureTerm(ply: number, ctx: StudentNeedContext): { score: number; reason: string | null } {
  const here = ctx.bookDepartures.filter((r) =>
    (ctx.openingId == null || r.openingId == null || r.openingId === ctx.openingId)
    && Math.abs(r.departurePly - ply) <= 1);
  if (here.length === 0) return { score: 0, reason: null };
  const costly = here.some((r) => bookDepartureIsCostly(r, ctx.rating));
  const score = costly ? 55 : 35;
  return { score, reason: `book departure here in ${here.length} game(s)${costly ? ', costly' : ''}` };
}

/**
 * THE FOUR ROUTES TO A HOLE, IN ORDER OF PRECISION — and the ORDER is the point.
 *
 * Each reaches a different part of the student's record, and a lane supplying
 * only one is blind to the rest:
 *  1. `fundamentalId` → THE EXACT FUNDAMENTAL this move broke, matched against
 *                    the student's own `fundamental:<id>` rows — the same rows
 *                    the Fundamentals tab counts. Exact, never by bucket.
 *  2. `conceptId`   → TACTICAL holes (fork, pin, skewer …) via the vocabulary bridge.
 *  3. `posedTags`   → the COACH'S OWN captures. `fromMisconception` files those
 *                    rows under the misconception tag itself, so a hole the
 *                    student admitted in "why did you play that?" joins here and
 *                    nowhere else. Exact, per tag.
 *  4. `clauseKind`  → POSITIONAL, STRUCTURAL and ENDGAME-CONVERSION holes, which
 *                    have no tactic id and are reachable no other way.
 *
 * 🚨 PRECISE BEFORE COARSE, AND THE COARSE ONE STAYS. Route 4 is the only
 * BUCKET match in the set: `matchClauseKind('fundamental' | 'structure-plan')`
 * answers with the most-pressing hole in the whole positional bucket, which on
 * a ply where routes 1–3 have an exact answer is a worse answer to the same
 * question. It ran SECOND until 2026-09-21, so it pre-empted the two exact
 * routes below it and the score was computed about a different hole than the
 * sentence was.
 *
 * It is DEMOTED rather than deleted, deliberately. Removing it would make the
 * coach QUIETER on a student who has a real positional hole that no attributor
 * named on this ply — and the ALGO-BASED law is that data may RAISE freely and
 * may only LOWER on evidence of the POSITIVE (which is `capabilityTerm`'s job
 * and nothing else's). A coarse match is weak evidence, not false evidence.
 *
 * The review lane supplied only `conceptId` until 2026-09-18 and was therefore
 * blind to a positional student entirely. Every matcher already existed; none
 * of this is a new table.
 */
/** The most-pressing hole among the tags this board POSED. Ungated by how the
 *  move went — see `posedTags`. */
function bestPosedMatch(p: NeedPlyInput, ctx: StudentNeedContext): WeaknessSignal | null {
  if (!p.posedTags?.length) return null;
  let best: WeaknessSignal | null = null;
  let bestB = 0;
  for (const tag of p.posedTags) {
    const m = matchTag(tag, ctx.signals);
    if (!m) continue;
    const b = boostFor(m);
    if (b > bestB) { bestB = b; best = m; }
  }
  return best;
}

function weaknessTerm(p: NeedPlyInput, ctx: StudentNeedContext): { score: number; reason: string | null } {
  if (ctx.signals.length === 0) return { score: 0, reason: null };
  const match = matchFundamental(p.fundamentalId, ctx.signals)
    ?? (p.conceptId ? matchTacticPattern(p.conceptId, ctx.signals) : null)
    ?? bestPosedMatch(p, ctx)
    ?? (p.clauseKind ? matchClauseKind(p.clauseKind, ctx.signals) : null);
  if (!match) return { score: 0, reason: null };
  // boostFor is 0–MAX_WEAKNESS_BOOST; a persistent, worsening hole alone clears the bar.
  const score = Math.round((boostFor(match) / MAX_WEAKNESS_BOOST) * 55);
  return score > 0 ? { score, reason: `weakness: ${match.clusterId} (${match.lifecycleStatus ?? 'open'})` } : { score: 0, reason: null };
}

/** Re-exported so existing importers keep working. The bar itself now lives
 *  in `capabilityEvidence`, beside the profile that computes the streak — it
 *  has two readers (here and `studentMomentBoost`) and a constant with two
 *  readers belongs with the thing it describes, not with one of them. */
export { HELD_FOR_PROVEN };

/**
 * THE POSITIVE TERM — the only one that can LOWER need, and the first evidence
 * of the positive the model has ever had.
 *
 * The heat map has three states and the app could only ever say two of them.
 * `capabilityEvidence` has been writing `held` rows from game review, and
 * `getCapabilityProfile` had THREE call sites, all inside its own test — so
 * success was recorded and nothing consumed it. Every data term was therefore
 * RAISE-ONLY: the coach could get louder about you and never quieter, and
 * silence stayed a guess instead of a computed verdict.
 *
 * THE THREE STATES, and which one each branch is:
 *  • GREY (absent from the map) → 0. Never asked is NOT mastered, so nothing is
 *    lowered and the other terms carry the ply. This is the branch the
 *    ALGO-BASED rule is about: a change that makes the coach quieter on MISSING
 *    data is wrong, so absence must be inexpressible as evidence.
 *  • RED (any `broken` row) → 0. The negative half already raises through
 *    `weaknessTerm`; green may not argue with a recorded failure.
 *  • GREEN (held ≥ HELD_FOR_PROVEN, zero broken) → a negative score.
 *
 * It cannot silence a blunder, and that is STRUCTURAL rather than guarded:
 * `capabilityTags` comes from `capabilitiesShown`, which returns [] for a move
 * costing a pawn or more, so a ply the student got wrong carries no tags to
 * lower with.
 */
function capabilityTerm(p: NeedPlyInput, ctx: StudentNeedContext): { score: number; reason: string | null } {
  // THE GREEN GUARD, now explicit. It used to live inside `capabilitiesShown`,
  // so this term was safe only because of which list the caller passed — a
  // property no reader of this function could check. A ply the student
  // blundered proves nothing and may never be quieted by green.
  //
  // Requires TRUE, not "not false": a lane that cannot grade the move (a book
  // move, a missing pre-move read) knows NOTHING about how it went, and unknown
  // may never be read as clean. Grey is unaffected — it asks only whether the
  // board POSED the question, so the live lane can still teach an unproven
  // capability on a ply it could not grade.
  if (p.playedCleanly !== true) return { score: 0, reason: null };
  if (!p.posedTags?.length || ctx.capabilities.size === 0) return { score: 0, reason: null };
  const proven: string[] = [];
  for (const tag of p.posedTags) {
    const e = ctx.capabilities.get(tag);
    // ONE definition of proven (`capabilityEvidence.capabilityProven`): a
    // RECENT clean streak spanning at least two distinct games. GREY (absent)
    // and RED (a break inside the streak) both fail it, so the three states
    // still fall out of the one call rather than out of three branches here.
    if (!e || !capabilityProven(e)) continue;
    proven.push(`${tag} (${e.heldStreak} held in a row across ${e.streakGames} games)`);
  }
  if (proven.length === 0) return { score: 0, reason: null };
  // One bar's worth of quiet per proven capability, so two independent proofs
  // about the same ply are quieter than one. Bounded by the clamp in
  // `computeNeed`; it can reach 0 but never negative, and it never crosses over
  // into raising.
  const score = -Math.min(NEED_THRESHOLD, proven.length * 25);
  return { score, reason: `proven: ${proven.join(', ')}` };
}

function unfamiliarityTerm(p: NeedPlyInput, ctx: StudentNeedContext): { score: number; reason: string | null } {
  if (!ctx.lineReps) return { score: 0, reason: null };
  const f = familiarity(ctx.lineReps[p.ply - 1]);
  // A never-seen line is a real need on its own (the bar exactly); each correct
  // rep decays it, so by FAMILIAR_REPS the line is silent unless a hole, a
  // departure or the thread says otherwise.
  const score = Math.round(NEED_THRESHOLD * (1 - f));
  return score > 0 ? { score, reason: `line familiarity ${(f * 100).toFixed(0)}%` } : { score: 0, reason: 'line familiar — silent' };
}

function resultDeficitTerm(ctx: StudentNeedContext): { score: number; reason: string | null } {
  if (ctx.openingScore == null || ctx.overallScore == null) return { score: 0, reason: null };
  const deficit = Math.max(0, Math.min(0.5, ctx.overallScore - ctx.openingScore));
  const score = Math.round(deficit * 80);
  return score > 0 ? { score, reason: `scores ${(deficit * 100).toFixed(0)}pts below overall in this opening` } : { score: 0, reason: null };
}

/**
 * The need verdict for one ply. Only the student's own plies can have need —
 * the opponent's move is never the student's lesson (their slips are the
 * refuted-alternative computer's business, N3).
 */
export function computeNeed(p: NeedPlyInput, ctx: StudentNeedContext): NeedVerdict {
  if (!p.studentMove) return { score: 0, speak: false, reasons: ['opponent move'], prior: false };
  const reasons: string[] = [];
  let score = 0;
  // NAMED so the contribution can be trended per term (the algo-audit rule:
  // a weighted sum whose terms cannot be separated can only be judged by its
  // output, and a term contributing nothing looks the same from there as one
  // working correctly). The names are the emission's keys — renaming one
  // renames the series, so treat them as the wire format they are.
  const terms: Record<string, number> = {};
  for (const [name, t] of [
    ['departure', departureTerm(p.ply, ctx)],
    ['weakness', weaknessTerm(p, ctx)],
    ['unfamiliarity', unfamiliarityTerm(p, ctx)],
    ['resultDeficit', resultDeficitTerm(ctx)],
    ['capability', capabilityTerm(p, ctx)],
  ] as const) {
    terms[name] = t.score;
    score += t.score;
    if (t.reason) reasons.push(t.reason);
  }
  terms.thread = p.onThread ? 35 : 0;
  if (p.onThread) { score += 35; reasons.push('on the causal thread'); }
  let prior = false;
  if (ctx.gamesPlayed < COLD_START_GAMES) {
    const pr = coldStartPrior();
    if (pr > score) { score = pr; prior = true; reasons.push(`cold start (${ctx.gamesPlayed} games) — rating prior`); }
  }
  score = Math.max(0, Math.min(100, score));
  const verdict: NeedVerdict = { score, speak: score >= NEED_THRESHOLD, reasons, prior };
  // Telemetry LAST and never inside the loop: the verdict is computed first,
  // so a listener can never change what the student hears.
  emitNeedScore({ ply: p.ply, score, speak: verdict.speak, prior, terms });
  return verdict;
}
