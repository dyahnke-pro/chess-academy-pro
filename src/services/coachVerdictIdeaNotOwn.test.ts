import { describe, expect, it } from 'vitest';
import { callInaccuracy } from './inaccuracyCall';

// Clean-pass walk 3, 2026-10-04, G3 (lichess mZ1GOTOw) 31.Nc4 — the OPPONENT's
// move: "a4 was their move, to swing pieces toward your king". The king read
// is the line's plan, not what a4 does; the student half already says "the
// idea is to" for a plan the move only serves.
const FEN = '3r4/p2r1pp1/1p1Nk2p/2p1P3/8/P7/1B5P/4RK2 w - - 2 31';
const LINE = ['a3a4', 'f7f6', 'e1e3', 'f6e5', 'd6c4', 'e5e4', 'f1e2', 'e6d5', 'c4e5', 'd7e7', 'e5g6', 'e7f7'];

describe('the opponent-side verdict keeps the idea/own split', () => {
  it('a4 does not "swing pieces" itself', () => {
    const call = callInaccuracy({
      fenBefore: FEN, playedSan: 'Nc4', bestSan: 'a4', bestLineUci: LINE,
      cpLoss: 140, side: 'coach', moverColor: 'white', moverEvalAfterCp: -120,
      replyLineUci: [], replySan: null, priorMove: null,
    });
    const dictated = callInaccuracy({
      fenBefore: FEN, playedSan: 'Nc4', bestSan: 'a4', bestLineUci: LINE,
      cpLoss: 140, side: 'coach', dictated: true, moverColor: 'white', moverEvalAfterCp: -120,
      replyLineUci: [], replySan: null, priorMove: null,
    });
    expect(dictated?.said ?? '').not.toMatch(/a4 was their move, to swing/);
    expect(call?.said ?? '').not.toMatch(/a4 was (?:the|their) move, to swing/);
    expect(call?.said ?? '').toMatch(/the idea is to swing pieces toward your king/);
  });
});
