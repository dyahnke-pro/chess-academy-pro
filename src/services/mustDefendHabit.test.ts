import { describe, it, expect } from 'vitest';
import { computeMustDefend } from './threatOut';
import { liveMethodBeat } from './methodBeat';

// Learn tape 2026-10-07: "the habit that finds it next time" closed 0 of 49
// moves while the student walked past a pawn threat three times. The live habit
// is gated on the must-defend net (positionFacts), and the net never saw a
// guarded piece — so the routine that would have saved the bishop was never
// taught. Composed here exactly as positionFacts composes it.
describe('a pawn hitting a guarded piece earns "their threat first"', () => {
  const FEN = 'rn2kb1r/ppp1pppp/5n2/q7/3P2b1/2N2N1P/PPP2PP1/R1BQKB1R b KQkq - 0 6';
  it('the habit fires, naming the piece the pawn hits', () => {
    const md = computeMustDefend(FEN, 'b');
    const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
    const beat = liveMethodBeat({
      bestSan: 'Bxf3',
      threatStanding: md.net > 0,
      threatTarget: md.net < 3 && md.pieces[0] ? `your ${PNAME[md.pieces[0].piece]} on ${md.pieces[0].square}` : null,
      isStudentMove: true,
      realChoice: false,
      tier: 'swing',
      looseTarget: null,
    }, 0);
    expect(beat?.text).toMatch(/your bishop on g4/);
  });
});
