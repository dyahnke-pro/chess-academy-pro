import { describe, it, expect } from 'vitest';
import { parseJsonSalvaging, isTruncatedJson } from './salvageJson';

// The failure this exists for (prod audit-stream, 2026-07-31):
//   openingGenerator.generateOpeningFromDbNarration | narration LLM call
//   failed for "Sicilian Defense: Alapin Variation" — falling back to
//   template ideas: Expected ',' or ']' after array element in JSON
// DeepSeek hit max_tokens mid-array, so the whole lesson became template
// ideas — the "repetitive, nothing like Naroditsky" narration David heard.
describe('parseJsonSalvaging', () => {
  it('parses valid JSON unchanged', () => {
    expect(parseJsonSalvaging('{"a":1,"b":[2,3]}')).toEqual({ a: 1, b: [2, 3] });
  });

  it('recovers the finished ideas from an array cut mid-element', () => {
    const raw = '{"intro":"hi","ideas":[{"text":"one"},{"text":"two"},{"text":"thr';
    expect(parseJsonSalvaging(raw)).toEqual({ intro: 'hi', ideas: [{ text: 'one' }, { text: 'two' }] });
  });

  it('recovers when the cut lands inside a string value', () => {
    const raw = '{"intro":"hi","outro":"bye","ideas":[{"text":"a long sentence that got ch';
    expect(parseJsonSalvaging(raw)).toEqual({ intro: 'hi', outro: 'bye' });
  });

  it('recovers through nested containers', () => {
    const raw = '{"a":{"b":[1,2],"c":[{"d":1},{"d":2},{"d":';
    expect(parseJsonSalvaging(raw)).toEqual({ a: { b: [1, 2], c: [{ d: 1 }, { d: 2 }] } });
  });

  it('is not fooled by braces or commas inside strings', () => {
    const raw = '{"intro":"e4, then {d4} and [c4]","ideas":[{"text":"x"},{"text":"y';
    expect(parseJsonSalvaging(raw)).toEqual({
      intro: 'e4, then {d4} and [c4]',
      ideas: [{ text: 'x' }],
    });
  });

  it('handles escaped quotes in the truncated tail', () => {
    const raw = '{"intro":"he said \\"go\\"","ideas":[{"text":"x"},{"text":"y\\"z';
    expect(parseJsonSalvaging(raw)).toEqual({ intro: 'he said "go"', ideas: [{ text: 'x' }] });
  });

  it('returns null when nothing ever completed', () => {
    expect(parseJsonSalvaging('{"intro":"only a partial val')).toBeNull();
    expect(parseJsonSalvaging('not json at all')).toBeNull();
  });

  it('distinguishes truncated from valid and from unsalvageable', () => {
    expect(isTruncatedJson('{"a":1}')).toBe(false);
    expect(isTruncatedJson('{"a":1,"b":[2,3')).toBe(true);
    expect(isTruncatedJson('{"a":1,,,')).toBe(false);
    expect(isTruncatedJson('garbage')).toBe(false);
  });
});
