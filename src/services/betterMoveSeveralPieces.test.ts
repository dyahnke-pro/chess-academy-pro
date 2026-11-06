// Learn walk 2026-11-06 (the muted concept-gameplay audit, the Scandinavian
// Lasker, student Black): "Knight takes d4 was imprecise. … Knight to b4 was
// the move — it would swing pieces toward their king." The king read is the
// line's plan — TWO pieces arriving (…Nb4 and …Ng4) — and the knight move is
// one step of it; its landing square was among the clause's squares, so the
// plan was said as what the one knight move does. A clause that is several
// pieces' work is never one move's own reason.
import { describe, it, expect } from 'vitest';
import { betterMoveReason, callInaccuracy } from './inaccuracyCall';
import { planFromUci } from './lookaheadPlan';
import { withOneSearch } from '../test/oneSearchScores';

// The board of the game, after 9.Be3 (…Qa5 Lasker, Black castled long).
const FEN = '2kr1b1r/ppp2ppp/2n1pn2/q7/3P2P1/2NQBN2/PPP2PP1/R3KB1R b KQ - 1 9';
// Stockfish 18, depth 16, MultiPV 2 there: …Nb4 Qd1 …Ng4 Bd3 …Nxe3 fxe3 …
const NB4_LINE = 'c6b4 d3d1 f6g4 f1d3 g4e3 f2e3 f8e7 d1d2 c7c5 a2a3 c5d4 e3d4 c8b8'.split(' ');

describe('a plan of several pieces is never one move\'s own reason', () => {
  it('the plan marks the king swing as several pieces\' work', () => {
    const plan = planFromUci(FEN, NB4_LINE, 'black', null);
    const swing = plan?.mine.spokenClauses.find((c) => /swing pieces/.test(c.text));
    expect(swing?.squares).toContain('b4');
    expect(swing?.several).toBe(true);
  });

  it('…Nb4 is not credited with swinging pieces toward their king — it gets its own reason', () => {
    const reason = betterMoveReason(FEN, 'Nxd4', 'Nb4', NB4_LINE, 'black', null, false);
    expect(reason ?? '').not.toMatch(/swing pieces/);
    expect(reason).toBe('it would attack the queen on d3');
  });

  it('the Learn verdict on the student\'s …Nxd4 names …Nb4 without lending it the plan', () => {
    const call = callInaccuracy(withOneSearch({ namesBetterMove: true,
      fenBefore: FEN, playedSan: 'Nxd4', bestSan: 'Nb4', bestLineUci: NB4_LINE,
      cpLoss: 90, side: 'student', moverColor: 'black', moverEvalAfterCp: -150,
      replyLineUci: ['f3d4', 'e6e5', 'd4f5'], replySan: 'Nxd4', priorMove: null,
    }));
    expect(call?.said ?? '').not.toMatch(/swing pieces/);
    expect(call?.said).toContain('Nb4 was the move — it would attack the queen on d3.');
  });
});
