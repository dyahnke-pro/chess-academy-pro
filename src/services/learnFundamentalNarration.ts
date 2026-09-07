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
// PURE. No engine, no model, no I/O — G0 by construction. The caller (the Learn
// narration turn in CoachTeachPage) already holds the two Stockfish reads this
// needs (the position before the move and after it), so this recomputes
// nothing; it normalises those reads to the attributor's contract (mover-POV cp
// + SAN PVs) and delegates. The attributor self-gates on pattern + available
// punishment + counterfactual, so a clean move attributes nothing and this
// stays silent.

import { Chess } from 'chess.js';
import {
  attributePrinciples,
  pvUciToSan,
  type FundamentalId,
} from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';
import { MATE_EVAL_THRESHOLD } from './engineConstants';

export interface LearnFundamentalInput {
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
  /** Engine eval at fenBefore, WHITE POV in cp (mate encoded as the sentinel).
   *  Undefined when the read is unavailable. */
  evalBeforeWhiteCp?: number;
  /** Engine eval at the position after the played move, WHITE POV in cp. */
  evalAfterWhiteCp?: number;
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
}

export interface LearnFundamental {
  id: FundamentalId;
  tag: string;
  /** Spoken-ready verdict — full the first time this game, a short stem after
   *  (the shared `seen` set makes the walk accumulate instead of nag). */
  verdict: string;
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
): LearnFundamental | null {
  if (!input.bestSan) return null;
  if (input.historySans.length === 0) return null;

  const moverIsWhite = input.studentColor === 'white';
  const evalBeforeMover = isRealCp(input.evalBeforeWhiteCp)
    ? (moverIsWhite ? input.evalBeforeWhiteCp : -input.evalBeforeWhiteCp)
    : undefined;
  const evalAfterMover = isRealCp(input.evalAfterWhiteCp)
    ? (moverIsWhite ? input.evalAfterWhiteCp : -input.evalAfterWhiteCp)
    : undefined;

  // FLAGGED? A real mover-POV loss over the floor, OR a mate swing either way.
  // Mate cases skip the centipawn arithmetic (sentinels don't subtract) but are
  // always worth naming.
  const mateSwing = (input.missedMate ?? null) !== null || (input.allowedMate ?? null) !== null;
  const cpLoss = evalBeforeMover !== undefined && evalAfterMover !== undefined
    ? evalBeforeMover - evalAfterMover
    : 0;
  const flagged = mateSwing || cpLoss >= LEARN_FUNDAMENTAL_CP_FLOOR;
  if (!flagged) return null;

  // Normalise the persisted lines to the attributor's contract (SAN, from the
  // right positions). Eval is passed MOVER POV and only when it is real cp —
  // the eval/PV-gated detectors (overvalued-attack, poisoned-pawn, botched-
  // conversion) then light up live too; on a mate swing they stay dark, which
  // is correct (a thrown mate is a tactic, not a conversion-tempo lesson).
  const pvAfterPlayed = input.playedPvUci && input.playedPvUci.length > 0
    ? pvUciToSan(afterFen(input.fenBefore, input.playedSan) ?? input.fenBefore, input.playedPvUci)
    : undefined;
  // `bestPvUci` is the engine's line FROM fenBefore, so its first move IS the
  // best move — the attributor wants the line AFTER it, replayed from the
  // post-best position (mirrors the review path). Drop move 1.
  const bestAfter = afterFen(input.fenBefore, input.bestSan);
  const pvAfterBest = input.bestPvUci && input.bestPvUci.length > 1 && bestAfter
    ? pvUciToSan(bestAfter, input.bestPvUci.slice(1))
    : undefined;

  const attrs = attributePrinciples({
    historySans: input.historySans,
    bestSan: input.bestSan,
    classification: 'mistake', // flagged is proven above; the module names WHY
    pvAfterPlayed,
    pvAfterBest,
    evalBefore: evalBeforeMover,
    evalAfterPlayed: evalAfterMover,
  });
  if (attrs.length === 0) return null;

  const verdict = renderFundamentalVerdict(attrs.slice(0, 1), {
    ply: input.historySans.length,
    seen,
  });
  if (!verdict.trim()) return null;
  return { id: attrs[0].id, tag: attrs[0].tag, verdict };
}
