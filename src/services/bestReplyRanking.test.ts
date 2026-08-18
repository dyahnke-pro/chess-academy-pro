// THE SUPERLATIVE HAS TO BE EARNED.
//
// David's prod game, 2026-08-16. Every recommendation was within 2-26cp of
// best — good moves, all of them — and two were announced as "your strongest
// reply" while not being the engine's top move at any depth I checked. The
// numbers below are his, measured on his boards.
import { describe, it, expect } from 'vitest';
import { rankReplies, bestReplyLine, CLEAR_BEST_CP } from './bestReplyRanking';
import type { StockfishAnalysis } from '../types';

/** His board after the coach played …f6 — the one that got "is Be3". */
const HIS_FEN = 'r1bqr1k1/1p4pp/p1nb1p2/3p2B1/N2Pp3/P4N1P/1P3PP1/1BRQR1K1 w - - 0 20';

const analysis = (lines: Array<[string, number]>, mates: Array<number | null> = []): StockfishAnalysis => ({
  bestMove: lines[0]?.[0] ?? '',
  evaluation: lines[0]?.[1] ?? 0,
  isMate: false,
  mateIn: null,
  depth: 14,
  topLines: lines.map(([uci, cp], i) => ({ rank: i + 1, evaluation: cp, moves: [uci], mate: mates[i] ?? null })),
  nodesPerSecond: 0,
} as StockfishAnalysis);

describe('rankReplies', () => {
  it('his position is genuinely close, so it does not say "strongest"', () => {
    // Depth 14, measured: Bd2 175, Bh4 169, Be3 158. Six centipawns between
    // the top two, and at depth 20 they swap places.
    const r = rankReplies(HIS_FEN, analysis([['g5d2', 175], ['g5h4', 169], ['g5e3', 158]]));
    expect(r).not.toBeNull();
    expect(r?.bestSan).toBe('Bd2');
    expect(r?.alsoSan).toBe('Bh4');
    expect(r?.clear).toBe(false);
    // NARROWED 2026-08-18. This used to expect "Two good moves here — Bd2, or
    // Bh4." — two pieces of notation, saying neither what either move does nor
    // how they differ. It fired that bare on a game driven on prod. With no
    // `why` there is nothing to teach and no strongest to name, so the line is
    // dropped and the turn's other facts are heard instead.
    expect(bestReplyLine(r!, '')).toBe('');
    // With something to say about the top move, the pair is back — the second
    // move earns its mention by the first having a lesson in it.
    expect(bestReplyLine(r!, ', taking the pin off')).toBe('Two good moves here — Bd2, taking the pin off, or Bh4.');
  });

  it('keeps the superlative when the top move really is clear', () => {
    const r = rankReplies(HIS_FEN, analysis([['g5d2', 175], ['g5h4', 20]]));
    expect(r?.clear).toBe(true);
    expect(bestReplyLine(r!, ', winning the bishop on c5'))
      .toBe('Your strongest reply here is Bd2, winning the bishop on c5.');
  });

  it('reads the gap by magnitude, so a perspective flip cannot break it', () => {
    // Same 6cp apart, expressed from the other side. The engine ordered them;
    // the sign is not ours to interpret.
    const r = rankReplies(HIS_FEN, analysis([['g5d2', -175], ['g5h4', -169]]));
    expect(r?.gap).toBe(6);
    expect(r?.clear).toBe(false);
  });

  it('a mate is always clear, never compared as a centipawn number', () => {
    const r = rankReplies(HIS_FEN, analysis([['g5d2', 30000], ['g5h4', 169]], [2, null]));
    expect(r?.clear).toBe(true);
    expect(r?.alsoSan).toBeNull();
  });

  it('the boundary is CLEAR_BEST_CP, inclusive', () => {
    expect(rankReplies(HIS_FEN, analysis([['g5d2', 100], ['g5h4', 100 - CLEAR_BEST_CP]]))?.clear).toBe(true);
    expect(rankReplies(HIS_FEN, analysis([['g5d2', 100], ['g5h4', 100 - CLEAR_BEST_CP + 1]]))?.clear).toBe(false);
  });

  it('degrades rather than going quiet', () => {
    // Single-PV engine, cache miss, or an unparseable line — the caller keeps
    // whatever it said before. Silence would be a worse trade than a slightly
    // over-confident sentence.
    expect(rankReplies(HIS_FEN, null)).toBeNull();
    expect(rankReplies(HIS_FEN, analysis([]))).toBeNull();
    expect(rankReplies(HIS_FEN, analysis([['zzzz', 10]]))).toBeNull();
    const single = rankReplies(HIS_FEN, analysis([['g5d2', 175]]));
    expect(single?.clear).toBe(true);
    expect(single?.alsoSan).toBeNull();
  });

  it('never names the same move twice', () => {
    const r = rankReplies(HIS_FEN, analysis([['g5d2', 175], ['g5d2', 174]]));
    expect(r?.alsoSan).toBeNull();
    expect(bestReplyLine(r!, '')).toBe('Your strongest reply here is Bd2.');
  });
});

describe('the Learn surface uses it', () => {
  it('is wired at the recommendation line, with the old sentence as fallback', async () => {
    const { readFileSync } = await import('node:fs');
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/const ranked = rankReplies\(probe\.fen\(\), studentBest\)/);
    expect(page).toMatch(/ranked\s*\?\s*bestReplyLine\(ranked, recWhy\)/);
  });
});
