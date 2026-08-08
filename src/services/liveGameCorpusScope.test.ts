// The live-game corpus lane must stay SCOPED to the opening being played.
//
// David 2026-08-08, after a full game in Learn: "Narrations still missing. I
// hear no Naroditsky corpus when it comes to the Vienna." Two bugs, both here.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { teachingSourceForBoard, spokenBeatText } from './danyaTeachingService';

const walk = (sans: string[]) => {
  const c = new Chess();
  const out: Array<{ prefix: string[]; fen: string }> = [];
  const prefix: string[] = [];
  for (const s of sans) { c.move(s); prefix.push(s); out.push({ prefix: [...prefix], fen: c.fen() }); }
  return out;
};

const VIENNA_GAMBIT = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Bg4'];

describe('the live-game corpus lane', () => {
  beforeAll(() => { loadFullCorpus(); loadSpokenBake(); }, 120_000);

  it('THE REGRESSION: teaches the Vienna, not the Scotch', () => {
    // The lane called `teachingSourceForBoard(history, fen, null)`. That null
    // switches OFF `noteOpeningConflicts`, whose whole job is stopping a note
    // tagged for one opening teaching in another — so ply 1 of a Vienna spoke
    // "The Scotch was beloved in Morphy's era… Kasparov's 1990 title match
    // revival brought it back". The board cannot catch that: after 1.e4 the
    // position is consistent with both. Only the tag can.
    const spoken: string[] = [];
    const seen = new Set<string>();
    for (const { prefix, fen } of walk(VIENNA_GAMBIT)) {
      const src = teachingSourceForBoard(prefix, fen, 'Vienna Game');
      if (!src || seen.has(src.note.id)) continue;
      seen.add(src.note.id);
      const t = spokenBeatText(src.note);
      if (t.trim()) spoken.push(t);
    }
    expect(spoken.length, 'the corpus went silent across an entire Vienna').toBeGreaterThan(0);
    const all = spoken.join(' ').toLowerCase();
    for (const foreign of ['scotch', 'morphy', 'kasparov']) {
      expect(all, `a ${foreign} note taught inside a Vienna`).not.toContain(foreign);
    }
  }, 120_000);

  it('the scope guard is what does it — unscoped, the foreign note comes back', () => {
    // Pins the CAUSE, not just the symptom: same walk, opening name withheld.
    // If this ever stops finding a foreign note the first assertion has gone
    // vacuous and is no longer proving anything.
    const seen = new Set<string>();
    let sawForeign = false;
    for (const { prefix, fen } of walk(VIENNA_GAMBIT)) {
      const src = teachingSourceForBoard(prefix, fen, null);
      if (!src || seen.has(src.note.id)) continue;
      seen.add(src.note.id);
      const tags = (src.note.opening ?? '').toLowerCase();
      if (tags && !tags.includes('vienna') && !tags.includes('king')) sawForeign = true;
    }
    expect(sawForeign, 'unscoped retrieval no longer reaches a foreign-tagged note').toBe(true);
  }, 120_000);
});
