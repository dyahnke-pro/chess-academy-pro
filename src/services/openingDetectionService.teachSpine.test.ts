import { describe, it, expect } from 'vitest';
import { resolveTeachSpine, resolveOpeningEntry, detectOpening } from './openingDetectionService';
// Typed via `variationMiddlegameDepth.shared.d.mts` (2026-09-21) — the
// suppression this replaces made every call an unsafe `any` call.
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

describe('a transposition is named by the position it reaches (hand walk 2340)', () => {
  it('1.e4 Nc6 2.Nf3 e5 is the open game, not the Nimzowitsch; Bb5 makes it a Ruy Lopez', () => {
    expect(detectOpening(['e4', 'Nc6', 'Nf3', 'e5'])?.name).not.toMatch(/Nimzowitsch/);
    expect(detectOpening(['e4', 'Nc6', 'Nf3', 'e5', 'Bb5'])?.name).toBe('Ruy Lopez');
  });
  it('the move-order match still names a game that never transposes', () => {
    expect(detectOpening(['e4', 'Nc6', 'Nf3'])?.name).toMatch(/Nimzowitsch/);
    expect(detectOpening(['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'])?.name).toBe('Nimzo-Indian Defense');
  });
});

describe('resolveTeachSpine — the exact line the caller holds (WO-ALL-OPENINGS-01 O4)', () => {
  const REPLY = ['e4', 'e5', 'Bc4', 'Nc6', 'Nc3', 'Nf6', 'd3', 'Na5', 'Nge2', 'Nxc4', 'dxc4', 'Bc5'];

  it('teaches the caller\'s moves, never the name\'s shortest row', () => {
    const named = resolveTeachSpine("Bishop's Opening", REPLY, { extendToMiddlegame: true });
    expect(named.spineMoves.slice(0, REPLY.length)).not.toEqual(REPLY);
    const exact = resolveTeachSpine("Bishop's Opening", REPLY, { extendToMiddlegame: true, exactLine: true });
    expect(exact.spineMoves.slice(0, REPLY.length)).toEqual(REPLY);
  });

  it('an extension may only carry the exact line further', () => {
    const short = ['e4', 'e5', 'Bc4', 'Bc5'];
    const res = resolveTeachSpine("Bishop's Opening", short, { extendToMiddlegame: true, exactLine: true });
    expect(res.spineMoves.slice(0, short.length)).toEqual(short);
  });
});
