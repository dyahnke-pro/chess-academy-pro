/**
 * sequenceChallenge — judge the student's CALCULATION against the engine PV
 * (Phase 1; David 2026-07-18: "coach should ask if the user can spot the
 * winning sequence first. If not, then that's a bucket we can tag. Longer
 * tactical sequences is a weakness of the user.").
 *
 * The student plays THEIR line for the mover's side on the review board; the
 * defender's PV reply auto-plays. Each student ply is judged here.
 *
 * R4 — THE TRUST CONTRACT (the feature dies the first time a right move is
 * called wrong):
 *   • exact PV match → credit;
 *   • a DIFFERENT move that the engine scores within EQUIVALENT_CP of the PV
 *     move → credit ("equivalent"), and the caller re-seeds the line from
 *     the student's move;
 *   • the equivalence probe UNAVAILABLE (engine busy/dead) → credit
 *     generously ("unverified") and log — never punish on missing data;
 *   • only an eval-VERIFIED worse move is "wrong" — and only verified
 *     fall-offs feed the calculation-depth bucket.
 */
import { Chess } from 'chess.js';
import type { PvPly } from './pvPlayback';

/** A student move within this many cp of the PV move's eval is equivalent. */
export const EQUIVALENT_CP = 30;

export type SequenceVerdict = 'exact' | 'equivalent' | 'unverified' | 'wrong';

export interface SequenceAttempt {
  san: string;
  from: string;
  to: string;
}

/** Engine probe the caller supplies: eval (WHITE POV cp) of `fen` with
 *  `uciMove` played, at a shallow verify depth. Reject/throw = unavailable. */
export type EvalProbe = (fen: string, uciMove: string) => Promise<number>;

function stripGlyphs(san: string): string {
  return san.replace(/[+#!?]+$/, '');
}

/**
 * Judge one student ply of the sequence.
 * `expected` is the PV ply at this index (mover's move); `pvLineEvalCp` is
 * the line's promise (WHITE POV) used as the equivalence yardstick.
 */
export async function judgeSequenceAttempt(opts: {
  expected: PvPly;
  attempt: SequenceAttempt;
  /** The line's eval promise, WHITE POV cp (rootEvalCp of the PvLine). */
  pvLineEvalCp: number;
  evalProbe?: EvalProbe;
}): Promise<SequenceVerdict> {
  const { expected, attempt } = opts;
  // Exact: same SAN (glyph-insensitive) or same from→to squares.
  if (
    stripGlyphs(attempt.san) === stripGlyphs(expected.san) ||
    (attempt.from === expected.uci.slice(0, 2) && attempt.to === expected.uci.slice(2, 4))
  ) {
    return 'exact';
  }
  // Different move — is it just as good? Probe its eval.
  if (!opts.evalProbe) return 'unverified'; // no probe wired → generous
  const attemptUci = `${attempt.from}${attempt.to}`;
  let attemptEvalCp: number;
  try {
    attemptEvalCp = await opts.evalProbe(expected.fenBefore, attemptUci);
  } catch {
    return 'unverified'; // probe failed → never punish on missing data
  }
  const moverIsWhite = expected.moverColor === 'white';
  const pov = (cp: number): number => (moverIsWhite ? cp : -cp);
  return pov(attemptEvalCp) >= pov(opts.pvLineEvalCp) - EQUIVALENT_CP ? 'equivalent' : 'wrong';
}

export interface SequenceOutcome {
  /** Mover plies the student got through (exact/equivalent/unverified). */
  reachedPlies: number;
  /** Mover plies the sequence asked for in total. */
  totalPlies: number;
  /** True only when a VERIFIED wrong move ended the run (bucket-worthy;
   *  R4: ambiguity never feeds the weakness profile). */
  verifiedFallOff: boolean;
  completed: boolean;
}

/** The mover's plies of a PV line (the ones the student must find —
 *  defender replies auto-play). */
export function moverPlies(plies: PvPly[]): PvPly[] {
  if (plies.length === 0) return [];
  const moverColor = plies[0].moverColor;
  return plies.filter((p) => p.moverColor === moverColor);
}

/** Legality guard for the sequence board: the attempt must be legal in the
 *  expected position (the UI board enforces this, but never trust a caller). */
export function isLegalAt(fen: string, attempt: SequenceAttempt): boolean {
  try {
    const c = new Chess(fen);
    return c.moves({ verbose: true }).some((m) => m.from === attempt.from && m.to === attempt.to);
  } catch {
    return false;
  }
}
