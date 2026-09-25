/**
 * The 1380 hand walk heard "c-pawn takes b3? Two moves keep the win here." —
 * a move question whose answer a claim stripper had dropped. Every stripper now
 * splits through ONE splitter that keeps the question glued to its answer, so
 * the pair lives or dies together.
 */
import { describe, it, expect } from 'vitest';
import { claimSentences } from './claimSentences';
import { stripDisprovenSentences } from '../services/boardClaimValidator';

describe('claimSentences', () => {
  it('glues a move question to its answer', () => {
    expect(claimSentences('cxb3? Then axb3, and the rook falls. Two moves keep the win here.'))
      .toEqual(['cxb3? Then axb3, and the rook falls.', 'Two moves keep the win here.']);
  });
  it('glues "Here\'s how:" to the sentence it explains', () => {
    expect(claimSentences('Their threat first. Here\'s how: look at their last move.'))
      .toEqual(['Their threat first. Here\'s how: look at their last move.']);
  });
  it('splits newlines only when asked', () => {
    expect(claimSentences('a.\nb.', { newlines: true })).toEqual(['a.', 'b.']);
  });
});

describe('a stripper never orphans a move question', () => {
  it('drops the question WITH its disproven answer', () => {
    // Start position: there is no knight on f6, so the answer is board-false.
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const { clean } = stripDisprovenSentences('Bc4? The knight on f6 is pinned. Development comes first.', fen);
    expect(clean).not.toMatch(/Bc4\?/);
    expect(clean).toContain('Development comes first.');
  });
});
