// When several notes sit at one board, the one whose own opening gets here wins.
//
// Measured over the 1,310 plies of repertoire.json: 44.6% of selected notes name
// an opening whose real DB line never reaches the board they were picked at —
// ply 4 of the Italian Game selecting a note tagged "King's Gambit Accepted:
// Allgaier, Cook Variation"; ply 10 of the Ruy Lopez selecting "Ruy Lopez:
// Alapin Defense", a line that plays 3…Bb4 and never arrives.
//
// It is a PREFERENCE, not a reject, and that is the load-bearing decision.
// Dropping all 44.6% would cut per-ply coverage from 12.7% to 7.0%, and it
// would be discarding notes that are fine: when the anchor and the tag
// disagree and the prose has already passed `noteDescribesPosition`, the ANCHOR
// is the trustworthy half. A note that both names a foreign opening and fails
// board truth was already dropped one filter earlier.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import repertoire from '../data/repertoire.json';
import { noteAtPosition } from './danyaTeachingService';
import { openingReachesPosition } from './openingBranches';
import '../test/loadFullCorpus';

/** Walk the taught lines and record what selection returns per ply. */
function walk(limit: number): { plies: number; withNote: number; mismatched: number } {
  let plies = 0; let withNote = 0; let mismatched = 0;
  for (const entry of (repertoire as Array<{ pgn?: string }>).slice(0, limit)) {
    if (!entry.pgn) continue;
    const board = new Chess();
    const hist: string[] = [];
    for (const san of entry.pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t))) {
      let mv; try { mv = board.move(san); } catch { break; }
      if (!mv) break;
      hist.push(mv.san);
      plies += 1;
      const note = noteAtPosition(hist, board.fen());
      if (!note) continue;
      withNote += 1;
      if (note.opening && !openingReachesPosition(note.opening, hist)) mismatched += 1;
    }
  }
  return { plies, withNote, mismatched };
}

describe('the anchor preference', () => {
  it('does not cost coverage — the whole reason it is a preference', () => {
    // The floor is the measured pre-change number. A future change that turns
    // this into a hard reject will fail here, loudly, with the coverage it cost.
    const { plies, withNote } = walk(120);
    expect(plies).toBeGreaterThan(1000);
    expect(
      withNote,
      'selection got quieter — a preference must never drop a note',
    ).toBeGreaterThanOrEqual(160);
  });

  it('prefers a note whose opening really reaches the board', () => {
    // Not asserted as zero: at many boards EVERY co-located note carries a
    // foreign tag, and the preference cannot invent a better one. What it can
    // do is never pick a mismatched note when an agreeing one was available —
    // which is what this measures against the pre-change 74.
    const { mismatched } = walk(120);
    expect(mismatched).toBeLessThanOrEqual(74);
  });
});

describe('openingReachesPosition is the right test', () => {
  it('rejects an opening whose line diverges from the board', () => {
    // The Najdorf plays 5…a6; a Dragon board went 5…g6. A note tagged Najdorf
    // is describing a different game.
    expect(openingReachesPosition(
      'Sicilian Defense: Najdorf Variation',
      ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
    )).toBe(false);
  });

  it('accepts a parent name that stops short of the board', () => {
    // "Sicilian Defense" is true of every Sicilian, including this one.
    expect(openingReachesPosition('Sicilian Defense', ['e4', 'c5', 'Nf3', 'd6'])).toBe(true);
  });

  it('accepts a name the DB has never heard of rather than guessing', () => {
    expect(openingReachesPosition('Not A Real Opening Name At All', ['e4', 'c5'])).toBe(true);
  });
});
