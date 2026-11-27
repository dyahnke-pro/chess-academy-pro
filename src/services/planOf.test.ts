import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { structureOf } from './structureOf';
import { planOf } from './planOf';
import type { AnalysisLine } from '../types';

const fenOf = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const line = (evaluation: number, moves: string[]): AnalysisLine => ({ rank: 1, evaluation, moves, mate: null });

// Real opening boards (G3: every move legal from the start position).
const FRENCH_ADVANCE = fenOf('e4 e6 d4 d5 e5');
const CARLSBAD = fenOf('d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 O-O Qc2 Nbd7 Nf3 Re8');
const SEMI_SLAV = fenOf('d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4');

describe('structureOf: the plan the pawns earn', () => {
  it('the French Advance: Black strikes the base of the chain, c5 at d4', () => {
    const chain = structureOf(FRENCH_ADVANCE, 'b').find((p) => p.kind === 'chain');
    expect(chain?.key).toEqual({ from: 'c7', to: 'c5', hits: 'd4' });
  });
  it('the Carlsbad: the minority attack, the b-pawn to b5 at c6', () => {
    const m = structureOf(CARLSBAD, 'w').find((p) => p.kind === 'minority');
    expect(m?.key).toEqual({ from: 'b2', to: 'b5', hits: 'c6' });
  });
  it('the Meran: b5 for space, then the break c5 at d4', () => {
    const e = structureOf(SEMI_SLAV, 'b').find((p) => p.kind === 'expansion');
    expect(e?.first).toEqual({ from: 'b7', to: 'b5' });
    expect(e?.key).toEqual({ from: 'c6', to: 'c5', hits: 'd4' });
  });
  it('no default big centre: the start position has no structural plan', () => {
    expect(structureOf(new Chess().fen(), 'w')).toEqual([]);
  });
});

describe('planOf: plans ranked by evidence, only the strongest said', () => {
  it('the structure plan the best line plays is said, with its break', () => {
    const out = planOf({ fen: FRENCH_ADVANCE, lines: [line(40, ['c7c5', 'c2c3', 'b8c6', 'g1f3'])], student: 'b', namesMoves: true });
    expect(out.mover.map((p) => p.text).join(' ')).toMatch(/c5/);
    expect(out.mover[0].evidence).toBeGreaterThan(0.9);
  });
  it('a concept plan no engine line plays is dropped', () => {
    const out = planOf({ fen: FRENCH_ADVANCE, lines: [line(40, ['g8e7', 'g1f3', 'e7f5', 'f1d3'])], student: 'b', namesMoves: true });
    expect(out.mover.some((p) => p.source === 'structure' && p.structure?.kind === 'chain')).toBe(false);
  });
  it('the student\'s own move is not named where the surface may not (Learn)', () => {
    const out = planOf({ fen: FRENCH_ADVANCE, lines: [line(40, ['c7c5', 'c2c3'])], student: 'b', namesMoves: false });
    const s = out.mover.find((p) => p.source === 'structure');
    expect(s?.text).toMatch(/c-pawn/);
    expect(s?.text).not.toMatch(/\bc5\b/);
  });
  it('a second plan only within 30% of the first', () => {
    // The minority attack is in the third line, 150cp off: no evidence at all.
    const far = planOf({ fen: CARLSBAD, lines: [line(40, ['a1b1', 'a7a5']), line(30, ['e1g1', 'd7f8']), line(-110, ['b2b4', 'a7a6'])], student: 'w', namesMoves: true });
    expect(far.mover.some((p) => p.structure?.kind === 'minority')).toBe(false);
    // The best line plays b4 itself: the minority attack is the plan.
    const near = planOf({ fen: CARLSBAD, lines: [line(40, ['b2b4', 'a7a6', 'a2a4', 'd7f8'])], student: 'w', namesMoves: true });
    expect(near.mover.map((p) => p.text).join(' ')).toMatch(/minority attack/);
  });
  it('a plan for later: its first step 50–100 off the best, played later by the best line', () => {
    const out = planOf({ fen: CARLSBAD, lines: [line(40, ['a1b1', 'a7a5', 'b2b4', 'a5b4']), line(-30, ['b2b4', 'a7a6'])], student: 'w', namesMoves: true });
    expect(out.later?.text).toMatch(/plan for later/);
  });
  it('their plan is priced on the pass read, never guessed', () => {
    const none = planOf({ fen: CARLSBAD, lines: [line(40, ['b2b4', 'a7a6'])], student: 'w', namesMoves: true });
    expect(none.other).toBeNull();
  });
});
