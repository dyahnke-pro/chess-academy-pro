import { describe, expect, it } from 'vitest';
import { detectTimeTrouble, LOW_TIME_MS } from './timeTroubleDetector';
import { buildGameRecord, buildMistakePuzzle } from '../test/factories';
import type { GameRecord, MistakePuzzle } from '../types';

function game(id: string, clockRemainingMs?: number[]): GameRecord {
  return buildGameRecord({ id, source: 'coach', clockRemainingMs });
}

function mistake(o: Partial<MistakePuzzle>): MistakePuzzle {
  return buildMistakePuzzle({ cpLoss: 300, classification: 'blunder', ...o });
}

describe('detectTimeTrouble', () => {
  it('flags a blunder made under the low-time bar', () => {
    // ply for White move 10 = (10-1)*2 + 0 = 18. Put 12s on the clock there.
    const clock = new Array(40).fill(120_000);
    clock[18] = 12_000;
    const g = game('g1', clock);
    const m = mistake({ sourceGameId: 'g1', moveNumber: 10, playerColor: 'white' });
    const hits = detectTimeTrouble([g], [m]);
    expect(hits).toHaveLength(1);
    expect(hits[0].remainingMs).toBe(12_000);
    expect(hits[0].moveNumber).toBe(10);
  });

  it('does NOT flag a blunder made with plenty of time', () => {
    const clock = new Array(40).fill(120_000);
    const g = game('g1', clock);
    const m = mistake({ sourceGameId: 'g1', moveNumber: 10, playerColor: 'white' });
    expect(detectTimeTrouble([g], [m])).toHaveLength(0);
  });

  it('maps Black moves to the odd ply', () => {
    // Black move 7 → ply (7-1)*2 + 1 = 13.
    const clock = new Array(40).fill(90_000);
    clock[13] = 8_000;
    const g = game('g1', clock);
    const m = mistake({ sourceGameId: 'g1', moveNumber: 7, playerColor: 'black' });
    const hits = detectTimeTrouble([g], [m]);
    expect(hits).toHaveLength(1);
    expect(hits[0].playerColor).toBe('black');
  });

  it('ignores games without clock data (unlimited / imported without [%clk])', () => {
    const g = game('g1', undefined);
    const m = mistake({ sourceGameId: 'g1', moveNumber: 10, playerColor: 'white' });
    expect(detectTimeTrouble([g], [m])).toHaveLength(0);
  });

  it('skips a mistake whose ply is past the recorded clock length', () => {
    const g = game('g1', [30_000, 29_000]); // only 2 plies recorded
    const m = mistake({ sourceGameId: 'g1', moveNumber: 20, playerColor: 'white' });
    expect(detectTimeTrouble([g], [m])).toHaveLength(0);
  });

  it('treats exactly LOW_TIME_MS as time trouble (boundary)', () => {
    const clock = new Array(10).fill(LOW_TIME_MS);
    const g = game('g1', clock);
    const m = mistake({ sourceGameId: 'g1', moveNumber: 1, playerColor: 'white' });
    expect(detectTimeTrouble([g], [m])).toHaveLength(1);
  });

  it('sorts hits by most-desperate (least time) first', () => {
    const clock = new Array(40).fill(120_000);
    clock[0] = 25_000; // W move 1
    clock[2] = 5_000;  // W move 2
    const g = game('g1', clock);
    const hits = detectTimeTrouble([g], [
      mistake({ id: 'a', sourceGameId: 'g1', moveNumber: 1, playerColor: 'white' }),
      mistake({ id: 'b', sourceGameId: 'g1', moveNumber: 2, playerColor: 'white' }),
    ]);
    expect(hits.map((h) => h.remainingMs)).toEqual([5_000, 25_000]);
  });
});
