import { describe, it, expect } from 'vitest';
import { practicalChance, practicalChanceLine, movesToWin } from './practicalChance';
import { readBoardAll } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import type { AnalysisLine } from '../types';
import { writerFor } from './writerRegister';

// Danya, "Never Resign Prematurely": Deep Blue–Kasparov 1997, game 2. Kasparov
// resigned here, a pawn worse by the engine (Black −1.12), when 45…Qe3 holds:
// after it Stockfish (depth 16, MultiPV 3) keeps White's edge only with Qxd6.
const KASPAROV = '1r6/5kp1/RqQb1p1p/1p1PpP2/1Pp1B3/2P4P/6P1/5K2 b - - 0 45';
const l = (evaluation: number, moves: string, rank: number): AnalysisLine => ({ rank, evaluation, mate: null, moves: moves.split(' ') });
const AFTER_QE3: AnalysisLine[] = [
  l(100, 'c6d6 b8e8 d6c7 e8e7 c7c6 e3e4 d5d6 e4b1 f1f2 b1c2 f2g1 c2c1 g1h2 c1f4 g2g3 f4d2 c6g2', 1),
  l(0, 'c6d7 f7g8 d7d6 b8f8 d6e6 g8h7 e4f3 e3c1 f1f2 c1d2 f2g1 d2c1 g1h2 c1f4 h2h1 f4c1', 2),
  l(0, 'e4f3 e3c1 f1f2 c1d2 f3e2 d2f4 e2f3 f4d2', 3),
];

describe('practicalChance: worse, so make them find it', () => {
  it('45…Qe3 leaves White one reply that keeps the edge — Qxd6 — and every other lets Black back to level', () => {
    const p = practicalChance(KASPAROV, 'Qe3', { moverCp: -112, costCp: 0, after: AFTER_QE3 });
    expect(p?.only?.san).toBe('Qxd6');
    const said = practicalChanceLine(p!, true, KASPAROV);
    expect(said).toMatch(/Only Qxd6 keeps their edge/);
    expect(said).not.toMatch(/Qe3/); // the student's own move is not named
  });
  it('from the other seat it names no reply: the one good answer is the student\'s to find', () => {
    const p = practicalChance(KASPAROV, 'Qe3', { moverCp: -112, costCp: 0, after: AFTER_QE3 })!;
    const said = practicalChanceLine(p, false, KASPAROV);
    expect(said).toMatch(/Only one reply keeps your edge/);
    expect(said).not.toMatch(/Qxd6|Qd6/);
  });
  it('says nothing when the mover is not worse, the move was costly, or there are too few lines to prove one reply', () => {
    expect(practicalChance(KASPAROV, 'Qe3', { moverCp: -40, costCp: 0, after: AFTER_QE3 })).toBeNull();
    expect(practicalChance(KASPAROV, 'Qe3', { moverCp: -112, costCp: 120, after: AFTER_QE3 })).toBeNull();
    expect(practicalChance(KASPAROV, 'Qe3', { moverCp: -112, costCp: null, after: AFTER_QE3 })).toBeNull();
    expect(practicalChance(KASPAROV, 'Qe3', { moverCp: -112, costCp: 0, after: AFTER_QE3.slice(0, 2) })).toBeNull();
  });
  it('no only-move when the second reply still keeps the edge (negative control)', () => {
    const held = [AFTER_QE3[0], { ...AFTER_QE3[1], evaluation: 90 }, { ...AFTER_QE3[2], evaluation: 80 }];
    expect(practicalChance(KASPAROV, 'Qe3', { moverCp: -112, costCp: 0, after: held })).toBeNull();
  });
});

describe('how deep the way through lies, read on the line itself', () => {
  it('a capture taken straight back is no win; a win that stays is counted on the move that makes it', () => {
    // 1.e4 d5 2.exd5 Qxd5: White's pawn grab is answered at once — nothing won.
    expect(movesToWin('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', ['e4d5', 'd8d5'])).toBeNull();
    // Scholar's mate: White's fourth move mates.
    expect(movesToWin('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'])).toBe(4);
  });
  it('a line that ends in the middle of an exchange counts nothing from its last capture', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6: the line stops before the retake.
    expect(movesToWin('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', ['a7a6', 'b5c6'])).toBeNull();
  });
});

describe('the wiring', () => {
  it('the registry and the one composer carry it, both seats', () => {
    const f = readBoardAll('practicalChance', { fenBefore: KASPAROV, san: 'Qe3', student: 'b', reads: { moverCp: -112, costCp: 0, after: AFTER_QE3 } })[0];
    expect(f?.computer).toBe('practicalChance');
    expect(f?.seat).toBe('student');
    const theirs = readBoardAll('practicalChance', { fenBefore: KASPAROV, san: 'Qe3', student: 'w', reads: { moverCp: -112, costCp: 0, after: AFTER_QE3 } })[0];
    expect(theirs?.seat).toBe('opponent');
    const facts = moveThoughtFacts({ moveReads: writerFor('review').moveReads, namesPlayedMove: true,
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: KASPAROV, san: 'Qe3', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 0,
      reads: { before: [l(112, 'b6e3 c6d6 b8e8', 1), l(372, 'b6c6 d5c6 b8c8', 2), l(514, 'b6a6 c6a6 f7e7', 3)], after: AFTER_QE3, passBefore: [], passAfter: [] },
    });
    expect(facts.some((x) => x.computer === 'practicalChance' && /Only Qxd6/.test(x.text))).toBe(true);
  }, 60_000);
});

describe('the worse side is worse on the board, not always behind on material', () => {
  it('no stem says "behind": Korchnoi\'s White is a pawn up and still worse (article board, 2026-11-18)', () => {
    const p = practicalChance(KASPAROV, 'Qe3', { moverCp: -112, costCp: 0, after: AFTER_QE3 });
    expect(p).not.toBeNull();
    for (let k = 0; k < 40; k += 1) {
      const fen = KASPAROV.replace(/ 45$/, ` ${45 + k}`);
      expect(practicalChanceLine(p!, true, fen)).not.toMatch(/\bBehind\b/);
      expect(practicalChanceLine(p!, false, fen)).not.toMatch(/\bBehind\b/);
    }
  });
});
