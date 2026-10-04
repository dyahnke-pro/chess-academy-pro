import { describe, it, expect } from 'vitest';
import type { Square } from 'chess.js';
import { boardIdentity, isFairKey, pickFairPosition, type FairKey, type LessonPositionCandidate } from './thinkingPositions';

const A = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const B = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const C = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';

const keyOf = (map: Record<string, FairKey | null>) => (fen: string): FairKey | null => map[fen] ?? null;
const k = (key: Square[], nearMiss: Square[] = []): FairKey => ({ key, nearMiss });

describe('thinkingPositions', () => {
  it('a fair key has 1 to 4 squares and no near miss', () => {
    expect(isFairKey(k(['c6']))).toBe(true);
    expect(isFairKey(k([]))).toBe(false);
    expect(isFairKey(k(['a1', 'b1', 'c1', 'd1', 'e1']))).toBe(false);
    expect(isFairKey(k(['c6'], ['e5']))).toBe(false);
    expect(isFairKey(null)).toBe(false);
  });

  it('prefers the student\'s own games over puzzles, whatever the input order', () => {
    const cands: LessonPositionCandidate[] = [
      { fen: A, origin: 'puzzle', puzzleId: 'p1' },
      { fen: B, origin: 'game', gameId: 'g1', ply: 3 },
    ];
    const got = pickFairPosition(cands, keyOf({ [A]: k(['e4']), [B]: k(['e5']) }), new Set());
    expect(got).toMatchObject({ origin: 'game', gameId: 'g1', key: ['e5'] });
  });

  it('skips unfair boards and boards already used', () => {
    const cands: LessonPositionCandidate[] = [
      { fen: A, origin: 'game' },
      { fen: B, origin: 'game' },
      { fen: C, origin: 'puzzle' },
    ];
    const keys = keyOf({ [A]: k(['e4'], ['d4']), [B]: k(['e5']), [C]: k(['e4']) });
    expect(pickFairPosition(cands, keys, new Set([boardIdentity(B)]))?.fen).toBe(C);
  });

  it('returns null rather than an unfair board', () => {
    expect(pickFairPosition([{ fen: A, origin: 'game' }], keyOf({ [A]: k([]) }), new Set())).toBeNull();
  });

  it('a throwing key computer just skips that board', () => {
    const got = pickFairPosition(
      [{ fen: A, origin: 'game' }, { fen: B, origin: 'game' }],
      (fen) => { if (fen === A) throw new Error('bad'); return k(['e5']); },
      new Set(),
    );
    expect(got?.fen).toBe(B);
  });

  it('board identity ignores move counters', () => {
    expect(boardIdentity(B)).toBe(boardIdentity(B.replace(' 0 2', ' 7 40')));
  });
});
