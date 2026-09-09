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
  it('key-squares: names the opponent hole as an outpost target (Sicilian d5)', () => {
    // 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 — ...e5 leaves d5 a hole
    // in Black's camp (no black c- or e-pawn can ever guard it). For a White
    // student that is an outpost target, computed from findWeakSquares (G3).
    const SICILIAN = 'r1bqkb1r/pp1p1ppp/2n2n2/4p3/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6';
    const a = assemblePositionalAnswer(SICILIAN, 'white', 'key-squares');
    expect(a?.facts).toMatch(/d5/);
    expect(a?.facts).toMatch(/outpost/);
    expect(a?.bestMoveSan).toBeNull(); // NOT an engine move — a board read
  });
  it('key-squares: honest null when no side has a hole (start position)', () => {
    const START_POS = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(assemblePositionalAnswer(START_POS, 'white', 'key-squares')).toBeNull();
  });
  it('returns null on an invalid FEN (degrades safe)', () => {
    expect(assemblePositionalAnswer('not-a-fen', 'white', 'material')).toBeNull();
  });
});
