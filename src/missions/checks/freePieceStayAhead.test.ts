import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import type { MissionGame } from '../missionCard';
import {
  checkFreePieceStayAhead,
  freePieceStayAheadProgress,
  freePieceStayAheadShowMove,
} from './freePieceStayAhead';

const sans = (m: string): string[] => m.split(/\s+/).filter(Boolean);
const fenOf = (moves: string[]): string => { const b = new Chess(); for (const s of moves) b.move(s); return b.fen(); };

/** White student. The coach (Black) plants …Ng4 at ply 15; f3 takes it. */
const WHITE_PREFIX = 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Qf6 Qxf6 Nxf6 f3 Bc5 Bd3 Ng4';
const WHITE_PLANT = { ply: 15, square: 'g4' };
/** Black student. The coach (White) plants Bd3 at ply 12; …Nxd3 takes it. */
const BLACK_PREFIX = 'd4 d5 c4 dxc4 e4 e5 dxe5 Qxd1+ Kxd1 Nc6 Bxc4 Nxe5 Bd3';
const BLACK_PLANT = { ply: 12, square: 'd3' };

function game(moves: string, studentColor: 'w' | 'b', planted: { ply: number; square: string } | null, opts: { startPly?: number; forgiven?: number[] } = {}): MissionGame {
  return {
    sans: sans(moves),
    studentColor,
    forgiven: new Set(opts.forgiven ?? []),
    startPly: opts.startPly ?? 10,
    context: planted ? { planted } : {},
  };
}

describe('every fixture is a legal game', () => {
  it.each([
    `${WHITE_PREFIX} fxg4 d6 Nc3 Be6 Bd2 O-O-O O-O-O Rhe8 Rhe1 Bd4 Bf4 Bxc3 bxc3 d5 exd5 Bxd5 Rxe8 Rxe8 Kd2`,
    `${WHITE_PREFIX} fxg4 d6 Nc3 Bd7 Na4`,
    `${BLACK_PREFIX} Nxd3 Ke2 Nc5 Nc3 Bd6 Nf3 Be6 Nb5 Ke7 Nxd6 Kxd6 Rd1+ Ke7 Rd2 Rd8 Rxd8 Kxd8 Nd4 Bd7 Nb3 Nxb3 axb3 a6`,
  ])('%s', (line) => {
    const b = new Chess();
    for (const s of sans(line)) expect(() => b.move(s)).not.toThrow();
  });
});

describe('Take the free piece, stay ahead — the check', () => {
  it('1. plant, immediate capture, lead held into a minor-piece ending → PASS', () => {
    const line = `${WHITE_PREFIX} fxg4 d6 Nc3 Be6 Bd2 O-O-O O-O-O Rhe8 Rhe1 Bd4 Bf4 Bxc3 bxc3 d5 exd5 Bxd5 Rxe8 Rxe8 Kd2`;
    // Every ply before the ending is still pending — nothing missed on the way.
    for (let n = 17; n < sans(line).length; n++) {
      expect(checkFreePieceStayAhead(game(sans(line).slice(0, n).join(' '), 'w', WHITE_PLANT)).state).toBe('pending');
    }
    expect(checkFreePieceStayAhead(game(line, 'w', WHITE_PLANT))).toEqual({ state: 'pass', ply: 34 });
  });

  it('2. the plant ignored → MISS missed-free-piece, showing the capture', () => {
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} Nc3`, 'w', WHITE_PLANT))).toEqual({
      state: 'miss', ply: 16, reason: 'missed-free-piece', showMove: { from: 'f3', to: 'g4' },
    });
  });

  it('3. the piece taken, then a knight hung with the lead at 3 → MISS gave-back-material', () => {
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} fxg4 d6 Nc3 Bd7 Na4`, 'w', WHITE_PLANT))).toEqual({
      state: 'miss', ply: 20, reason: 'gave-back-material',
    });
  });

  it('4. a hung pawn only is never a miss', () => {
    const line = `${WHITE_PREFIX} fxg4 d6 Nc3`;
    // …Bxg4 wins the g4 pawn — one point, not a give-back.
    expect(legalSeeGainFor(fenOf(sans(line)), 'g4', 'b')).toBe(1);
    expect(checkFreePieceStayAhead(game(line, 'w', WHITE_PLANT)).state).toBe('pending');
  });

  it('5. an even trade of rooks is never a miss', () => {
    const line = `${WHITE_PREFIX} fxg4 d6 Nc3 Be6 Bd2 O-O-O O-O-O Rhe8 Rhe1 Bd4 Bf4 Bxc3 bxc3 d5 exd5 Bxd5 Rxe8`;
    // The coach takes back a rook (5) — the lead goes 8 → 3, still ahead.
    expect(legalSeeGainFor(fenOf(sans(line)), 'e8', 'b')).toBe(5);
    expect(checkFreePieceStayAhead(game(line, 'w', WHITE_PLANT)).state).toBe('pending');
  });

  it('6. the 40th move with the lead held and no ending → PASS', () => {
    // Kings on cycles of 4 and 5 squares: no position comes round three times
    // (threefold would end the game first).
    const B = ['Kd8', 'Ke7', 'Kf8', 'Ke8'];
    const W = ['Kd1', 'Kd2', 'Ke2', 'Kf1', 'Ke1'];
    const shuffle = Array.from({ length: 31 }, (_, i) => `${B[i % 4]} ${W[i % 5]}`).join(' ');
    const line = `${WHITE_PREFIX} fxg4 ${shuffle}`;
    expect(sans(line)).toHaveLength(79); // White's 40th move
    const end = new Chess();
    for (const m of sans(line)) end.move(m);
    expect(end.isGameOver()).toBe(false);
    expect(checkFreePieceStayAhead(game(line, 'w', WHITE_PLANT))).toEqual({ state: 'pass', ply: 78 });
  });

  it('7. FAIL TWIN: a defended "free" piece (SEE < 3) is never the plant', () => {
    // …Bd7 guards g4 before …Ng4: f3 takes a knight for a pawn back — 2, not 3.
    const twin = 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Qf6 Qxf6 Nxf6 f3 d6 Bd3 Bd7 Nc3 Ng4';
    expect(legalSeeGainFor(fenOf(sans(twin)), 'g4', 'w')).toBe(2);
    const plant = { ply: 17, square: 'g4' };
    // Ignoring it is no miss; taking it is no first half.
    expect(checkFreePieceStayAhead(game(`${twin} Ke2`, 'w', plant)).state).toBe('pending');
    expect(freePieceStayAheadProgress(game(`${twin} fxg4`, 'w', plant))).toBe('Win material when the chance comes');
  });

  it('8a. Black mirror of 1: plant, capture, lead held into the ending → PASS', () => {
    const line = `${BLACK_PREFIX} Nxd3 Ke2 Nc5 Nc3 Bd6 Nf3 Be6 Nb5 Ke7 Nxd6 Kxd6 Rd1+ Ke7 Rd2 Rd8 Rxd8 Kxd8 Nd4 Bd7 Nb3 Nxb3 axb3 a6`;
    expect(checkFreePieceStayAhead(game(line, 'b', BLACK_PLANT))).toEqual({ state: 'pass', ply: 35 });
  });

  it('8b. Black mirror of 2: the plant ignored → MISS, showing the capture', () => {
    expect(checkFreePieceStayAhead(game(`${BLACK_PREFIX} a6`, 'b', BLACK_PLANT))).toEqual({
      state: 'miss', ply: 13, reason: 'missed-free-piece', showMove: { from: 'e5', to: 'd3' },
    });
  });
});

