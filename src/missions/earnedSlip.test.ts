// THE EARNED FREE PIECE — the pure half (docs/CAMPAIGN.md §6a). Every board
// here was built and checked with chess.js: the moves are legal, the fork is a
// fork, and the hanging rook really hangs.
import { describe, expect, it } from 'vitest';
import { lineWin, nothingHangs, slipCandidates, SLIP_DROP_CP } from './earnedSlip';

// White (the student) to move; the black king and the rook on a8 stand a
// knight's fork apart: Nc7+ forks them, the king steps, Nxa8.
const FORK = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
// The same idea a step earlier: the knight already attacks a8 — a hand-over.
const HANDED = 'r3k3/8/1N6/8/8/8/8/4K3 w - - 0 1';

describe('nothingHangs — the piece has to be won, never picked up', () => {
  it('a fork in the air leaves nothing hanging', () => {
    expect(nothingHangs(FORK)).toBe(true);
  });
  it('a rook the knight already attacks is a hand-over', () => {
    expect(nothingHangs(HANDED)).toBe(false);
  });
});

describe('lineWin — how deep the student must see before the piece falls', () => {
  it('the fork, the king steps, the rook falls: depth 1 on a8', () => {
    expect(lineWin(FORK, ['d5c7', 'e8d7', 'c7a8'])).toEqual({ depth: 1, line: ['d5c7', 'e8d7', 'c7a8'], square: 'a8' });
  });
  it('a capture on the first move is a hand-over, never a line', () => {
    expect(lineWin(HANDED, ['b6a8'])).toBeNull();
  });
  it('a line that wins nothing is no line', () => {
    expect(lineWin(FORK, ['d5f4', 'e8d7', 'f4d5'])).toBeNull();
  });
  it('a line is cut at the winning capture — the rest is not the lesson', () => {
    expect(lineWin(FORK, ['d5c7', 'e8d7', 'c7a8', 'd7c8'])?.line).toEqual(['d5c7', 'e8d7', 'c7a8']);
  });
});

describe('slipCandidates — the coach\'s own natural mistakes', () => {
  // Black (the coach) to move. Ke8 walks into the fork; Kc8 is its best.
  const COACH = 'r2k4/8/8/3N4/8/8/8/4K3 b - - 0 1';

  it('keeps a candidate that costs the coach a real mistake, after which nothing hangs', () => {
    const out = slipCandidates(COACH, [
      { uci: 'd8c8', coachCp: 0 },
      { uci: 'd8e8', coachCp: -SLIP_DROP_CP - 300 },
    ]);
    expect(out.map((s) => s.uci)).toEqual(['d8e8']);
    expect(out[0].fenAfter).toBe(FORK.replace(' w - - 0 1', ' w - - 1 2'));
  });

  it('drops an inaccuracy (under the slip bar) and a check (it leads the student by the hand)', () => {
    const out = slipCandidates(COACH, [
      { uci: 'd8c8', coachCp: 0 },
      { uci: 'a8b8', coachCp: -SLIP_DROP_CP + 1 },
      { uci: 'a8a1', coachCp: -900 },
    ]);
    expect(out).toEqual([]);
  });

  it('drops a move that leaves a piece hanging — that is the old hand-over', () => {
    const hangs = 'r2k4/8/8/2N5/8/8/8/4K3 b - - 0 1';
    const out = slipCandidates(hangs, [
      { uci: 'd8e8', coachCp: 0 },
      { uci: 'a8a6', coachCp: -500 },   // Nxa6 picks it up
      { uci: 'a8a7', coachCp: -300 },
    ]);
    expect(out.map((s) => s.uci)).toEqual(['a8a7']);
  });

  it('puts the smallest drop first — the most natural mistake reads best', () => {
    const out = slipCandidates(COACH, [
      { uci: 'd8c8', coachCp: 100 },
      { uci: 'a8a7', coachCp: -600 },
      { uci: 'd8e8', coachCp: -150 },
    ]);
    expect(out.map((s) => s.uci)).toEqual(['d8e8', 'a8a7']);
  });
});
