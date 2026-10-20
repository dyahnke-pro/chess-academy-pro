/**
 * The Openings Play rung's game reaches the record (persistent memory,
 * 2026-10-19). Its games were shown once on the result card and forgotten,
 * so they never reached game history, review or mistake puzzles, and the
 * line the student left was never evidence. Saved as a normal game row
 * (unanalysed, so the background sweep analyses it like any import); the
 * opening id and the moves make the departure derivable by the same
 * computers that read every other game.
 */
import { db } from '../db/schema';
import type { GameRecord, GameResult } from '../types';
import { shouldPersistFinishedGame } from '../utils/coachGamePersistence';
import { openingKeyFromSans } from './openingKey';

export interface OpeningPlayGameArgs {
  /** The Play-rung session id — also the id its hints were stamped with. */
  id: string;
  openingName: string;
  eco: string | null;
  sans: readonly string[];
  studentSide: 'white' | 'black';
  /** 'win' | 'loss' | 'draw' from the student's seat; 'ongoing' = left mid-way. */
  outcome: 'win' | 'loss' | 'draw' | 'ongoing';
  studentName: string;
  studentRating: number | null;
}

export function buildOpeningPlayGame(a: OpeningPlayGameArgs, now: Date = new Date()): GameRecord | null {
  if (!shouldPersistFinishedGame(a.sans.length)) return null;
  const white = a.studentSide === 'white';
  const result: GameResult = a.outcome === 'ongoing' ? '*'
    : a.outcome === 'draw' ? '1/2-1/2'
      : (a.outcome === 'win') === white ? '1-0' : '0-1';
  return {
    id: a.id,
    pgn: a.sans.join(' '),
    white: white ? a.studentName : 'Stockfish Bot',
    black: white ? 'Stockfish Bot' : a.studentName,
    studentSide: a.studentSide,
    result,
    date: now.toISOString().split('T')[0],
    event: `Opening practice: ${a.openingName}`,
    eco: a.eco,
    whiteElo: white ? a.studentRating : null,
    blackElo: white ? null : a.studentRating,
    source: 'coach',
    annotations: null,
    coachAnalysis: null,
    isMasterGame: false,
    // The ONE opening key, minted from the moves like every other game.
    openingId: openingKeyFromSans(a.sans),
  };
}

/** Save it once (a second call for the same id keeps the longer game). */
export async function saveOpeningPlayGame(a: OpeningPlayGameArgs): Promise<boolean> {
  const record = buildOpeningPlayGame(a);
  if (!record) return false;
  try {
    const prev = await db.games.get(record.id);
    if (prev && prev.pgn.split(' ').length >= a.sans.length && prev.result !== '*') return false;
    await db.games.put(record);
    return true;
  } catch {
    return false;
  }
}
