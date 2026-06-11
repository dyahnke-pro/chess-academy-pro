import type { ChessPiece } from './index';

// A time-trial "race" course: capture every target as FAST as possible.
// Same board shape as a sweep, but scored by elapsed TIME, not moves —
// the timer IS the point, so this is a sanctioned timed kid game
// (like Color Wars), per the kids non-negotiables.
export interface PieceRaceLevel {
  piece: ChessPiece;
  id: number;
  name: string;
  pieceStart: string;
  targets: string[];
  obstacles?: string[];
  /** Finish at or under this many seconds → 3 stars. */
  goldSec: number;
  /** At or under this → 2 stars; slower → 1 star (finishing always wins). */
  silverSec: number;
}

export interface PieceRaceLevelProgress {
  completed: boolean;
  bestSec: number;
  stars: number;
}

export interface PieceRaceProgress {
  levels: Record<string, PieceRaceLevelProgress>;
}
