// COUNTED WHEN THE TRADE ENDS (false facts, batch 3, class A — 2026-11-12).
// The writers of six Watch courses found structure and material claims read
// one move into an exchange. Each board below is the exact course board the
// claim was printed on; every test fails on the code that said it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveDifference } from './weighedMoves';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { moveAspects } from './reviewMoveBriefing';
import { pawnBreak } from './pawnBreak';
import { NO_FOLLOW, moverLineProof } from './exchangeLedger';
import { captureRunOfMoves, NO_PREV_CAPTURE, lastMoveOfHistory } from './captureRun';
import { buildDeliberation, moveWhy } from './deliberation';
import type { StockfishAnalysis } from '../types';

function boardAt(line: string, n: number): string {
  const c = new Chess();
  for (const m of line.split(' ').slice(0, n)) c.move(m);
  return c.fen();
}
const uci = (fen: string, sans: readonly string[]): string[] => {
  const c = new Chess(fen);
  return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
};

// Scotch, Göring Gambit: …Bxc3 bxc3 Nf6 e5 Nxe5 Nxe5 dxe5.
const GORING = 'e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Bb4 Bc4 d6 O-O Bxc3 bxc3 Nf6 e5 Nxe5 Nxe5 dxe5';

describe('a take-back that comes out ahead wins the run\'s net, never the piece it takes', () => {
  // …Nxe5 took a pawn, Nxe5 took the knight back, …dxe5 takes the knight:
  // the knight is the other half of a trade, and the pawn is what Black is up.
  const fen = boardAt(GORING, 19);
  const prev = captureRunOfMoves(null, GORING.split(' ').slice(0, 19));
  it('the board: Black nets a pawn on e5, and nothing can take back', () => {
    expect(prev).toEqual({ square: 'e5', capturedValue: 3, net: 2 });
  });
  it('moveAspects: "completes the trade and wins a pawn", never "wins a knight"', () => {
    const verbs = moveAspects({ fenBefore: fen, san: 'dxe5', prev: prev!, moverIsStudent: false, follow: NO_FOLLOW })?.aspects.map((a) => a.verb) ?? [];
    expect(verbs.join(' | ')).not.toMatch(/wins a knight/);
    expect(verbs).toContain('completes the trade and wins a pawn');
  });
  it('the move\'s reason says the same', () => {
    const why = moveWhy(fen, 'dxe5', 'b', prev);
    expect(why ?? '').not.toMatch(/wins a knight/);
    expect(why).toBe('completes the trade and wins a pawn');
  });
  it('twin: a run whose net is one piece keeps "wins a queen for a rook"', () => {
    // Kxf2 after …Qxf2+ took a rook (record game 1, captureRun.test).
    const before = '5k2/p4p2/2P2p1p/1p6/5b2/1Q1r3P/1P1q1RKP/8 b - - 0 38';
    const after = '5k2/p4p2/2P2p1p/1p6/5b2/1Q1r3P/1P3qKP/8 w - - 0 39';
    const run = captureRunOfMoves(before, ['Qxf2+']);
    const verbs = moveAspects({ fenBefore: after, san: 'Kxf2', prev: run!, moverIsStudent: true, follow: NO_FOLLOW })?.aspects.map((a) => a.verb) ?? [];
    expect(verbs).toContain('wins a queen for a rook');
  });
});

