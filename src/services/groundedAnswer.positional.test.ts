import { describe, it, expect } from 'vitest';
import { assemblePositionalAnswer } from './groundedAnswer';
const START='r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';
describe('assemblePositionalAnswer — correct deterministic data', () => {
  it('material: even + real piece breakdown in symmetric Italian', () => {
    const a = assemblePositionalAnswer(START, 'white', 'material');
    expect(a?.facts).toMatch(/Material is even/);
    expect(a?.facts).toMatch(/2 knights/);
    expect(a?.facts).not.toMatch(/pawn of|winning/); // NOT an eval
  });
  it('center: real central-piece counts, not an eval', () => {
    const a = assemblePositionalAnswer(START, 'white', 'center');
    expect(a?.facts).toMatch(/bearing on the centre/);
  });
  it('development: developed-minor count + castling state', () => {
    const a = assemblePositionalAnswer(START, 'white', 'development');
    expect(a?.facts).toMatch(/developed \d of your \d minor/);
  });
  it('structure: sound / weak-pawn read', () => {
    const a = assemblePositionalAnswer(START, 'white', 'structure');
    expect(a?.facts).toMatch(/sound|isolated|doubled/);
  });
  it('king: castled + exposure read', () => {
    const a = assemblePositionalAnswer(START, 'white', 'king');
    expect(a?.facts).toMatch(/king is (?:castled|not castled)/);
  });
  it('returns null on an invalid FEN (degrades safe)', () => {
    expect(assemblePositionalAnswer('not-a-fen', 'white', 'material')).toBeNull();
  });
});
