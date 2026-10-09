/**
 * FILLER IS NOT EVIDENCE (WO-CHAT-01, live walk 2026-10-09). A Thai student
 * asked to be taught the Italian; the translation said "Italian Opening", and
 * the resolver matched the word "opening" inside "Italian Game: Two Knights
 * Defense, Modern Bishop's Opening". "the Italian" resolved to nothing.
 */
import { describe, it, expect } from 'vitest';
import { resolveOpeningEntry } from './openingDetectionService';

describe('the words people wrap a name in', () => {
  it.each([
    ['Italian Opening', 'Italian Game'],
    ['Italian opening', 'Italian Game'],
    ['the Italian', 'Italian Game'],
    ['the Italian opening', 'Italian Game'],
    ['the Sicilian', 'Sicilian Defense'],
    ['the Caro-Kann opening', 'Caro-Kann Defense'],
  ])('%s → %s', (q, name) => {
    expect(resolveOpeningEntry(q)?.canonicalName).toBe(name);
  });
  it.each([
    ['English Opening', 'English Opening'],
    ["Bird's Opening", 'Bird Opening'],
    ['Italian Game', 'Italian Game'],
  ])('a name that IS a name is untouched: %s', (q, name) => {
    expect(resolveOpeningEntry(q)?.canonicalName).toBe(name);
  });
});
