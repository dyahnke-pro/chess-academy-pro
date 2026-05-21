import { describe, it, expect, vi } from 'vitest';
import {
  squaresInText,
  splitSentences,
  buildNarrationSegments,
  speakSegments,
} from './narrationSegments';

describe('squaresInText', () => {
  it('finds bare and piece-token squares', () => {
    const s = squaresInText('The knight on d5 eyes c7 after Nf3.');
    expect(s.has('d5')).toBe(true);
    expect(s.has('c7')).toBe(true);
    expect(s.has('f3')).toBe(true);
  });
  it('returns empty for prose with no coordinates', () => {
    expect(squaresInText('White keeps the pressure.').size).toBe(0);
  });
});

describe('splitSentences', () => {
  it('splits on sentence boundaries, keeps punctuation', () => {
    const out = splitSentences('First idea. Second idea! Third?');
    expect(out).toEqual(['First idea.', 'Second idea!', 'Third?']);
  });
  it('does not split mid-coordinate or on a single sentence', () => {
    expect(splitSentences('The d5 outpost is yours.')).toEqual(['The d5 outpost is yours.']);
  });
  it('returns empty for blank text', () => {
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('buildNarrationSegments', () => {
  it('reveals each square on the sentence that first names it', () => {
    const text = 'The knight belongs on d5. From there it eyes the c7-fork.';
    const segs = buildNarrationSegments(text, ['d5', 'c7']);
    expect(segs).toHaveLength(2);
    expect(segs[0].revealSquares).toEqual(['d5']);
    expect(segs[1].revealSquares).toEqual(['c7']);
  });

  it('attaches never-named marker squares to the last sentence (never lost)', () => {
    const text = 'White is better. The plan is clear.';
    const segs = buildNarrationSegments(text, ['e4']);
    expect(segs[segs.length - 1].revealSquares).toContain('e4');
  });

  it('reveals a square only once even if named again later', () => {
    const text = 'Watch d5. Again, d5 is the key.';
    const segs = buildNarrationSegments(text, ['d5']);
    expect(segs[0].revealSquares).toEqual(['d5']);
    expect(segs[1].revealSquares).toEqual([]);
  });
});

describe('speakSegments', () => {
  it('reveals before speaking, prefetches the next, and plays in order', async () => {
    const order: string[] = [];
    const segs = buildNarrationSegments('Play d5. Then c7 falls.', ['d5', 'c7']);
    await speakSegments(segs, {
      speak: async (t) => { order.push(`speak:${t}`); },
      prefetch: (t) => { order.push(`prefetch:${t}`); },
      reveal: (sq) => { order.push(`reveal:${sq.join(',')}`); },
    });
    // First segment: reveal d5, prefetch the 2nd sentence, then speak the 1st.
    expect(order[0]).toBe('reveal:d5');
    expect(order[1]).toBe('prefetch:Then c7 falls.');
    expect(order[2]).toBe('speak:Play d5.');
    // Second segment: reveal c7, no further prefetch, speak.
    expect(order[3]).toBe('reveal:c7');
    expect(order[4]).toBe('speak:Then c7 falls.');
  });

  it('bails out when cancelled', async () => {
    const speak = vi.fn().mockResolvedValue(undefined);
    const segs = buildNarrationSegments('A. B. C.', []);
    await speakSegments(segs, { speak, reveal: () => {}, cancelled: () => true });
    expect(speak).not.toHaveBeenCalled();
  });
});
