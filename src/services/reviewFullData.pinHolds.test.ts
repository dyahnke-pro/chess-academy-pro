// A PIN SAYS WHAT IT HOLDS (prod Review 2026-10-28): the [tactic] facet named
// "their knight on c6 is pinned against their king" and stopped — a
// description, counted against the why floor. The producer now appends the
// same rotated hold Learn's pin line speaks (`pinConsequence`).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { NO_SECOND_READ } from './inaccuracyCall';
// @ts-expect-error — plain .mjs audit helper, no types.
import { isWhy } from '../../scripts/audit-lib/why-count.mjs';

describe('the review pin facet carries its hold', () => {
  it('Bb5 against Nc6 after …d6: the king pin is said with what it freezes', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6'];
    const c = new Chess();
    const fens: string[] = [];
    for (const s of sans) { c.move(s); fens.push(c.fen()); }
    const facets = computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: fens[4], fenAfter: fens[5], san: 'd6', ply: 6,
      moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 40, preMoveEval: 35, costCp: null, heardVerdict: null,
      classification: 'book', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0, net: 0 },
      allSans: sans, forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], secondReads: NO_SECOND_READ,
      replyBestSan: null, replyEvaluation: null,
    });
    const pin = facets.find((f) => f.startsWith('[tactic]') && /pin/i.test(f));
    expect(pin, facets.join('\n')).toBeDefined();
    expect(pin).toMatch(/c6/);
    expect(pin).toMatch(/cannot move|frozen|out of play/);
    expect(isWhy(pin!.replace(/^\[tactic\] /, ''))).toBe(true);
  });
});
