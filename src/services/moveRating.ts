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
import { isMateEval, INACCURACY_CP, MISTAKE_CP, BLUNDER_CP, EXCELLENT_WIN_PCT } from './engineConstants';
import { winPctLost, bandForWinPctLost } from './accuracyService';
import { detectBrilliancy, describeBrilliancy, type Brilliancy } from './brilliancy';
import type { MoveClassification } from '../types';

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
  /** True-brilliancy verdict (sacrifice / only-move / mate) — the sharp signal
   *  distinct from the coarse `quality` band, computed via the shared detector.
   *  Null when not brilliant. */
  brilliancy: Brilliancy | null;
  /** Pre-rendered grounded "why it's brilliant" line, or null. Rendered here so
   *  the answer assembler needs no runtime import of the detector. */
  brilliancyWhy: string | null;
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
  /** WHITE-POV evals either side of the move, plus whose move it was. When all
   *  three are present the bands are computed in EXPECTED POINTS — chess.com's
   *  currency and the review's — instead of centipawns. Optional because one
   *  caller (`callInaccuracy`) genuinely has only a cpLoss; that path keeps the
   *  centipawn bands rather than pretending to a precision it does not have. */
  evalBefore?: number | null;
  evalAfter?: number | null;
  isWhiteMove?: boolean;
}): MoveQuality {
  if (r.allowedMate !== null || r.missedMate !== null) return 'blunder';

  // 🔒 MATCH CHESS.COM WHERE WE CAN (David 2026-09-20). The centipawn ladder
  // below is a rung short of the truth: it cannot tell 300cp given back at
  // +9.00 (an inaccuracy — the game is no less won) from 300cp thrown away at
  // +0.50 (a blunder — the game is gone). Expected points can, so when the
  // evals are in hand they decide.
  if (r.evalBefore != null && r.evalAfter != null && r.isWhiteMove !== undefined) {
    const lost = winPctLost(r.evalBefore, r.evalAfter, r.isWhiteMove);
    const band = bandForWinPctLost(lost);
    if (band) return band;
    if (r.wasBest) return 'best';
    return lost < EXCELLENT_WIN_PCT ? 'best' : 'excellent';
  }

  // 🔒 STOCKFISH MEASURES MISTAKE VS INACCURACY, AND IT MEASURES IT ONCE
  // (David 2026-08-10). These bands were 20 / 50 / 100 / 200 / 400 here and
  // 50 / 100 / 300 in the review's `classifyCpLoss`, so one engine delta got two
  // different names depending on which surface said it out loud. See
  // `engineConstants` for which set won and why.
  //
  // 'good' loses its band as a result — 50–99 is an inaccuracy now, as the review
  // has always called it. That is the drift being paid off, not a regression, and
  // it does NOT make the coach chattier: what is worth SPEAKING about is a
  // separate decision and lives in `callInaccuracy`'s floor.
  if (r.wasBest || r.cpLoss < 20) return 'best';
  if (r.cpLoss < INACCURACY_CP) return 'excellent';
  if (r.cpLoss < MISTAKE_CP) return 'inaccuracy';
  if (r.cpLoss < BLUNDER_CP) return 'mistake';
  return 'blunder';
}

/**
 * THE ONE CLASSIFIER (David 2026-08-10: "Chop down into one model to maintain
 * consistency plz").
 *
 * There were two. This file's bands (20/50/100/200/400) drove the review's
 * accuracy counts and the "was that a good move?" answer; `CoachGamePage` kept
 * its own at 10/50/100/250 for the in-play move flash. A move costing 150
 * centipawns was therefore a MISTAKE while you played it and an INACCURACY when
 * you reviewed it — the same move, the same game, two different words. Nothing
 * was wrong with either set of numbers; having two sets was the defect.
 *
 * `classifyMove` above stays the single source of the bands. This wraps it with
 * the two judgements the play surface needs and the plain bands cannot express:
 * mate context, and BRILLIANT — the engine's best move in a position where the
 * second-best is far worse, i.e. the only move that holds.
 *
 * Evals are White-POV throughout (`stockfishEngine` normalises them); the flip
 * to the mover's perspective happens here, once.
 */
