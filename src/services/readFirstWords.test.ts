import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { readFirstWords, saidAlready } from './readFirstWords';
import type { AnalysisLine } from '../types';

const fenOf = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const line = (evaluation: number, moves: string[]): AnalysisLine => ({ rank: 1, evaluation, moves, mate: null });

describe('Read this position: the first words, in one order', () => {
  it('their threat first, then the standing with its why', () => {
    // 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? — no: …d6 leaves Qxf7# on (Black to move).
    const fen = fenOf('e4 e5 Bc4 Nc6 Qh5 d6 a3');
    const w = readFirstWords({ fen, student: 'b', studentPovCp: -900, lines: [line(900, ['g7g6'])], names: true });
    expect(w[0]).toMatch(/mate/);
    expect(w[1]).toMatch(/./);
  });
  it('a level board opens on the standing and why it is level', () => {
    const w = readFirstWords({ fen: fenOf('e4 e5 Nf3 Nc6'), student: 'w', studentPovCp: 20, lines: [line(20, ['f1b5', 'a7a6'])], names: true });
    expect(w[0]).toMatch(/level/i);
    expect(w[0]).toMatch(/neither king is under fire/);
  });
  it('the plan follows the standing (the French Advance: the break c5)', () => {
    const w = readFirstWords({ fen: fenOf('e4 e6 d4 d5 e5'), student: 'b', studentPovCp: -30, lines: [line(30, ['c7c5', 'c2c3', 'b8c6'])], names: true });
    expect(w.join(' ')).toMatch(/c5/);
  });
  it('the first words cost no engine time: computed well under the half second', () => {
    const fen = fenOf('d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 O-O Qc2 Nbd7 Nf3 Re8');
    const t0 = performance.now();
    readFirstWords({ fen, student: 'w', studentPovCp: 40, lines: [line(40, ['b2b4', 'a7a6'])], names: true });
    expect(performance.now() - t0).toBeLessThan(400);
  });
  it('a sentence the opening said is not said again', () => {
    expect(saidAlready("Your plan: strike at the base of their pawn chain, c5 hitting d4.", ['Your plan: strike at the base of their pawn chain, c5 hitting d4.'])).toBe(true);
    expect(saidAlready('Their knight on f6 is pinned.', ['Your plan: strike at the base of their pawn chain, c5 hitting d4.'])).toBe(false);
  });
});
