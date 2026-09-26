// A square left unguarded is a cost only if THEY use it (re-walk 1380,
// 2026-09-25): "that took your last defender off d4 / h4 / f5" spoke on six
// flagged moves because the detector asked only whether a piece COULD land
// there. The engine's reply line says whether one WILL.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { backwardLook } from './backwardLook';

// 10.Nf3 in the Philidor: the knight steps onto the d1–g4 diagonal.
const BEFORE = 'r1bq1rk1/pppnbppp/3p1n2/8/3NPP2/1BN5/PPP3PP/R1BQ1RK1 w - - 1 10';
const after = (): string => { const c = new Chess(BEFORE); c.move('Nf3'); return c.fen(); };
const look = (replyPvUci: string[]) => backwardLook({
  fenBefore: BEFORE, fenAfter: after(), playedSan: 'Nf3', bestSan: 'Qe1',
  bestPvUci: ['d1e1'], replyPvUci, cpLoss: 80, moverEvalAfterCp: 40, studentColor: 'white',
} as never);

describe('the defender-left cost needs their reply to use the square', () => {
  it('speaks when their reply goes to g4', () => {
    expect(look(['d7c5', 'd1e1', 'c8g4'])?.line ?? '').toMatch(/off from g4/);
  });
  it('stays quiet about g4 when their reply never goes there', () => {
    expect(look(['d7c5', 'd1e1', 'a7a6', 'a2a3', 'b7b5'])?.line ?? '').not.toMatch(/g4/);
  });
  it('stays quiet while still clearly winning — the cleaner move is the teaching (29.Qe2 at +7)', () => {
    const won = backwardLook({
      fenBefore: BEFORE, fenAfter: after(), playedSan: 'Nf3', bestSan: 'Qe1',
      bestPvUci: ['d1e1'], replyPvUci: ['d7c5', 'd1e1', 'c8g4'], cpLoss: 80, moverEvalAfterCp: 700, studentColor: 'white',
    } as never);
    expect(won?.line ?? '').not.toMatch(/g4/);
  });
});