export function classifyMoveFull(r: {
  /** Eval before the move, White-POV. Null → nothing to compare, so 'good'. */
  preMoveEval: number | null;
  /** Eval after the move, White-POV. */
  postMoveEval: number;
  /** Eval of the engine's best move at the same position, White-POV. */
  bestMoveEval: number | null;
  isEngineBestMove: boolean;
  playerColor: 'white' | 'black';
  /** Eval of the engine's second line, White-POV. Kept for callers; no longer
   *  used for the brilliant decision (chess.com requires a sacrifice, not an
   *  only-move). */
  secondBestEval?: number | null;
  /** Position BEFORE the move + the move in SAN — required to detect the
   *  mandatory sacrifice. Without them the move can't be graded brilliant (the
   *  safe answer — never disagree with chess.com by guessing). */
  fenBefore?: string;
  san?: string;
}): MoveClassification {
  if (r.preMoveEval === null) return 'good';
  const white = r.playerColor === 'white';

  // MATE CONTEXT OUTRANKS EVERY BAND, in both directions.
  const postGoodForPlayer = white ? r.postMoveEval > 0 : r.postMoveEval < 0;
  const postBadForPlayer = white ? r.postMoveEval < 0 : r.postMoveEval > 0;
  if (isMateEval(r.postMoveEval) && postBadForPlayer && !isMateEval(r.preMoveEval)) {
    return 'blunder';
  }
  // A forced mate that was already on the board and is still there: the player
  // held the line.
  if (isMateEval(r.preMoveEval) && isMateEval(r.postMoveEval)) return 'good';

  // BRILLIANT (!!) — the SHARED chess.com-rules detector (single source of truth)
  // so the play-flash and the "was that a good move?" answer agree with chess.com
  // and each other. Requires a SACRIFICE, so fenBefore+san must be supplied;
  // without them the move is never brilliant (returns great/best below). Evals
  // flipped to the student's POV for the detector.
  const sign = white ? 1 : -1;
  const cpLossFromBestCp = (r.bestMoveEval !== null && r.bestMoveEval !== undefined)
    ? Math.round(white ? r.bestMoveEval - r.postMoveEval : r.postMoveEval - r.bestMoveEval)
    : null;
  const brill = detectBrilliancy({
    isBest: r.isEngineBestMove,
    cpLossFromBestCp,
    evalBeforeStudentCp: r.preMoveEval === null ? null : r.preMoveEval * sign,
    evalAfterStudentCp: r.postMoveEval * sign,
    postForcedMateForStudent: isMateEval(r.postMoveEval) && postGoodForPlayer,
    fenBefore: r.fenBefore,
    san: r.san,
  });
  if (brill.brilliant) return 'brilliant';
  // A found mate that isn't a sacrificial brilliancy is still a great practical
  // result (chess.com: great/best, not !!).
  if (isMateEval(r.postMoveEval) && postGoodForPlayer) return 'great';

  const cpLoss = r.bestMoveEval !== null
    ? (white ? r.bestMoveEval - r.postMoveEval : r.postMoveEval - r.bestMoveEval)
    : 0;

  // …and everything else is the shared bands, mapped into the richer vocabulary
  // the play surface renders.
  // Hand over the evals this function already holds — they were being dropped
  // at this boundary, which is what made the coarse cp ladder the only input.
  switch (classifyMove({
    wasBest: r.isEngineBestMove,
    cpLoss,
    missedMate: null,
    allowedMate: null,
    evalBefore: r.preMoveEval,
    evalAfter: r.postMoveEval,
    isWhiteMove: r.playerColor === 'white',
  })) {
    // ONE MEANING FOR "GREAT" (walk 5, 2026-09-23). Batch analysis calls a
    // move great when it IMPROVES the mover's position beyond noise (win%
    // gained ≥ EXCELLENT_WIN_PCT); this path called every engine-best move
    // great, so a book 4…a6 was "You: that was a great move" and a 16-move
    // game showed nine Greats. Same label, two meanings — the enum split the
    // foundation warns about. The live path now asks the batch path's
    // question: a best move that merely keeps the balance is good.
    case 'best': return r.preMoveEval !== null
      && winPctLost(r.preMoveEval, r.postMoveEval, white) <= -EXCELLENT_WIN_PCT ? 'great' : 'good';
    case 'excellent': return 'good';
    case 'good': return 'good';
    case 'inaccuracy': return 'inaccuracy';
    case 'mistake': return 'mistake';
    default: return 'blunder';
  }
}

