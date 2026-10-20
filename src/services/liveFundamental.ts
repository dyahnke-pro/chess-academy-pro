// liveFundamental — the fundamental a LIVE move neglected, computed from the
// two engine reads a live surface already holds (C4, WO-STANDARD-01).
//
// ONE computer, TWO consumers (the dual-use rule): `learnFundamentalNarration`
// speaks it on the Learn board, and `positionFacts` hands the same id to
// `computeNeed` so the student's OWN record of that exact fundamental raises
// the decision — the way review has done since `attributeGameFundamentals`.
// Until C4 the live lane passed `fundamentalId: null` to need with a comment
// calling the blocker "concrete rather than architectural"; the reads were in
// scope the whole time, and Learn was running this very attribution 1,300
// lines later to speak a sentence the decision never saw.
//
// A LEAF: chess.js + the attributor + one constant. No db, no store, no
// appAuditor — it is imported by `positionFacts`, and a fact-computer must not
// drag persistence in to learn what a move neglected. It normalises the raw
// reads to the attributor's contract (mover-POV cp, SAN PVs replayed from the
// right boards) and delegates; the attributor self-gates on pattern +
// available punishment + counterfactual, so a clean move attributes nothing.

import { Chess } from 'chess.js';
import { attributePrinciples, pvUciToSan, type PrincipleAttribution } from './principleAttribution';
import { MATE_EVAL_THRESHOLD } from './engineConstants';
import { moverFault } from './accuracyService';
import type { MovePrice } from './moveCost';

/** The raw reads around one student move, exactly as the surface holds them:
 *  WHITE-POV centipawns (a mate encoded as the sentinel), UCI lines. */
export interface LiveFundamentalReads {
  /** Position BEFORE the played move (FEN). */
  fenBefore: string;
  /** Every SAN of the game up to AND INCLUDING the played move. */
  historySans: readonly string[];
  /** The move the student played (SAN). */
  playedSan: string;
  /** The engine's best move at fenBefore (SAN), or null when none/equal. */
  bestSan: string | null;
  /** Which side the student is — the mover here. */
  studentColor: 'white' | 'black';
  /** The played move's ONE price (`liveMovePrice`): its cost against the best
   *  move and both moves' scores from the same search. REQUIRED, and the only
   *  cost this computer reads — null (unpriced) flags nothing but a mate swing.
   *  There is no fallback to a read before minus a read after (walk oct3c:
   *  Learn's flag off two time-boxed reads misjudged costs by a pawn; #2 root
   *  cause 4, 2026-10-20: Kg5 read 63 at the door and 115 in the record). */
  price: MovePrice | null;
  /** The engine's PV from fenBefore (its best line), UCI. Corroborates the
   *  best-move counterfactual for the eval/PV-gated detectors. */
  bestPvUci?: readonly string[];
  /** The engine's PV from the position AFTER the played move, UCI — the
   *  opponent's punishing line. */
  playedPvUci?: readonly string[];
  /** A mate the best move offered that the played move let go (plies), or null. */
  missedMate?: number | null;
  /** A mate the played move now allows the opponent (plies), or null. */
  allowedMate?: number | null;
  /** The opponent's ACTUAL reply to `playedSan`, or null when it has not been
   *  played yet. REQUIRED — see `AttributionInput.replySan`. */
  replySan: string | null;
}

/** A move under this mover-POV loss is not worth naming a fundamental on — a
 *  near-best move that still technically drops a few centipawns is not a
 *  "flagged" move. Matches the inaccuracy floor the rest of the coach uses. */
export const LEARN_FUNDAMENTAL_CP_FLOOR = 60;

/** Real centipawns only — a mate sentinel makes the subtraction meaningless. */
function isRealCp(cp: number | undefined): cp is number {
  return typeof cp === 'number' && Math.abs(cp) < MATE_EVAL_THRESHOLD;
}

function afterFen(fenBefore: string, san: string): string | null {
  try {
    const c = new Chess(fenBefore);
    if (!c.move(san)) return null;
    return c.fen();
  } catch {
    return null;
  }
}

/** A UCI move as SAN at `fen`, or null when absent / illegal — the one
 *  converter the live lane uses for the engine's best move, so a surface never
 *  grows its own. */
export function uciToSanAt(fen: string, uci: string | null | undefined): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return m ? m.san : null;
  } catch {
    return null;
  }
}

/**
 * The fundamentals the just-played move neglected, most important first —
 * `[]` when nothing attributes (a clean move under the floor, no best move to
 * compare against, an empty history, or an unparseable position).
 */
export function attributeLiveFundamental(input: LiveFundamentalReads): PrincipleAttribution[] {
  if (!input.bestSan) return [];
  if (input.historySans.length === 0) return [];

  // Both scores MOVER POV, from the one search the cost came from.
  const sign = input.studentColor === 'white' ? 1 : -1;
  const scores = input.price?.scores ?? null;
  const evalBeforeMover = scores && isRealCp(scores.bestWhiteCp) ? scores.bestWhiteCp * sign : undefined;
  const evalAfterMover = scores && isRealCp(scores.playedWhiteCp) ? scores.playedWhiteCp * sign : undefined;

  // FLAGGED? A real mover-POV loss over the floor, OR a mate swing either way.
  // Mate cases skip the centipawn arithmetic (sentinels don't subtract) but are
  // always worth naming.
  const mateSwing = (input.missedMate ?? null) !== null || (input.allowedMate ?? null) !== null;
  // ONE GRADE ON EVERY SURFACE (clean-pass walk SI5q0VJz, 39.Qb8 — mate in
  // six — was told "Qb4+ won material by force, and this doesn't force
  // anything" off two reads of +8.6 and +7.7). When the search scored both
  // moves the cost is graded the way Review grades it, in expected points: a
  // wobble inside a decided position is not a cost. The floor stays for a
  // price without scores.
  const graded = input.price === null
    ? false
    : evalBeforeMover !== undefined && evalAfterMover !== undefined
      ? moverFault(input.price.costCp, evalAfterMover) !== null
      : input.price.costCp >= LEARN_FUNDAMENTAL_CP_FLOOR;
  const flagged = mateSwing || graded;
  if (!flagged) return [];

  // Normalise the persisted lines to the attributor's contract (SAN, from the
  // right positions). Eval is passed MOVER POV and only when it is real cp —
  // the eval/PV-gated detectors (overvalued-attack, poisoned-pawn, botched-
  // conversion, calculation-depth) then light up live too; on a mate swing
  // they stay dark, which is correct (a thrown mate is a tactic, not a
  // conversion-tempo lesson).
  const pvAfterPlayed = input.playedPvUci && input.playedPvUci.length > 0
    ? pvUciToSan(afterFen(input.fenBefore, input.playedSan) ?? input.fenBefore, [...input.playedPvUci])
    : undefined;
  // `bestPvUci` is the engine's line FROM fenBefore, so its first move IS the
  // best move — the attributor wants the line AFTER it, replayed from the
  // post-best position (mirrors the review path). Drop move 1.
  const bestAfter = afterFen(input.fenBefore, input.bestSan);
  const pvAfterBest = input.bestPvUci && input.bestPvUci.length > 1 && bestAfter
    ? pvUciToSan(bestAfter, [...input.bestPvUci.slice(1)])
    : undefined;

  return attributePrinciples({
    historySans: input.historySans,
    bestSan: input.bestSan,
    classification: 'mistake', // flagged is proven above; the attributor names WHY
    pvAfterPlayed,
    pvAfterBest,
    evalBefore: evalBeforeMover,
    evalAfterPlayed: evalAfterMover,
    replySan: input.replySan,
  });
}
