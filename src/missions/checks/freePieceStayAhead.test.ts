import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import type { MissionGame, PlantedShot } from '../missionCard';
import {
  checkFreePieceStayAhead,
  freePieceStayAheadProgress,
  freePieceStayAheadShowMove,
  freePieceFoundAt,
} from './freePieceStayAhead';

const sans = (m: string): string[] => m.split(/\s+/).filter(Boolean);
const fenOf = (moves: string[]): string => { const b = new Chess(); for (const s of moves) b.move(s); return b.fen(); };

/** White student. The coach (Black) slips …Qe7 at ply 7 — nothing hangs, but
 *  the queen no longer guards c7: Nxc7+ forks the king and the rook on a8, the
 *  only answer is …Kd8, and Nxa8 wins the rook (the earned piece, §6a). */
const WHITE_PREFIX = 'e4 e5 Nf3 Nc6 Nc3 Nf6 Nb5 Qe7';
const WHITE_PLANT = { ply: 7, square: 'a8', line: ['b5c7', 'e8d8', 'c7a8'], depth: 1, alts: [] };
const WHITE_WON = `${WHITE_PREFIX} Nxc7+ Kd8 Nxa8`;
/** Black student. The coach (White) slips Qe2 at ply 4: c2 loses its guard —
 *  …Nxc2+ forks the king and the rook on a1, Kd1 is forced, …Nxa1. */
const BLACK_PREFIX = 'e4 Nc6 Nf3 Nb4 Qe2';
const BLACK_PLANT = { ply: 4, square: 'a1', line: ['b4c2', 'e1d1', 'c2a1'], depth: 1, alts: [] };
/** A shuffle that never repeats a position three times: Black's knight on a
 *  4-square cycle, White's bishop on a 5-square cycle (found and checked with
 *  chess.js — no check, no capture, no threefold before White's 40th move). */
const SHUFFLE = 'Ng8 Ba6 Nh6 Bb5 Ng4 Bc4 Nf6 Be2 Ng8 Bf1 Nh6 Ba6 Ng4 Bb5 Nf6 Bc4 Ng8 Be2 Nh6 Bf1 Ng4 Ba6 Nf6 Bb5 Ng8 Bc4 Nh6 Be2 Ng4 Bf1 Nf6 Ba6 Ng8 Bb5 Nh6 Bc4 Ng4 Be2 Nf6 Bf1 Ng8 Ba6 Nh6 Bb5 Ng4 Bc4 Nf6 Be2 Ng8 Bf1 Nh6 Ba6 Ng4 Bb5 Nf6 Bc4 Ng8 Be2 Nh6 Bf1 Ng4 Ba6 Nf6 Bb5 Ng8 Bc4 Nh6 Be2';
/** A curated ending start (Black, the coach, to move): …Ke8 walks into Nc7+,
 *  …Kd7, Nxa8 — the capture itself reaches the ending. */
const ENDING_START = 'r2k4/8/8/3N4/8/8/8/4K3 b - - 0 1';

type Planted = PlantedShot & { ply: number };

function game(moves: string, studentColor: 'w' | 'b', planted: Planted | null, opts: { startPly?: number; forgiven?: number[]; startFen?: string } = {}): MissionGame {
  return {
    sans: sans(moves),
    studentColor,
    forgiven: new Set(opts.forgiven ?? []),
    startPly: opts.startPly ?? 4,
    ...(opts.startFen ? { startFen: opts.startFen } : {}),
    context: planted ? { planted } : {},
  };
}

describe('every fixture is a legal game', () => {
  it.each([
    WHITE_WON,
    `${WHITE_WON} b6 d3 Bb7 h3 Bxa8 Bf4`,
    `${WHITE_WON} ${SHUFFLE}`,
    `${BLACK_PREFIX} Nxc2+ Kd1 Nxa1`,
  ])('%s', (line) => {
    const b = new Chess();
    for (const s of sans(line)) expect(() => b.move(s)).not.toThrow();
  });
  it('the slips leave nothing hanging, and the fork is the only answer', () => {
    expect(new Chess(fenOf(sans(WHITE_PREFIX))).moves().filter((m) => m.includes('x'))).toEqual(['Nxa7', 'Nxc7+', 'Nxe5']);
    expect(new Chess(fenOf(sans(`${WHITE_PREFIX} Nxc7+`))).moves()).toEqual(['Kd8']);
    expect(new Chess(fenOf(sans(`${BLACK_PREFIX} Nxc2+`))).moves()).toEqual(['Kd1']);
  });
});

