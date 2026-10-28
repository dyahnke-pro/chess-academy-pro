// Every tab's replies (WO-ALL-OPENINGS-01): where the opening starts, and a
// reply that is already a taught line is never shown twice.
import { describe, it, expect } from 'vitest';
import { isTaughtLine, openingStartPly } from './builtReplies';

describe('openingStartPly', () => {
  it('the first ply the line is inside its opening — 1…c5 against 1.e4 is the Sicilian, so a Vienna starts later', () => {
    expect(openingStartPly(['e4', 'e5', 'Nc3', 'Nf6', 'f4'], 'Vienna Game: Vienna Gambit')).toBe(3);
    expect(openingStartPly(['e4', 'c5', 'a3', 'g6'], 'Sicilian Defense: Mengarini Variation')).toBe(2);
  });
});

describe('isTaughtLine', () => {
  const reply = { triggerMove: 'Nf3', name: '', pct: 20, games: 50, moves: ['e4', 'c5', 'Nf3', 'd6'], atPly: 2, reachesMiddlegame: false };
  it('a reply a tab already teaches is that tab', () => {
    expect(isTaughtLine(reply, [['e4', 'c5', 'Nf3', 'Nc6']])).toBe(true);
  });
  it('a reply no line plays is a reply', () => {
    expect(isTaughtLine(reply, [['e4', 'c5', 'c3'], ['e4', 'c5']])).toBe(false);
  });
});
