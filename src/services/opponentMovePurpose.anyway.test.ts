// Computers batch 2 — "can you play it anyway?": their prevention, tested.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { threatStoppedBy, playItAnyway } from './opponentMovePurpose';

// White's Nb5 sets up the Nc7 fork of king and rook; …Rb8 takes the rook off.
const PREV = 'r3k3/p4ppp/8/8/8/2N5/P4PPP/6K1 w - - 0 1';
function boards(): { mid: string; now: string } {
  const c = new Chess(PREV); c.move('Nb5'); const mid = c.fen(); c.move('Rb8');
  return { mid, now: c.fen() };
}

describe('playItAnyway', () => {
  it('the knight check still works after their rook steps aside, by the engine\'s line', () => {
    const { mid, now } = boards();
    const stop = threatStoppedBy(PREV, mid, 'Rb8', 'w');
    expect(stop).not.toBeNull();
    const any = playItAnyway(stop!, now, [{ moves: ['b5c7', 'e8d7', 'c7d5'], evaluation: 40, mate: null }], 'w');
    expect(any?.san).toBe('Nc7+');
    expect(any?.line).toEqual(['Nc7+', 'Kd7', 'Nd5']);
    expect(any?.text).toMatch(/Nc7/);
    expect(any?.text).not.toMatch(/\+/);
    expect(any?.text).not.toMatch(/\b(we|our)\b/i);
  });
  it('stays silent when the engine says the move now costs', () => {
    const { mid, now } = boards();
    const stop = threatStoppedBy(PREV, mid, 'Rb8', 'w')!;
    expect(playItAnyway(stop, now, [{ moves: ['g1f1'], evaluation: 40, mate: null }, { moves: ['b5c7', 'e8d7'], evaluation: -60, mate: null }], 'w')).toBeNull();
  });
});
