import { describe, expect, it } from 'vitest';
import { threatTheyMake } from './positionFacts';
import { computeMustDefend } from './threatOut';

// "THEIR THREAT FIRST" ONLY OF A THREAT THE BEST MOVE ANSWERS, MATE FIRST
// (Danya narration test 2026-11-19).
describe('threatTheyMake', () => {
  it('their mate in one is the threat, named as mate, when the best move stops it', () => {
    // White: Kg1, pawns f2 g2 h2. Black: Kg8, Re8 — …Re1# threatens; h3 stops it.
    const fen = '4r1k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1';
    const t = threatTheyMake(fen, 'w', computeMustDefend(fen, 'w'), 'h2h3');
    expect(t?.words).toBe('mate on e1');
  });
  it('a threatened piece the best move leaves where it is is not "first"', () => {
    // Black's rook on b8 hits the bishop on b2; White's best ignores it.
    const fen = '1r4k1/5ppp/8/8/8/8/1B3PPP/6K1 w - - 0 1';
    const md = computeMustDefend(fen, 'w');
    expect(md.net).toBeGreaterThan(0);
    expect(threatTheyMake(fen, 'w', md, 'h2h3')).toBeNull();
    // negative control: the move that saves the bishop makes it first
    expect(threatTheyMake(fen, 'w', md, 'b2c3')?.square).toBe('b2');
  });
});
