// Piece race — capture every target as FAST as possible (time trial).
// Reuses the sweep movement + board helpers; only the scoring differs
// (elapsed seconds vs star thresholds instead of move count vs par).
// Progress lives in the key-value `meta` store (no schema change).

import { db } from '../db/schema';
import type { ChessPiece } from '../types';
import type { PieceRaceProgress, PieceRaceLevelProgress } from '../types/pieceRace';

// Movement + board rendering are identical to the sweep — re-export so
// the race component reads from one place.
export {
  getPieceSweepLegalMoves as getPieceRaceLegalMoves,
  buildPieceSweepPieceMap as buildPieceRacePieceMap,
} from './pieceSweepService';

/** Finishing always wins; faster = more stars. */
export function raceStars(seconds: number, goldSec: number, silverSec: number): number {
  if (seconds <= goldSec) return 3;
  if (seconds <= silverSec) return 2;
  return 1;
}

const PIECE_RACE_META_KEY = 'piece_race_progress_v1';

function defaultProgress(): PieceRaceProgress {
  return { levels: {} };
}

export async function getPieceRaceProgress(): Promise<PieceRaceProgress> {
  const record = await db.meta.get(PIECE_RACE_META_KEY);
  if (!record) return defaultProgress();
  return JSON.parse(record.value) as PieceRaceProgress;
}

export async function savePieceRaceProgress(progress: PieceRaceProgress): Promise<void> {
  await db.meta.put({ key: PIECE_RACE_META_KEY, value: JSON.stringify(progress) });
}

export async function completePieceRaceLevel(
  piece: ChessPiece,
  levelId: number,
  seconds: number,
  goldSec: number,
  silverSec: number,
): Promise<PieceRaceLevelProgress> {
  const progress = await getPieceRaceProgress();
  const key = `${piece}:${levelId}`;
  const prior = progress.levels[key];
  const stars = raceStars(seconds, goldSec, silverSec);
  const next: PieceRaceLevelProgress = {
    completed: true,
    bestSec: prior && prior.completed ? Math.min(prior.bestSec, seconds) : seconds,
    stars: prior && prior.completed ? Math.max(prior.stars, stars) : stars,
  };
  progress.levels[key] = next;
  await savePieceRaceProgress(progress);
  return next;
}
