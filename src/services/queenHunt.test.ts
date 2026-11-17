import { describe, it, expect } from 'vitest';
import { queenHunt, queenHuntLine, queenSafeSquares } from './queenHunt';

// Real boards from Danya's speedruns (the S4 king group).
const BB5 = 'r1b1k2r/p1pp1ppp/1p5n/4P3/qB1NP3/8/2P2PPP/1RQ1KB1R w Kkq - 2 14';   // hv0P9kotpJw, 14.Bb5
const BG4 = 'rnbq1rk1/pp3pp1/2pb1n1p/4p3/4p3/1BN4N/PPPP1PPP/R1BQKR2 b Q - 1 9';   // LJa5Df75CJI, 9…Bg4
const QA4 = 'r1b1k2r/p1pp1ppp/1p5n/4P3/1B1NP3/8/q1P2PPP/1RQ1KB1R b Kkq - 1 13';    // hv0P9kotpJw, 13…Qa4
const ND4 = 'r1bq1rk1/pp3ppp/2n1p3/1Bbp4/4n3/3P1Q1N/PPP2PPP/RNB1K2R b KQ - 0 9';   // 1Rejj6niwvo, 9…Nd4

describe('queenHunt — a queen with nowhere to run', () => {
  it('Bb5 leaves the queen one safe square, and Rb2 traps it there', () => {
    const h = queenHunt(BB5, 'Bb5', ['a4a2', 'b1b2', 'a2b2']);
    expect(h).toMatchObject({ shape: 'one-square', queen: 'a4', exit: 'a2' });
    expect(h?.net?.san).toBe('Rb2');
    const line = queenHuntLine(h!, 'your', BB5);
    expect(line).toMatch(/a2/);
    expect(line).toMatch(/Rb2 traps it/);
  });

  it('…Bg4 leaves the queen on d1 with no safe square', () => {
    const h = queenHunt(BG4, 'Bg4', null);
    expect(h).toMatchObject({ shape: 'boxed', queen: 'd1', hunter: { square: 'g4', piece: 'b' } });
    expect(queenHuntLine(h!, 'your', BG4)).toMatch(/no safe square|nowhere to run/);
  });

  it('…Qa4 gets the queen off a2, where Ra1 would have trapped it', () => {
    const h = queenHunt(QA4, 'Qa4', null);
    expect(h).toMatchObject({ shape: 'escape', queen: 'a2' });
    expect(h?.net?.san).toBe('Ra1');
  });

  it('stays quiet on a queen hit that has squares to run to', () => {
    // …Nd4 hits the queen on f3, which has safe squares (d1, e3, …).
    expect(queenHunt(ND4, 'Nd4', null)).toBeNull();
    expect(queenSafeSquares('r1bq1rk1/pp3ppp/4p3/1Bbp4/3nn3/3P1Q1N/PPP2PPP/RNB1K2R w KQ - 1 10', 'f3').length).toBeGreaterThan(1);
    // A quiet move that hits no queen.
    expect(queenHunt(BB5, 'Rb2', null)).toBeNull();
  });
});