describe('the rest of the contract', () => {
  it('before any plant it is pending, and the banner never names the piece', () => {
    const g = game(WHITE_PREFIX, 'w', null);
    expect(checkFreePieceStayAhead(g).state).toBe('pending');
    expect(freePieceStayAheadProgress(g)).toBe('Win material when the chance comes');
    expect(freePieceStayAheadProgress(game(`${WHITE_PREFIX} fxg4`, 'w', WHITE_PLANT))).toBe('Ahead by 3 — keep it');
  });

  it('plies before the card went live are never judged', () => {
    // The same ignored plant, but the card went live after it: nothing to judge.
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} Nc3`, 'w', WHITE_PLANT, { startPly: 17 })).state).toBe('pending');
  });

  it('a forgiven missed capture is walked past; taking the piece later still counts', () => {
    const g = game(`${WHITE_PREFIX} Nc3 h6 fxg4`, 'w', WHITE_PLANT, { forgiven: [16] });
    expect(checkFreePieceStayAhead(g).state).toBe('pending');
    expect(freePieceStayAheadProgress(g)).toBe('Ahead by 3 — keep it');
  });

  it('a forgiven give-back is walked past', () => {
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} fxg4 d6 Nc3 Bd7 Na4`, 'w', WHITE_PLANT, { forgiven: [20] })).state).toBe('pending');
  });

  it('an ending without the lead closes the card incomplete', () => {
    // The Black mirror, but the plant never stood (no context): the ending
    // arrives and the phase is over.
    const line = `${BLACK_PREFIX} Nxd3 Ke2 Nc5 Nc3 Bd6 Nf3 Be6 Nb5 Ke7 Nxd6 Kxd6 Rd1+ Ke7 Rd2 Rd8 Rxd8 Kxd8 Nd4 Bd7 Nb3 Nxb3 axb3 a6`;
    expect(checkFreePieceStayAhead(game(line, 'b', null))).toEqual({ state: 'incomplete', ply: 35 });
  });

  it('a second give-back shows the first engine candidate that keeps the lead', () => {
    const before = fenOf(sans(`${WHITE_PREFIX} fxg4 d6 Nc3 Bd7`));
    expect(freePieceStayAheadShowMove(before, 'w', ['c3a4', 'e1e2'])).toEqual({ from: 'e1', to: 'e2' });
    // With no read, still a move that keeps it.
    const shown = freePieceStayAheadShowMove(before, 'w', []);
    expect(shown).not.toBeNull();
    expect(shown).not.toEqual({ from: 'c3', to: 'a4' });
  });
});
