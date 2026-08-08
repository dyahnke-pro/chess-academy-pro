// Tactics reaches the corpus by THEME, not by position.
//
// The drill looked its post-solve note up with `teachingSourceForBoard(fen)` —
// a Lichess puzzle position, against a corpus of taught opening lines. It is
// essentially never there, so the note fired almost never: wired, and silent.
// A puzzle already declares what pattern it is, and the corpus has thousands of
// notes about those patterns.
import { describe, it, expect, beforeAll } from 'vitest';
import { tacticNoteForPuzzleThemes } from './danyaTeachingService';
import { loadFullCorpus } from '../test/loadFullCorpus';
import puzzles from '../data/puzzles.json';

interface Puzzle { id: string; fen: string; themes: string[] }

describe('tactic notes by puzzle theme', () => {
  beforeAll(() => { loadFullCorpus(); });

  it('a back-rank puzzle gets a note that teaches the back rank', () => {
    const hit = tacticNoteForPuzzleThemes({ themes: ['backRankMate', 'endgame', 'mate', 'mateIn2', 'short'] });
    expect(hit).not.toBeNull();
    expect(hit?.text.toLowerCase()).toMatch(/back.?rank|mate/);
  });

  it('the note names NO square — the puzzle position is not the note\'s position', () => {
    // The whole reason this is safe. A floating note's original prose describes
    // its own example; spoken over a puzzle the student is staring at, every
    // square in it would be a lie.
    for (const themes of [['fork'], ['pin'], ['deflection'], ['skewer']]) {
      const hit = tacticNoteForPuzzleThemes({ themes });
      if (!hit) continue;
      expect(hit.text).not.toMatch(/\b[a-h][1-8]\b/);
    }
  });

  it('difficulty and phase themes alone reach nothing', () => {
    // `short`, `long`, `crushing`, `endgame` say nothing about what to learn.
    expect(tacticNoteForPuzzleThemes({ themes: ['short', 'crushing', 'long'] })).toBeNull();
  });

  it('never repeats a note inside one session', () => {
    const seen = new Set<string>();
    const a = tacticNoteForPuzzleThemes({ themes: ['fork'], seenIds: seen });
    const b = tacticNoteForPuzzleThemes({ themes: ['fork'], seenIds: seen });
    expect(a).not.toBeNull();
    expect(b?.id).not.toBe(a?.id);
  });

  it('MEASURES the real fire rate across the shipped puzzle set', () => {
    const all = (Array.isArray(puzzles) ? puzzles : Object.values(puzzles)[0]) as Puzzle[];
    const sample = all.slice(0, 4000);
    let mappable = 0;
    let fired = 0;
    for (const p of sample) {
      // Fresh set per puzzle: session dedupe is a UX concern, not a coverage one.
      const hit = tacticNoteForPuzzleThemes({ themes: p.themes ?? [] });
      if ((p.themes ?? []).some((t) => t !== 'short' && t !== 'long')) mappable += 1;
      if (hit) fired += 1;
    }
    const pct = (fired / sample.length) * 100;
    console.log(`[tactics] ${fired}/${sample.length} puzzles get a themed note (${pct.toFixed(1)}%)`);
    // A floor, not a target — it may only rise as the corpus grows.
    expect(pct).toBeGreaterThan(50);
  }, 300_000);
});
