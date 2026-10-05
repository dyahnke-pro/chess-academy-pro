import { describe, it, expect } from 'vitest';
import { computeMoveFundamentals, MOVE_FUNDAMENTAL_TAG, principleToTeach } from './moveFundamentals';

// PP on the PP (David 2026-10-05): Bg5 pins the f6-knight to the queen and
// e4-e5 attacks it with a pawn — the positive half of `missed-pin-pressure`.
const PILE_ON = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3PP3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5';

describe('pile-on-pin — the move that puts pressure on the pinned piece', () => {
  it('e5 piles on the pinned knight, named from its square, and is not read as a "kick"', () => {
    const fs = computeMoveFundamentals(PILE_ON, 'e5', 'white');
    const pile = fs.find((f) => f.id === 'pile-on-pin');
    expect(pile, JSON.stringify(fs.map((f) => f.id))).toBeTruthy();
    expect(pile!.led).toMatch(/pinned knight on f6/);
    expect(pile!.led).toMatch(/can't run/);
    expect(pile!.squares).toEqual(expect.arrayContaining(['e5', 'f6', 'g5']));
    // A pinned knight is not "kicked off f6" — it cannot leave.
    expect(fs.some((f) => f.id === 'tempo')).toBe(false);
  });

  it('files under the same hole as the miss, so playing it is held evidence', () => {
    expect(MOVE_FUNDAMENTAL_TAG['pile-on-pin']).toBe('missed-tactic');
  });

  it('is taught as a rule with its reason, once a game', () => {
    const p = principleToTeach(PILE_ON, 'e5', 'white', new Set());
    expect(p?.id).toBe('pile-on-pin');
    expect(principleToTeach(PILE_ON, 'e5', 'white', new Set(['pile-on-pin']))?.id).not.toBe('pile-on-pin');
  });

  it('a move that does not pile on carries no pile-on-pin', () => {
    expect(computeMoveFundamentals(PILE_ON, 'a3', 'white').some((f) => f.id === 'pile-on-pin')).toBe(false);
  });
});
