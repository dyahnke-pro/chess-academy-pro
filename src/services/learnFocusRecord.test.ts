import { describe, expect, it } from 'vitest';
import { recentMissesFrom } from './learnFocusRecord';
import type { MisconceptionTagRecord } from '../types';

const FEN_A = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const FEN_B = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4';

let n = 0;
const slip = (over: Partial<MisconceptionTagRecord>): MisconceptionTagRecord => ({
  id: `s${n += 1}`, tag: 'hung-material', source: 'auto-analysis', createdAt: 1_000, fen: FEN_A, playedSan: 'Nc3',
  sourceGameId: 'g1', ...over,
} as MisconceptionTagRecord);

describe('the pre-game "last few games" count says one move once', () => {
  it('duplicate rows of one move count once (David\'s drop: one game filed two slips 24 times each)', () => {
    const rows = [...Array.from({ length: 24 }, () => slip({ fen: FEN_A })), ...Array.from({ length: 24 }, () => slip({ fen: FEN_B }))];
    expect(recentMissesFrom(rows).get('hung-material')).toBe(2);
  });
  it('a copy that differs only in the halfmove clock is the same move', () => {
    const rows = [slip({ fen: FEN_A }), slip({ fen: FEN_A.replace(' 2 3', ' 0 3') })];
    expect(recentMissesFrom(rows).get('hung-material')).toBe(1);
  });
  it('one move counts at its heaviest weight', () => {
    const rows = [slip({ fen: FEN_A, grade: 'inaccuracy' }), slip({ fen: FEN_A, grade: 'mistake' })];
    expect(recentMissesFrom(rows).get('hung-material')).toBe(1);
  });
  it('the same board in two games is two misses', () => {
    expect(recentMissesFrom([slip({ sourceGameId: 'g1' }), slip({ sourceGameId: 'g2' })]).get('hung-material')).toBe(2);
  });
  it('a prompted slip is not a measurement', () => {
    expect(recentMissesFrom([slip({ prompted: true })]).get('hung-material')).toBeUndefined();
  });
  it('only the last five games are read', () => {
    const rows = Array.from({ length: 7 }, (_, i) => slip({ sourceGameId: `g${i}`, createdAt: 1_000 + i }));
    expect(recentMissesFrom(rows).get('hung-material')).toBe(5);
  });
});
