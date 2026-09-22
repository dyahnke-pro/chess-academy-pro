// reviewTurningPoint — the end-of-review "where did this game turn?" question
// (David 2026-07-11, approved with the review-questions design). Pure fact-
// computer over the review walk's segments: the candidates and the answer are
// COMPUTED from the eval record (G0) — the student self-assesses, the board
// grades. The question is asked once per game, at the end of the walk.
//
// IMPORTANCE MODEL (David 2026-08-26 — CLAUDE.md "THE COMPUTER DECIDES WHAT IS
// SPOKEN"). Which swings count as turning points is now RATING-SCALED (a
// 2-pawn swing is a must-know for a 1200; a 0.5 subtlety is for a 2200 —
// `criticalityThresholds`) and CONTESTED-GATED: a blowout that stays a blowout
// (+8→+5, both sides still decided the same way) never "turned"; throwing a
// won game (+8→−2) did. A flat 1.0-pawn threshold caught the first as loudly
// as the second, and treated every rating the same.

import { criticalityThresholds } from './criticalityScan';

/** A position is decided when |eval| clears this (white-POV cp). */
const DECIDED_CP = 600;
/** Both endpoints decided for the SAME side — the game never turned here. */
function decidedSameSide(beforeCp: number, afterCp: number): boolean {
  return Math.abs(beforeCp) >= DECIDED_CP && Math.abs(afterCp) >= DECIDED_CP
    && Math.sign(beforeCp) === Math.sign(afterCp);
}

export interface TurningPointSegmentLike {
  ply: number;
  moveNumber: number;
  san: string;
  playerColor: 'white' | 'black';
  /** White-POV centipawns, as the review walk carries them. */
  evalBefore: number | null;
  evalAfter: number | null;
  classification: string | null;
  /** The position the mover FACED (before the move) — so the card can preview
   *  the board at a candidate before the student commits (David 2026-07-19:
   *  "give board context, step the board to each candidate"). */
  fenBefore?: string;
}

export interface TurningPointCandidate {
  ply: number;
  /** Display label, e.g. "18… Rd8". */
  label: string;
  /** The move's cost to its mover, in pawns (always > 0 for candidates). */
  swingPawns: number;
  /** The position to preview when this chip is tapped (before commit). */
  fenBefore?: string;
}

export interface TurningPointQuestion {
  question: string;
  /** Up to 4 candidate moments, in game order. */
  candidates: TurningPointCandidate[];
  /** The computed answer — the game's biggest single swing. */
  answer: TurningPointCandidate;
  /** Reveal spoken after the student commits, correct or not. */
  reveal: string;
}

/** Min mover-POV cost (pawns) for a turning-point candidate — the band-free
 *  "critical" bar (B6): a game turns where a mistake was made, whoever made
 *  it. This used to be rating-scaled (2.0 for a beginner, 0.5 for an expert),
 *  which was the rating deciding how many moments a student got to hear. */
export function minSwingPawns(): number {
  return criticalityThresholds().critical / 100;
}
/** The question needs a real choice — at least this many candidates. */
export const TURNING_POINT_MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 4;

export function moveLabel(s: TurningPointSegmentLike): string {
  return `${s.moveNumber}${s.playerColor === 'black' ? '…' : '.'} ${s.san}`;
}

/**
 * The same locator, SPOKEN. `moveLabel` is right on a chip and wrong in the
 * voice: the TTS sanitizer expands the SAN but leaves the number prefix, so
 * "12. Ne5" is read "twelve knight to e5" — the robotic move-number prefix
 * CLAUDE.md §G9.4 bans (found 2026-09-16 in the shipped turning-point reveal).
 * Moving the number out of prefix position into a phrase keeps the locator and
 * reads naturally: "move 12, knight to e5".
 */
export function spokenMoveLabel(label: string): string {
  const m = /^(\d+)(?:\.\.\.|…|\.)\s*(.+)$/.exec(label.trim());
  return m ? `move ${m[1]}, ${m[2]}` : label;
}

/** The move's cost to the side that played it, in pawns (mover POV). */
function swingPawns(s: TurningPointSegmentLike): number | null {
  if (typeof s.evalBefore !== 'number' || typeof s.evalAfter !== 'number') return null;
  const sign = s.playerColor === 'white' ? 1 : -1;
  const cost = (s.evalBefore - s.evalAfter) * sign;
  return cost > 0 ? cost / 100 : null;
}

/**
 * Compute the question, or null when the game doesn't support one (fewer than
 * two costed moments — a clean game has no turning point to find, and a
 * one-blunder game answers itself). Empty > generic > invented.
 */
