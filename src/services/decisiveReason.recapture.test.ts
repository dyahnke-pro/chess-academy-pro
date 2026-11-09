import { describe, it, expect } from 'vitest';
import { decisiveReason } from './decisiveReason';
import type { AnalysisLine } from '../types';

// Prod walk 2026-10-18: "Their Nxd4 takes back — anything else, like Bd2,
// loses material" was spoken "their knight takes d4 takes back" — the capture
// and the verb collided. The seat is the subject; the capture is the object.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4'; // 1.e4 e5 2.Nf3 Nc6 3.d4 exd4
const lines: AnalysisLine[] = [
  { rank: 1, evaluation: 30, moves: ['f3d4', 'g8f6', 'b1c3'], mate: null },
  { rank: 2, evaluation: -90, moves: ['f1c4', 'g8f6', 'e1g1', 'f8c5'], mate: null },
];
const reads = { before: lines, after: lines, passBefore: [], passAfter: [] };

describe('a forced recapture, said with the seat as subject', () => {
  it('the student: "You take back with Nxd4"', () => {
    const r = decisiveReason({ namesPreparedMove: true, fenBefore: FEN, san: 'Nxd4', reads, seat: 'student', prevCapture: { square: 'd4', capturedValue: 1, net: 1 } });
    expect(r?.text ?? '').toMatch(/^You take back with Nxd4 — anything else, like Bc4/);
    expect(r?.text ?? '').not.toMatch(/Nxd4 takes back/);
  });
  it('the opponent: "They take back with Nxd4", never "Their Nxd4 takes back"', () => {
    const r = decisiveReason({ namesPreparedMove: true, fenBefore: FEN, san: 'Nxd4', reads, seat: 'opponent', prevCapture: { square: 'd4', capturedValue: 1, net: 1 } });
    expect(r?.text ?? '').toMatch(/^They take back with Nxd4/);
    expect(r?.text ?? '').not.toMatch(/Their Nxd4 takes back/);
  });
});

// Learn replay of his Four Knights (i9lgxqlkUgQ), 2026-11-08: after 15.Bxe5
// the coach said "They play dxe5 — they win a bishop" — the bishop they took
// back was the one Bxe5 had just taken. Stockfish d14: …dxe5 −4.89, …f5 −6.64
// — a gap too small to carry the bishop, so the take-back sentence was not
// trusted and the count from the board after Bxe5 called the recapture a win.
describe('a recapture is never a win', () => {
  const FOUR = 'r1b2rk1/ppp2pp1/3p3p/4B3/4P1q1/2NB4/PPPQ1PP1/R4RK1 b - - 0 15';
  const before: AnalysisLine[] = [
    { rank: 1, evaluation: 489, moves: ['d6e5', 'c3d5', 'c7c6', 'd5e7', 'g8h8', 'e7c8', 'f8c8', 'd2e3', 'g4g5'], mate: null },
    { rank: 2, evaluation: 664, moves: ['f7f5', 'f2f3', 'g4h5', 'd3c4', 'g8h7', 'e5h2', 'f5f4', 'f1f2'], mate: null },
  ];
  const after: AnalysisLine[] = [
    { rank: 1, evaluation: 475, moves: ['d2e3', 'g4g6', 'a2a4', 'f7f5', 'e4f5', 'c8f5', 'c3e4', 'f5e4'], mate: null },
    { rank: 2, evaluation: 460, moves: ['c3d5', 'c8e6', 'f2f3', 'g4h4', 'd5c7', 'a8c8', 'c7e6', 'f7e6'], mate: null },
  ];
  it('their dxe5 taking back the bishop is not "they win a bishop"', () => {
    const r = decisiveReason({ namesPreparedMove: true, fenBefore: FOUR, san: 'dxe5', reads: { before, after, passBefore: [], passAfter: [] }, seat: 'opponent', prevCapture: { square: 'e5', capturedValue: 3, net: 3 } });
    expect(r?.text ?? '').not.toMatch(/win a bishop/);
  });
});

