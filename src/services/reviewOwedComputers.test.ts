// ONE COACH (David 2026-10-15: "Make sure no other code is missing from other
// coach surfaces. Everything gets unified"): the board computers Learn speaks
// reach Review's facts too, through the one registry, each once a game.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { __setLocalDbForTests } from './masterPlayLookup';
import { positionFen } from './masterPlayCache';

type Side = 'w' | 'b';
function facets(a: { fenBefore: string; fenAfter: string; san: string; student: Side; mover: Side; best?: string[]; sans?: string[]; ply?: number }): Map<string, string> {
  const ids = new Map<string, string>();
  const f = computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
    fenBefore: a.fenBefore, fenAfter: a.fenAfter, san: a.san, ply: a.ply ?? 1,
    moverColor: a.mover === 'w' ? 'white' : 'black', playerColor: a.student === 'w' ? 'white' : 'black', studentColorWB: a.student,
    evaluation: 0, preMoveEval: 0, costCp: 0, heardVerdict: null, classification: 'good', bestMoveSan: null,
    prevCap: { square: null, capturedValue: 0 }, allSans: a.sans ?? [a.san], forcedRunStartPly: null,
    playedLineUci: [], bestLineUci: a.best ?? [], replyBestSan: null, replyEvaluation: null }, undefined, undefined, undefined, ids);
  const out = new Map<string, string>();
  for (const x of f) out.set(x, ids.get(x) ?? '');
  return out;
}
const idOf = (m: Map<string, string>, prefix: string): string | undefined => [...m.entries()].find(([, id]) => id.startsWith(prefix))?.[0];

describe('review speaks the computers Learn speaks', () => {
  it('their move lifts an obligation', () => {
    const m = facets({ fenBefore: 'r3k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1', fenAfter: 'r3k3/8/2n5/8/8/8/4B3/4K3 b - - 1 1', san: 'Be2', student: 'b', mover: 'w' });
    expect(idOf(m, 'hint:lifted:c6')).toMatch(/^\[their-read\]/);
  });
  it('your pinned piece walks out with tempo', () => {
    const m = facets({ fenBefore: '3r2k1/5p1p/8/8/4N3/8/4QPPP/6K1 b - - 0 1', fenAfter: '4r1k1/5p1p/8/8/4N3/8/4QPPP/6K1 w - - 1 2', san: 'Re8', student: 'w', mover: 'b' });
    expect(idOf(m, 'hint:pinbreak:')).toMatch(/^\[tactic\]/);
  });
  it('a queen grab that traps the queen', () => {
    const m = facets({ fenBefore: 'r2q1rk1/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 b - - 0 16', fenAfter: 'r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17', san: 'Kh8', student: 'w', mover: 'b' });
    expect(idOf(m, 'hint:grab:')).toMatch(/^\[tactic\]/);
  });
  it('the move order of the best line', () => {
    const m = facets({ fenBefore: '4k3/7p/8/8/8/8/4P3/4KB2 w - - 0 1', fenAfter: '4k3/7p/8/8/8/4P3/8/4KB2 b - - 0 1', san: 'e3', student: 'w', mover: 'w', best: ['e2e3', 'h7h6', 'f1d3'] });
    expect(idOf(m, 'hint:order:')).toMatch(/^\[timing\] e3 first/);
  });
  it('the book move the student left, with its job', () => {
    const history = ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'Nf3'];
    const positions: Record<string, Array<{ san: string; games: number }>> = {};
    const c = new Chess();
    let fenBefore = '';
    history.forEach((san, i) => {
      positions[positionFen(c.fen())] = i === history.length - 1 ? [{ san: 'Ne2', games: 400 }] : [{ san, games: 900 }];
      if (i === history.length - 1) fenBefore = c.fen();
      c.move(san);
    });
    __setLocalDbForTests({ positions });
    try {
      const m = facets({ fenBefore, fenAfter: c.fen(), san: 'Nf3', student: 'w', mover: 'w', sans: history, ply: history.length });
      expect(idOf(m, 'hint:book-move:')).toMatch(/^\[opening\] The book move is the knight to e2/);
    } finally {
      __setLocalDbForTests(null);
    }
  });
});

describe('review proves a threat to your loose piece the way Learn does (threatCost)', () => {
  it('their pawn opens the bishop onto your knight: the line carries its proof', async () => {
    const { isProof } = await import('./proof');
    const fenBefore = '6k1/4b3/8/2p5/8/N7/8/6K1 b - - 0 1';
    const c = new Chess(fenBefore); c.move('c4');
    const proofs = new Map<string, import('./proof').FactProof>();
    const f = computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore, fenAfter: c.fen(), san: 'c4', ply: 2, moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 0, preMoveEval: 0, costCp: 0, heardVerdict: null, classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: ['c4'], forcedRunStartPly: null,
      playedLineUci: [], bestLineUci: [], replyBestSan: null, replyEvaluation: null }, undefined, undefined, undefined, undefined, undefined, proofs);
    const loose = f.find((x) => x.startsWith('[loose]') && /knight on a3/.test(x));
    expect(loose).toBeDefined();
    expect(isProof(proofs.get(loose ?? ''))).toBe(true);
  });
});
