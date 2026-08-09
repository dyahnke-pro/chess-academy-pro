// The phase-transition ritual was the one selection site with no scope guard.
//
// Every other path asks `noteStaysInScope`; `transitionTeachingSourceForGame`
// asked only whether a note had plans and taught chess rather than its own
// source. Nothing forced the ritual to stay inside the opening being played,
// on any of its five tiers — including the gap tier, which reaches by NAME
// overlap and is the fuzzy arm this guard exists for.
//
// HONEST SCOPE OF THIS GATE. It holds the invariant across the openings we
// teach; it is a net, not a reproduction. The line that sent me looking —
// "the critical moment is when white plays Ba4" during a Dragon — is NOT
// caught by it and never could be: that note (dt-5t4) is tagged "Sicilian
// Defense: Najdorf Variation" and teaches the Bb5 systems, so it is genuinely
// Sicilian and clears any token-overlap check against a Dragon. Wrong
// sub-line inside the right family is a separate, unsolved problem, and it
// needs the board, not the name.
import { describe, it, expect } from 'vitest';
import '../test/loadFullCorpus';
import { transitionTeachingSourceForGame } from './danyaTeachingService';
import { noteStaysInScope } from './noteAnchorIntegrity';

/** A real middlegame in each, so the ritual has something to choose from. */
const GAMES: Array<[string, string[], string]> = [
  ['Sicilian Defense: Dragon Variation',
    ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
    'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7'],
  ['French Defense',
    ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
    'rnbqkb1r/ppp2ppp/4pn2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 4'],
  ['Caro-Kann Defense',
    ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
    'rn1qkbnr/pp2pppp/2p5/5b2/3PN3/8/PPP2PPP/R1BQKBNR w KQkq - 2 5'],
  ['Italian Game',
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'],
    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 4 5'],
  ["Queen's Gambit Declined",
    ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'],
    'rnbqk2r/ppp1bppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR w KQkq - 4 5'],
];

describe('a transition ritual stays inside the opening being played', () => {
  it.each(GAMES)('%s picks a note that belongs to it', (name, sans, fen) => {
    const src = transitionTeachingSourceForGame({ historySans: sans, fen, openingName: name });
    if (!src) return; // silence is in scope by definition
    expect(
      noteStaysInScope(src.note, name),
      `${name} was handed ${src.note.id} (${src.note.opening}) via ${src.origin}`,
    ).toBe(true);
  });

  it('the guard does not silence the ritual', () => {
    // The point is a note about THIS opening, not no note at all — a guard
    // that buys scope by going quiet has traded one failure for another.
    const spoke = GAMES.filter(([name, sans, fen]) =>
      transitionTeachingSourceForGame({ historySans: sans, fen, openingName: name }));
    expect(spoke.length).toBe(GAMES.length);
  });

  it('an unnamed game has no scope to violate', () => {
    const [, sans, fen] = GAMES[0];
    expect(() => transitionTeachingSourceForGame({ historySans: sans, fen, openingName: null })).not.toThrow();
  });
});
