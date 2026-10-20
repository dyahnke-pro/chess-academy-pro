import { describe, it, expect } from 'vitest';
import { squaresInText, splitSentences, buildNarrationSegments } from './narrationSegments';

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
  // A MOVE NUMBER IS NOT A SENTENCE. Prod caught the coach speaking a
  // standalone "9." — the splitter had broken "…ground. 9. Nc3 is better."
  // after BOTH periods.
  it('does not leave a bare move number as its own utterance', () => {
    expect(splitSentences('That gives ground. 9. Nc3 is better.'))
      .toEqual(['That gives ground.', '9. Nc3 is better.']);
  });

  it('drops a trailing move number that introduces nothing', () => {
    expect(splitSentences('That gives ground. 9.')).toEqual(['That gives ground.']);
  });

  it('still splits ordinary sentences that end in a number', () => {
    expect(splitSentences('You are up by 2.9. Keep pressing.'))
      .toEqual(['You are up by 2.9.', 'Keep pressing.']);
  });

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


describe('splitSentences keeps a tried move with its answer (Learn audit 2026-10-14)', () => {
  it('does not split "Rd8? Then …"', async () => {
    const { splitSentences } = await import('./narrationSegments');
    expect(splitSentences('Rd8? Then Bxc3 — they win a knight. The plan here: the d-file.')).toEqual(['Rd8? Then Bxc3 — they win a knight.', 'The plan here: the d-file.']);
  });
});
