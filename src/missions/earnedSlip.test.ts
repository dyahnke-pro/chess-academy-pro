// THE EARNED FREE PIECE — the pure half (docs/CAMPAIGN.md §6a). Every board
// here was built and checked with chess.js: the moves are legal, the fork is a
// fork, and the hanging rook really hangs.
import { describe, expect, it } from 'vitest';
import { findEarnedSlip, lineWin, nothingHangs, PLANT_VERIFY_MAX, slipCandidates, SLIP_DROP_CP, type SlipRead } from './earnedSlip';

// White (the student) to move; the black king and the rook on a8 stand a
// knight's fork apart: Nc7+ forks them, the king steps, Nxa8.
const FORK = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
// The same idea a step earlier: the knight already attacks a8 — a hand-over.
const HANDED = 'r3k3/8/1N6/8/8/8/8/4K3 w - - 0 1';

describe('nothingHangs — the piece has to be won, never picked up', () => {
  it('a fork in the air leaves nothing hanging', () => {
    expect(nothingHangs(FORK, 0)).toBe(true);
  });
  it('a rook the knight already attacks is a hand-over', () => {
    expect(nothingHangs(HANDED, 0)).toBe(false);
  });
});

describe('lineWin — how deep the student must see before the piece falls', () => {
  it('the fork, the king steps, the rook falls: depth 1 on a8', () => {
    expect(lineWin(FORK, ['d5c7', 'e8d7', 'c7a8'], 0)).toEqual({ depth: 1, line: ['d5c7', 'e8d7', 'c7a8'], square: 'a8' });
  });
  it('a capture on the first move is a hand-over, never a line', () => {
    expect(lineWin(HANDED, ['b6a8'], 0)).toBeNull();
  });
  it('a line that wins nothing is no line', () => {
    expect(lineWin(FORK, ['d5f4', 'e8d7', 'f4d5'], 0)).toBeNull();
  });
  it('a line is cut at the winning capture — the rest is not the lesson', () => {
    expect(lineWin(FORK, ['d5c7', 'e8d7', 'c7a8', 'd7c8'], 0)?.line).toEqual(['d5c7', 'e8d7', 'c7a8']);
  });
});

describe('slipCandidates — the coach\'s own natural mistakes', () => {
  // Black (the coach) to move. Ke8 walks into the fork; Kc8 is its best.
  const COACH = 'r2k4/8/8/3N4/8/8/8/4K3 b - - 0 1';

  it('keeps a candidate that costs the coach a real mistake, after which nothing hangs', () => {
    const out = slipCandidates(COACH, [
      { uci: 'd8c8', coachCp: 0, pv: ['d8c8'] },
      { uci: 'd8e8', coachCp: -SLIP_DROP_CP - 300, pv: ['d8e8'] },
    ], 'forbid');
    expect(out.map((s) => s.uci)).toEqual(['d8e8']);
    expect(out[0].fenAfter).toBe(FORK.replace(' w - - 0 1', ' w - - 1 2'));
  });

  it('drops an inaccuracy (under the slip bar) and a check (it leads the student by the hand)', () => {
    const out = slipCandidates(COACH, [
      { uci: 'd8c8', coachCp: 0, pv: ['d8c8'] },
      { uci: 'a8b8', coachCp: -SLIP_DROP_CP + 1, pv: ['a8b8'] },
      { uci: 'a8a1', coachCp: -900, pv: ['a8a1'] },
    ], 'forbid');
    expect(out).toEqual([]);
  });

  it('drops a move that leaves a piece hanging — that is the old hand-over', () => {
    const hangs = 'r2k4/8/8/2N5/8/8/8/4K3 b - - 0 1';
    const out = slipCandidates(hangs, [
      { uci: 'd8e8', coachCp: 0, pv: ['d8e8'] },
      { uci: 'a8a6', coachCp: -500, pv: ['a8a6'] },   // Nxa6 picks it up
      { uci: 'a8a7', coachCp: -300, pv: ['a8a7'] },
    ], 'forbid');
    expect(out.map((s) => s.uci)).toEqual(['a8a7']);
  });

  it('…unless the hanging piece IS the question (the loose-pieces plant asks for it)', () => {
    const hangs = 'r2k4/8/8/2N5/8/8/8/4K3 b - - 0 1';
    const out = slipCandidates(hangs, [
      { uci: 'd8e8', coachCp: 0, pv: ['d8e8'] },
      { uci: 'a8a6', coachCp: -500, pv: ['a8a6'] },
      { uci: 'a8a7', coachCp: -300, pv: ['a8a7'] },
    ], 'allow');
    expect(out.map((s) => s.uci)).toEqual(['a8a7', 'a8a6']);
  });

  it('puts the smallest drop first — the most natural mistake reads best', () => {
    const out = slipCandidates(COACH, [
      { uci: 'd8c8', coachCp: 100, pv: ['d8c8'] },
      { uci: 'a8a7', coachCp: -600, pv: ['a8a7'] },
      { uci: 'd8e8', coachCp: -150, pv: ['d8e8'] },
    ], 'forbid');
    expect(out.map((s) => s.uci)).toEqual(['d8e8', 'a8a7']);
  });
});

