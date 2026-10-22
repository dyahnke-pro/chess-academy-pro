import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import * as T from '../../../scripts/scenarios/kp-tablebase.mjs';
import tables from './kpTables.json';
import { exactWinner, kpShowMove, kpkWhiteWins, winnerAfter, winningMovesUci } from './kpEndings';

/** The tables rebuilt from scratch by the same solver the build used. */
const kpk = T.solveKpk();
const solvedPairs = new Map<number, T.PairTable>();
const pairOf = (wp: number): T.PairTable => {
  const hit = solvedPairs.get(wp);
  if (hit) return hit;
  const solved = T.solvePair(kpk, wp);
  solvedPairs.set(wp, solved);
  return solved;
};

describe('the shipped K+P vs K bits are the solved table, bit for bit', () => {
  it('every legal position, both sides to move, every pawn square a2–h7', () => {
    let checked = 0;
    for (let p = 8; p < 56; p++) for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (const stm of [0, 1] as const) {
      if (!T.kpkLegal(p, wk, bk, stm)) continue;
      const solved = kpk.val[T.kpkIndex(p, wk, bk, stm)] === 1;
      if (kpkWhiteWins(p, wk, bk, stm) !== solved) throw new Error(`bit mismatch at ${T.fenFor({ wk, bk, wp: p }, stm, 'w')}`);
      checked++;
    }
    // ~364k legal placements: a real sweep, not a vacuous one.
    expect(checked).toBeGreaterThan(300_000);
  }, 120_000);
});

/** The shipped blocked pairs: slice keys of one white pawn and the black pawn
 *  directly in front of it ("e5/e6"). */
const PAIR_KEYS = Object.keys(tables.slices).filter((k) => /^[a-h][1-8]\/[a-h][1-8]$/.test(k) && k[0] === k[3] && Number(k[4]) === Number(k[1]) + 1);

describe('the shipped blocked-pair slices are the solved tables', () => {
  it('every shipped pair, every legal position, both sides to move', () => {
    expect(PAIR_KEYS.length).toBeGreaterThan(0);
    for (const key of PAIR_KEYS) {
      const name = key.slice(0, 2);
      const wp = T.squareIndex(name);
      const pair = pairOf(wp);
      for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (const stm of [0, 1] as const) {
        if (!T.pairLegal(wp, wk, bk, stm)) continue;
        const v = pair.val[T.pairIndex(wk, bk, stm)];
        const want = v === 1 ? 'w' : v === -1 ? 'b' : 'draw';
        const got = exactWinner(new Chess(T.fenFor({ wk, bk, wp, bp: wp + 8 }, stm, 'w')));
        if (got !== want) throw new Error(`${name} pair: ${T.fenFor({ wk, bk, wp, bp: wp + 8 }, stm, 'w')} reads ${got}, solved ${want}`);
      }
    }
  }, 120_000);

  it('a Black-student board reads the colour mirror of a shipped pair', () => {
    // A white pawn on the 3rd with a black pawn on the 4th reads the shipped
    // 5th/6th-rank pair, ranks flipped and colours swapped.
    const shipped = PAIR_KEYS.find((k) => k[1] === '5');
    expect(shipped).toBeDefined();
    const wp = T.squareIndex((shipped as string).slice(0, 2));
    const pair = pairOf(wp);
    let checked = 0;
    for (let wk = 0; wk < 64; wk += 3) for (let bk = 1; bk < 64; bk += 2) for (const stm of [0, 1] as const) {
      if (!T.pairLegal(wp, wk, bk, stm)) continue;
      const v = pair.val[T.pairIndex(wk, bk, stm)];
      const want = v === 1 ? 'b' : v === -1 ? 'w' : 'draw'; // colours swap in the mirror
      const fen = T.fenFor({ wk, bk, wp, bp: wp + 8 }, stm, 'b');
      expect(exactWinner(new Chess(fen)), fen).toBe(want);
      checked++;
    }
    expect(checked).toBeGreaterThan(500);
  });
});

