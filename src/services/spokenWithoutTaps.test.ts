import { describe, expect, it } from 'vitest';
import { spokenWithoutTaps } from './thinkingLesson';

describe('spokenWithoutTaps — the voice never names the interface', () => {
  it('asks "Tap every X" as "Find every X"', () => {
    expect(spokenWithoutTaps('Tap every piece of yours they could win right now.', true)).toBe('Find every piece of yours they could win right now.');
    expect(spokenWithoutTaps('Where does the line end? Tap the square where the last capture lands.', true))
      .toBe('Where does the line end? Find the square where the last capture lands.');
  });
  it('drops a bare "Tap them."', () => {
    expect(spokenWithoutTaps('Which of your pieces could they win right now? Tap them.', true)).toBe('Which of your pieces could they win right now?');
  });
  it('says nothing for an empty-square miss, keeps the teaching part of a miss', () => {
    expect(spokenWithoutTaps('Tap the piece itself, not an empty square.', false)).toBe('');
    expect(spokenWithoutTaps('Tap a king. Compare the two: castled or still in the centre.', false)).toBe('Compare the two: castled or still in the centre.');
    expect(spokenWithoutTaps('That one is theirs — the question is about yours.', false)).toBe('That one is theirs — the question is about yours.');
  });
});
