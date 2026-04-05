import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { getNextOpeningBookMove } from './openingDetectionService';
import type { StockfishAnalysis, CoachDifficulty } from '../types';

const COACH_MOVE_TIMEOUT_MS = 5000;

const FALLBACK_ANALYSIS: StockfishAnalysis = {
  bestMove: '',
  evaluation: 0,
  isMate: false,
  mateIn: null,
  depth: 0,
  topLines: [],
  nodesPerSecond: 0,
};

/**
 * Maps target ELO to Stockfish Skill Level (0–20).
 * Skill Level controls how many intentional "errors" the engine makes —
 * much more natural than picking random non-best moves.
 */
function getSkillLevelForElo(targetElo: number): number {
  if (targetElo < 800) return 2;
  if (targetElo < 1000) return 5;
  if (targetElo < 1200) return 8;
  if (targetElo < 1400) return 11;
  if (targetElo < 1600) return 14;
  if (targetElo < 1800) return 16;
  if (targetElo < 2000) return 18;
  return 20;
}

/**
 * Analysis depth — higher is fine because Skill Level handles weakness.
 * We want the engine to "see" tactics so it doesn't hang pieces.
 */
function getDepthForElo(targetElo: number): number {
  if (targetElo < 1000) return 10;
  if (targetElo < 1200) return 12;
  if (targetElo < 1500) return 14;
  if (targetElo < 1800) return 16;
  return 18;
}

/**
 * Small chance of picking 2nd-best move for variety (not blundering).
 * Kept very low since Skill Level already weakens play naturally.
 */
function getVarietyChance(targetElo: number): number {
  if (targetElo < 1000) return 0.10;
  if (targetElo < 1200) return 0.08;
  if (targetElo < 1500) return 0.05;
  return 0.03;
}

export function getRandomLegalMove(fen: string): string | null {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;
    const move = moves[Math.floor(Math.random() * moves.length)];
    return `${move.from}${move.to}${move.promotion ?? ''}`;
  } catch {
    return null;
  }
}

function makeTimeoutPromise(ms: number): Promise<never> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Stockfish timeout after ${ms}ms`)), ms);
  });
}

/**
 * Try to play the next opening book move if a requested opening is active.
 * Returns the UCI move string (e.g. "e7e6") or null if not applicable.
 */
export function tryOpeningBookMove(
  fen: string,
  gameHistory: string[],
  openingMoves: string[] | null,
  aiColor: 'white' | 'black',
): string | null {
  if (!openingMoves || openingMoves.length === 0) return null;

  const bookSan = getNextOpeningBookMove(openingMoves, gameHistory, aiColor);
  if (!bookSan) return null;

  // Convert SAN to UCI
  try {
    const chess = new Chess(fen);
    const move = chess.move(bookSan);
    return `${move.from}${move.to}${move.promotion ?? ''}`;
  } catch {
    return null;
  }
}

export async function getAdaptiveMove(
  fen: string,
  targetElo: number,
): Promise<{ move: string; analysis: StockfishAnalysis }> {
  const depth = getDepthForElo(targetElo);
  const skillLevel = getSkillLevelForElo(targetElo);

  let analysis: StockfishAnalysis;
  try {
    analysis = await Promise.race([
      stockfishEngine.analyzePosition(fen, depth, { 'Skill Level': skillLevel }),
      makeTimeoutPromise(COACH_MOVE_TIMEOUT_MS),
    ]);
  } catch (error) {
    console.warn('[CoachEngine] Full analysis failed/timed out, trying quick bestmove:', error);
    stockfishEngine.stop();

    // Second attempt: use movetime-based best move (always returns within budget)
    try {
      const bestMove = await Promise.race([
        stockfishEngine.getBestMove(fen, 2000),
        makeTimeoutPromise(4000),
      ]);
      if (bestMove && bestMove !== '(none)') {
        console.log('[CoachEngine] Fallback getBestMove succeeded:', bestMove);
        return { move: bestMove, analysis: { ...FALLBACK_ANALYSIS, bestMove } };
      }
    } catch {
      console.warn('[CoachEngine] getBestMove also failed, using random legal move');
    }

    // Last resort: random legal move (should be extremely rare)
    const fallbackMove = getRandomLegalMove(fen);
    if (!fallbackMove) throw new Error('No legal moves available');
    return { move: fallbackMove, analysis: { ...FALLBACK_ANALYSIS, bestMove: fallbackMove } };
  }

  const varietyChance = getVarietyChance(targetElo);
  const topLines = analysis.topLines;

  // Occasionally pick the 2nd-best move for variety (not the 3rd — too risky)
  if (topLines.length >= 2 && Math.random() < varietyChance) {
    const secondLine = topLines[1];
    if (secondLine.moves.length > 0) {
      // Only pick 2nd-best if it's not drastically worse (within 0.8 pawns)
      const evalDiff = Math.abs(
        topLines[0].evaluation - secondLine.evaluation,
      );
      if (evalDiff < 80) {
        console.log('[CoachEngine] Picked 2nd-best move for variety:', secondLine.moves[0]);
        return { move: secondLine.moves[0], analysis };
      }
    }
  }

  console.log('[CoachEngine] Playing best move:', analysis.bestMove, 'eval:', analysis.evaluation, 'skill:', skillLevel);
  return { move: analysis.bestMove, analysis };
}

/** ELO offset per difficulty level relative to the player rating. */
const DIFFICULTY_OFFSET: Record<CoachDifficulty, number> = {
  easy: -300,
  medium: 0,
  hard: 200,
};

export function getTargetStrength(playerRating: number, difficulty: CoachDifficulty = 'medium'): number {
  return Math.max(600, playerRating + DIFFICULTY_OFFSET[difficulty]);
}
