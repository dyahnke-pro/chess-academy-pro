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
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import repertoire from '../data/repertoire.json';
import { noteAtPosition } from './danyaTeachingService';
import { openingReachesPosition } from './openingBranches';
// 🔒 CALL IT, DO NOT MERELY IMPORT IT (2026-09-17). `loadFullCorpus` exports a
// FUNCTION and does nothing on import, so this side-effect-only import primed
// nothing: selection saw the two STATIC corpora, which have been floating-only
// since the anchored farmed notes were archived on 2026-08-26, and the exact
// tier therefore returned ZERO notes over 1,300+ plies.
//
// The floors below are the numbers this gate was WRITTEN against, so they are
// the proof it was once measuring a loaded corpus and stopped. The helper's own
// header warns about exactly this failure — "a gate written without it passes
// while testing a fifth of the data" — and this gate fell into it.
import { loadFullCorpus } from '../test/loadFullCorpus';

/** Walk the taught lines and record what selection returns per ply.
 *
 *  TWO coverage counts, because TWO mechanisms can drop a note and conflating
 *  them makes this gate blame the wrong one:
 *   • `withNote`   — what the student on THIS line's seat actually hears.
 *   • `eitherSeat` — what the corpus has at that board for either seat. This is
 *     the number the anchor PREFERENCE is answerable for; it is seat-blind, so
 *     it isolates the preference from the seat guard. */
function walk(limit: number): { plies: number; withNote: number; eitherSeat: number; mismatched: number } {
  let plies = 0; let withNote = 0; let eitherSeat = 0; let mismatched = 0;
  for (const entry of (repertoire as Array<{ pgn?: string; color?: string }>).slice(0, limit)) {
    if (!entry.pgn) continue;
    const board = new Chess();
    const hist: string[] = [];
    for (const san of entry.pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t))) {
      let mv; try { mv = board.move(san); } catch { break; }
      if (!mv) break;
      hist.push(mv.san);
      plies += 1;
      const seat: 'white' | 'black' = entry.color === 'black' ? 'black' : 'white';
      const other: 'white' | 'black' = seat === 'white' ? 'black' : 'white';
      const note = noteAtPosition(hist, board.fen(), null, seat);
      if (note || noteAtPosition(hist, board.fen(), null, other)) eitherSeat += 1;
      if (!note) continue;
      withNote += 1;
      if (note.opening && !openingReachesPosition(note.opening, hist)) mismatched += 1;
    }
  }
  return { plies, withNote, eitherSeat, mismatched };
}

describe('the anchor preference', () => {
  beforeAll(() => {
    const loaded = loadFullCorpus();
    const total = loaded.reduce((n, c) => n + c.notes, 0);
    // Non-vacuity: with the fetched corpora missing from disk every assertion
    // below would measure an empty index and this gate would be theatre.
    expect(total, `corpora loaded: ${JSON.stringify(loaded)}`).toBeGreaterThan(20_000);
  }, 180_000);

  it('does not cost coverage — the whole reason it is a preference', () => {
    // The floor is the measured pre-change number. A future change that turns
    // this into a hard reject will fail here, loudly, with the coverage it cost.
    //
    // 🔒 MEASURED SEAT-BLIND, ON PURPOSE (2026-09-17). This asserted the
    // student's-seat count, which conflates the preference with the SEAT GUARD
    // added the same day — and the guard's job is precisely to refuse notes, so
    // the gate would have read a deliberate correctness fix as a coverage
    // regression and pushed the next reader to weaken the guard. The preference
    // is answerable for whether the corpus is REACHED here; who may hear it is
    // the guard's question and has its own assertion below.
    const { plies, eitherSeat } = walk(120);
    expect(plies).toBeGreaterThan(1000);
    expect(
      eitherSeat,
      'selection got quieter — a preference must never drop a note',
    ).toBeGreaterThanOrEqual(160);
  });

  it('the seat guard is what costs the rest, and it costs lies', () => {
    // Over the same 1,310 plies: 205 boards have a note for SOME seat, 131 for
    // the seat this line is taught from. The 74-note gap is voiced prose
    // written from the other side of the board — "your knight" about the
    // opponent's knight — which is why the guard refuses it rather than
    // reframing it (second-person prose cannot be flipped). See
    // `noteSeatMatches`.
    //
    // A FLOOR, so a future change that silently widens the guard shows up here.
    // If this number has to move down again, the question to answer first is
    // whether the newly-refused notes are lies too.
    const { withNote, eitherSeat } = walk(120);
    expect(withNote, 'the seat guard got hungrier — check what it is now refusing')
      .toBeGreaterThanOrEqual(125);
    expect(eitherSeat).toBeGreaterThan(withNote);
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