/** Rate the last move in `moveHistory` (full SAN list from the standard start).
 *  Returns null on any failure so the caller can fall through. */
export async function computeLastMoveRating(
  moveHistory: readonly string[],
  studentColor: 'white' | 'black' | null,
): Promise<MoveRating | null> {
  const ply = lastPlyOf(moveHistory, studentColor);
  return ply === null ? null : computeMoveRatingAt(moveHistory, ply);
}

/**
 * The ply index of the STUDENT's last move (walk 5, 2026-09-23). "Was that a
 * good move?" on Play was graded against whatever move was LAST — which, once
 * the coach has replied, is the COACH's move: the student played 4…a6 and
 * heard "d4 was the engine's top move — you gave up nothing", their opponent's
 * move handed to them as their own. The seat is REQUIRED so a new caller has
 * to decide it: null means the surface genuinely has no seat (a free board),
 * and only then is the last move on the board the one being asked about.
 * History is from the initial position, so White moved on even plies.
 */
export function lastPlyOf(moveHistory: readonly string[], studentColor: 'white' | 'black' | null): number | null {
  if (moveHistory.length === 0) return null;
  if (studentColor === null) return moveHistory.length - 1;
  const parity = studentColor === 'white' ? 0 : 1;
  for (let i = moveHistory.length - 1; i >= 0; i -= 1) if (i % 2 === parity) return i;
  return null;
}

/** Rate the move at `plyIndex` (0-based) of `moveHistory` against the engine's
 *  best at the position BEFORE it. This is the RETROSPECTIVE computer (PLAN
 *  §E1, 2026-09-22): "why was Ke2 bad?" used to be answered by rating whatever
 *  move happened to be LAST — the opponent's — because only the last-move form
 *  existed. Now the lane resolves the named move to its ply and rates THAT ply.
 *  `studentColor` on the result is the MOVER's colour at that ply (the caller
 *  compares it to the seat to know whose move it was). Null on any failure. */
export async function computeMoveRatingAt(moveHistory: readonly string[], plyIndex: number): Promise<MoveRating | null> {
  if (plyIndex < 0 || plyIndex >= moveHistory.length) return null;
  const playedSan = moveHistory[plyIndex];

  // Replay from the standard start to reconstruct the pre-move position.
  const chess = new Chess();
  try {
    for (const san of moveHistory.slice(0, plyIndex)) chess.move(san);
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

  // BRILLIANT (!!) detection by CHESS.COM's rules (David 2026-09-09) — a
  // material SACRIFICE that is best/near-best, stays favourable, and is not
  // played while already winning. cpLoss here IS the student-POV eval given up vs
  // best play; preStudent/postStudent are the before/after evals student-POV.
  const brilliancy = detectBrilliancy({
    isBest: wasBest,
    cpLossFromBestCp: cpLoss,
    evalBeforeStudentCp: preStudent,
    evalAfterStudentCp: postStudent,
    postForcedMateForStudent: postMate !== null && postMate > 0,
    fenBefore: preFen,
    san: playedSan,
  });

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
    brilliancy: brilliancy.brilliant ? brilliancy : null,
    brilliancyWhy: describeBrilliancy(brilliancy, playedSan),
  };
}
