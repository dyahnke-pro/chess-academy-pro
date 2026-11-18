import { describe, it, expect } from 'vitest';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { NO_SECOND_READ } from './inaccuracyCall';
import { facetLines } from '../test/reviewFacetLines';
import { kingSquareByChecks } from './kingAttackReads';
import { mateEvalFor } from './engineConstants';

// THE MATE A MOVE ALLOWS LEADS ITS VERDICT, AND IS SAID ONCE (Review prod audit
// 2026-11-18, ply 68). The student (Black) played 34…Ke6 and White mates with
// Qe5#. Review said "Your Ke6 was a blunder. It let them play Qe5#. They have
// mate in one with their queen. Here, the king belongs on e8, not e6: there
// their queen checks and wins time." — the mate second, then again, then a
// king-square lesson naming the very square that walks into the mate.
const BEFORE = '3r1r2/p1Rkq2p/6pP/3p2b1/1P1Pn1P1/P3p3/7Q/4BRK1 b - - 1 34';
const AFTER = '3r1r2/p1R1q2p/4k1pP/3p2b1/1P1Pn1P1/P3p3/7Q/4BRK1 w - - 2 35';

const facets = (): string[] => facetLines(computeMoveFacets({
  secondReads: NO_SECOND_READ, seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
  fenBefore: BEFORE, fenAfter: AFTER, san: 'Ke6', ply: 68,
  moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
  // White mates in one after the move (White's point of view, + = White mates).
  evaluation: mateEvalFor(1), preMoveEval: -150, costCp: 900, heardVerdict: null,
  classification: 'blunder', bestMoveSan: 'Ke8',
  prevCap: { square: null, capturedValue: 0, net: 0 }, allSans: [],
  forcedRunStartPly: null, playedLineEarlierUci: null, playedLineUci: ['h2e5'], bestLineUci: ['d7e8'],
  replyBestSan: 'Qe5#', replyEvaluation: mateEvalFor(1),
}));

describe('Review: the mate a move allows', () => {
  it('the verdict carries the mate in its own sentence', () => {
    const all = facets().join(' ');
    const verdict = all.match(/Your Ke6 was a blunder[^.]*\./)?.[0] ?? '';
    expect(verdict).toMatch(/mate/i);
  });

  it('the mate is said once — no second "mate in one" line for the same reply', () => {
    const all = facets().join(' ');
    expect((all.match(/mate/gi) ?? []).length).toBe(1);
  });

  it('a king square that walks into mate is never offered as the square that "wins them time"', () => {
    const r = kingSquareByChecks(BEFORE, 'b', 'Ke8');
    expect(r === null || !/\be6\b/.test(JSON.stringify(r))).toBe(true);
  });
});
