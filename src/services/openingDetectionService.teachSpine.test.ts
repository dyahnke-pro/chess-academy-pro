import { describe, it, expect } from 'vitest';
import { resolveTeachSpine, resolveOpeningEntry } from './openingDetectionService';
// @ts-expect-error — plain-JS shared metric, no type decls
import { reachesMiddlegame } from '../data/variationMiddlegameDepth.shared.mjs';

/**
 * Regression guard for the "coach doesn't get me to the middlegame" bug
 * (David 2026-07-15). The teach walkthrough's main line (spine + the
 * auto-advanced top branch) MUST reach a middlegame in full pace.
 * `resolveTeachSpine` guarantees it: it extends the spine (same-prefix,
 * then a family trunk mainline) when the shortest-canonical spine's forks
 * don't carry the line past the opening. Every move stays a real DB line
 * (G3 — never invented).
 */

function mainLinePgn(canonicalName: string, moves: string[]): string {
  const res = resolveTeachSpine(canonicalName, moves, { extendToMiddlegame: true });
  const top = res.branches[0];
  return top
    ? [...res.spineMoves, top.san, ...top.extensionMoves].join(' ')
    : res.spineMoves.join(' ');
}

// A cross-section: openings that already reached the middlegame via forks
// PLUS the four that used to leaf in the opening (Scandinavian / Slav /
// Philidor bare entries are short sidelines; Benoni's spine was a short
// prefix of a deeper line).
const OPENINGS = [
  'Caro-Kann Defense', 'French Defense', 'Italian Game', 'Ruy Lopez',
  'Sicilian Defense', 'Vienna Game', 'Pirc Defense', 'Scandinavian Defense',
  'Slav Defense', 'Philidor Defense', 'Benoni Defense', "Queen's Gambit",
  "King's Indian Defense", 'Nimzo-Indian Defense', 'Scotch Game',
];

describe('resolveTeachSpine — main line reaches the middlegame (full pace)', () => {
  for (const name of OPENINGS) {
    it(`"${name}" main line reaches a middlegame`, () => {
      const entry = resolveOpeningEntry(name);
      expect(entry, `no DB entry for ${name}`).not.toBeNull();
      const pgn = mainLinePgn(entry!.canonicalName, entry!.moves);
      const r = reachesMiddlegame(pgn);
      expect(
        r.pass,
        `${name} main line stops before the middlegame: ${pgn} (${r.plies} plies, wCastle=${r.wCastle} bCastle=${r.bCastle} wDev=${r.wDev} bDev=${r.bDev})`,
      ).toBe(true);
    });
  }

  it('the four repaired openings actually invoke the extension', () => {
    for (const name of ['Scandinavian Defense', 'Slav Defense', 'Philidor Defense', 'Benoni Defense']) {
      const entry = resolveOpeningEntry(name)!;
      const res = resolveTeachSpine(entry.canonicalName, entry.moves, { extendToMiddlegame: true });
      expect(res.extendedToMiddlegame, `${name} should have been extended`).toBe(true);
    }
  });

  it('tour pace does NOT extend the spine (quick taste)', () => {
    const entry = resolveOpeningEntry('Scandinavian Defense')!;
    const res = resolveTeachSpine(entry.canonicalName, entry.moves, { extendToMiddlegame: false });
    expect(res.extendedToMiddlegame).toBe(false);
  });

  it('every extended/family spine is a legal move sequence (G3)', () => {
    // reachesMiddlegame replays via chess.js and throws on an illegal move,
    // so a passing reachesMiddlegame above already proves legality — assert
    // it explicitly here for the repaired set from the standard start.
    for (const name of ['Scandinavian Defense', 'Slav Defense', 'Philidor Defense', 'Benoni Defense']) {
      const entry = resolveOpeningEntry(name)!;
      const res = resolveTeachSpine(entry.canonicalName, entry.moves, { extendToMiddlegame: true });
      expect(() => reachesMiddlegame(res.spineMoves.join(' '))).not.toThrow();
    }
  });
});
