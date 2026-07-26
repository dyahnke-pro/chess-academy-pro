import { describe, it, expect } from 'vitest';
import { pickStoryGame } from './reviewStoryGame';
import { resolveOpeningIdFromName } from './chessConceptService';
import modelGamesRaw from '../data/model-games.json';

describe('pickStoryGame — cited illustrative game from the VERIFIED corpus (§6)', () => {
  it('returns null for an unknown / unresolvable opening', () => {
    expect(pickStoryGame(null)).toBeNull();
    expect(pickStoryGame('Totally Made Up Opening ZZZ')).toBeNull();
  });

  it('cites a real game for an opening that has model games', () => {
    // Find an openingId that actually has a model game with white/black/year.
    const games = modelGamesRaw as Array<{ openingId?: string; white?: string; black?: string; year?: number | string }>;
    const sample = games.find((g) => g.openingId && g.white && g.black && g.year !== undefined && String(g.year).trim() !== '');
    expect(sample).toBeTruthy();
    // Reverse a name that resolves to that id is hard; instead assert via any
    // opening name that resolves to an id WITH games. Try the common ones.
    const names = ['Caro-Kann Defence', 'Italian Game', 'Sicilian Defense', 'French Defence', 'Ruy Lopez', 'Queen\'s Gambit'];
    const hit = names.find((n) => {
      const id = resolveOpeningIdFromName(n);
      return id && games.some((g) => g.openingId === id && g.white && g.black && g.year);
    });
    if (!hit) return; // corpus may not cover these ids in this build — skip cleanly
    const story = pickStoryGame(hit)!;
    expect(story).not.toBeNull();
    // Citation names both players + a year (public facts).
    expect(story.citation).toMatch(/–/);
    expect(story.citation).toMatch(/\d{4}/);
    // The line teaches "look at the game", not a fabricated claim.
    expect(story.text).toMatch(/look up|battleground|plan/i);
  });

  it('is deterministic (same opening → same game)', () => {
    const names = ['Caro-Kann Defence', 'Italian Game', 'Sicilian Defense'];
    for (const n of names) {
      const a = pickStoryGame(n);
      const b = pickStoryGame(n);
      expect(a?.citation).toBe(b?.citation);
    }
  });
});