describe('a line that opens by taking back is counted from before the capture it answers', () => {
  // After …Bxc3: "After bxc3, they play Nf6, you answer e5 and they play dxe5 —
  // you win a bishop for a pawn". bxc3 only takes back for the knight, and the
  // e-pawn is lost: the line wins nothing.
  const moves = GORING.split(' ');
  const fen = boardAt(GORING, 14);
  const prior = lastMoveOfHistory(moves.slice(0, 14), fen);
  const best = uci(fen, ['bxc3', 'Nf6', 'e5', 'dxe5', 'Ng5', 'O-O', 'Ba3']);
  it('the prior is …Bxc3 on the board before it', () => {
    expect(prior).toEqual({ fenBefore: boardAt(GORING, 13), san: 'Bxc3' });
  });
  it('moverLineProof proves no win from the take-back', () => {
    expect(moverLineProof(fen, best, 'w', null)?.short ?? '').toMatch(/win a bishop/);
    expect(moverLineProof(fen, best, 'w', prior)).toBeNull();
  });
  it('the weighing says no "you win a bishop for a pawn"', () => {
    const topLines = [
      { rank: 1, evaluation: 2, mate: null, moves: best },
      { rank: 2, evaluation: -67, mate: null, moves: uci(fen, ['Ng5', 'Ne5', 'Qb3', 'Qe7', 'Qxc3', 'Nxc4']) },
      { rank: 3, evaluation: -250, mate: null, moves: uci(fen, ['Qb3', 'Bf6', 'Bxf7+', 'Kf8', 'Re1', 'Nge7']) },
    ] as unknown as StockfishAnalysis['topLines'];
    const d = buildDeliberation({ analysis: { topLines }, fenBefore: fen, moverColor: 'w', excludeSan: 'bxc3', prevCapture: captureRunOfMoves(null, moves.slice(0, 14)), priorMove: prior });
    expect(d?.bestLine ?? '').not.toMatch(/win a bishop/);
    expect(d?.bestLineAfter ?? '').not.toMatch(/win a bishop/);
  });
  it('a history that does not end on the board gives no prior', () => {
    expect(lastMoveOfHistory(moves.slice(0, 13), fen)).toBeNull();
  });
});

describe('structure is read when the exchange is over (the boards the sheets printed)', () => {
  const DUTCH = 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Bd7 b4 c6 dxc6';
  const IZ = 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 Nc3 c6 Qc2 Qe8 Rb1 a5 a3 b5 cxb5';
  const E5 = 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5 dxe6';
  const PETROV = 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4 Be2 O-O';
  const THREE_KNIGHTS = 'e4 e5 Nf3 Nf6 Nc3 Nc6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5';
  const KGD = 'e4 e5 f4 Bc5 Nf3 d6 c3 Nf6 d4 exd4 cxd4 Bb6 Nc3 O-O e5 dxe5 fxe5';
  it('Dutch dxc6: no doubled pawns — …bxc6 takes back', () => {
    expect(moveDifference(boardAt(DUTCH, 20), 'Be3', 'dxc6', 'their', { a: null, b: null })?.text ?? '').not.toMatch(/doubled/);
  });
  it('Ilyin-Zhenevsky cxb5: no doubled b-pawns, no isolated a-pawn — …cxb5 takes back', () => {
    const fen = boardAt(IZ, 20);
    expect(moveDifference(fen, 'c5', 'cxb5', 'their', { a: null, b: null })?.text ?? '').not.toMatch(/doubled/);
    expect(buildReviewMoveTeachingFact(fen, 'cxb5', false)?.text ?? '').not.toMatch(/isolated/);
  });
  it('Leningrad e5 dxe6: no passed pawn, no doubled pawns — …Bxe6 takes it', () => {
    const fen = boardAt(E5, 16);
    const verbs = moveAspects({ fenBefore: fen, san: 'dxe6', prev: NO_PREV_CAPTURE, moverIsStudent: false, follow: NO_FOLLOW })?.aspects.map((a) => a.verb).join(' | ') ?? '';
    expect(verbs).not.toMatch(/passed pawn/);
    expect(moveDifference(fen, 'e4', 'dxe6', 'their', { a: null, b: null })?.text ?? '').not.toMatch(/doubled/);
  });
  it('Petrov …O-O: …dxc4 doubles no c-pawns — Bxc4 takes back', () => {
    expect(moveDifference(boardAt(PETROV, 17), 'O-O', 'dxc4', 'your', { a: null, b: null })?.text ?? '').not.toMatch(/doubled/);
  });
  it('Three Knights …d5: no "half-opens the d-file" — …cxd5 puts a pawn back on d5', () => {
    expect(pawnBreak(boardAt(THREE_KNIGHTS, 13), 'd5', 'your', 'd3')?.text ?? '').not.toMatch(/d-file/);
  });
  it('King\'s Gambit Declined fxe5: the f-file half-opens, and not toward the king on g8', () => {
    const t = buildReviewMoveTeachingFact(boardAt(KGD, 16), 'fxe5', true)?.text ?? '';
    expect(t).toMatch(/Half-opens the f-file/);
    expect(t).not.toMatch(/toward/);
  });
});
