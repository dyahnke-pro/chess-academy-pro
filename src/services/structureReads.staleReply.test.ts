// A standing claim about the student's move is spoken once their reply is on
// the board — a reply that changed its squares has made it false (Smith-Morra
// replay 2026-10-19: "d4 and e4 stand side by side: together they cover c5,
// d5, e5 and f5", said after …cxd4 took the d4 pawn).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { studentMoveStructure, squaresTheReplyChanged } from './structureReads';

const fa = (moves: string): string => { const c = new Chess(); for (const m of moves.split(' ')) c.move(m); return c.fen(); };
const base = { san: 'd4', student: 'w' as const, cpLoss: 0, bestSan: 'd4', bestUci: ['d2d4'], namesBetterMove: false };

describe('a standing claim is not spoken once the reply changed its squares', () => {
  it('2.d4 cxd4: the phalanx is gone, so it is not said', () => {
    const reads = studentMoveStructure({ ...base, fenBefore: fa('e4 c5'), reply: 'cxd4' });
    expect(reads.some((r) => r.act === 'formation')).toBe(false);
  });
  it('a reply that leaves the squares alone keeps it (control)', () => {
    const reads = studentMoveStructure({ ...base, fenBefore: fa('e4 c5'), reply: 'Nc6' });
    expect(reads.find((r) => r.act === 'formation')?.text).toMatch(/d4 and e4 stand side by side/);
  });
  it('no reply yet keeps it (control)', () => {
    expect(studentMoveStructure({ ...base, fenBefore: fa('e4 c5'), reply: null }).some((r) => r.act === 'formation')).toBe(true);
  });
  it('the changed squares are exactly what the reply moved', () => {
    expect([...(squaresTheReplyChanged(fa('e4 c5'), 'd4', 'cxd4') ?? [])].sort()).toEqual(['c5', 'd4']);
    expect(squaresTheReplyChanged(fa('e4 c5'), 'd4', 'Ke7')).toBeNull();
    expect([...(squaresTheReplyChanged(fa('e4 e5 Nf3 Nc6 Bc4 Bc5'), 'd3', 'Nf6') ?? [])].sort()).toEqual(['f6', 'g8']);
  });
});
