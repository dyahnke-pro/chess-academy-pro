// ONE LOOSE PIECE, ONE LINE (Review baseline 2026-11-08): their move hits a
// loose piece of yours, and Review said it twice in one turn — the reach
// ("Their bishop now attacks your light-squared bishop, which is loose") and
// the hanging read ("Watch out — that bishop attacks your bishop on b7, and
// nothing defends it"). One claim about one square: the threat read keeps it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { NO_SECOND_READ } from './inaccuracyCall';
import { facetLines } from '../test/reviewFacetLines';

const facetsFor = (fenBefore: string, san: string): string[] => {
  const c = new Chess(fenBefore); c.move(san);
  return facetLines(computeMoveFacets({ secondReads: NO_SECOND_READ,
    seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
    fenBefore, fenAfter: c.fen(), san, ply: 2, moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
    evaluation: 0, preMoveEval: 0, costCp: null, heardVerdict: null, classification: 'good', bestMoveSan: null, prevCap: { square: null, capturedValue: 0, net: 0 },
    allSans: ['Bb5', san], forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], replyBestSan: null, replyEvaluation: null,
  }));
};

describe('their move hits a loose piece of yours', () => {
  it('says it once, as the threat', () => {
    const lines = facetsFor('2b3k1/8/8/1B6/8/8/8/4K3 b - - 0 1', 'Ba6');
    // The reach line says "your bishop" (one bishop each), the threat names b5.
    const hits = lines.filter((l) => /^\[(?:does|opp-target)\]/.test(l) && /(?:eyes|attacks|hits) your bishop/.test(l));
    expect(hits, lines.join('\n')).toHaveLength(1);
    expect(hits[0]).toMatch(/^\[opp-target\] Watch out/);
  });
});
