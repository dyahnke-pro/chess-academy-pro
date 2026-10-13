import { describe, expect, it } from 'vitest';
import { correctionAgainstHeard } from './reviewFullData';

// David 2026-10-13: the deeper read corrects what was heard live, out loud.
describe('Review says when the deeper read disagrees with the grade heard live', () => {
  it('heard a mistake, the deeper read says fine → a correction of its own', () => {
    expect(correctionAgainstHeard('mistake', 'good', 'e6')).toEqual({
      text: 'During the game your e6 was called a mistake — the deeper read says it was fine.', ridesVerdict: false,
    });
  });
  it('heard fine, the deeper read finds a blunder → the correction rides the verdict', () => {
    expect(correctionAgainstHeard('fine', 'blunder', 'Bb5')).toEqual({
      text: 'During the game it was called fine; the deeper read says it was a blunder.', ridesVerdict: true,
    });
  });
  it('NEGATIVE CONTROL: they agree → nothing to say', () => {
    expect(correctionAgainstHeard('mistake', 'mistake', 'e6')).toBeNull();
    expect(correctionAgainstHeard('fine', 'great', 'e6')).toBeNull();
  });
});
