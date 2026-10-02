/**
 * puzzleMissService — a missed Lichess puzzle reaches the student model.
 *
 * David 2026-10-01 ("Wire all of the computers in to tactics" → "Yes, as
 * weaker evidence"): a puzzle the student fails is a real miss of that motif,
 * but a WEAKER one than a game miss — the puzzle announced that a tactic was
 * there. So:
 *   • one row per puzzle that ENDS unsolved (failed, or the solution shown);
 *   • the weakness spine reads these at a lower severity than game misses
 *     (`PUZZLE_MISS_SEVERITY` vs the game rows' 6 per miss);
 *   • a solve is never recorded as a held capability: being told a tactic
 *     exists is the same as being prompted, and a prompted find proves nothing.
 *
 * Its own small store, because the puzzle table is ~15,000 rows with no
 * attempted index and the spine is rebuilt often — scanning it there is the
 * shape of freeze this app has paid for before.
 */
import { db } from '../db/schema';
import { getTacticTypeFromThemes } from './tacticClassifierService';
import type { TacticType } from '../types';

export interface PuzzleMissRecord {
  id: string;
  puzzleId: string;
  /** The motif, from the puzzle's own themes; null when none maps. */
  tacticType: TacticType | null;
  themes: string[];
  /** The position the student had to solve. */
  fen: string;
  rating: number;
  /** Which Tactics surface — honest about where it came from. */
  surface: 'classic' | 'master' | 'drill' | 'adaptive' | 'deep-run' | 'other';
  recordedAt: number;
}

/** Severity per miss in the spine — half a game miss's 6, capped well below
 *  the game rows' 95 so puzzles alone never outrank the student's own games. */
export const PUZZLE_MISS_SEVERITY = 3;
export const PUZZLE_MISS_SEVERITY_CAP = 50;

const newId = (): string => `pm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function recordPuzzleMiss(args: {
  puzzleId: string;
  themes: string[];
  fen: string;
  rating: number;
  surface: PuzzleMissRecord['surface'];
}): Promise<boolean> {
  try {
    await db.puzzleMisses.add({
      id: newId(),
      puzzleId: args.puzzleId,
      tacticType: getTacticTypeFromThemes(args.themes),
      themes: args.themes,
      fen: args.fen,
      rating: args.rating,
      surface: args.surface,
      recordedAt: Date.now(),
    });
    return true;
  } catch {
    return false; // never break the puzzle over telemetry
  }
}
