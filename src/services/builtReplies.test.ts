// Every tab's replies (WO-ALL-OPENINGS-01): where the opening starts, and a
// reply that is already a taught line is never shown twice.
import { describe, it, expect } from 'vitest';
import { isTaughtLine, openingStartPly, replyStartPly } from './builtReplies';

describe('openingStartPly', () => {
  it('the first ply the line is inside its opening — 1…c5 against 1.e4 is the Sicilian, so a Vienna starts later', () => {
    expect(openingStartPly(['e4', 'e5', 'Nc3', 'Nf6', 'f4'], 'Vienna Game: Vienna Gambit')).toBe(3);
    expect(openingStartPly(['e4', 'c5', 'a3', 'g6'], 'Sicilian Defense: Mengarini Variation')).toBe(2);
  });
  it('the course\'s British spelling is the database\'s family — the Caro-Kann Defence starts after 1…c6, not at a fallback', () => {
    expect(openingStartPly(['e4', 'c6', 'd4', 'd5'], 'Caro-Kann Defence')).toBe(2);
    expect(openingStartPly(['e4', 'e6', 'd4', 'd5'], 'French Defence')).toBe(2);
    // …so a Caro-Kann student meets 2.Nf3 and 2.c4 on the page's own tree.
    expect(replyStartPly(['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'], 'Caro-Kann Defence', 'black')).toBe(2);
  });
});

describe('replyStartPly', () => {
  it('a page named by the OPPONENT\'s move has no replies before it: the Mengarini drops 2.Nf3 and 2.Nc3', () => {
    expect(replyStartPly(['e4', 'c5', 'a3', 'g6', 'h4'], 'Sicilian Defense: Mengarini Variation', 'black')).toBe(3);
    // The Caro-Kann Advance (named by White's 3.e5) drops 2.Nc3 / 3.Nc3.
    expect(replyStartPly(['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5'], 'Caro-Kann Defense: Advance Variation', 'black')).toBe(5);
  });
  it('a page named by the STUDENT\'s move keeps the opponent\'s earlier moves: a Najdorf player still meets 2.c3', () => {
    const najdorf = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3'];
    expect(replyStartPly(najdorf, 'Sicilian Defense: Najdorf Variation', 'black')).toBe(2);
    expect(replyStartPly(['e4', 'c6', 'd4', 'd5'], 'Caro-Kann Defense', 'black')).toBe(2);
  });
  it('a line that does not play the named moves keeps the family start', () => {
    expect(replyStartPly(['e4', 'c5', 'Nf3', 'Nc6'], 'Sicilian Defense: Mengarini Variation', 'black')).toBe(2);
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
