// The read's key squares ride a TYPED channel out of coachApi (2026-09-19):
// `keySquareHighlightTags` renders the marker for surfaces that parse the
// answer text directly AND records the squares in a read-once scratch that
// `coachService.ask` consumes to re-append the highlight AFTER the arrow pass
// has stripped every marker. Origin travels in the channel, never in the text,
// so an LLM-written `[BOARD: highlight:]` can never reach the board that way.
import { describe, it, expect } from 'vitest';
import { keySquareHighlightTags, consumeCoachKeySquares } from './coachApi';

describe('keySquareHighlightTags → consumeCoachKeySquares (typed highlight channel)', () => {
  it('records the squares the read NAMED, read-once', () => {
    expect(consumeCoachKeySquares()).toBeNull();
    const tag = keySquareHighlightTags({ keySquares: ['e8', 'f7'] });
    expect(tag).toBe(' [BOARD: highlight:e8:yellow,f7:yellow]');
    expect(consumeCoachKeySquares()).toEqual(['e8', 'f7']);
    expect(consumeCoachKeySquares()).toBeNull();
  });

  it('records nothing when the read named no square', () => {
    expect(keySquareHighlightTags({ keySquares: [] })).toBe('');
    expect(keySquareHighlightTags(null)).toBe('');
    expect(consumeCoachKeySquares()).toBeNull();
  });
});
