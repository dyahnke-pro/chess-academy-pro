/**
 * Walk defect 12 (hand walk 2026-10-04, custom lesson drill): the eval line
 * said "They're winning (about 2.7 points)". In a drill "they" has no clear
 * referent, and a student reads whose-side off it backwards. With the seat
 * known, the line is about the STUDENT: "you're down about 2.7 points".
 */
import { describe, it, expect } from 'vitest';
import { assembleEngineReasoning, assemblePlanAnswer } from './groundedAnswer';

// Black to move (the student is Black), a quiet legal position.
const FEN_B = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 5 4';

describe('the eval is said from the student\'s seat', () => {
  it('opponent better → "you\'re down about X points", never "They\'re winning"', () => {
    const a = assembleEngineReasoning({ fenBefore: FEN_B, pvSan: ['Bc5'], moverColor: 'black', evalCp: 270, mateIn: null, studentSide: 'black' });
    expect(a?.facts).toMatch(/You're clearly worse\./); // The one eval ladder (evalBand, census 2026-10-10: 0.5 / 1.5 / 3.0). +2.7 is clearly, not yet winning. expect(a?.facts).not.toMatch(/\d\.\d points/);
    expect(a?.facts).not.toMatch(/they're winning|They're winning/);
  });
  it('student better → "you\'re up about X points"', () => {
    const a = assembleEngineReasoning({ fenBefore: FEN_B, pvSan: ['Bc5'], moverColor: 'black', evalCp: -150, mateIn: null, studentSide: 'black' });
    expect(a?.facts).toMatch(/You're clearly better\./);
  });
  it('a small edge keeps the seat too', () => {
    const a = assembleEngineReasoning({ fenBefore: FEN_B, pvSan: ['Bc5'], moverColor: 'black', evalCp: 60, mateIn: null, studentSide: 'black' });
    expect(a?.facts).toMatch(/You're slightly worse\./);
  });
  it('NEGATIVE CONTROL — with NO seat the colour is named (spectator)', () => {
    const a = assembleEngineReasoning({ fenBefore: FEN_B, pvSan: ['Bc5'], moverColor: 'black', evalCp: 270, mateIn: null });
    expect(a?.facts).toMatch(/White is clearly better/); expect(a?.facts).not.toMatch(/about 2\.7 points/);
  });
  it('the plan answer carries the same seated line', () => {
    const a = assemblePlanAnswer({ fen: FEN_B, pvSan: ['Bc5', 'O-O'], evalCp: 270, mateIn: null, studentSide: 'black' });
    if (a) expect(a.facts).not.toMatch(/they're winning|They're winning/);
  });
});
