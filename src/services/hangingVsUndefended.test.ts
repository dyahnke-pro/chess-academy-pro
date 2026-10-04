import { describe, expect, it } from 'vitest';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';

// Review walk 2026-10-04, G3 (lichess mZ1GOTOw) 37…Kc7: "Newly undefended:
// their rook on d1" — nothing had ever defended it; the king step opened the
// d-file onto it. A piece that never had a defender is HANGING, not undefended.
describe('"undefended" only for a defender lost', () => {
  it('37…Kc7: their rook on d1 is now hanging, not newly undefended', () => {
    const before = '3r4/6p1/p2k3p/1pp5/8/P4K2/7P/3R4 b - - 1 37';
    const after = '3r4/2k3p1/p6p/1pp5/8/P4K2/7P/3R4 w - - 2 38';
    const facets = computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: before, fenAfter: after, san: 'Kc7', ply: 74,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: -300, preMoveEval: -300, costCp: null, classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: [],
      forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], replyBestSan: null,
    });
    const loose = facets.filter((f) => f.startsWith('[loose]'));
    expect(loose.join(' ')).not.toMatch(/Newly undefended: their rook on d1/);
    expect(loose.join(' ')).toMatch(/Now hanging: their rook on d1/);
  });
});
