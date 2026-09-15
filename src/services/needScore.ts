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
//   need = bookDepartureHere (35/55) + weaknessMatch (≤55) + unfamiliarity (≤25)
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
// bar; the rating enters through the cold-start prior and the terms' own
// rating-scaled computers (`bookDepartureIsCostly`). This is still the student
// term of ONE importance filter, not a second criticality: it gates the quiet
// per-ply teaching beat only; a swing / must-defend / mate speaks on its own
// importance regardless of need.
//
// Pure. No I/O. The context is loaded once per game by `loadStudentNeedContext`
// (surface side) and handed in — the selector and the review walk both consume
// this same function (invariant: one computer set).

import type { WeaknessSignal } from './weaknessSignal';
import { matchClauseKind, matchTacticPattern, boostFor, MAX_WEAKNESS_BOOST } from './weaknessSignal';
import { bookDepartureIsCostly, type BookDepartureRow } from './bookDepartureWeakness';
import type { TacticPatternType } from '../types/tacticTypes';

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
}

/** The empty context — a brand-new student. Every data term is zero; the
 *  cold-start prior carries the coach. */
export function coldStudent(rating = 1500): StudentNeedContext {
  return { rating, gamesPlayed: 0, signals: [], bookDepartures: [] };
}

export interface NeedPlyInput {
  /** 1-based ply. */
  ply: number;
  /** Is this the student's own move? (Need is only ever computed for those.) */
  studentMove: boolean;
  /** The computed concept of the ply (a landed / available tactic), when any. */
  conceptId?: TacticPatternType | null;
  /** The positionFacts clause kind the ply's teaching would carry, when known
   *  ('fundamental' / 'structure-plan' / 'must-defend' / …). */
  clauseKind?: string | null;
  /** The ply lies on the game's causal thread (selector `onThread`). */
  onThread?: boolean;
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

/** Rating-band prior for a student with no data. Every band clears the bar —
 *  "defaults to TEACH" — weaker bands by more, so a per-ply tie-break (e.g. a
 *  later cap on beats per game) keeps their teaching first. */
export function coldStartPrior(rating: number): number {
  if (rating < 1000) return 70;
  if (rating < 1400) return 62;
  if (rating < 1800) return 55;
  return NEED_THRESHOLD; // strong players still get taught cold — the bar exactly
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

function weaknessTerm(p: NeedPlyInput, ctx: StudentNeedContext): { score: number; reason: string | null } {
  if (ctx.signals.length === 0) return { score: 0, reason: null };
  const match = (p.conceptId ? matchTacticPattern(p.conceptId, ctx.signals) : null)
    ?? (p.clauseKind ? matchClauseKind(p.clauseKind, ctx.signals) : null);
  if (!match) return { score: 0, reason: null };
  // boostFor is 0–MAX_WEAKNESS_BOOST; a persistent, worsening hole alone clears the bar.
  const score = Math.round((boostFor(match) / MAX_WEAKNESS_BOOST) * 55);
  return score > 0 ? { score, reason: `weakness: ${match.clusterId} (${match.lifecycleStatus ?? 'open'})` } : { score: 0, reason: null };
}

function unfamiliarityTerm(p: NeedPlyInput, ctx: StudentNeedContext): { score: number; reason: string | null } {
  if (!ctx.lineReps) return { score: 0, reason: null };
  const f = familiarity(ctx.lineReps[p.ply - 1]);
  const score = Math.round(25 * (1 - f));
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
  for (const t of [departureTerm(p.ply, ctx), weaknessTerm(p, ctx), unfamiliarityTerm(p, ctx), resultDeficitTerm(ctx)]) {
    score += t.score;
    if (t.reason) reasons.push(t.reason);
  }
  if (p.onThread) { score += 35; reasons.push('on the causal thread'); }
  let prior = false;
  if (ctx.gamesPlayed < COLD_START_GAMES) {
    const pr = coldStartPrior(ctx.rating);
    if (pr > score) { score = pr; prior = true; reasons.push(`cold start (${ctx.gamesPlayed} games) — rating prior`); }
  }
  score = Math.max(0, Math.min(100, score));
  return { score, speak: score >= NEED_THRESHOLD, reasons, prior };
}
