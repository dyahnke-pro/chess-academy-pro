import { describe, it, expect } from 'vitest';
import { engineReadLines } from './engineReadNarration';
import type { StockfishAnalysis, AnalysisLine } from '../types';

const line = (rank: number, cp: number, extra: Partial<AnalysisLine> = {}): AnalysisLine => ({
  rank, evaluation: cp, moves: ['e2e4'], mate: null, wdl: null, seldepth: 20, bound: null, ...extra,
});

const analysis = (o: Partial<StockfishAnalysis> = {}): StockfishAnalysis => ({
  bestMove: 'e2e4', evaluation: 0, isMate: false, mateIn: null, depth: 14,
  topLines: [line(1, 0)], nodesPerSecond: 0, wdl: null, seldepth: 20,
  nodes: 1000, timeMs: 100, hashfull: 100, ...o,
});

describe('the engine read, spoken', () => {
  it('reads a winning position for the side that is actually winning', () => {
    // White-POV 700 win. The WHITE student is the one winning.
    const a = analysis({ wdl: { win: 700, draw: 200, loss: 100 } });
    expect(engineReadLines(a, 'white')[0]?.text).toContain('come out on top');
    // The same numbers to a BLACK student describe a position going AGAINST
    // them. Reading the engine's white-POV number as though it were the
    // student's is the wrong-colour class of bug, in a lane made of numbers.
    expect(engineReadLines(a, 'black')[0]?.text).toContain('goes against you');
  });

  it('names a drawish position rather than calling it a slim edge', () => {
    const a = analysis({ wdl: { win: 200, draw: 700, loss: 100 } });
    expect(engineReadLines(a, 'white')[0]?.text).toContain('heading for a draw');
  });

  it('says NOTHING when the engine has found forced mate', () => {
    // WDL collapses to 1000/0/0 on a mate score, and "you win almost always" is
    // a comically weak way to say "there is a forced mate". The mate lanes own
    // that moment.
    const a = analysis({ isMate: true, mateIn: 3, wdl: { win: 1000, draw: 0, loss: 0 } });
    expect(engineReadLines(a, 'white')).toHaveLength(0);
  });

  it('refuses the outcome read when the score is only a BOUND', () => {
    // lowerbound/upperbound means the search cut off before proving the score.
    const a = analysis({
      wdl: { win: 800, draw: 100, loss: 100 },
      topLines: [line(1, 300, { bound: 'lower' })],
    });
    expect(engineReadLines(a, 'white').some((l) => l.kind === 'wdl')).toBe(false);
  });

  it('calls an only-move position when the second line is far behind', () => {
    const a = analysis({ topLines: [line(1, 200), line(2, 20)] });
    expect(engineReadLines(a, 'white').some((l) => l.text.includes('only one move'))).toBe(true);
  });

  it('calls a choice of plans when three lines hold equally', () => {
    const a = analysis({ topLines: [line(1, -37), line(2, -44), line(3, -50)] });
    // The real depth-14 read after 1.e4 e5 2.Nf3 — three moves within 13cp.
    expect(engineReadLines(a, 'white').some((l) => l.text.includes('choice of plan'))).toBe(true);
  });

  it('reads the gap from the STUDENT\'s side, not white\'s', () => {
    // Black to move, black's best is +200 for black = -200 white-POV, and the
    // second is -20. Without the sign flip the subtraction runs backwards and
    // an only-move position reads as a quiet one.
    const a = analysis({ topLines: [line(1, -200), line(2, -20)] });
    expect(engineReadLines(a, 'black').some((l) => l.text.includes('only one move'))).toBe(true);
  });

  it('says each reading once per game, and is not fooled by drift', () => {
    const said = new Set<string>();
    const a = analysis({ wdl: { win: 700, draw: 200, loss: 100 } });
    expect(engineReadLines(a, 'white', said)).toHaveLength(1);
    expect(engineReadLines(a, 'white', said)).toHaveLength(0);
    // A permille that drifts within the same bucket must NOT reintroduce it —
    // the mistake the idle-pieces caveat made by keying on its own squares.
    const drifted = analysis({ wdl: { win: 742, draw: 158, loss: 100 } });
    expect(engineReadLines(drifted, 'white', said)).toHaveLength(0);
  });

  it('stays silent when the engine reported no WDL at all', () => {
    expect(engineReadLines(analysis({ wdl: null }), 'white')).toHaveLength(0);
  });
});
