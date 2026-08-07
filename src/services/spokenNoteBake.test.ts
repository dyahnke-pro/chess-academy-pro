// The bake is what the VOICE says, so these are the rules that keep a baked
// line from becoming the thing it was built to prevent.
import { describe, it, expect, afterEach } from 'vitest';
import { __setSpokenBakeCache, bakedSpoken, spokenBakeStats } from './spokenNoteBake';
import { spokenBeatText, type DanyaNote } from './danyaTeachingService';

const note = (over: Partial<DanyaNote>): DanyaNote => ({
  id: 'n1', lineSan: ['e4'], opening: null, phase: 'middlegame',
  explains: '', teaches: '', plans: '', concepts: [], sources: [],
  ...over,
});

afterEach(() => { __setSpokenBakeCache(undefined); });

describe('spokenNoteBake', () => {
  it('the baked line wins over the original prose', () => {
    // A baked note is already in its verified final form — reviewed and gated
    // offline. Re-running the runtime pruning over it could only drift it.
    __setSpokenBakeCache(new Map([['n1', { spoken: 'The knight has no safe square left.', kind: 'floating' }]]));
    expect(spokenBeatText(note({ explains: 'Some older, wordier written sentence about the knight on f6.' })))
      .toBe('The knight has no safe square left.');
  });

  it('an unspeakable note is SILENT, never its original prose', () => {
    // `unspeakable` means the idea could not be taught without geometry that
    // belongs to a foreign example. Falling back to the original text would
    // speak exactly the false board claims the bake exists to remove.
    __setSpokenBakeCache(new Map([['n1', { unspeakable: 'needs-geometry' }]]));
    expect(spokenBeatText(note({ explains: 'Bishop d2 attacks the queen, then rook to b1 skewers it.' }))).toBe('');
  });

  it('falls back to the original prose before the bake has loaded', () => {
    // The bake is fetched, so a note selected in the first moments of a session
    // must still teach — just in its pre-bake wording.
    __setSpokenBakeCache(undefined);
    expect(spokenBeatText(note({ explains: 'White grabs space; Black strikes at the base.' })))
      .toBe('White grabs space; Black strikes at the base.');
  });

  it('an un-baked note falls back too — a partial bake is safe to ship', () => {
    __setSpokenBakeCache(new Map([['other', { spoken: 'unrelated' }]]));
    expect(spokenBeatText(note({ explains: 'White grabs space; Black strikes at the base.' })))
      .toBe('White grabs space; Black strikes at the base.');
    expect(bakedSpoken('n1')).toBeUndefined();
  });

  it('reports how much of the corpus is baked', () => {
    __setSpokenBakeCache(new Map([
      ['a', { spoken: 'x' }], ['b', { spoken: 'y' }], ['c', { unspeakable: 'needs-geometry' }],
    ]));
    expect(spokenBakeStats()).toEqual({ loaded: true, baked: 2, unspeakable: 1 });
    __setSpokenBakeCache(undefined);
    expect(spokenBakeStats().loaded).toBe(false);
  });
});