/**
 * The costed, contested-gated moments of a sequence, BIGGEST SWING FIRST. The
 * one computation the review's turning-point card and the game-level selector
 * (`teachingSelector`, unified-coach N1) share — a moment is a moment on every
 * surface, computed once here. Band-free via `minSwingPawns`.
 */
export function turningPointCandidates(
  segments: ReadonlyArray<TurningPointSegmentLike>,
): TurningPointCandidate[] {
  const minSwing = minSwingPawns();
  const costed: TurningPointCandidate[] = [];
  for (const s of segments) {
    const swing = swingPawns(s);
    if (swing === null || swing < minSwing) continue;
    // Contested gate: a blowout that stayed a blowout (both endpoints decided
    // for the same side) never turned — skip it. Throwing a won game, or any
    // swing that crosses into/out of contested territory, is kept.
    if (typeof s.evalBefore === 'number' && typeof s.evalAfter === 'number'
      && decidedSameSide(s.evalBefore, s.evalAfter)) continue;
    costed.push({ ply: s.ply, label: moveLabel(s), swingPawns: swing, fenBefore: s.fenBefore });
  }
  return costed.sort((a, b) => b.swingPawns - a.swingPawns);
}

export function buildTurningPointQuestion(
  segments: ReadonlyArray<TurningPointSegmentLike>,
): TurningPointQuestion | null {
  const bySwing = turningPointCandidates(segments);
  if (bySwing.length < TURNING_POINT_MIN_CANDIDATES) return null;

  const answer = bySwing[0];
  const candidates = bySwing.slice(0, MAX_CANDIDATES).sort((a, b) => a.ply - b.ply);

  return {
    question: 'One more thing — where do you think this game turned?',
    candidates,
    answer,
    reveal:
      `The turning point was ${answer.label} — the game's biggest single swing, ` +
      `about ${answer.swingPawns.toFixed(1)} points.`,
  };
}

/** Grade a pick. The reveal is the same either way; this feeds the spoken
 *  lead-in and analytics. */
export function judgeTurningPointPick(q: TurningPointQuestion, pickedPly: number): boolean {
  return pickedPly === q.answer.ply;
}

// ─── THE CRITICAL MOMENT, ASKED ─────────────────────────────────────────────
//
// 🔒 REVIEW ASKS AT THE BIGGEST SWING; THE MOMENT WORTH TEACHING IS THE BIGGEST
// CRITICALITY (David 2026-09-18: "I want the only question to come at the
// critical moment. That is where the teaching has most effect." → "This will
// also take place in review.").
//
// The question above is selected by SWING — what a move COST. Criticality is
// how much the CHOICE mattered, and the two come apart exactly where teaching
// is best: a student who FOUND the only move has a swing of ZERO, so the
// swing card can never ask about the most instructive position in the game. On
// the So–Carlsen draw (audit 2026-09-18) it fired not at all — "fewer than 2
// costed moments" on a GM draw full of real forks. That is CLAUDE.md's own
// importance doctrine, failure mode #1 (sharp-but-flat), living in the review
// question.
//
// SAME COMPUTER, DIFFERENT REGISTER. `criticalMoment` computes the count and
// the stake; Learn STATES them mid-decision and this ASKS them afterwards.
// Nothing about the chess differs — only whether the student is still choosing.
import {
  criticalMomentSpeaks, criticalMomentAsk, criticalMomentReveal, criticalMomentHeld,
  type CriticalMomentRead, type StakeId, type SpeakingCriticalMoment,
} from './criticalMoment';

export type { CriticalMomentRead, StakeId, SpeakingCriticalMoment };

/**
 * 🔒 NEVER ASK A STUDENT TO FIND A MOVE THEY PLAYED (CLAUDE.md §G4.5.2). The
 * first cut of this asked "can you find it?" at every critical moment — and the
 * whole point of selecting by CRITICALITY rather than swing is that it reaches
 * the positions where the student FOUND the only move. Asking them to find it
 * again is §G4.5.2's exact defect: their own success handed back as a miss they
 * never made.
 *
 * So the register follows the board, not the card:
 *  • `credit` — their move held. STATE it. This is the app's first computed
 *    GREEN sentence at a critical moment, and it is better teaching than a
 *    quiz whose answer they already produced.
 *  • `ask` — their move did not hold and exactly ONE move did. Withhold and
 *    ask; the move is named only in the reveal, and the chips are the fan's own
 *    other lines (real engine moves from this board, never a made-up decoy).
 *  • `note` — their move did not hold and TWO did. STATED, not asked: a
 *    three-chip question with two right answers is not a question, and the
 *    teaching is in the reveal either way.
 *
 * The MOMENT is still selected by pure criticality; only its register differs.
 */