describe('exactWinner on real boards', () => {
  it('a Black pawn reads the mirrored K+P vs K table', () => {
    // Mirror of 8/4k3/2P5/4K3/8/8/8/8 w (a White win): Black wins.
    expect(exactWinner(new Chess('8/8/8/8/4k3/2p5/4K3/8 b - - 0 1'))).toBe('b');
    expect(exactWinner(new Chess('8/4k3/2P5/4K3/8/8/8/8 w - - 0 1'))).toBe('w');
    // The rook pawn with the defender in the corner: a draw.
    expect(exactWinner(new Chess('k7/8/K7/P7/8/8/8/8 w - - 0 1'))).toBe('draw');
  });

  it('a promotion is judged on the spot: safe queen wins, a stalemating queen or a hanging one draws', () => {
    // b8=Q stalemates Ka6 (only the rook wins here) — the selfcheck's own find.
    const stale = new Chess('8/1P6/k7/8/K7/8/8/8 w - - 0 1');
    stale.move('b8=Q');
    expect(stale.isStalemate()).toBe(true);
    expect(exactWinner(stale)).toBe('draw');
    const rook = new Chess('8/1P6/k7/8/K7/8/8/8 w - - 0 1');
    rook.move('b8=R');
    expect(exactWinner(rook)).toBe('w');
    // The new queen next to their king and unguarded: they take it.
    const hang = new Chess('8/1Pk5/8/8/8/8/8/6K1 w - - 0 1');
    hang.move('b8=Q');
    expect(exactWinner(hang)).toBe('draw');
    // A knight or a bishop never wins against a lone king.
    expect(exactWinner(new Chess('8/8/8/3k4/8/8/8/N3K3 w - - 0 1'))).toBe('draw');
  });

  it('bare kings draw; anything outside the solved families reads null (never a guess)', () => {
    expect(exactWinner(new Chess('8/8/3k4/8/8/3K4/8/8 w - - 0 1'))).toBe('draw');
    expect(exactWinner(new Chess())).toBeNull();
    // Two pawns not blocking each other.
    expect(exactWinner(new Chess('8/3k4/8/2p5/4P3/3K4/8/8 w - - 0 1'))).toBeNull();
    // A blocked pair whose table does not ship (a2/a3), nor its mirror (a6/a7).
    expect(Object.keys(tables.slices)).not.toContain('a2/a3');
    expect(Object.keys(tables.slices)).not.toContain('a6/a7');
    expect(exactWinner(new Chess('8/3k4/8/8/8/p7/P7/3K4 w - - 0 1'))).toBeNull();
  });

  it('agrees with the solver through chess.js on sampled K+P vs K boards and their every move', () => {
    let n = 0;
    for (let p = 9; p < 55; p += 5) for (let wk = 0; wk < 64; wk += 7) for (let bk = 3; bk < 64; bk += 9) {
      if (!T.kpkLegal(p, wk, bk, 0)) continue;
      const fen = T.fenFor({ wk, bk, wp: p }, 0, 'w');
      const want = kpk.val[T.kpkIndex(p, wk, bk, 0)] === 1;
      expect(exactWinner(new Chess(fen)) === 'w', fen).toBe(want);
      // A win has a winning move; a draw has none.
      expect(winningMovesUci(fen, 'w').length > 0, fen).toBe(want);
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });
});

describe('the move a second miss shows', () => {
  const FEN = '8/4k3/2P5/4K3/8/8/8/8 w - - 0 1'; // only Kd5 wins
  it('the first engine candidate that keeps the win, else the fallback, else the first winning move', () => {
    expect(winningMovesUci(FEN, 'w')).toEqual(['e5d5']);
    expect(kpShowMove(FEN, 'w', ['c6c7', 'e5d5'], null)).toEqual({ from: 'e5', to: 'd5' });
    expect(kpShowMove(FEN, 'w', ['c6c7'], 'e5d5')).toEqual({ from: 'e5', to: 'd5' });
    expect(kpShowMove(FEN, 'w', [], 'c6c7')).toEqual({ from: 'e5', to: 'd5' });
    expect(winnerAfter(FEN, 'c6c7')).toBe('draw');
  });
});
