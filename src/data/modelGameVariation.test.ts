import { describe, it, expect } from 'vitest';
import modelGamesRaw from './model-games.json';
import repertoireRaw from './repertoire.json';
import proRaw from './pro-repertoires.json';
import { createVariationClassifier } from './modelGameVariation.shared.mjs';

// Locks the per-variation model-game tags (David 2026-05-30, fix #1) against
// hand-drift: every `variation` tag must be exactly what the ONE classifier
// (modelGameVariation.shared.mjs, also run by
// scripts/classify-model-game-variations.mjs) derives — the variation the game
// follows deepest by POSITION as well as by move order, else untagged (main
// line). If you change a game's PGN or an opening's variations, re-run the
// classifier (`node scripts/classify-model-game-variations.mjs --write`)
// rather than hand-editing the tag.

interface Variation { name: string; pgn?: string }
interface Opening { id: string; pgn?: string; variations?: Variation[] }
interface Game { id: string; openingId: string; pgn: string; variation?: string }

const games = modelGamesRaw as unknown as Game[];
const openings = [
  ...(Array.isArray(repertoireRaw) ? (repertoireRaw as Opening[]) : []),
  ...(Array.isArray(proRaw) ? (proRaw as Opening[]) : ((proRaw as { openings?: Opening[] }).openings ?? [])),
];
const byId = new Map(openings.map((o) => [o.id, o]));
const classifyVerdict = createVariationClassifier(openings);
const classify = (g: Game): string | undefined => classifyVerdict(g)?.name;

describe('model-game variation tags are the deterministic classifier output', () => {
  it('every stored variation tag matches what the classifier derives', () => {
    const drift = games
      .map((g) => ({ id: g.id, stored: g.variation, expected: classify(g) }))
      .filter((r) => r.stored !== r.expected);
    expect(
      drift,
      `Model-game variation tags drifted from the classifier. Re-run:\n  node scripts/classify-model-game-variations.mjs --write\n${drift
        .map((d) => `  ${d.id}: stored=${JSON.stringify(d.stored)} expected=${JSON.stringify(d.expected)}`)
        .join('\n')}`,
    ).toHaveLength(0);
  }, 180000); // re-derives the classifier across every model game: ~12 s alone, headroom for a shared machine (30 s timed out under load)

  it('files a game that transposes into a tab under that tab, not the tab sharing its move order', () => {
    // GothamChess Vienna vs Kovalev: 2…Nc6 3.Bc4 Nf6 shares the "Quiet vs …Na5"
    // tab's first six moves, then 4.d3 Bc5 5.f4 d6 6.Nf3 Bg4 7.Na4 is the
    // "Vienna Quiet (Bc4 + d3)" line by position for 13 plies. The move-order
    // classifier filed it under Na5.
    const kovalev = games.find((g) => g.id === 'mg-pro-gothamchess-vie-kovalev-quiet');
    expect(kovalev?.openingId).toBe('pro-gothamchess-vienna');
    expect(kovalev?.pgn.startsWith('e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Bg4 Na4')).toBe(true);
    expect(kovalev && classify(kovalev)).toBe('Vienna Quiet (Bc4 + d3)');
    expect(kovalev?.variation).toBe('Vienna Quiet (Bc4 + d3)');
  });

  it('every tagged variation names a real variation of its opening', () => {
    const bad = games
      .filter((g) => g.variation)
      .filter((g) => !(byId.get(g.openingId)?.variations || []).some((v) => v.name === g.variation));
    expect(bad.map((g) => `${g.id} → ${g.variation}`)).toHaveLength(0);
  });

  it('no opening lists the same game (PGN) twice', () => {
    // A duplicate PGN under one opening shows the identical game twice in the
    // Model Games list (the GothamChess boilerplate-import bug, David 2026-06-23).
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const g of games) {
      const key = `${g.openingId}\u0000${g.pgn}`;
      const first = seen.get(key);
      if (first) dupes.push(`${g.id} duplicates ${first} (${g.openingId})`);
      else seen.set(key, g.id);
    }
    expect(dupes, `Duplicate model games within an opening:\n${dupes.join('\n')}`).toHaveLength(0);
  });
});
