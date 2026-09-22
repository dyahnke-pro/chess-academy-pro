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
import { LIVE_ANALYSIS_DEPTH } from './coachGameAnnotations';
import type { GameRecord, GameResult, MoveAnnotation, MoveClassification, OpeningKey } from '../types';

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
  /** The engine lines around the move, UCI — the punishment after the played
   *  move (the mid-turn read) and the continuation after the best move (the
   *  pre-move read minus its first move). Same shape the sweep persists, so a
   *  Learn game is attributed like an import (C3). Absent when a read never
   *  arrived; an honest gap, never an empty guess. */
  pv?: { afterPlayed: string[]; afterBest: string[] };
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
  // Lines persist on FLAGGED plies only — the sweep's own contract — and only
  // when at least one side of the pair exists.
  const flagged = band != null;
  const pv = flagged && g.pv && (g.pv.afterPlayed.length > 0 || g.pv.afterBest.length > 0) ? g.pv : undefined;
  return {
    moveNumber: Math.floor(g.ply / 2) + 1,
    color: g.color,
    san: g.san,
    evaluation,
    bestMove: g.bestMoveUci,
    bestMoveEval: g.bestMoveEvalCp,
    classification,
    comment: null,
    ...(pv ? { pv } : {}),
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
  /** The ONE opening key (A1), minted from the board by the caller. */
  openingId: OpeningKey | null;
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

/** Did the live grader score EVERY one of the student's plies? */
export function coversEveryStudentPly(input: Pick<LearnGameInput, 'plyCount' | 'playerColor' | 'liveGrades'>): boolean {
  const graded = new Set(input.liveGrades.map((g) => g.ply));
  let any = false;
  for (let ply = 0; ply < input.plyCount; ply += 1) {
    const isWhitePly = ply % 2 === 0;
    if ((input.playerColor === 'white') !== isWhitePly) continue;
    any = true;
    if (!graded.has(ply)) return false;
  }
  return any;
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
    // The live per-move evaluations, where they exist — only the student's
    // graded plies. An honest null when nothing was graded.
    annotations: annotations.length > 0 ? annotations : null,
    // B7(c): the live grades ARE the analysis, so a game where EVERY student
    // ply was graded is stamped `fullyAnalyzed` (the sweep leaves it alone and
    // it feeds the cold-start count + line familiarity). A ply the engine never
    // read leaves the flag unset — sparse is deepened by the sweep, never
    // half-flagged.
    ...(coversEveryStudentPly(input) ? { fullyAnalyzed: true, analysisDepth: LIVE_ANALYSIS_DEPTH } : {}),
    coachAnalysis: null,
    isMasterGame: false,
    openingId: input.openingId,
    promptedPlies: [...input.promptedPlies],
  };
}
