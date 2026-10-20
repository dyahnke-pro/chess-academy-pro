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
    const r = decisiveReason({ namesPreparedMove: true, fenBefore: FEN, san: 'Nxd4', reads, seat: 'student', opponentLastSan: 'exd4' });
    expect(r?.text ?? '').toMatch(/^You take back with Nxd4 — anything else, like Bc4/);
    expect(r?.text ?? '').not.toMatch(/Nxd4 takes back/);
  });
  it('the opponent: "They take back with Nxd4", never "Their Nxd4 takes back"', () => {
    const r = decisiveReason({ namesPreparedMove: true, fenBefore: FEN, san: 'Nxd4', reads, seat: 'opponent', opponentLastSan: 'exd4' });
    expect(r?.text ?? '').toMatch(/^They take back with Nxd4/);
    expect(r?.text ?? '').not.toMatch(/Their Nxd4 takes back/);
  });
});
