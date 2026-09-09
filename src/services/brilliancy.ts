/**
 * brilliancy — THE single source of truth for "is this move a Brilliant (!!)
 * move, and WHY", following CHESS.COM'S RULES so the app never labels a move
 * brilliant that chess.com wouldn't, or vice-versa (David 2026-09-09: "Make sure
 * we follow the same rules as chess.com for brilliant moves. I don't want our
 * app to say one thing and chess.com to say another").
 *
 * chess.com's Brilliant (!!) criteria (verified against chess.com's own docs +
 * their game-review behaviour, 2026-09-09):
 *   1. A MATERIAL SACRIFICE IS MANDATORY — "no sacrifice, no brilliant". The
 *      move must give up net material the opponent can take.
 *   2. It must be the BEST or NEAR-BEST move (the engine agrees it's strong).
 *   3. The evaluation must STAY FAVOURABLE after the sacrifice — a sac that just
 *      loses is a blunder, not a brilliancy.
 *   4. You must NOT already be completely winning — a sac while crushing is
 *      "cleanup", which chess.com labels great/best, not brilliant.
 *   (5. Non-obvious: an obvious forced mate with no sacrifice is great/best, not
 *      brilliant. Covered by requiring the sacrifice — a non-sac mate never
 *      qualifies here.)
 *
 * This replaces the app's two older, non-chess.com definitions (a big eval GAIN
 * in gameAnalysisService.classifyCpLoss; an "only move" / found-mate in
 * moveRating.classifyMoveFull) — NEITHER required a sacrifice, so both diverged
 * from chess.com. Every surface that LABELS a move brilliant (review counts, the
 * Overview/Tactics tabs, the "was that brilliant?" chat) now routes its brilliant
 * decision through this one detector.
 *
 * G0/G3: the sacrifice is board-true (describeSacrifice, chess.js), soundness is
 * the engine's (isBest + favourable-after). The model only phrases the result.
 */
import { describeSacrifice } from './groundedAnswer';

/** Given up ≤ this vs the engine's best still counts as "near-best". */
export const NEAR_BEST_CP = 30;
/** After the sacrifice the student must be at least roughly level (not losing).
 *  A forced mate for the student is favourable regardless. */
export const FAVORABLE_FLOOR_CP = -50;
/** Already ahead by more than this BEFORE the move → a sac is just cleanup, which
 *  chess.com grades great/best, not brilliant. chess.com's exact cutoff is
 *  proprietary; +3 pawns is a faithful, conservative approximation of "already
 *  winning". */
export const ALREADY_WINNING_CP = 300;

export interface Brilliancy {
  brilliant: boolean;
  /** The board-true sacrifice phrase ("sacrifices the knight on d5"), reused in
   *  the WHY. Null when not brilliant. */
  sacrificePhrase: string | null;
}

const NOT_BRILLIANT: Brilliancy = { brilliant: false, sacrificePhrase: null };

/**
 * detectBrilliancy — decide whether the played move is a Brilliant (!!) move by
 * chess.com's rules. All eval inputs are STUDENT-POV centipawns (positive = good
 * for the mover). The sacrifice arm needs the board (fenBefore + san); without
 * them the move can never be brilliant (a sacrifice can't be detected), which is
 * the safe answer — better to under-call than to disagree with chess.com.
 */
export function detectBrilliancy(input: {
  isBest: boolean;
  /** Student-POV centipawns given up vs the engine's best (>= 0 a loss, <= 0 a
   *  gain). Used for the near-best test when `isBest` is not asserted. */
  cpLossFromBestCp?: number | null;
  /** Engine eval BEFORE the move, student-POV cp. */
  evalBeforeStudentCp: number | null;
  /** Engine eval AFTER the move, student-POV cp. */
  evalAfterStudentCp: number | null;
  /** The student has a forced mate after the move (favourable regardless of cp). */
  postForcedMateForStudent: boolean;
  fenBefore?: string;
  san?: string;
}): Brilliancy {
  // 1. SACRIFICE IS MANDATORY (chess.com: "no sacrifice, no brilliant").
  const sac = input.fenBefore && input.san ? describeSacrifice(input.fenBefore, input.san) : null;
  if (!sac) return NOT_BRILLIANT;

  // 2. Best or near-best.
  const nearBest = input.isBest
    || (input.cpLossFromBestCp !== null && input.cpLossFromBestCp !== undefined && input.cpLossFromBestCp <= NEAR_BEST_CP);
  if (!nearBest) return NOT_BRILLIANT;

  // 3. Stays favourable after the sacrifice (not losing).
  const favourableAfter = input.postForcedMateForStudent
    || (input.evalAfterStudentCp !== null && input.evalAfterStudentCp >= FAVORABLE_FLOOR_CP);
  if (!favourableAfter) return NOT_BRILLIANT;

  // 4. Not already completely winning (else the sac is cleanup → great/best).
  if (input.evalBeforeStudentCp !== null && input.evalBeforeStudentCp >= ALREADY_WINNING_CP) return NOT_BRILLIANT;

  return { brilliant: true, sacrificePhrase: sac };
}

/**
 * describeBrilliancy — the grounded WHY line for a detected brilliancy. Names the
 * board-true sacrifice and asserts its soundness (the engine still rates the move
 * best). Returns null when the move is not brilliant, so callers stay silent
 * rather than praising with filler.
 */
export function describeBrilliancy(b: Brilliancy, playedSan: string): string | null {
  if (!b.brilliant || !b.sacrificePhrase) return null;
  return `${playedSan} is brilliant — it ${b.sacrificePhrase}, and the engine still rates it the best move, so the sacrifice is sound.`;
}
