// learnGameRecord — ONE shape for a game played on Learn (`/coach/teach`),
// whichever way it ended (WO-STANDARD-01 C7, 2026-09-22).
//
// THE DEFECT. Learn saved a game only when the BOARD said it was over
// (`isGameOver`), with `annotations: null`. "End Lesson" navigated to
// /coach/home and the game was gone — not in `db.games`, not in the review
// list, no hand-off — while Play's resign has saved the game since 2026-06-01
// ("resigned games carry the blunder that lost them — the highest-value game
// to learn from"). And the record Learn did write carried no per-move
// evaluations, although every student ply had been graded live off the
// paid-for engine read (`gradePlayedMove`).
//
// THE SHAPE. Both Learn call sites — the game-over effect and End Lesson —
// build their record HERE, so an ending cannot skip the persistence floor,
// the declared seat, the live annotations or the prompted plies. The ending
// is a discriminated union (`LearnGameEnding`) rather than three booleans, so
// a new way to end a lesson fails to compile until it says what result it is.
//
// Zero React, zero Dexie: a pure builder, so the gate can hold the exact row
// the page writes without rendering twelve thousand lines of page.
import { shouldPersistFinishedGame } from '../utils/coachGamePersistence';
import { winPctLost, bandForWinPctLost } from './accuracyService';
import type { GameRecord, GameResult, MoveAnnotation, MoveClassification } from '../types';

/** What Learn knows about one STUDENT ply it graded live: the engine's read of
 *  the position before the move (best move + its eval, White POV) and what the
 *  played move cost the mover. Coach plies are never graded — the coach's own
 *  move is rating-throttled and must never be filed as a "best move" (same
 *  rule as `movesToAnnotations` on Play). */
export interface LearnLiveGrade {
  /** 0-based ply index in the game's history. */
  ply: number;
  san: string;
  color: 'white' | 'black';
  /** Engine best move (UCI) from the pre-move read, when the read had one. */
  bestMoveUci: string | null;
  /** Eval of the pre-move position with best play — centipawns, White POV. */
  bestMoveEvalCp: number;
  /** What the played move cost, mover POV, centipawns (≥ 0). */
  cpLossCp: number;
}

/** A live grade → the review's annotation shape. `evaluation` (after the
 *  move, White POV) is derived from the best-play eval minus the mover's
 *  cost, and the band is the same expected-points band every other import
 *  uses (`bandForWinPctLost`), so a Learn game is labelled in the same
 *  currency as a chess.com one. */
export function annotationFromLiveGrade(g: LearnLiveGrade): MoveAnnotation {
  const isWhite = g.color === 'white';
  const cost = Math.max(0, Math.round(g.cpLossCp));
  const evaluation = g.bestMoveEvalCp - (isWhite ? cost : -cost);
  const band = bandForWinPctLost(winPctLost(g.bestMoveEvalCp, evaluation, isWhite));
  const classification: MoveClassification = band ?? 'good';
  return {
    moveNumber: Math.floor(g.ply / 2) + 1,
    color: g.color,
    san: g.san,
    evaluation,
    bestMove: g.bestMoveUci,
    bestMoveEval: g.bestMoveEvalCp,
    classification,
    comment: null,
  };
}

/** How the Learn game ended. `ended` = the student pressed End Lesson with a
 *  game in progress: result `*`, never a resignation — nobody lost. */
export type LearnGameEnding =
  | { kind: 'checkmate'; winner: 'white' | 'black' }
  | { kind: 'draw' }
  | { kind: 'ended' };

export interface LearnGameInput {
  /** The id `learnMemory` minted when the game began — the same id every
   *  slip captured during the game carries, so the two join with no lookup. */
  gameId: string;
  /** chess.js PGN (carries the [SetUp]/[FEN] header for a non-standard start). */
  pgn: string;
  plyCount: number;
  playerColor: 'white' | 'black';
  playerName: string;
  rating: number;
  openingId: string | null;
  ending: LearnGameEnding;
  liveGrades: readonly LearnLiveGrade[];
  promptedPlies: readonly number[];
  /** ISO date (YYYY-MM-DD). Defaults to today; injectable for the gate. */
  date?: string;
}

function resultFor(ending: LearnGameEnding): GameResult {
  switch (ending.kind) {
    case 'checkmate': return ending.winner === 'white' ? '1-0' : '0-1';
    case 'draw': return '1/2-1/2';
    case 'ended': return '*';
  }
}

/** The record Learn writes — or null when the game is below the persistence
 *  floor (`MIN_PERSIST_PLIES`, the same floor Play applies to every ending),
 *  so a two-move abandon never litters the library. */
export function buildLearnGameRecord(input: LearnGameInput): GameRecord | null {
  if (!shouldPersistFinishedGame(input.plyCount)) return null;
  const annotations = [...input.liveGrades]
    .sort((a, b) => a.ply - b.ply)
    .map(annotationFromLiveGrade);
  return {
    id: input.gameId,
    pgn: input.pgn,
    white: input.playerColor === 'white' ? input.playerName : 'Coach',
    black: input.playerColor === 'black' ? input.playerName : 'Coach',
    // DECLARED — see the same line in CoachGamePage.
    studentSide: input.playerColor,
    result: resultFor(input.ending),
    date: input.date ?? new Date().toISOString().split('T')[0],
    event: input.ending.kind === 'ended' ? 'Learn with Coach (lesson ended)' : 'Learn with Coach',
    eco: null,
    whiteElo: input.playerColor === 'white' ? input.rating : null,
    blackElo: input.playerColor === 'black' ? input.rating : null,
    source: 'coach',
    // The live per-move evaluations, where they exist. Only the student's
    // graded plies — so this is SPARSE, and `fullyAnalyzed` stays unset: the
    // sweep deepens it exactly as it deepens an import with sparse
    // detectBlunders annotations. An honest null when nothing was graded.
    annotations: annotations.length > 0 ? annotations : null,
    coachAnalysis: null,
    isMasterGame: false,
    openingId: input.openingId,
    promptedPlies: [...input.promptedPlies],
  };
}
