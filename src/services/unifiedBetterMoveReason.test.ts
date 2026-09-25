// ONE COACH (David 2026-09-25: "this is a unified coach so whatever changes on
// one coach are made to all of them"). The reason a better move is better is
// ONE computer — `betterMoveReason` — and both surfaces speak it: Learn's
// verdict (`callInaccuracy`) and review's "the stronger move was X" facet.
// Real position: the 1380 Philidor re-walk, 22.gxh5 vs Rxf8+ (checks first).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { betterMoveReason, callInaccuracy } from './inaccuracyCall';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';

const LINE = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3 Rxf3 Rd8 g4 f5 Rxd8 Qe7'.split(' ');
const BEST_LINE = ['d8f8', 'g8f8', 'g4h5', 'g7g6', 'e1g3', 'b4c5'];
const board = (): { before: string; after: string } => {
  const c = new Chess(); for (const s of LINE) c.move(s);
  const before = c.fen(); c.move('gxh5');
  return { before, after: c.fen() };
};

describe('one reason for the better move, on every surface', () => {
  const { before, after } = board();
  const reason = betterMoveReason(before, 'gxh5', 'Rxf8+', BEST_LINE, 'white');

  it('the shared computer gives the move-order reason', () => {
    expect(reason).toBe("checks first: Rxf8+, Kxf8, and gxh5 would still have been there — you'd have had both");
  });

  it('Learn speaks it', () => {
    const said = callInaccuracy({
      fenBefore: before, playedSan: 'gxh5', bestSan: 'Rxf8+', bestLineUci: BEST_LINE,
      cpLoss: 261, moverEvalAfterCp: 418, side: 'student', moverColor: 'white',
    } as never)?.said ?? '';
    expect(said).toContain(reason ?? '<no reason>');
  });

  it('review speaks the same reason', () => {
    const facets = computeMoveFacets({
      seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: before, fenAfter: after, san: 'gxh5', ply: 43,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 418, preMoveEval: 679, classification: 'mistake',
      bestMoveSan: 'Rxf8+', prevCap: { square: null, capturedValue: 0 },
      allSans: [...LINE, 'gxh5'], forcedRunStartPly: null,
      bestLineUci: BEST_LINE, replyBestSan: null,
    });
    const quality = facets.find((f) => f.startsWith('[quality]')) ?? '';
    expect(quality).toContain('the stronger move was Rxf8+');
    expect(quality).toContain(reason ?? '<no reason>');
  });
});
