import { describe, it, expect } from 'vitest';
import { createStandingFactMemory, fullmoveOf } from './standingFactMemory';

describe('standingFactMemory — one copy of the forget-on-rewind rule', () => {
  it('says a standing fact once while the game moves forward', () => {
    const m = createStandingFactMemory();
    m.observe(5); m.remember('your d5 pawn is backward');
    expect(m.observe(6)).toBe(false);
    expect(m.said.has('your d5 pawn is backward')).toBe(true);
  });

  it('FORGETS when the board goes backwards — a new or rewound game', () => {
    const m = createStandingFactMemory();
    m.observe(12); m.remember('their bishop is buried');
    expect(m.observe(3), 'rewind must forget').toBe(true);
    expect(m.said.size).toBe(0);
  });

  it('a second game inside one mount does not inherit the first game\'s silence', () => {
    // Neither surface has a game id — this is the whole reason the rule exists.
    const m = createStandingFactMemory();
    for (let i = 1; i <= 20; i++) m.observe(i);
    m.remember('standing fact');
    m.observe(1);                       // game two, move one
    expect(m.said.has('standing fact')).toBe(false);
  });

  it('the set handed out stays live after a forget', () => {
    // The caller passes `said` as `alreadySaid`; a stale reference to the
    // pre-forget Set would silently keep suppressing.
    const m = createStandingFactMemory();
    m.observe(9); m.remember('a');
    m.observe(2);
    m.remember('b');
    expect([...m.said]).toEqual(['b']);
  });

  it('rememberAll takes the pf.remember shape', () => {
    const m = createStandingFactMemory();
    m.observe(4); m.rememberAll(['x', 'y']);
    expect(m.said.size).toBe(2);
  });

  it('fullmoveOf reads the FEN, and never throws on junk', () => {
    expect(fullmoveOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(1);
    expect(fullmoveOf('8/8/8/8/8/8/8/8 w - - 0 37')).toBe(37);
    expect(fullmoveOf('nonsense')).toBe(1);
    expect(fullmoveOf('')).toBe(1);
  });
});
