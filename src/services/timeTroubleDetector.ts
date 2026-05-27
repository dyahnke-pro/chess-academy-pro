// Time-trouble detector (David 2026-05-27).
//
// The Play-with-Coach clock now persists `clockRemainingMs` — the remaining
// time (ms) for the side that moved, per ply — on clocked games. This crosses
// that against the player's blunders (`mistakePuzzles`): a mistake made at or
// under LOW_TIME_MS is a time-trouble hit. Pure post-process, no schema change.
// Feeds the unified weakness profile so "you crumble on the clock" drives the
// plan and routes to timed practice.
//
// Coach-game clocks are opt-in, so the signal is sparse until the student
// plays timed games. Imported-game `[%clk]` extraction is a follow-up source.

import type { GameRecord, MistakePuzzle } from '../types';

/** At/under this much time on the clock, a blunder counts as time-trouble. */
export const LOW_TIME_MS = 30_000;

export interface TimeTroubleHit {
  gameId: string;
  moveNumber: number;
  playerColor: 'white' | 'black';
  cpLoss: number;
  remainingMs: number;
  fen: string;
}

/** Half-move (ply) index for a full-move number + side. White's move 1 is
 *  ply 0, Black's move 1 is ply 1, White's move 2 is ply 2, etc. */
function plyIndex(moveNumber: number, color: 'white' | 'black'): number {
  return (moveNumber - 1) * 2 + (color === 'white' ? 0 : 1);
}

/**
 * Flag the player's blunders that were made in time trouble. A game qualifies
 * only if it carries per-ply clock data (`clockRemainingMs`); each of its
 * mistakes is mapped to its ply and kept when the clock was at/under the bar.
 */
export function detectTimeTrouble(games: GameRecord[], mistakes: MistakePuzzle[]): TimeTroubleHit[] {
  const clockByGame = new Map<string, number[]>();
  for (const g of games) {
    if (g.clockRemainingMs && g.clockRemainingMs.length > 0) clockByGame.set(g.id, g.clockRemainingMs);
  }
  if (clockByGame.size === 0) return [];

  const hits: TimeTroubleHit[] = [];
  for (const m of mistakes) {
    const clock = clockByGame.get(m.sourceGameId);
    if (!clock) continue;
    const ply = plyIndex(m.moveNumber, m.playerColor);
    if (ply < 0 || ply >= clock.length) continue;
    const remainingMs = clock[ply];
    if (typeof remainingMs !== 'number' || remainingMs > LOW_TIME_MS) continue;
    hits.push({
      gameId: m.sourceGameId,
      moveNumber: m.moveNumber,
      playerColor: m.playerColor,
      cpLoss: m.cpLoss,
      remainingMs,
      fen: m.fen,
    });
  }
  hits.sort((a, b) => a.remainingMs - b.remainingMs);
  return hits;
}
