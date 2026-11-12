// FALSE FACTS, CLASS C — wrong piece, wrong geometry, overstated sizes (Watch
// course writers, 2026-11-12). Each claim was spoken by the app's composer on
// these exact boards and is false there; each is fixed at the computer that
// made it. Every test fails on the code before the fix.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFundamentals } from './moveFundamentals';
import { castleByHandMove } from './kingWalk';
import { computePlyFacts } from './pvPlayback';
import { NO_PREV_CAPTURE } from './captureRun';
import { detectTacticType } from './missedTacticService';
import { inBetweenMove } from './inBetweenMove';
import { moveOrder } from './moveOrder';
import type { AnalysisLine } from '../types';

const plyFacts = (fen: string, san: string): ReturnType<typeof computePlyFacts> => {
  const c = new Chess(fen);
  const m = c.move(san);
  return computePlyFacts(fen, c.fen(), { captured: m.captured, san: m.san, color: m.color, promotion: m.promotion }, NO_PREV_CAPTURE);
};

describe('a pawn guards the squares it covers, never the enemy piece standing on one', () => {
  // Petrov 3.Nxe5 d6: "You play d6 — it supports the center, guarding e5" —
  // e5 is their knight; the pawn hits it.
  const PETROV = 'rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3';
  it('…d6 hits the knight on e5 and guards nothing there', () => {
    const fs = computeMoveFundamentals(PETROV, 'd6', 'black');
    expect(fs.some((f) => f.id === 'center' && /guarding e5/.test(f.led))).toBe(false);
    expect(fs.some((f) => /kicks their knight off e5/.test(f.led))).toBe(true);
  });
  it('NEGATIVE CONTROL: c3 in the French still guards d4 (an empty square)', () => {
    const fs = computeMoveFundamentals('rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', 'c3', 'white');
    expect(fs.some((f) => f.id === 'center' && /guarding d4/.test(f.led))).toBe(true);
  });
});

describe('castling by hand walks a king that is on the kingside wing already', () => {
  // Two Knights, Ulvestad, …Bb7 with the king on d8: "the king to f8, the
  // pawn to g6, the king to g7" — the wrong wing, and d8–f8 is no one step.
  it('a king on d8 gets no kingside walk', () => {
    expect(castleByHandMove('r1bk1b1r/p1p2ppp/8/1B1np1q1/3P4/5Q2/PP1P1PPP/RNB1K2R b KQ - 2 10', 'Bb7', 'your')).toBeNull();
  });
  it('NEGATIVE CONTROL: the Scotch Gambit king on f8 still gets its walk', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4 Bc5 5.c3 dxc3 6.Bxf7+ Kxf7 7.Qd5+ Kf8 8.Qxc5+ d6 9.Qxc3, …Nf6
    const c = new Chess();
    for (const s of 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 dxc3 Bxf7+ Kxf7 Qd5+ Kf8 Qxc5+ d6 Qxc3'.split(' ')) c.move(s);
    expect(castleByHandMove(c.fen(), 'Nf6', 'your')?.kind).toBe('plan');
  });
});

describe('a discovered attack is landed by the move that unveils it, never by one that sets one up', () => {
  it('Fried Liver 5…Na5: dxc6 puts a pawn in front of the b5 bishop — it sets up a discovery, lands none', () => {
    expect(plyFacts('r1bqkb1r/pp3ppp/2p2n2/nB1Pp1N1/8/8/PPPP1PPP/RNBQK2R w KQkq - 0 7', 'dxc6').tacticLanded).not.toBe('discovery');
  });
  it('Cochrane …d5: Nxd5 steps onto its own bishop\'s diagonal — no discovered attack', () => {
    const fen = 'rnbqr3/ppp1bkpp/5n2/3p4/2BPP3/2N5/PPP2PPP/R1BQK2R w KQ - 0 8';
    expect(plyFacts(fen, 'Nxd5').tacticLanded).not.toBe('discovery');
    expect(detectTacticType(fen, 'c3d5', ['c3d5'])).not.toBe('discovered_attack');
    // …and the branch's own engine line (depth 16) names none either.
    expect(detectTacticType(fen, 'c3d5', ['c3d5', 'c8e6', 'd5f6', 'e7f6', 'c4e6', 'e8e6', 'e4e5', 'd8d5'])).not.toBe('discovered_attack');
  });
  it('NEGATIVE CONTROL: Ulvestad …Nxd5 leaves f6 and the d8 queen hits the g5 knight — a discovery that lands', () => {
    expect(plyFacts('r1bqkb1r/p1p2ppp/5n2/1p1Pp1N1/3n4/2P5/PP1P1PPP/RNBQKB1R b KQkq - 0 7', 'Nxd5').tacticLanded).toBe('discovery');
  });
});

describe('"taking can wait" only when the engine does not prefer taking now', () => {
  // King's Gambit main, 9.Nc3: "Taking on f4 can wait — the threat comes
  // first", where Bxf4 at once was 0.49 better now and 0.53 one move deeper.
  const FEN = 'rnb2rk1/ppp1bppp/8/3q4/3P1p2/5N2/PPP3PP/RNBQ1RK1 w - - 0 9';
  const PLAYED = ['b1c3', 'd5f5', 'f3e5', 'g7g5', 'c3d5', 'e7d6', 'd5f4'];
  const reads = [
    { evaluation: 7, mate: null, moves: ['c1f4', 'c7c6', 'b1c3', 'd5d8', 'd4d5', 'c8f5'] },
    { evaluation: -42, mate: null, moves: PLAYED },
  ];
  it('Nc3 is not an in-between move when Bxf4 now reads better', () => {
    expect(inBetweenMove(FEN, PLAYED, { reads })).toBeNull();
  });
  it('NEGATIVE CONTROL: the same line, with Nc3 the better read, is one', () => {
    const flipped = [{ ...reads[0], evaluation: -42 }, { ...reads[1], evaluation: 7 }];
    expect(inBetweenMove(FEN, PLAYED, { reads: flipped })?.captureSquare).toBe('f4');
  });
  it('a move the reads do not cover makes no claim', () => {
    expect(inBetweenMove(FEN, PLAYED, { reads: [] })).toBeNull();
  });
});

describe('the move order names the square the material goes on', () => {
  // Dutch main, …d4: "…Ng4 at once would have met Nxd7, and it would have
  // cost material on d7" — Nxd7 Qxd7 is a bishop for a knight; the pawn the
  // line wins falls on d5.
  const FEN = 'r3qrk1/p2bp1bp/2p1nnp1/2PpNp2/1P6/P1N3P1/1B2PPBP/1R1Q1RK1 b - - 1 15';
  const line = (evaluation: number, moves: string[]): AnalysisLine => ({ rank: 1, evaluation, moves, mate: null });
  const xLine = line(72, ['c3a4', 'a8d8', 'd1b3', 'f6d5', 'e5f3', 'f5f4']);
  const yFirst = line(235, ['e5d7', 'e8d7', 'b4b5', 'a8b8', 'b5c6', 'd7c6', 'g2d5', 'c6c8', 'c5c6', 'g8h8', 'b2a1', 'e6d4', 'd1a4', 'f5f4', 'b1b8']);
  it('names no square for a cost that does not land there', () => {
    const mo = moveOrder(FEN, 'd4', 'f6g4', xLine, yFirst, 'student', true);
    expect(mo).not.toBeNull();
    expect(mo!.text).not.toMatch(/on d7/);
    expect(mo!.text).toMatch(/would have cost material/);
  });
});
