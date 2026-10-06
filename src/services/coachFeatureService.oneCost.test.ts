// The fundamental-led beat says the SAME cost the flag says: the one-search
// price (`costCp`) when the review recorded it, the eval delta only as a
// fallback. It read the delta alone, so a re-priced move could be flagged at
// one number and costed at another in the same beat (review walk oct3g).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';

const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];

function inputs(costCp?: number): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    const isBlack = i % 2 === 1;
    return {
      ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: !isBlack,
      classification: i === 11 ? 'mistake' : 'book',
      preMoveEval: i === 11 ? -20 : 0, evaluation: i === 11 ? 90 : 0,
      bestMove: i === 11 ? 'e7e6' : null,
      ...(i === 11 && costCp !== undefined ? { costCp } : {}),
    } as unknown as ReviewMoveInput;
  });
}

describe('review — one cost reader on the fundamental-led beat', () => {
  it('speaks the one-search cost when the review recorded it', () => {
    const text = buildReviewSegments(inputs(70), 'black', null, false, 1400, [], undefined, 'g')[11].narration ?? '';
    expect(text).toMatch(/That cost about half a pawn\./);
    expect(text).not.toMatch(/about a pawn/);
  });
  it('falls back to the eval delta when no one-search cost was recorded', () => {
    const text = buildReviewSegments(inputs(), 'black', null, false, 1400, [], undefined, 'g')[11].narration ?? '';
    expect(text).toMatch(/That cost about a pawn\./);
  });
});
