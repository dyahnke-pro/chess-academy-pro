import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { classifyMatePattern } from './matePatterns';
import matingPatternsData from '../data/mating-patterns.json';
import type { MatingPattern } from '../types/matingPattern';

/** Every mate-in-1 lesson position in `mating-patterns.json`, with its mating
 *  move found by search (deterministic — no solution field needed). */
function fixtures(): Array<{ id: string; fen: string; mates: string[]; fenAfter: string }> {
  const out: Array<{ id: string; fen: string; mates: string[]; fenAfter: string }> = [];
  for (const p of matingPatternsData as MatingPattern[]) {
    for (const pos of p.lessonPositions) {
      if (pos.movesToMate !== 1) continue;
      const c = new Chess(pos.fen);
      const mates = c.moves({ verbose: true }).filter((m) => m.san.endsWith('#'));
      if (mates.length === 0) continue;
      c.move(mates[0].san);
      out.push({ id: p.id, fen: pos.fen, mates: mates.map((m) => m.san), fenAfter: c.fen() });
    }
  }
  return out;
}

/** Lesson fixtures whose geometry is genuinely ANOTHER named pattern too — the
 *  classifier's answer is board-true; the lesson's label is the human's frame.
 *  Each entry is reviewed by hand; the list only ever shrinks. */
const ACCEPTED_ALIAS: Record<string, string[]> = {
  // Cozio's mate is "the dovetail from the other approach line" (the data says so).
  'cozios-mate': ['dovetail-mate'],
};

describe('classifyMatePattern — proven on the mating-patterns lesson corpus', () => {
  const fx = fixtures();

  it('has a known-answer set to prove against', () => {
    expect(fx.length).toBeGreaterThanOrEqual(30);
  });

  for (const f of fx) {
    it(`${f.id}: ${f.mates.join('/')} on ${f.fen}`, () => {
      const r = classifyMatePattern(f.fenAfter);
      const ok = r?.id === f.id || (ACCEPTED_ALIAS[f.id] ?? []).includes(r?.id ?? '');
      expect(ok, `got ${r?.id ?? 'null'}`).toBe(true);
      if (r) {
        expect(r.recognition.length).toBeGreaterThan(20);
        expect(r.squares).toHaveLength(2);
      }
    });
  }

  it('returns null on a position that is not checkmate', () => {
    expect(classifyMatePattern(new Chess().fen())).toBeNull();
    expect(classifyMatePattern('not a fen')).toBeNull();
  });

  it('a plain queen mate with only a king to beat is the queen-mate fundamental', () => {
    // K+Q vs K: Qe7# with kings e6/e8 … use Kf6 + Qg7# vs Kh8.
    expect(classifyMatePattern('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1')?.id).toBe('queen-mate');
  });
});
