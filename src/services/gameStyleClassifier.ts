/**
 * gameStyleClassifier — categorize a played game by character so the
 * Review-with-Coach picker can highlight cards with a style badge that
 * matches the rest of the app's neon palette. The labels here are a
 * subset of `getNeonColor()` keys in `utils/neonColors.ts`, so the
 * card border color comes for free from the existing system.
 *
 * The classifier is a deliberately simple heuristic over the per-move
 * annotations + raw PGN length. We don't need ML — we need a label
 * that the user recognizes ("oh that one was a tactical brawl"). When
 * a game has no annotations yet (fresh import, not analyzed) we
 * return 'unanalyzed' so the card can show a muted neutral state.
 */
import type { GameRecord, MoveAnnotation } from '../types';

export type GameStyle =
  | 'tactical'
  | 'positional'
  | 'aggressive'
  | 'solid'
  | 'sharp'
  | 'unanalyzed';

export interface GameStyleResult {
  style: GameStyle;
  reason: string;
}

const TACTICAL_BLUNDER_RATIO = 0.08;
const SHARP_SWING_CP = 250;
const AGGRESSIVE_SWING_CP = 400;
const SOLID_MAX_SWING_CP = 80;

export function classifyGameStyle(game: GameRecord): GameStyleResult {
  const annotations = game.annotations ?? [];
  if (!game.fullyAnalyzed || annotations.length === 0) {
    return { style: 'unanalyzed', reason: 'no Stockfish analysis yet' };
  }

  const total = annotations.length;
  const blunderish = annotations.filter(
    (a) => a.classification === 'blunder' || a.classification === 'mistake',
  ).length;
  const blunderRatio = blunderish / total;
  const evals = annotations
    .map((a) => a.evaluation)
    .filter((e): e is number => e !== null);
  const swings = computeSwings(evals);
  const maxSwing = swings.reduce((m, s) => Math.max(m, s), 0);
  const meanSwing = swings.length > 0 ? swings.reduce((a, b) => a + b, 0) / swings.length : 0;

  if (maxSwing >= AGGRESSIVE_SWING_CP && blunderRatio >= TACTICAL_BLUNDER_RATIO) {
    return { style: 'aggressive', reason: `large eval swings (${Math.round(maxSwing)}cp) + ${blunderish} mistakes` };
  }
  if (maxSwing >= SHARP_SWING_CP) {
    return { style: 'sharp', reason: `sharp eval swings (${Math.round(maxSwing)}cp)` };
  }
  if (blunderRatio >= TACTICAL_BLUNDER_RATIO) {
    return { style: 'tactical', reason: `${blunderish}/${total} mistakes — tactical fight` };
  }
  if (meanSwing <= SOLID_MAX_SWING_CP) {
    return { style: 'solid', reason: `low eval volatility (${Math.round(meanSwing)}cp avg)` };
  }
  return { style: 'positional', reason: `steady evals — positional grind` };
}

function computeSwings(evals: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < evals.length; i += 1) {
    out.push(Math.abs(evals[i] - evals[i - 1]));
  }
  return out;
}

export function summarizeMoveQuality(annotations: MoveAnnotation[]): {
  total: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  brilliants: number;
} {
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;
  let brilliants = 0;
  for (const a of annotations) {
    if (a.classification === 'blunder') blunders += 1;
    else if (a.classification === 'mistake') mistakes += 1;
    else if (a.classification === 'inaccuracy') inaccuracies += 1;
    else if (a.classification === 'brilliant') brilliants += 1;
  }
  return { total: annotations.length, blunders, mistakes, inaccuracies, brilliants };
}
