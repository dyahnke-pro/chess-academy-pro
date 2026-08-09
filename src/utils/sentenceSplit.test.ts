// The regression these cover was heard, not read: a live Learn game against
// prod ended a turn with the coach speaking the words "7 points)." on their
// own. See sentenceSplit.ts for why the old regex produced that.
import { describe, it, expect } from 'vitest';
import { splitSpeakableSentences } from './sentenceSplit';

describe('splitting narration into sentences', () => {
  it('THE REGRESSION: a decimal never becomes a sentence break', () => {
    const { sentences } = splitSpeakableSentences('It wins the bishop on e7 (worth 3.7 points).');
    expect(sentences).toEqual(['It wins the bishop on e7 (worth 3.7 points).']);
    expect(sentences).not.toContain('7 points).');
  });

  it('splits ordinary sentences', () => {
    const { sentences } = splitSpeakableSentences('The best move is fxe7. It wins a bishop.');
    expect(sentences).toEqual(['The best move is fxe7.', 'It wins a bishop.']);
  });

  it('keeps question and exclamation marks as terminators', () => {
    const { sentences } = splitSpeakableSentences('Did you see it? Good!');
    expect(sentences).toEqual(['Did you see it?', 'Good!']);
  });

  it('does not split inside an abbreviation', () => {
    // Found by writing this test: "e.g." DOES have whitespace after its second
    // period, so the mechanical rule split it and the coach would have said
    // "Trade the defender, e.g." out loud. The single-letter-between-periods
    // shape is what distinguishes it, with no abbreviation list to drift.
    const { sentences } = splitSpeakableSentences('Trade the defender, e.g. the knight on f3.');
    expect(sentences).toEqual(['Trade the defender, e.g. the knight on f3.']);
  });

  it('holds an unterminated tail back as `rest`', () => {
    const { sentences, rest } = splitSpeakableSentences('One move done. Now the plan is');
    expect(sentences).toEqual(['One move done.']);
    expect(rest.trim()).toBe('Now the plan is');
  });

  it('returns nothing for text with no terminator', () => {
    const { sentences, rest } = splitSpeakableSentences('still thinking');
    expect(sentences).toEqual([]);
    expect(rest).toBe('still thinking');
  });

  it('drops whitespace-only fragments between terminators', () => {
    const { sentences } = splitSpeakableSentences('Check.  . Mate.');
    expect(sentences).toEqual(['Check.', '.', 'Mate.']);
  });

  it('handles an eval in parentheses mid-sentence', () => {
    const { sentences } = splitSpeakableSentences('White is better (+1.4) after the recapture. Push on.');
    expect(sentences).toEqual(['White is better (+1.4) after the recapture.', 'Push on.']);
  });
});
