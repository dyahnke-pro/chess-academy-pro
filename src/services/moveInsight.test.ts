// moveInsight — the coach's insight, read off real boards (David 2026-10-05:
// "Why was the knight to one square better than the other when they both
// checked the king???").
import { describe, it, expect } from 'vitest';
import { doubleAttack, mechanismContrast, moveMissed, positionAsk, walkableLine } from './moveInsight';

// White: Ka1, Re2, Ng5. Black: Kh8, Qd8. Two checks — Nf7+ (forks king and
// queen) and Rh2+ (only checks).
const TWO_CHECKS = '3q3k/8/8/6N1/8/8/4R3/K7 w - - 0 1';

describe('doubleAttack — one piece, two targets', () => {
  it('finds the knight check that also hits the queen', () => {
    const d = doubleAttack(TWO_CHECKS, 'Nf7+');
    expect(d?.targets.map((t) => t.phrase)).toEqual(['the king', 'the queen on d8']);
  });
  it('a check that hits only the king is not a double attack', () => {
    expect(doubleAttack(TWO_CHECKS, 'Rh2+')).toBeNull();
  });
});

describe('mechanismContrast — why one check beats the other', () => {
  it('names what the better check hits and that the other only checks', () => {
    expect(mechanismContrast(TWO_CHECKS, 'Nf7+', 'Rh2+'))
      .toBe('The knight to f7 hits the king and the queen on d8 at once; the rook to h2 only checks.');
  });
  it('says nothing when the better move carries no double attack', () => {
    expect(mechanismContrast(TWO_CHECKS, 'Rh2+', 'Nf7+')).toBeNull();
  });
});

describe('moveMissed — what the student’s move actually does', () => {
  it('a check the king walks out of', () => {
    const m = moveMissed(TWO_CHECKS, 'Rh2+', ['h8g7']);
    expect(m?.text).toBe('The rook to h2 checks, but the king steps to g7 and nothing follows.');
    expect(m?.line?.plies.map((p) => p.san)).toEqual(['Rh2+', 'Kg7']);
  });
  it('a move that loses material along the reply', () => {
    // Qd4 walks into the rook on d8's file? No — Qe4 is taken by nothing; use
    // a queen move onto a square the rook covers: Qd5?? Rxd5.
    const fen = '3rk3/8/8/8/8/8/8/3QK3 w - - 0 1';
    const m = moveMissed(fen, 'Qd5', ['d8d5']);
    expect(m?.text).toMatch(/^The queen to d5\? Then the rook takes d5, and you come out 9 points down\.$/);
  });
});

describe('positionAsk — what the position asks, never the move', () => {
  const HIT = '3rk3/8/8/8/3Q4/8/8/4K3 w - - 0 1'; // rook d8 hits the queen d4
  it('defend: a piece under fire', () => {
    const a = positionAsk(HIT);
    expect(a.mode).toBe('defend');
    expect(a.text).toBe('Their rook on d8 is hitting your queen on d4 — deal with that first.');
  });
  it('press: something stronger than defending, without naming the move', () => {
    const a = positionAsk(HIT, { bestSan: 'Qxd8+' });
    expect(a.mode).toBe('press');
    expect(a.text).toMatch(/something stronger than defending/);
    expect(a.text).not.toMatch(/d8\+|Qxd8|takes d8/);
  });
  it('press: the fork position points at the idea, not the square', () => {
    const a = positionAsk(TWO_CHECKS, { bestSan: 'Nf7+' });
    expect(a.mode).toBe('press');
    expect(a.text).toMatch(/check that does more than check/);
    expect(a.text).not.toMatch(/f7/);
  });
  it('improve: a quiet start position', () => {
    expect(positionAsk('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').mode).toBe('improve');
  });
  it('in check: the king first', () => {
    expect(positionAsk('4k3/8/8/8/8/8/8/r3K3 w - - 0 1').mode).toBe('defend');
  });
});

describe('walkableLine — arrows + Walk for any spoken line', () => {
  it('stops at the first illegal move', () => {
    const l = walkableLine(TWO_CHECKS, ['Nf7+', 'Kg8', 'Nxd8', 'Zz9'], 'Nf7+');
    expect(l?.plies.map((p) => p.san)).toEqual(['Nf7+', 'Kg8', 'Nxd8']);
  });
});
