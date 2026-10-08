import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { detectTacticType } from './missedTacticService';

// The record half of "their in-between move" (missed computers, 2026-10-08):
// with the opponent's previous move in hand, the missed king step is filed
// under the one vocabulary's `zwischenzug`, not the "no named motif" sentinel.
describe('detectTacticType reads their in-between check', () => {
  const before = '6k1/p6p/4b3/3N4/8/8/PPP1K2P/8 b - - 0 1'; // they owe Bxd5
  const c = new Chess(before); c.move('Bg4+');
  const pv = ['e2e3', 'a7a6', 'd5c7'];
  it('files the missed king step as zwischenzug when the previous move is known', () => {
    expect(detectTacticType(c.fen(), 'e2e3', pv, { fenBefore: before, san: 'Bg4+' })).toBe('zwischenzug');
  });
  it('without the previous move it cannot claim one', () => {
    expect(detectTacticType(c.fen(), 'e2e3', pv)).not.toBe('zwischenzug');
  });
});
