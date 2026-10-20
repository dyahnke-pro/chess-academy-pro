import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decisiveReason } from './decisiveReason';
import { stampAsked } from './stockfishEngine';
import type { AnalysisLine, StockfishAnalysis } from '../types';

// A NUMBER THE SEARCH DID NOT EARN IS NOT SAID (OS-11). Real Stockfish 18
// reads of the two positions from David's record: each once at the Learn turn
// depth (14) and once cut short by a movetime budget, every line carrying the
// depth it reached. The read is stamped against the depth-14 ask exactly as
// the engine stamps it when it hands the read out.
type Case = { fen: string; san: string; full: AnalysisLine[]; cut: AnalysisLine[] };
const F = JSON.parse(readFileSync('src/services/__fixtures__/decisiveReason.turnDepth.json', 'utf8')) as Record<'rg5' | 'bg7', Case>;
const TURN_DEPTH = 14;

function read(c: Case, which: 'full' | 'cut', seat: 'student' | 'opponent') {
  const lines = c[which];
  const analysis = stampAsked({
    bestMove: lines[0].moves[0], evaluation: lines[0].evaluation, isMate: false, mateIn: null,
    depth: Math.max(...lines.map((l) => l.depth ?? 0)), topLines: lines, nodesPerSecond: 0,
  } as StockfishAnalysis, TURN_DEPTH);
  return decisiveReason({ namesPreparedMove: false, fenBefore: c.fen, san: c.san, seat, opponentLastSan: null, reads: { before: analysis.topLines, after: [], passBefore: [], passAfter: [] } });
}

describe('decisiveReason — the gap is said only off a turn-depth read', () => {
  it('21.Rg5 on a cut read: Nf8 is named, with no amount', () => {
    for (const seat of ['student', 'opponent'] as const) {
      const r = read(F.rg5, 'cut', seat);
      expect(r?.text).toMatch(/like Nf8, falls short/);
      expect(r?.text).not.toMatch(/gives up|about a point|pawns?\b.*short/);
      expect(r?.gapEarned).toBe(false);
    }
  });
  it('21.Rg5 at turn depth: the amount is earned and said', () => {
    const r = read(F.rg5, 'full', 'opponent');
    expect(r?.gapEarned).toBe(true);
    expect(r?.text).toMatch(/like Nf8, gives up /);
  });
  it('7…Bg7 on a cut read: …Bd7 is named, never "about as good"', () => {
    for (const seat of ['student', 'opponent'] as const) {
      const r = read(F.bg7, 'cut', seat);
      expect(r?.text).not.toMatch(/about as good|about equal|only good move|gives up/);
      expect(r?.text).toMatch(/The other move to weigh here is …Bd7\./);
      expect(r?.gapEarned).toBe(false);
    }
  });
  it('7…Bg7 at turn depth: the gap is a pawn, and it is said', () => {
    const r = read(F.bg7, 'full', 'student');
    expect(r?.gapEarned).toBe(true);
    expect(r?.text).toMatch(/like …Bd7, gives up /);
  });
});

describe('stampAsked — each line measured against the ask it answers', () => {
  const line = (depth: number | undefined): AnalysisLine => ({ rank: 1, evaluation: 0, mate: null, moves: ['e2e4'], ...(depth === undefined ? {} : { depth }) });
  const an = (depth: number, lines: AnalysisLine[]) => ({ bestMove: 'e2e4', evaluation: 0, isMate: false, mateIn: null, depth, topLines: lines, nodesPerSecond: 0 }) as StockfishAnalysis;
  it('a line one ply short of the ask is short; one at it is not', () => {
    const a = stampAsked(an(14, [line(14), line(13)]), 14);
    expect(a.topLines.map((l) => l.searchedShort)).toEqual([false, true]);
  });
  it('a deeper cached read serving a shallower ask is not short', () => {
    expect(stampAsked(an(18, [line(18), line(17)]), 14).topLines.every((l) => !l.searchedShort)).toBe(true);
  });
  it('a line with no depth of its own reads the analysis depth', () => {
    expect(stampAsked(an(12, [line(undefined)]), 14).topLines[0].searchedShort).toBe(true);
  });
});
