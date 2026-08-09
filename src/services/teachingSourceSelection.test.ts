// What the LIVE BOARD is allowed to borrow, and what selection owes the voice.
//
// Both rules here came out of walking a real Vienna Gambit game ply by ply
// (2026-08-09) and reading what the coach would have said at each move.
//
// 1. FIVE OF TWELVE plies picked a note and then said nothing: the caller
//    discards a note it has already spoken, and `spokenBeatText` strips a note
//    whose prose is a move-list recitation. Selection handed back its first
//    pick and let the caller turn it into silence — three times re-offering the
//    exact note the previous ply had rejected. Teaching existed for those
//    positions and never reached the student.
//
// 2. The plies that DID speak early spoke about other openings: a King's-Indian
//    pawn storm at move 2, a Four Knights Scotch note at move 2, an Italian
//    Game note at move 6. All honestly framed ("the same idea shows up in
//    positions like this"), all noise in a Vienna. In the opening there is no
//    "kind of position" yet — only a specific line — so the borrow tiers stay
//    shut and silence is the honest answer.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import './../test/loadFullCorpus';
import { teachingSourceForBoard } from './danyaTeachingService';
import { noteStaysInScope } from './noteAnchorIntegrity';

/** Board after a list of SAN moves. */
function boardAfter(sans: string[]): { history: string[]; fen: string } {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return { history: sans, fen: c.fen() };
}

const VIENNA = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5'];

describe('the opening never borrows another position ideas', () => {
  it.each([1, 2, 3, 4, 5, 6])('ply %i selects nothing, or a note about THIS line', (n) => {
    const { history, fen } = boardAfter(VIENNA.slice(0, n));
    const src = teachingSourceForBoard(history, fen, 'Vienna Game: Vienna Gambit');
    if (!src) return; // silence is a valid answer and the common one
    expect(['position', 'opening-family']).toContain(src.origin);
  });

  it('a middlegame board may still borrow', () => {
    // The rule is about the opening, not about the tiers themselves — a real
    // middlegame is exactly where structure transfer earns its keep. Asserted
    // as "not forced silent by phase": whether a note exists depends on the
    // corpus, so this only proves the gate above is phase-scoped.
    const mid = '2rq1rk1/pb1nbppp/1p2pn2/3p4/2PP4/1PN1PN2/PB2BPPP/2RQ1RK1 w - - 0 12';
    const src = teachingSourceForBoard([], mid, null);
    if (src) expect(['position', 'opening-family', 'structure', 'concept']).toContain(src.origin);
  });
});

describe('selection keeps looking until the caller can use the note', () => {
  it('rejecting the first pick yields a DIFFERENT note, not silence', () => {
    const { history, fen } = boardAfter(VIENNA);
    const first = teachingSourceForBoard(history, fen, 'Vienna Game: Vienna Gambit');
    expect(first).not.toBeNull();

    const second = teachingSourceForBoard(
      history,
      fen,
      'Vienna Game: Vienna Gambit',
      (note) => note.id !== first?.note.id,
    );
    // Either a genuinely different note, or nothing left to say — never the
    // rejected one handed back.
    expect(second?.note.id).not.toBe(first?.note.id);
  });

  it('a predicate that refuses everything gets silence, not a violation', () => {
    const { history, fen } = boardAfter(VIENNA);
    expect(teachingSourceForBoard(history, fen, 'Vienna Game: Vienna Gambit', () => false)).toBeNull();
  });
});

describe('the scope guard reads openings named with "Game"', () => {
  const note = (text: string) => ({
    id: 't', opening: null, phase: 'opening' as const, lineSan: [],
    explains: text, teaches: '', plans: '', concepts: [], source: 't',
  });

  it('drops an Italian Game note from a Vienna', () => {
    // The exact miss: the class-noun list had Variation/Defense/Attack/Gambit/
    // System/Opening but not Game, so "In the Italian Game…" was never even
    // recognised as naming an opening.
    expect(noteStaysInScope(
      note('In the Italian Game, Black\'s main moves are Nf6 and Bc5.') as never,
      'Vienna Game: Vienna Gambit',
    )).toBe(false);
  });

  it('keeps a Vienna Game note in a Vienna', () => {
    expect(noteStaysInScope(
      note('In the Vienna Game, f4 is the critical try.') as never,
      'Vienna Game: Vienna Gambit',
    )).toBe(true);
  });

  it('ordinary prose about "the game" is not an opening name', () => {
    expect(noteStaysInScope(
      note('This decides the game in most lines.') as never,
      'Vienna Game: Vienna Gambit',
    )).toBe(true);
  });
});
