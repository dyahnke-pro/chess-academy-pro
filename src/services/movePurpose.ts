// WHAT A MOVE IS FOR — one computer, every surface (David 2026-10-15: "play
// and other coach surfaces need to be able to speak to the same facts").
//
// `moveIntent` answers it from engine reads. This module is the one door the
// surfaces go through, so Learn's live line, the review walk, the explore
// board, Play's "Why?", and the chat's "why did they play that?" all give the
// same purpose for the same move:
//   - `intentWithFallback` — the reads in hand: the default read (what it
//     stops, what it unlocks), then the engine's own line (what it heads for).
//   - `purposeFromLine`    — only the engine's multi-PV at the board before the
//     move, whose first line starts with the move (the Why button, a best-move
//     answer): the line after the move IS the reply read.
//   - `movePurpose`        — nothing in hand: reads the four positions itself
//     (`movePurposeEngine.ts`, kept apart so this file stays a pure leaf).
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { DEFAULT_INTENT, moveIntent, type IntentReads, type MoveIntent } from './moveIntent';

/** The default read first; when it finds nothing, the move's follow-up in the
 *  engine's own line, and only a CONCRETE stopped threat (mate, check,
 *  material). */
export function intentWithFallback(
  fenBefore: string,
  san: string,
  reads: IntentReads,
  seat: 'student' | 'opponent',
  book = false,
): MoveIntent | null {
  return moveIntent(fenBefore, san, reads, seat, { ...DEFAULT_INTENT, book })
    ?? moveIntent(fenBefore, san, reads, seat, { prepare: 'line', prevent: 'concrete', book });
}

const uciOf = (fen: string, san: string): string | null => {
  try { const m = new Chess(fen).move(san); return m ? `${m.from}${m.to}${m.promotion ?? ''}` : null; } catch { return null; }
};

/** The purpose of `san` from the engine's lines at `fenBefore` alone. The line
 *  that starts with the move, minus the move, is the read after it. Null when
 *  no listed line starts with the move. */
export function purposeFromLine(
  fenBefore: string,
  san: string,
  lines: readonly AnalysisLine[],
  seat: 'student' | 'opponent',
): MoveIntent | null {
  const uci = uciOf(fenBefore, san);
  const own = uci ? lines.find((l) => l.moves?.[0] === uci) : undefined;
  if (!own || (own.moves?.length ?? 0) < 2) return null;
  const after: AnalysisLine[] = [{ ...own, rank: 1, moves: own.moves.slice(1) }];
  return intentWithFallback(fenBefore, san, { before: lines, after, passBefore: [], passAfter: [] }, seat);
}
