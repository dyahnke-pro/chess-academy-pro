import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hangingLine, lostLastGuard } from './hangingLine';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { NO_SECOND_READ } from './inaccuracyCall';
import { facetLines } from '../test/reviewFacetLines';

// ONE WORDING FOR A PIECE NOTHING GUARDS (WO-DEPTH-01, David 2026-11-08).
// Learn said "Careful — your bishop on f4 is attacked and nothing's defending
// it"; Review said "Their rook is now hanging" / "has lost its last defender".
// One producer now, both surfaces.

// David's game G1 (Learn walk), move 15: White's bishop on f4 is hit and
// nothing guards it, White to move.
const G1_15 = 'r1b1kr2/pp2p1bp/2np2p1/3R2N1/1q2PBn1/1QN5/PP3PPP/4R1K1 w - - 12 15';
// lichess mZ1GOTOw after 37…Kc7: the king step opened the d-file onto White's
// rook on d1, which never had a guard.
const KC7_BEFORE = '3r4/6p1/p2k3p/1pp5/8/P4K2/7P/3R4 b - - 1 37';
const KC7_AFTER = '3r4/2k3p1/p6p/1pp5/8/P4K2/7P/3R4 w - - 2 38';

describe('hangingLine — one sentence for a piece nothing guards', () => {
  it('your piece, you to move: the piece, that nothing guards it, and what it means', () => {
    const line = hangingLine({ fen: G1_15, squares: ['f4'], viewer: 'w', lostGuard: false, still: false });
    expect(line).toMatch(/bishop on f4/);
    expect(line).toMatch(/[Nn]othing guards it/);
    expect(line).not.toMatch(/nothing's defending/);
  });

  it('the same board says the same line (rotated on the board, never rolled)', () => {
    const a = hangingLine({ fen: G1_15, squares: ['f4'], viewer: 'w', lostGuard: false, still: false });
    expect(hangingLine({ fen: G1_15, squares: ['f4'], viewer: 'w', lostGuard: false, still: false })).toBe(a);
  });

  it('said again after the student left it, word for word', () => {
    expect(hangingLine({ fen: G1_15, squares: ['f4'], viewer: 'w', lostGuard: false, still: true }))
      .toMatch(/^Your (dark-squared )?bishop( on f4)? is still hanging — nothing guards it yet\.$/);
  });

  it('a guard LOST is a different lesson from a piece never guarded', () => {
    expect(lostLastGuard(KC7_BEFORE, 'd1')).toBe(false);
    const lost = hangingLine({ fen: KC7_AFTER, squares: ['d1'], viewer: 'b', lostGuard: true, still: false });
    const hit = hangingLine({ fen: KC7_AFTER, squares: ['d1'], viewer: 'b', lostGuard: false, still: false });
    expect(lost).toMatch(/lost its last (guard|defender)|Nothing guards .* any more/);
    expect(hit).toMatch(/hanging|is hit/);
  });
});

describe('Review and Learn speak the one producer', () => {
  it('Review\'s loose facet on 37…Kc7 is the producer\'s line, their side to move', () => {
    const facets = facetLines(computeMoveFacets({ secondReads: NO_SECOND_READ, seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: KC7_BEFORE, fenAfter: KC7_AFTER, san: 'Kc7', ply: 74,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: -300, preMoveEval: -300, costCp: null, heardVerdict: null, classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0, net: 0 }, allSans: [],
      forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], replyBestSan: null, replyEvaluation: null,
    }));
    const loose = facets.filter((f) => f.startsWith('[loose]')).join(' ');
    expect(loose).toContain(hangingLine({ fen: KC7_AFTER, squares: ['d1'], viewer: 'b', lostGuard: false, still: false })!);
    expect(loose).toMatch(/Their rook on d1 is (hanging|hit)/);
    expect(loose).toMatch(/[Nn]othing guards it/);
  });

  it('no second wording survives: the old Learn and Review sentences are gone from their producers', () => {
    const code = (p: string): string => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const learn = code('src/services/learnBoardTeaching.ts') + code('src/components/Coach/CoachTeachPage.tsx');
    const review = code('src/services/reviewFullData.ts');
    expect(learn).not.toMatch(/nothing's defending it/);
    expect(learn).toMatch(/hangingLine\(/);
    expect(review).not.toMatch(/'is' : 'is'\} now hanging|lost \$\{many \? 'their' : 'its'\} last defender/);
    expect(review).toMatch(/hangingLine\(/);
  });
});
