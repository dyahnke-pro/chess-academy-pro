// Walk a forced line to its proven terminus. Deterministic mock engine keyed by
// the POSITION (fen minus move counters) so a cyclic shuffle can recur and
// chess.js's own threefold detection fires (G0 — no real engine needed).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { walkForcedSequence } from './onlyMoveSequence';
import type { EvaluateMulti, RawCandidate } from './criticalityScan';

const posKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const byPosition = (table: Record<string, RawCandidate[]>): EvaluateMulti => async (fen) => table[posKey(fen)] ?? [];

describe('walkForcedSequence', () => {
  it('stops immediately with "not-forced" when the position is a real choice', async () => {
    const start = new Chess().fen();
    const flat = byPosition({ [posKey(start)]: [{ uci: 'e2e4', cp: 25 }, { uci: 'd2d4', cp: 22 }] });
    const seq = await walkForcedSequence(start, flat);
    expect(seq.terminus).toBe('not-forced');
    expect(seq.steps).toHaveLength(0);
  });

  it('walks a forced mate and proves the checkmate terminus', async () => {
    const fen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'; // Ra8#
    expect(new Chess(fen).move('Ra8')).toBeTruthy();
    const eng = byPosition({ [posKey(fen)]: [{ uci: 'a1a8', cp: 99999 }, { uci: 'a1a2', cp: 40 }] });
    const seq = await walkForcedSequence(fen, eng);
    expect(seq.steps.map((s) => s.san)).toEqual(['Ra8#']);
    expect(seq.terminus).toBe('checkmate');
    expect(seq.outcome).toBe('white-mates');
  });

  it('walks a SERIES OF ONLY MOVES into a draw by repetition', async () => {
    // Rook + king shuffle: each side has exactly one "engine-preferred" move
    // (the others drop 4 pawns in the mock), and the cycle returns to the start
    // position until chess.js sees the threefold. No checks → 'repetition'.
    const start = '7k/8/8/8/8/8/8/R6K w - - 0 1';
    const eng = byPosition({
      '7k/8/8/8/8/8/8/R6K w - -': [{ uci: 'a1a2', cp: 0 }, { uci: 'a1b1', cp: -400 }], // White
      '7k/8/8/8/8/8/R7/7K b - -': [{ uci: 'h8g8', cp: 0 }, { uci: 'h8h7', cp: 400 }],   // Black
      '6k1/8/8/8/8/8/R7/7K w - -': [{ uci: 'a2a1', cp: 0 }, { uci: 'a2a3', cp: -400 }], // White
      '6k1/8/8/8/8/8/8/R6K b - -': [{ uci: 'g8h8', cp: 0 }, { uci: 'g8g7', cp: 400 }],   // Black
    });
    const seq = await walkForcedSequence(start, eng, { maxPlies: 16 });
    expect(seq.terminus).toBe('repetition');
    expect(seq.outcome).toBe('draw');
    expect(seq.steps.length).toBeGreaterThanOrEqual(8); // needed two full cycles to hit threefold
  });

  it('returns unclear/not-forced on a malformed FEN without throwing', async () => {
    const seq = await walkForcedSequence('not a fen', byPosition({}));
    expect(seq.terminus).toBe('not-forced');
    expect(seq.steps).toHaveLength(0);
  });
});
