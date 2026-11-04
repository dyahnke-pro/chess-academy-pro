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
import { facetLines } from '../test/reviewFacetLines';

describe('the review pin facet carries its hold', () => {
  it('Bb5 against Nc6 after …d6: the king pin is said with what it freezes', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6'];
    const c = new Chess();
    const fens: string[] = [];
    for (const s of sans) { c.move(s); fens.push(c.fen()); }
    const facets = facetLines(computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: fens[4], fenAfter: fens[5], san: 'd6', ply: 6,
      moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 40, preMoveEval: 35, costCp: null, heardVerdict: null,
      classification: 'book', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0, net: 0 },
      allSans: sans, forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], secondReads: NO_SECOND_READ,
      replyBestSan: null, replyEvaluation: null,
    }));
    const pin = facets.find((f) => f.startsWith('[tactic]') && /pin/i.test(f));
    expect(pin, facets.join('\n')).toBeDefined();
    expect(pin).toMatch(/c6/);
    expect(pin).toMatch(/cannot move|frozen|out of play/);
    expect(isWhy(pin!.replace(/^\[tactic\] /, ''))).toBe(true);
  });

  // ROTATED BY HOW OFTEN IT WAS SAID, NEVER BY PLY (Review prod audit
  // 2026-11-04: three pins on plies sharing a remainder spoke one stem three
  // times). The walk's spoken-motif count picks the words; the ply does not.
  it('the pin facet rotates on the game\'s spoken-pin count, not the ply', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6'];
    const c = new Chess();
    const fens: string[] = [];
    for (const s of sans) { c.move(s); fens.push(c.fen()); }
    // `said` other pins said before this one; this pin (b5c6e8) is new.
    const others = ['a1a2a3', 'a4a5a6', 'h1h2h3'];
    const pinAt = (ply: number, said: number, saidThisOne = false): string | undefined => facetLines(computeMoveFacets({ seenFundamentals: new Set(),
      teaching: { ...NO_TEACHING_CONTEXT, motifSaid: new Map([['pin', [...others.slice(0, said), ...(saidThisOne ? ['b5c6e8'] : [])]]]) },
      fenBefore: fens[4], fenAfter: fens[5], san: 'd6', ply,
      moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 40, preMoveEval: 35, costCp: null, heardVerdict: null,
      classification: 'book', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0, net: 0 },
      allSans: sans, forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], secondReads: NO_SECOND_READ,
      replyBestSan: null, replyEvaluation: null,
    })).find((f) => f.startsWith('[tactic]') && /pin/i.test(f));
    const bySaid = [0, 1, 2, 3].map((n) => pinAt(6, n));
    expect(new Set(bySaid).size).toBe(4);
    // The same count on another ply says the same words.
    expect(pinAt(9, 1)).toBe(bySaid[1]);
    // THE SAME PIN SAID AGAIN KEEPS ITS WORDS (Colle baseline 2026-11-04: a
    // standing guard re-said in rotated words slipped past the repeat ledger
    // on two moves running). Said first after one other pin, it stays stem 1.
    expect(pinAt(12, 1, true)).toBe(bySaid[1]);
    expect(pinAt(14, 1, true)).toBe(bySaid[1]);
  });
});
