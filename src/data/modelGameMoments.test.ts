// GATE — every hand-authored model-game criticalMoment must verify against
// its game's own pgn (the 2026-07-21 sweep: the Fischer 'Game 6' moments
// described a Najdorf that never happened; Naroditsky moments were anchored
// to the wrong moves). Rules live in momentVerifies: a leading "Move N <san>"
// must match the pgn at N, and every piece-on-square claim must be true at
// some ply. Baseline-free — the corpus was repaired in the same commit.
import { describe, it, expect } from 'vitest';
import { momentVerifies } from '../services/reviewStoryGame';
import modelGames from './model-games.json';

interface GameLike { id?: string; pgn?: string; criticalMoments?: Array<{ moveNumber?: number; color?: string; annotation?: string }> }

describe('model-game criticalMoments verify against their own pgn', () => {
  it('every moment passes momentVerifies', () => {
    const failures: string[] = [];
    for (const g of modelGames as GameLike[]) {
      if (!g.pgn || !g.criticalMoments?.length) continue;
      for (const m of g.criticalMoments) {
        if (typeof m.moveNumber !== 'number' || (m.color !== 'white' && m.color !== 'black') || !m.annotation) continue;
        if (!momentVerifies(g.pgn, m as { moveNumber: number; color: 'white' | 'black'; annotation: string })) {
          failures.push(`${g.id} mv${m.moveNumber}${m.color === 'black' ? 'b' : 'w'}: ${m.annotation.slice(0, 80)}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
