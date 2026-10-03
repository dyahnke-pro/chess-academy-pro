import { describe, it, expect } from 'vitest';
import { moveCostOneSearch, uciOfSan } from './moveCost';
import type { MoveScorer } from './pvPlayback';

const never: MoveScorer = { scoreMoves: () => { throw new Error('the fan held both moves — no second search'); } };

describe('a move\'s cost comes from one search (walk oct3c)', () => {
  // 6.Qd3: the fan scores Qd1 -263 and Qd3 -303 (White POV) — 40cp apart in one
  // tree, where a read before minus a time-boxed read after said "more than a pawn".
  const FEN = 'r1bqkbnr/1p1p1ppp/p3p3/2p1P3/2Bn4/1P6/P1PPQPPP/RNB1K1NR w KQkq - 1 6';
  const fan = { topLines: [
    { evaluation: -263, mate: null, moves: ['e2d1', 'd8g5'] },
    { evaluation: -303, mate: null, moves: ['e2d3', 'b7b5'] },
  ] };
  it('reads both moves off the fan when it holds them', async () => {
    expect(await moveCostOneSearch({ fenBefore: FEN, playedUci: 'e2d3', fan, scorer: never, depth: 12 })).toBe(40);
  });
  it('best move costs nothing', async () => {
    expect(await moveCostOneSearch({ fenBefore: FEN, playedUci: 'e2d1', fan, scorer: never, depth: 12 })).toBe(0);
  });
  it('outside the fan: scores best and played together', async () => {
    const asked: string[][] = [];
    const scorer: MoveScorer = { async scoreMoves(_f, ucis) { asked.push([...ucis]); return [
      { evaluation: -263, mate: null, moves: ['e2d1'] }, { evaluation: -404, mate: null, moves: ['e2e4'] }]; } };
    expect(await moveCostOneSearch({ fenBefore: FEN, playedUci: 'e2e4', fan, scorer, depth: 12 })).toBe(141);
    expect(asked).toEqual([['e2d1', 'e2e4']]);
  });
  it('Black to move reads from Black\'s seat', async () => {
    const f = 'r4rk1/p2q1pbp/1p2p1pn/3p4/3P2P1/1PP2Q2/P4P1P/RNB1K2R b KQ - 0 14';
    const scorer: MoveScorer = { async scoreMoves() { return [
      { evaluation: -239, mate: null, moves: ['e6e5'] }, { evaluation: 0, mate: null, moves: ['b6b5'] }]; } };
    expect(await moveCostOneSearch({ fenBefore: f, playedUci: 'b6b5', fan: { topLines: [{ evaluation: -239, mate: null, moves: ['e6e5'] }] }, scorer, depth: 12 })).toBe(239);
  });
  it('a mate either side is not centipawns', async () => {
    const scorer: MoveScorer = { async scoreMoves() { return [
      { evaluation: 0, mate: 3, moves: ['e2d1'] }, { evaluation: -300, mate: null, moves: ['e2e4'] }]; } };
    expect(await moveCostOneSearch({ fenBefore: FEN, playedUci: 'e2e4', fan: { topLines: [{ evaluation: 0, mate: 3, moves: ['e2d1'] }] }, scorer, depth: 12 })).toBeNull();
  });
  it('uciOfSan', () => {
    expect(uciOfSan(FEN, 'Qd3')).toBe('e2d3');
    expect(uciOfSan(FEN, 'Qh8')).toBeNull();
  });
});
