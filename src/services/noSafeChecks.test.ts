import { describe, expect, it } from 'vitest';
import { noSafeChecks } from './noSafeChecks';

// Carlsen's ending (magnus-carlsens-best-endgame-wins#3): White's two checks both drop the rook,
// while Black has ...Bh5+ in hand.
const CARLSEN = '3k4/2p2b2/2PpR3/3P1pP1/3P4/p4KNr/P7/8 w - - 0 54';
// Wallach–Naroditsky (tales-from-a-grandmaster#1), where Danya says he is "all out of meaningful
// checks": by the board ...Qa7+ is safe (and the engine's second line), so the read stays silent.
const WALLACH = '3r3k/1q4bP/p3Q3/4B3/5N1R/4K3/1p6/8 b - - 0 37';

describe('noSafeChecks', () => {
  it('names their safe check while every check you have gives the piece away', () => {
    const r = noSafeChecks(CARLSEN, 'w');
    expect(r?.yourChecks.length).toBe(2);
    expect(r?.theirSafeChecks).toEqual(['Bh5+']);
    expect(r?.text).toContain('your two checks all give the checking piece away');
  });
  it('stays silent when one of your checks is safe', () => {
    expect(noSafeChecks(WALLACH, 'b')).toBeNull();
  });
  it('stays silent with no checks at all, and in check', () => {
    expect(noSafeChecks('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w')).toBeNull();
    expect(noSafeChecks('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1', 'w')).toBeNull();
  });
});

// learn-mistakes-only bug 10: a mate in one is said as the mate, never listed
// as "a safe check".
describe('noSafeChecks — their mate is not a "safe check"', () => {
  it('back-rank Ra1# is named as mate in one', () => {
    // White to move: Ne7+ (…Bxe7) and Nf6+ (…gxf6) both lose the knight, and
    // Black threatens …Ra1#.
    const fen = 'r2b2k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1';
    const mine = noSafeChecks(fen, 'w');
    expect(mine?.text).toMatch(/mate in one with Ra1#/);
    expect(mine?.text).not.toMatch(/safe checks? in [^,]*Ra1#/);
    const theirs = noSafeChecks(fen, 'b');
    expect(theirs?.text).toMatch(/while you still have mate in one with Ra1#/);
  });
});
