// A RESOURCE "STILL IN HAND" IS ONE THE BISHOP CAN USE (task 172, 2026-11-11).
// "The bishop check is still in hand — it bites once their knight is on c3"
// was said with a3 played (the bishop is taken on b4), with their queen on a4
// (the same), and in the middle of an exchange or with a piece of theirs to
// take. Each board is a logged fact, and each fails on the code before the fix.
import { describe, it, expect } from 'vitest';
import { heldResource } from './holdResource';

const held = (fen: string, san: string): string | null => heldResource(fen, san, san, 0)?.text ?? null;

describe('the saved bishop move must be usable', () => {
  it('with a3 played the bishop is simply taken on b4: nothing is in hand (Petrosian Queen’s Indian)', () => {
    expect(held('rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/P4N2/1P2PPPP/RNBQKB1R b KQkq - 0 4', 'Bb7')).toBeNull();
  });

  it('with their queen on a4 a bishop on b4 is taken (Miles Queen’s Indian)', () => {
    expect(held('rn1qkb1r/p1pp1ppp/bp2pn2/8/Q1PP4/5NP1/PP2PP1P/RNB1KB1R b KQkq - 2 5', 'Bb7')).toBeNull();
  });

  it('in the middle of an exchange their knight does not "come to c3": they take back first (Schliemann …Nxe5)', () => {
    expect(held('r1bqkbnr/pppp2pp/2n5/1B2N3/3Pp3/8/PPP2PPP/RNBQK2R b KQkq - 0 5', 'Nxe5')).toBeNull();
  });

  it('with their bishop to take once the knight is out, the pin is not the move (Schliemann …c6)', () => {
    expect(held('r1bqkbnr/pppp2pp/8/1B2P3/4p3/8/PPP2PPP/RNBQK2R b KQkq - 0 6', 'c6')).toBeNull();
  });

  it('the real one is still said: 4.e3 in the Queen’s Indian, …Bb4 pins the knight once it is on c3', () => {
    expect(held('rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/4PN2/PP3PPP/RNBQKB1R b KQkq - 0 4', 'Bb7')).toMatch(/c3/);
  });
});
