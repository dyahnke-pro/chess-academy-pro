import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { NO_SECOND_READ } from './inaccuracyCall';
import { facetLines } from '../test/reviewFacetLines';
import { keyPawn } from './pawnJudgement';

// Carlsen–Caruana, prod Review 2026-11-09: on 39.Rxd6+ the walk said "Their d6
// pawn is the key pawn: it guards c5, and if d6 drops, c5 goes with it" as the
// rook took the d6 pawn. A standing fact of the board the move was played on
// speaks only where the move left its squares as they were.
const BEFORE = 'r7/8/3p1k2/2pR4/2R5/p7/r4PPP/6K1 w - - 0 39';

const facts = (san: string): string[] => {
  const after = new Chess(BEFORE); after.move(san);
  return facetLines(computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
    fenBefore: BEFORE, fenAfter: after.fen(), san, ply: 76,
    moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
    evaluation: 300, preMoveEval: 300, costCp: 0, heardVerdict: null,
    classification: 'great', bestMoveSan: null,
    prevCap: { square: null, capturedValue: 0, net: 0 },
    allSans: [], forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], secondReads: NO_SECOND_READ,
    replyBestSan: null, replyEvaluation: null,
  }));
};

describe('Review says a standing fact only while the move left it standing', () => {
  it('the board before the move holds the key-pawn fact', () => {
    expect(keyPawn(BEFORE, 'w')?.text).toBe('Their d6 pawn is the key pawn: it guards c5, and if d6 drops, c5 goes with it.');
  });
  it('the move that takes the key pawn does not say it is still the key pawn', () => {
    expect(facts('Rxd6+').join('\n')).not.toMatch(/d6 pawn is the key pawn/);
  });
});
