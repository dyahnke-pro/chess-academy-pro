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

  it('a "tap" inside a sentence is never spoken either (prod 2026-10-23)', () => {
    expect(spokenWithoutTaps('Now count: your rook on h1 — tap each of their pieces that attacks it.', true))
      .toBe('Now count: your rook on h1 — find each of their pieces that attacks it.');
    expect(spokenWithoutTaps('Now tap their pieces defending it.', true)).toBe('Now find their pieces defending it.');
    expect(spokenWithoutTaps('And its defenders — tap each of theirs.', true)).not.toMatch(/\btap/i);
  });
});

