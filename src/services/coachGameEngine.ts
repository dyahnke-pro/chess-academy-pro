import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { getNextOpeningBookMove } from './openingDetectionService';
import type { StockfishAnalysis, CoachDifficulty } from '../types';

const COACH_MOVE_TIMEOUT_MS = 3000;

const FALLBACK_ANALYSIS: StockfishAnalysis = {
  bestMove: '',
  evaluation: 0,
  isMate: false,
  mateIn: null,
  depth: 0,
  topLines: [],
  nodesPerSecond: 0,
};

// Depth mapping by target ELO range
function getDepthForElo(targetElo: number): number {
  if (targetElo < 1000) return 4;
  if (targetElo < 1200) return 6;
  if (targetElo < 1500) return 10;
  if (targetElo < 1800) return 14;
  return 18;
}

// Lower ELO = more randomness (higher chance of picking 2nd/3rd best move)
function getRandomnessForElo(targetElo: number): number {
  if (targetElo < 1000) return 0.35;
  if (targetElo < 1200) return 0.25;
  if (targetElo < 1500) return 0.15;
  if (targetElo < 1800) return 0.08;
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

  let analysis: StockfishAnalysis;
  try {
    analysis = await Promise.race([
      stockfishEngine.analyzePosition(fen, depth),
      makeTimeoutPromise(COACH_MOVE_TIMEOUT_MS),
    ]);
  } catch (error) {
    console.warn('[CoachEngine] Stockfish failed or timed out, falling back to random move:', error);
    stockfishEngine.stop();
    const fallbackMove = getRandomLegalMove(fen);
    if (!fallbackMove) throw new Error('No legal moves available');
    return { move: fallbackMove, analysis: { ...FALLBACK_ANALYSIS, bestMove: fallbackMove } };
  }

  const randomness = getRandomnessForElo(targetElo);
  const topLines = analysis.topLines;

  // Pick from top lines with weighted randomness
  if (topLines.length >= 2) {
    const roll = Math.random();
    if (roll < randomness && topLines.length >= 3) {
      // Pick 3rd best move
      const thirdLine = topLines[2];
      if (thirdLine.moves.length > 0) {
        console.log('[CoachEngine] Picked 3rd-best move for variety:', thirdLine.moves[0]);
        return { move: thirdLine.moves[0], analysis };
      }
    } else if (roll < randomness * 2) {
      // Pick 2nd best move
      const secondLine = topLines[1];
      if (secondLine.moves.length > 0) {
        console.log('[CoachEngine] Picked 2nd-best move for variety:', secondLine.moves[0]);
        return { move: secondLine.moves[0], analysis };
      }
    }
  }

  console.log('[CoachEngine] Playing best move:', analysis.bestMove, 'eval:', analysis.evaluation);
  return { move: analysis.bestMove, analysis };
}

/** ELO offset per difficulty level relative to the player rating. */
const DIFFICULTY_OFFSET: Record<CoachDifficulty, number> = {
  easy: -300,
  medium: -100,
  hard: 100,
};

export function getTargetStrength(playerRating: number, difficulty: CoachDifficulty = 'medium'): number {
  return Math.max(600, playerRating + DIFFICULTY_OFFSET[difficulty]);
}