describe('Tactically win an extra piece, maintain the advantage to the end — the check (the earned piece, §6a)', () => {
  it('1. the line played: the fork, the forced king move, the capture — the piece is won', () => {
    for (let n = 9; n <= sans(WHITE_WON).length; n++) {
      expect(checkFreePieceStayAhead(game(sans(WHITE_WON).slice(0, n).join(' '), 'w', WHITE_PLANT)).state).toBe('pending');
    }
    expect(freePieceStayAheadProgress(game(WHITE_WON, 'w', WHITE_PLANT))).toBe('Ahead by 6 — maintain the advantage to the end');
  });

  it('2. off the line on the key move → MISS missed-free-piece, showing the fork', () => {
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} d3`, 'w', WHITE_PLANT))).toEqual({
      state: 'miss', ply: 8, reason: 'missed-free-piece', showMove: { from: 'b5', to: 'c7' },
    });
  });

  it('3. off the line after the fork, before the piece falls → MISS, showing the capture', () => {
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} Nxc7+ Kd8 Nd5`, 'w', WHITE_PLANT))).toEqual({
      state: 'miss', ply: 10, reason: 'missed-free-piece', showMove: { from: 'c7', to: 'a8' },
    });
  });

  it('4. the piece won, then a bishop hung with the lead at 3 → MISS gave-back-material', () => {
    // …b6, …Bb7 and …Bxa8 win the trapped knight back (lead 3); Bf4 hangs to …exf4.
    expect(checkFreePieceStayAhead(game(`${WHITE_WON} b6 d3 Bb7 h3 Bxa8 Bf4`, 'w', WHITE_PLANT))).toEqual({
      state: 'miss', ply: 16, reason: 'gave-back-material',
    });
  });

  it('5. the 40th move with the lead held and no ending → PASS', () => {
    const line = `${WHITE_WON} ${SHUFFLE}`;
    expect(sans(line)).toHaveLength(79); // White's 40th move
    const end = new Chess();
    for (const m of sans(line)) end.move(m);
    expect(end.isGameOver()).toBe(false);
    expect(checkFreePieceStayAhead(game(line, 'w', WHITE_PLANT))).toEqual({ state: 'pass', ply: 78 });
  });

  it('6. a line whose own capture reaches the ending waits for the capture, then → PASS', () => {
    // From the curated start the fork itself is already an ending by material;
    // mid-line the card waits, and the capture holds the lead (+3).
    const planted = { ply: 0, square: 'a8', line: ['d5c7', 'e8d7', 'c7a8'], depth: 1, alts: [] };
    const g = (moves: string): MissionGame => game(moves, 'w', planted, { startPly: 0, startFen: ENDING_START });
    expect(checkFreePieceStayAhead(g('Ke8 Nc7+')).state).toBe('pending');
    expect(checkFreePieceStayAhead(g('Ke8 Nc7+ Kd7 Nxa8'))).toEqual({ state: 'pass', ply: 3 });
  });

  it('7. FAIL TWIN: a coach move that leaves a piece hanging is never the plant (the old hand-over)', () => {
    // …Ng4 hangs to f3xg4 outright: no line, no plant, and ignoring it is no miss.
    const handOver = 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Qf6 Qxf6 Nxf6 f3 Bc5 Bd3 Ng4';
    expect(legalSeeGainFor(fenOf(sans(handOver)), 'g4', 'w')).toBe(3);
    const plant = { ply: 15, square: 'g4', line: ['f3g4'], depth: 0, alts: [] };
    expect(checkFreePieceStayAhead(game(`${handOver} Nc3`, 'w', plant)).state).toBe('pending');
    expect(freePieceStayAheadProgress(game(`${handOver} fxg4`, 'w', plant))).toBe('Win an extra piece when the chance comes');
  });

  it('7b. a first move the engine rated as good as the line\'s is no miss — the student found a way in', () => {
    const withAlt = { ...WHITE_PLANT, alts: ['d2d4'] };
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} d4`, 'w', withAlt)).state).toBe('pending');
    // Only on the first move: past it, the line's own moves are the shot.
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} d4`, 'w', WHITE_PLANT)).state).toBe('miss');
  });

  it('8a. Black mirror of 1: the line played — the piece is won', () => {
    expect(checkFreePieceStayAhead(game(`${BLACK_PREFIX} Nxc2+ Kd1 Nxa1`, 'b', BLACK_PLANT, { startPly: 0 })).state).toBe('pending');
    expect(freePieceStayAheadProgress(game(`${BLACK_PREFIX} Nxc2+ Kd1 Nxa1`, 'b', BLACK_PLANT, { startPly: 0 }))).toBe('Ahead by 6 — maintain the advantage to the end');
  });

  it('8b. Black mirror of 2: off the line → MISS, showing the fork', () => {
    expect(checkFreePieceStayAhead(game(`${BLACK_PREFIX} e6`, 'b', BLACK_PLANT, { startPly: 0 }))).toEqual({
      state: 'miss', ply: 5, reason: 'missed-free-piece', showMove: { from: 'b4', to: 'c2' },
    });
  });
});