describe('findEarnedSlip — the student-side reads go where the coach\'s own line shows a piece falling', () => {
  // Black (the coach) to move. Kc8 is its best; Ra7 and Rb8 are smaller
  // mistakes that lose no piece; Ke8 walks into Nc7+ and the rook falls.
  const COACH = 'r2k4/8/8/3N4/8/8/8/4K3 b - - 0 1';
  const lines = [
    { uci: 'd8c8', coachCp: 0, pv: ['d8c8'] },
    { uci: 'a8a7', coachCp: -SLIP_DROP_CP - 10, pv: ['a8a7', 'd5f4'] },
    { uci: 'a8b8', coachCp: -SLIP_DROP_CP - 20, pv: ['a8b8', 'd5f4'] },
    { uci: 'd8e8', coachCp: -SLIP_DROP_CP - 400, pv: ['d8e8', 'd5c7', 'e8d7', 'c7a8'] },
  ];

  it('checks first the slip whose own line already wins the piece — never two quieter slips ahead of it', async () => {
    // Ke8 is the BIGGEST drop: in smallest-drop order it came third, and the
    // reads stopped at PLANT_VERIFY_MAX (fails on the old order).
    expect(PLANT_VERIFY_MAX).toBeLessThan(3);
    const asked: string[] = [];
    const read: SlipRead = async (fen) => {
      asked.push(fen);
      const forked = fen.startsWith('r3k3/8/8/3N4/');
      return { topLines: [forked
        ? { evaluation: 500, mate: null, moves: ['d5c7', 'e8d7', 'c7a8'] }
        : { evaluation: 100, mate: null, moves: ['d5f4', 'a7a8'] }] };
    };
    const { pick, scan } = await findEarnedSlip(COACH, lines, 1, read);
    expect(pick?.uci).toBe('d8e8');
    expect(pick?.square).toBe('a8');
    expect(asked).toHaveLength(1);
    expect(scan).toEqual({});
  });

  it('the read still decides: a line the coach saw that the student-side read does not confirm is no plant', async () => {
    const read: SlipRead = async () => ({ topLines: [{ evaluation: 0, mate: null, moves: ['e1e2'] }] });
    const { pick, scan } = await findEarnedSlip(COACH, lines, 1, read);
    expect(pick).toBeNull();
    expect(scan['no-line']).toBe(PLANT_VERIFY_MAX);
  });
});

describe('a slip that TRADES into the shot — measured from the board before it (David\'s game, 2026-10-21)', () => {
  // David's Campaign game: Black (the coach) to move. …Bxd6 trades bishops, and
  // Nxd6+ forks the king on e8 and the bishop on b7. The old finder measured
  // from the board AFTER the slip, so the recapture read as "a bishop hanging"
  // and as "a piece won at once" — every slip that captures was thrown out.
  const COACH = 'r2qk1nr/pb1nbppp/2pBp3/1p6/3PN3/5N2/PPP1BPPP/R2Q1RK1 b kq - 0 10';
  const AFTER = 'r2qk1nr/pb1n1ppp/2pbp3/1p6/3PN3/5N2/PPP1BPPP/R2Q1RK1 w kq - 0 11';

  it('the recapture only wins back what the slip took — nothing hangs', () => {
    expect(nothingHangs(AFTER, 3)).toBe(true);
    // Measured as if the slip took nothing, the bishop on d6 is a hand-over.
    expect(nothingHangs(AFTER, 0)).toBe(false);
  });

  it('the fork is a one-move shot: Nxd6+ is the key move, the bishop on b7 falls', () => {
    expect(lineWin(AFTER, ['e4d6', 'e8f8', 'd6b7'], 3)).toEqual({ depth: 1, line: ['e4d6', 'e8f8', 'd6b7'], square: 'b7' });
    // Measured from after the slip, the recapture itself read as the win.
    expect(lineWin(AFTER, ['e4d6', 'e8f8', 'd6b7'], 0)).toBeNull();
  });

  it('the coach offers it as a slip', () => {
    const out = slipCandidates(COACH, [
      { uci: 'c6c5', coachCp: -150, pv: ['c6c5'] },
      { uci: 'e7d6', coachCp: -150 - SLIP_DROP_CP - 100, pv: ['e7d6', 'e4d6', 'e8f8', 'd6b7'] },
    ], 'forbid');
    expect(out.map((s) => s.uci)).toEqual(['e7d6']);
    expect(out[0].took).toBe(3);
    expect(out[0].shown).toEqual({ depth: 1, line: ['e4d6', 'e8f8', 'd6b7'], square: 'b7' });
  });
});
