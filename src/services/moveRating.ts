/**
 * moveRating — rate the LAST move a student played by comparing it to the
 * engine's best at the position BEFORE it. Powers the "was that a good move?"
 * grounded vertical (David 2026-07-04). G0: the rating is COMPUTED here in
 * code (Stockfish + chess.js); the LLM only voices `assembleMoveRatingAnswer`.
 *
 * All Stockfish evals are White-POV (`stockfishEngine` normalizes to White's
 * perspective — positive = good for White). We flip to the STUDENT's POV so
 * `cpLoss` is always "how much the mover gave up vs best play". Every failure
 * mode (empty/illegal history, engine unavailable) returns null so the caller
 * falls through to the LLM — it never fabricates a rating.
 */
import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';

export type MoveQuality = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveRating {
  playedSan: string;
  studentColor: 'white' | 'black';
  wasBest: boolean;
  /** Student-POV centipawns given up vs best play, always >= 0. */
  cpLoss: number;
  quality: MoveQuality;
  /** The engine's best move at the pre-move position, in SAN (null if wasBest). */
  betterSan: string | null;
  betterFromTo: { from: string; to: string } | null;
  /** Student had a forced mate in N and didn't take it. */
  missedMate: number | null;
  /** Student's move allows the opponent to force mate in N. */
  allowedMate: number | null;
}

/** Shallow-ish depth: on-demand, two positions compared, must feel responsive. */
const RATING_DEPTH = 14;

/** Pure classifier — split out so the thresholds are unit-testable without an
 *  engine. Mate context always outranks the centipawn bands. */
export function classifyMove(r: {
  wasBest: boolean;
  cpLoss: number;
  missedMate: number | null;
  allowedMate: number | null;
}): MoveQuality {
  if (r.allowedMate !== null || r.missedMate !== null) return 'blunder';
  if (r.wasBest || r.cpLoss < 20) return 'best';
  if (r.cpLoss < 50) return 'excellent';
  if (r.cpLoss < 100) return 'good';
  if (r.cpLoss < 200) return 'inaccuracy';
  if (r.cpLoss < 400) return 'mistake';
  return 'blunder';
}

/** Rate the last move in `moveHistory` (full SAN list from the standard start).
 *  Returns null on any failure so the caller can fall through. */
export async function computeLastMoveRating(moveHistory: readonly string[]): Promise<MoveRating | null> {
  if (moveHistory.length === 0) return null;
  const playedSan = moveHistory[moveHistory.length - 1];

  // Replay from the standard start to reconstruct the pre-move position.
  const chess = new Chess();
  try {
    for (const san of moveHistory.slice(0, -1)) chess.move(san);
  } catch {
    return null; // history doesn't replay from the start (custom FEN game, etc.)
  }
  const preFen = chess.fen();
  const studentColor: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  // Apply the played move to get the resulting position + its UCI.
  let playedUci: string;
  try {
    const mv = chess.move(playedSan);
    if (!mv) return null;
    playedUci = mv.from + mv.to + (mv.promotion ?? '');
  } catch {
    return null;
  }
  const postFen = chess.fen();

  let pre, post;
  try {
    [pre, post] = await Promise.all([
      stockfishEngine.analyzePosition(preFen, RATING_DEPTH),
      stockfishEngine.analyzePosition(postFen, RATING_DEPTH),
    ]);
  } catch {
    return null;
  }
  if (!pre || !post) return null;

  const sign = studentColor === 'white' ? 1 : -1;
  const preStudent = pre.evaluation * sign;   // best-case for the student at pre-move
  const postStudent = post.evaluation * sign; // what the student actually got
  const cpLoss = Math.max(0, Math.round(preStudent - postStudent));
  const wasBest = !!pre.bestMove && pre.bestMove.toLowerCase() === playedUci.toLowerCase();

  // Mate context — flip White-POV mateIn to the student's POV.
  const preMate = pre.isMate && pre.mateIn !== null ? pre.mateIn * sign : null;   // > 0 = student mating
  const postMate = post.isMate && post.mateIn !== null ? post.mateIn * sign : null; // < 0 = student getting mated
  const missedMate = preMate !== null && preMate > 0 && !wasBest ? Math.abs(preMate) : null;
  const allowedMate = postMate !== null && postMate < 0 ? Math.abs(postMate) : null;

  // The better move (SAN + from/to for an arrow) when the student missed best.
  let betterSan: string | null = null;
  let betterFromTo: { from: string; to: string } | null = null;
  if (!wasBest && pre.bestMove && pre.bestMove.length >= 4) {
    try {
      const b = new Chess(preFen);
      const from = pre.bestMove.slice(0, 2);
      const to = pre.bestMove.slice(2, 4);
      const promotion = pre.bestMove.slice(4, 5) || undefined;
      const mv = b.move({ from, to, promotion });
      if (mv) {
        betterSan = mv.san;
        betterFromTo = { from, to };
      }
    } catch {
      betterSan = null;
      betterFromTo = null;
    }
  }

  return {
    playedSan,
    studentColor,
    wasBest,
    cpLoss,
    quality: classifyMove({ wasBest, cpLoss, missedMate, allowedMate }),
    betterSan,
    betterFromTo,
    missedMate,
    allowedMate,
  };
}
