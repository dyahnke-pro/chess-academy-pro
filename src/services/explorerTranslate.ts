// Explorer-stats -> plain English (David's hard rule, 2026-05-21):
// NEVER show or speak raw percentages. Two numbers exist — POPULARITY
// ("the main move" / "a sideline") and SCORE / W-D-L ("scores well" /
// "roughly equal" / "dubious") — both translated to words, with sample
// size also given in words ("thousands of games"). The coach speaks
// words, never digits. This module is the single source of that
// translation so Discussion Practice, Game Review, and the where-you-
// left-book marker all phrase masters' data identically.

import type { MasterPlayMove, MasterPlayResult } from './masterPlayTypes';

export type Perspective = 'white' | 'black';

/** Popularity of a move = its share of games in the position. */
export function translatePopularity(moveGames: number, totalGames: number): string {
  if (totalGames <= 0 || moveGames <= 0) return 'almost never played';
  const share = moveGames / totalGames;
  if (share >= 0.5) return 'the main move';
  if (share >= 0.2) return 'a common choice';
  if (share >= 0.05) return 'a sideline';
  return 'rarely played';
}

/** Mover's score (wins + half the draws) for the side to move, from
 *  Lichess's White-perspective W-D-L. Translated to words only. */
export function translateScore(move: MasterPlayMove, perspective: Perspective): string {
  const total = move.white + move.draws + move.black;
  if (total <= 0) return 'untested';
  const moverWins = perspective === 'white' ? move.white : move.black;
  const score = (moverWins + move.draws / 2) / total;
  if (score >= 0.58) return 'scores very well';
  if (score >= 0.53) return 'scores well';
  if (score > 0.47) return 'is roughly equal';
  if (score > 0.42) return 'scores a little worse';
  return 'scores poorly';
}

/** Sample size in words (so voice never reads a digit). */
export function describeSampleSize(games: number): string {
  if (games >= 10000) return 'thousands of master games';
  if (games >= 1000) return 'over a thousand master games';
  if (games >= 100) return 'hundreds of master games';
  if (games >= 24) return 'dozens of master games';
  if (games >= 6) return 'a handful of master games';
  if (games >= 2) return 'a couple of master games';
  if (games === 1) return 'a single master game';
  return 'no master games';
}

export interface TranslatedMove {
  san: string;
  popularity: string;
  score: string;
  sample: string;
  /** A spoken-safe sentence (words only, no percentages or digits). */
  sentence: string;
}

/** Translate one master move into spoken-safe English. */
export function translateMasterMove(
  move: MasterPlayMove,
  totalGames: number,
  perspective: Perspective,
): TranslatedMove {
  const popularity = translatePopularity(move.games, totalGames);
  const score = translateScore(move, perspective);
  const sample = describeSampleSize(move.games);
  return {
    san: move.san,
    popularity,
    score,
    sample,
    sentence: `${move.san} is ${popularity} here and ${score} for ${perspective === 'white' ? 'White' : 'Black'}, from ${sample}.`,
  };
}

/** The headline "masters play X" line for a position — the top move by
 *  game count, phrased for speech. Returns null when there is no master
 *  data (source 'none' / empty). Use for the where-you-left-book marker
 *  and the Discussion Practice "masters play …" reply. */
export function describeTopMasterMove(
  result: MasterPlayResult,
  perspective: Perspective,
): TranslatedMove | null {
  if (result.source === 'none' || result.moves.length === 0) return null;
  const top = result.moves[0];
  return translateMasterMove(top, result.totalGames, perspective);
}

/** Up to `n` translated master moves for a position (top by game count),
 *  for a fuller "here's what masters do" breakdown. */
export function translateTopMasterMoves(
  result: MasterPlayResult,
  perspective: Perspective,
  n = 3,
): TranslatedMove[] {
  if (result.source === 'none') return [];
  return result.moves
    .slice(0, n)
    .map((m) => translateMasterMove(m, result.totalGames, perspective));
}
