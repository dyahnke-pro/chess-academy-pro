// A pawn race is the whole position (g9 walk 2026-09-27, plies 42-46).
import { describe, it, expect } from 'vitest';
import { readPosition, racingPasser } from './positionalRead';

describe('readPosition during a pawn race', () => {
  // g9 after 23.d6+ — White's d-pawn on d6, two squares from queening.
  const RACE = '2r2b1r/pp2kppp/3P1q2/1B3n2/1P3B2/1P6/4NPPP/R2QK2R b KQ - 0 22';
  it('only the passer and king danger speak', () => {
    expect(racingPasser(RACE)).toBe('d6');
    const kinds = new Set(readPosition(RACE, 'black').map((o) => o.kind));
    for (const k of kinds) expect(['passer', 'king']).toContain(k);
  });
  it('NEGATIVE CONTROL: no race, the structure reads still speak', () => {
    const quiet = 'r1bqkb1r/pp3ppp/2n1pn2/2pp4/3P4/2PBPN2/PP3PPP/RNBQK2R w KQkq - 0 6';
    expect(racingPasser(quiet)).toBeNull();
  });
});