export type CriticalMomentRegister = 'credit' | 'ask' | 'note';

export interface CriticalMomentQuestion {
  register: CriticalMomentRegister;
  ply: number;
  /** The position the student FACED — the board the card sits on. */
  fenBefore: string;
  /** `ask` only: withholds the move, always (the honesty contract). Null on a
   *  `credit` / `note`, where there is nothing to ask. The card renders iff
   *  this is non-null. */
  question: string | null;
  /** `ask` only: the chips, in a ply-keyed deterministic order — the answer is
   *  never first. Empty otherwise. */
  choices: readonly string[];
  /** `credit`: spoken at the ply. `ask`: spoken only after they commit. */
  reveal: string;
  /** What they played in the real game. */
  playedSan: string;
  /** Did their real move hold? `register === 'credit'` iff this is true. */
  found: boolean;
  count: number;
  stake: StakeId;
  holdingSans: readonly string[];
  /** Best minus runner-up, mover-POV — the ranking key. */
  gapCp: number;
}

/**
 * Pick the game's one critical moment and phrase it as a question, or null when
 * no scanned ply resolved to a real count.
 *
 * SELECTION IS PURE CRITICALITY: one-move positions before two-move forks, then
 * the widest gap, then the earliest ply. Deliberately NOT re-ranked by whether
 * the student got it right — both outcomes teach, and preferring the misses
 * would rebuild the swing card under a new name.
 */
export function buildCriticalMomentQuestion(
  segments: ReadonlyArray<TurningPointSegmentLike>,
  reads: ReadonlyMap<number, CriticalMomentRead>,
  playerColor: 'white' | 'black',
): CriticalMomentQuestion | null {
  let best: { seg: TurningPointSegmentLike & { fenBefore: string }; read: SpeakingCriticalMoment } | null = null;
  for (const seg of segments) {
    if (seg.playerColor !== playerColor) continue;   // only the student's own decisions
    if (!seg.fenBefore) continue;
    const fenBefore = seg.fenBefore;
    const read = reads.get(seg.ply) ?? null;
    if (!criticalMomentSpeaks(read)) continue;
    const here = { seg: { ...seg, fenBefore }, read };
    if (!best) { best = here; continue; }
    const better = read.count !== best.read.count
      ? read.count < best.read.count
      : read.gapCp !== best.read.gapCp
        ? read.gapCp > best.read.gapCp
        : seg.ply < best.seg.ply;
    if (better) best = here;
  }
  if (!best) return null;

  const { seg, read } = best;
  const named = criticalMomentReveal(read);
  if (!named) return null;   // no move to name → nothing honest to say
  const found = criticalMomentHeld(read, seg.san);
  const register: CriticalMomentRegister = found ? 'credit' : read.count === 1 ? 'ask' : 'note';
  const question = register === 'ask' ? criticalMomentAsk(read, seg.ply) : null;
  if (register === 'ask' && !question) return null;
  // THE CHIPS ARE THE ENGINE'S OWN LINES from this very position — the holding
  // move plus the fan's discards, and the move they actually played when the
  // fan did not already contain it. Rotated on the ply so the answer is not
  // always first, deterministically (never `Math.random`).
  const pool = register === 'ask'
    ? [...new Set([...read.holdingSans, ...read.discardedSans, seg.san])]
    : [];
  const shift = pool.length ? Math.abs(seg.ply) % pool.length : 0;
  const choices = [...pool.slice(shift), ...pool.slice(0, shift)];
  return {
    register,
    ply: seg.ply,
    fenBefore: seg.fenBefore,
    question,
    choices,
    // THE STUDENT IS THE SUBJECT OF THEIR OWN REVIEW. The credit names what
    // they did before it names the chess; the ask names what they played
    // without grading a move the engine never flagged.
    reveal: found
      ? `That was a critical moment. ${named} You found it over the board.`
      : `You played ${seg.san}. ${named}`,
    playedSan: seg.san,
    found,
    count: read.count,
    stake: read.stake,
    holdingSans: read.holdingSans,
    gapCp: read.gapCp,
  };
}

/** Grade the student's pick against the moves that actually held. */
export function judgeCriticalMomentPick(q: CriticalMomentQuestion, pickedSan: string): boolean {
  return q.holdingSans.includes(pickedSan);
}