describe('the rest of the contract', () => {
  it('before any slip it is pending, and the banner never names the piece', () => {
    const g = game(WHITE_PREFIX, 'w', null);
    expect(checkFreePieceStayAhead(g).state).toBe('pending');
    expect(freePieceStayAheadProgress(g)).toBe('Win an extra piece when the chance comes');
    expect(freePieceStayAheadProgress(game(`${WHITE_PREFIX} Nxc7+`, 'w', WHITE_PLANT))).toBe('Win an extra piece when the chance comes');
  });

  it('plies before the card went live are never judged', () => {
    expect(checkFreePieceStayAhead(game(`${WHITE_PREFIX} d3`, 'w', WHITE_PLANT, { startPly: 9 })).state).toBe('pending');
  });

  it('a forgiven miss leaves the line; winning a piece later still counts', () => {
    // Played on from d3 (forgiven); …a6 and Nxc7+ later: the pawn only, no piece yet.
    const g = game(`${WHITE_PREFIX} d3 a6 Nxc7+ Kd8 Nxa8`, 'w', WHITE_PLANT, { forgiven: [8] });
    expect(checkFreePieceStayAhead(g).state).toBe('pending');
    expect(freePieceStayAheadProgress(g)).toBe('Ahead by 6 — maintain the advantage to the end');
  });

  it('a forgiven give-back is walked past', () => {
    expect(checkFreePieceStayAhead(game(`${WHITE_WON} b6 d3 Bb7 h3 Bxa8 Bf4`, 'w', WHITE_PLANT, { forgiven: [16] })).state).toBe('pending');
  });

  it('an ending without the lead closes the card incomplete', () => {
    // No slip stood (no context): the curated ending is reached on the first
    // student move and the phase is over.
    expect(checkFreePieceStayAhead(game('Ke8 Nc7+', 'w', null, { startPly: 0, startFen: ENDING_START }))).toEqual({ state: 'incomplete', ply: 1 });
  });

  it('a second give-back shows the first engine candidate that keeps the lead', () => {
    const before = fenOf(sans(`${WHITE_WON} b6 d3 Bb7 h3 Bxa8`));
    expect(freePieceStayAheadShowMove(before, 'w', ['c1f4', 'a2a3'])).toEqual({ from: 'a2', to: 'a3' });
    const shown = freePieceStayAheadShowMove(before, 'w', []);
    expect(shown).not.toBeNull();
    expect(shown).not.toEqual({ from: 'c1', to: 'f4' });
  });
});

describe('a slip that TRADES into the shot (David\'s game, 2026-10-21)', () => {
  // The coach (Black) to move: …Bxd6 trades bishops, Nxd6+ forks the king and
  // the bishop on b7. Measured from the board after the slip, the recapture
  // looked like "a bishop hanging" and the plant never stood.
  const DAVID = 'r2qk1nr/pb1nbppp/2pBp3/1p6/3PN3/5N2/PPP1BPPP/R2Q1RK1 b kq - 0 10';
  const PLANT: Planted = { ply: 0, square: 'b7', line: ['e4d6', 'e8f8', 'd6b7'], depth: 1, alts: [] };
  const g = (moves: string): MissionGame => game(moves, 'w', PLANT, { startPly: 0, startFen: DAVID });

  it('the recapture alone is not the piece won', () => {
    expect(freePieceStayAheadProgress(g('Bxd6 Nxd6+ Kf8'))).toBe('Win an extra piece when the chance comes');
    expect(checkFreePieceStayAhead(g('Bxd6 Nxd6+ Kf8')).state).toBe('pending');
  });

  it('the fork\'s capture is: a piece up on the board before the slip', () => {
    expect(freePieceStayAheadProgress(g('Bxd6 Nxd6+ Kf8 Nxb7'))).toBe('Ahead by 3 — maintain the advantage to the end');
  });

  it('the find is the capture\'s ply — not the recapture, not the fork', () => {
    expect(freePieceFoundAt(g('Bxd6 Nxd6+ Kf8'))).toBeNull();
    expect(freePieceFoundAt(g('Bxd6 Nxd6+ Kf8 Nxb7'))).toBe(3);
  });

  it('a move off the line (Qd3, no recapture) is the miss — it shows the fork', () => {
    const status = checkFreePieceStayAhead(g('Bxd6 Qd3'));
    expect(status).toMatchObject({ state: 'miss', reason: 'missed-free-piece', showMove: { from: 'e4', to: 'd6' } });
  });
});
