// Hole 5 — model-game criticalMoment grounding.
//
// A model game's `criticalMoments[]` each carry a FEN + annotation shown
// when the viewer pauses at that moment. If a moment's FEN doesn't actually
// occur in the game, the teaching is anchored to a fabricated position —
// the model-game equivalent of inventing a line. This gate replays each
// game's PGN and verifies (a) the PGN is legal end-to-end, and (b) every
// criticalMoment FEN's piece placement matches the real board after the
// move the moment claims (moveNumber + color).
//
// PGN db-anchoring (the opening is real) is covered by
// scripts/audit-pgn-db-anchor.mjs; student-side-wins is enforced at render
// by ModelGamesSection. This gate owns "the paused positions are real."

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import modelGamesRaw from './model-games.json';
import openingManifests from './opening-manifests.json';
import { sourcesAreValid } from './narrationSources';

interface CriticalMoment {
  moveNumber: number;
  color: 'white' | 'black';
  fen: string;
  annotation?: string;
}
interface ModelGame {
  id: string;
  openingId: string;
  pgn: string;
  criticalMoments?: CriticalMoment[];
}

const games = modelGamesRaw as ModelGame[];

/** Piece-placement field only (FEN field 1) — castling/ep/clock vary by
 *  how the FEN was captured and aren't what the teaching points at. */
function placement(fen: string): string {
  return fen.trim().split(/\s+/)[0];
}

/** Replay a numberless or numbered SAN PGN token-by-token, capturing the
 *  placement after each half-move keyed by (moveNumber, color). */
function placementsByMoment(pgn: string): { map: Map<string, string>; illegal: string | null } {
  const c = new Chess();
  const map = new Map<string, string>();
  let moveNo = 1;
  for (const tokRaw of pgn.trim().split(/\s+/).filter(Boolean)) {
    const tok = tokRaw.replace(/^\d+\.+/, '').replace(/[+#!?]+$/, '');
    if (!tok || tok === '1-0' || tok === '0-1' || tok === '1/2-1/2' || tok === '*') continue;
    const turn = c.turn(); // 'w' | 'b' BEFORE the move
    try {
      c.move(tok);
    } catch {
      return { map, illegal: tokRaw };
    }
    const color = turn === 'w' ? 'white' : 'black';
    map.set(`${moveNo}:${color}`, placement(c.fen()));
    if (turn === 'b') moveNo += 1;
  }
  return { map, illegal: null };
}

describe('model-game integrity — legal PGN + grounded critical moments', () => {
  for (const game of games) {
    it(`${game.id}: PGN legal and every criticalMoment FEN occurs in the game`, () => {
      const { map, illegal } = placementsByMoment(game.pgn);
      expect(illegal, `${game.id}: illegal move "${illegal}" in PGN`).toBeNull();

      for (const m of game.criticalMoments ?? []) {
        const key = `${m.moveNumber}:${m.color}`;
        const actual = map.get(key);
        expect(actual, `${game.id}: criticalMoment at ${key} is past the end of the game`).toBeTruthy();
        if (!actual) continue;
        expect(
          placement(m.fen),
          `${game.id}: criticalMoment FEN at ${key} doesn't match the real position after that move ` +
            `(annotation: "${(m.annotation ?? '').slice(0, 60)}…") — the paused position is fabricated or mis-keyed`,
        ).toBe(actual);
      }
    });
  }
});

// Independent-verification gate (David 2026-05-25). Every model game on a
// masterclass opening must record a resolvable source for its overview prose.
// All masterclass games were sourced 2026-05-25, so this gates with no baseline
// escape — a new masterclass model game can't ship unsourced.
describe('masterclass model games cite an independent verification source', () => {
  const masterclass = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
  const unsourced = (modelGamesRaw as Array<{ id: string; openingId: string; sources?: string[] }>)
    .filter((g) => masterclass.has(g.openingId) && !sourcesAreValid(g.sources))
    .map((g) => g.id);

  it('every masterclass model game has a resolvable source', () => {
    expect(unsourced, `Masterclass model games missing a resolvable source (sources: ["book:<id>" | "concept:<id>" | reputable https URL]):\n${unsourced.join('\n')}`).toEqual([]);
  });
});
