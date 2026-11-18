import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { defenderJobs, defenderTradeBy, defenderTradeMade, keyDefenderPlan, keyDefenderLine } from './keyDefender';
import { readBoardAll } from './boardComputers';
import { assemblePositionAssessment } from './groundedAnswer';
import type { AnalysisLine } from '../types';

// Danya's boards ("Turn Off the Autopilot", "Never Resign Prematurely"), with
// Stockfish's own lines at depth 16 (MultiPV 3, White's view).
const AUTOPILOT = '1q3r1k/3nrp1p/3N4/p1pPP3/Pp3Q2/1P1b4/6BP/2R1R2K w - - 0 30';
const AUTOPILOT_BEST: AnalysisLine = { rank: 1, evaluation: 302, mate: null, moves: ['g2h3', 'b8a8', 'f4f3', 'd3g6', 'h3d7', 'e7d7', 'f3f6', 'h8g8', 'c1c5', 'a8d8', 'f6d8', 'f8d8', 'd6c8', 'g6f5', 'c8b6'] };
const AUTOPILOT_AFTER: AnalysisLine = { rank: 1, evaluation: 301, mate: null, moves: ['e7e5', 'd6f7', 'h8g7', 'e1e5', 'd7e5', 'f4e5', 'b8e5', 'f7e5', 'd3e4', 'h3g2'] };
const RESIGN = '2kr4/ppp3Pp/4RP1B/2r5/5P2/8/PP1p3P/3K4 w - - 0 30';
const RESIGN_BEST: AnalysisLine = { rank: 1, evaluation: 423, mate: null, moves: ['e6d6', 'd8d6', 'g7g8q', 'c8d7', 'g8h7', 'd7c6', 'h7e4', 'c6b6', 'e4e3', 'b6c6'] };
const RESIGN_AFTER: AnalysisLine = { rank: 1, evaluation: 477, mate: null, moves: ['d8d6', 'g7g8q', 'd6d8', 'g8d8', 'c8d8', 'f6f7', 'c5f5', 'f7f8r', 'f5f8', 'h6f8'] };

describe('keyDefender: the piece doing a job alone', () => {
  it('the d7 knight is the only guard of the c5 pawn, and c5 falls once it and the trading bishop are gone', () => {
    const c = new Chess(AUTOPILOT);
    expect(c.attackers('c5', 'b')).toEqual(['d7']);
    const jobs = defenderJobs(AUTOPILOT, 'd7', 'g2');
    expect(jobs).toContainEqual({ kind: 'man', square: 'c5', piece: 'p' });
  });
  it('the d8 rook stops the g7 pawn (it alone covers g8) and guards the d2 pawn', () => {
    const c = new Chess(RESIGN);
    expect(c.attackers('g8', 'b')).toEqual(['d8']);
    const jobs = defenderJobs(RESIGN, 'd8', 'e6');
    expect(jobs.some((j) => j.kind === 'passer' && j.pawn === 'g7')).toBe(true);
    expect(jobs.some((j) => j.kind === 'man' && j.square === 'd2')).toBe(true);
  });
});

describe('the trade, with the engine\'s word', () => {
  it('Bh3 puts the bishop-for-knight trade on the board (Bxd7 Rxd7 is even) and the engine has White three pawns up', () => {
    const t = defenderTradeMade(AUTOPILOT, 'Bh3', 0, AUTOPILOT_AFTER);
    expect(t?.how).toBe('offers');
    expect(t?.defender.square).toBe('d7');
    const line = keyDefenderLine(t!, true, false, AUTOPILOT);
    expect(line).toMatch(/knight on d7/);
    expect(line).toMatch(/pawn on c5 falls/);
    expect(line).not.toMatch(/Bh3/); // the student's own move is not named
    // The other seat: the same trade aimed at the student's knight.
    expect(keyDefenderLine(t!, false, false, AUTOPILOT)).toMatch(/[Yy]our knight on d7/);
  });
  it('Rd6 offers the rook trade: the d8 rook is what stops the g-pawn', () => {
    const t = defenderTradeMade(RESIGN, 'Rd6', 0, RESIGN_AFTER);
    expect(t?.defender.square).toBe('d8');
    expect(keyDefenderLine(t!, true, false, RESIGN)).toMatch(/passed pawns? on g7/);
  });
  it('says nothing when the engine does not agree: a costly move, or a trader not half a pawn up', () => {
    expect(defenderTradeMade(AUTOPILOT, 'Bh3', 120, AUTOPILOT_AFTER)).toBeNull();
    expect(defenderTradeMade(AUTOPILOT, 'Bh3', 0, { ...AUTOPILOT_AFTER, evaluation: 20 })).toBeNull();
    expect(defenderTradeMade(AUTOPILOT, 'Bh3', null, AUTOPILOT_AFTER)).toBeNull();
    expect(defenderTradeMade(AUTOPILOT, 'Bh3', 0, null)).toBeNull();
  });
  it('the Ruy Lopez Bb5: the c6 knight guards e5, but the engine keeps White under half a pawn, so no "trade helps you"', () => {
    const ruy = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    expect(defenderTradeBy(ruy, 'Bb5')?.defender.square).toBe('c6');
    expect(defenderTradeMade(ruy, 'Bb5', 0, { rank: 1, evaluation: 30, mate: null, moves: ['a7a6'] })).toBeNull();
  });
  it('a trade of a piece doing no job alone is not a key defender (negative control)', () => {
    // 1.e4 e5 2.Nf3 Nf6 3.Nc3 Bb4 — Nd5 offers nothing; the quiet Bd3 attacks nothing.
    const fen = 'rnbqk2r/pppp1ppp/5n2/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';
    expect(defenderTradeBy(fen, 'Bd3')).toBeNull();
  });
});

describe('the standing read and the wiring', () => {
  it('the engine\'s best line on the autopilot board trades off the d7 knight', () => {
    const p = keyDefenderPlan(AUTOPILOT, AUTOPILOT_BEST);
    expect(p?.defender.square).toBe('d7');
    expect(keyDefenderLine(p!, true, true, AUTOPILOT)).toMatch(/The plan is to trade it off/);
  });
  it('the engine\'s best line on the resign board offers the rook trade at once', () => {
    expect(keyDefenderPlan(RESIGN, RESIGN_BEST)?.defender.square).toBe('d8');
  });
  it('the plan is judged on THIS board: a defender that moves before the trade is not named', () => {
    // Danya's back-rank board: in the line the d7 rook steps to f7 before Rc8
    // trades the d8 rook — what d8 guards now is gone by then.
    const fen = '3r2k1/p2r1ppp/1pQ3n1/3P2q1/P3B3/6P1/5P1P/2R1R1K1 w - - 0 29';
    const best: AnalysisLine = { rank: 1, evaluation: 300, mate: null, moves: ['e4g6', 'f7g6', 'c6e6', 'd7f7', 'c1c8'] };
    expect(keyDefenderPlan(fen, best)).toBeNull();
  });
  it('the registry, the move thought and the position read all carry it', () => {
    const f = readBoardAll('keyDefender', { fenBefore: AUTOPILOT, san: 'Bh3', student: 'w', costCp: 0, after: AUTOPILOT_AFTER })[0];
    expect(f?.computer).toBe('defenderTradeMade');
    expect(f?.seat).toBe('student');
    const read = assemblePositionAssessment({ evalCp: 302, mateIn: null, studentColor: 'white', fen: AUTOPILOT, bestUci: 'g2h3', line: AUTOPILOT_BEST.moves, tempting: null });
    expect(read?.facts).toMatch(/knight on d7/);
  }, 30_000);
});
