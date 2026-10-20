/**
 * The discovery look-ahead says WHAT is discovered, and only when the line wins
 * (David's Learn walk, audit-reports/learn-rootcauses-2026-10-19.md, defect 2).
 * Both boards are his.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildTacticsLiveContext, speakDeepestLookahead, upcomingTacticSquares } from './liveTacticsContext';
import type { StockfishAnalysis } from '../types';
import type { WeaknessSignal } from './weaknessSignal';

const analysis = (moves: string, evaluation: number): StockfishAnalysis => ({
  bestMove: moves.split(' ')[0], evaluation, isMate: false, mateIn: null, depth: 18, nodesPerSecond: 0,
  topLines: [{ rank: 1, evaluation, moves: moves.split(' '), mate: null }],
});

// David's record: 130 rows of HIS OWN missed discoveries.
const MISSED_DISCOVERIES: WeaknessSignal[] = [{
  clusterId: 'analysis:tactic:discovered_attack', capabilityTag: null, proven: false, bucket: 'tactical',
  label: 'Missed discovered attacks', openCount: 130, total: 130, severity: 70,
  lifecycleStatus: 'persistent', trend: 'flat', puzzleThemes: [],
}];

describe('Case A — Smith-Morra after 7...Bg7: a discovery that wins nothing', () => {
  const FEN = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';
  const ctx = buildTacticsLiveContext(FEN, analysis('f3g5 c6e5 d1b3 e5c4 b3c4 g8h6 h2h3 e8g8', -41), 'w', 1414);

  it('the entry carries the detector\'s roles and the line\'s outcome', () => {
    const d = ctx.threats.find((t) => t.type === 'discovery');
    expect(d?.roles).toEqual({
      mover: { piece: 'n', from: 'e5', to: 'c4' },
      unmasked: { piece: 'b', square: 'g7' },
      targets: [{ piece: 'n', square: 'c3' }],
    });
    expect(d?.collects).toBe(false);
  });

  it('is not spoken: Nxc4 Qxc4 is a trade, not a win', () => {
    const say = speakDeepestLookahead(ctx, 'student', 'w', false, []);
    expect(say ?? '').not.toMatch(/discover/i);
  });

  it('never says "keeps catching you" off a record of his own missed shots', () => {
    const say = speakDeepestLookahead(ctx, 'student', 'w', false, MISSED_DISCOVERIES);
    expect(say ?? '').not.toMatch(/keeps catching you/);
  });
});

describe('Case B — chesscom-1034830120 move 18: a discovery that wins the exchange', () => {
  const FEN = 'r1b1rknQ/1pp3p1/p1n1pp2/2b3N1/3q1P2/2N5/PPPB1RPP/R5K1 w - - 2 18';
  const ctx = buildTacticsLiveContext(FEN, analysis('c3e4 d4b2 a1f1 c5d4 d2c1 d4f2 g1f2 b2a2', -237), 'w', 1414);

  it('says what is uncovered onto what, counted in their moves, and holds the student\'s move', () => {
    const say = speakDeepestLookahead(ctx, 'student', 'w', false, [])!;
    expect(say).toMatch(/their queen taking on b2/);
    expect(say).toMatch(/their queen taking on b2, uncovering their bishop on c5 onto your rook on f2/);
    expect(say).toMatch(/on their next move/);
    expect(say).not.toMatch(/knight to e4|if you play|moves away/);
  });
});

describe('the squares marked for an upcoming tactic come from the detector, never the prose', () => {
  it('a discovery marks where the mover lands, the uncovered piece and its target', () => {
    const FEN = 'r1b1rknQ/1pp3p1/p1n1pp2/2b3N1/3q1P2/2N5/PPPB1RPP/R5K1 w - - 2 18';
    const ctx = buildTacticsLiveContext(FEN, analysis('c3e4 d4b2 a1f1 c5d4 d2c1 d4f2 g1f2 b2a2', -237), 'w', 1414);
    const d = ctx.threats.find((t) => t.type === 'discovery')!;
    // The description's first square is d4, which the queen LEAVES.
    expect(upcomingTacticSquares(d)).toEqual(['b2', 'c5', 'f2']);
  });

  it('no surface scrapes squares out of a tactic description', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) files.push(p);
      }
    };
    walk('src/components'); walk('src/hooks');
    const offenders = files.filter((f) => /\.description\.match\(\/\\b\[a-h\]\[1-8\]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
