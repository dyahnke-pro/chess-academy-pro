import { describe, it, expect } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';
import { buildLessonReferenceBlock } from './index';

const lessons = [RUY_LOPEZ_LESSON, ...Object.values(RUY_VARIATION_LESSONS)];

function fileRank(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
}

/** True if a slider on `from` has a clear line to `to` (exclusive of endpoints). */
function clearRay(c: Chess, from: string, to: string): boolean {
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const df = Math.sign(tf - ff);
  const dr = Math.sign(tr - fr);
  let f = ff + df, r = fr + dr;
  while (f !== tf || r !== tr) {
    const sq = (String.fromCharCode(97 + f) + String(r + 1)) as Square;
    if (c.get(sq)) return false;
    f += df; r += dr;
  }
  return true;
}

function sees(c: Chess, from: string, to: string): boolean {
  const pc = c.get(from as Square);
  if (!pc) return false;
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const adf = Math.abs(tf - ff), adr = Math.abs(tr - fr);
  switch (pc.type) {
    case 'n': return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'b': return adf === adr && adf > 0 && clearRay(c, from, to);
    case 'r': return ((adf === 0) !== (adr === 0)) && clearRay(c, from, to);
    case 'q': return (adf === adr || adf === 0 || adr === 0) && clearRay(c, from, to);
    case 'k': return adf <= 1 && adr <= 1;
    default: return false; // pawns never get arrows
  }
}

describe('coach lesson-reference block', () => {
  it('surfaces the named subline + main opening when asked', () => {
    const blk = buildLessonReferenceBlock('Can you explain the Berlin Defense?');
    expect(blk).toContain('MASTER-CLASS REFERENCE');
    expect(blk).toContain('Berlin');
    expect(blk).toContain('A Master Class'); // main Ruy lesson too
  });
  it('returns empty for openings we have no master class for', () => {
    expect(buildLessonReferenceBlock('how do I play the Najdorf Sicilian')).toBe('');
  });
  it('returns empty for empty input', () => {
    expect(buildLessonReferenceBlock('')).toBe('');
  });
});

describe('Ruy master-class integrity', () => {
  for (const lesson of lessons) {
    describe(lesson.title, () => {
      for (const beat of lesson.beats) {
        it(`${beat.id}: legal moves + valid arrows`, () => {
          const c = new Chess();
          for (const m of beat.moves) {
            const before = c.fen();
            try { c.move(m); } catch { /* surfaced below */ }
            expect(c.fen(), `illegal move "${m}" in ${beat.id}`).not.toBe(before);
          }
          for (const a of beat.arrows ?? []) {
            const pc = c.get(a.from as Square);
            expect(pc, `arrow origin ${a.from} empty in ${beat.id}`).toBeTruthy();
            expect(pc?.type, `pawn arrow from ${a.from} in ${beat.id}`).not.toBe('p');
            // Every arrow is green (a clear sight-line) — no aspirational
            // blocked arrows. Enforce line of sight for all of them.
            expect(sees(c, a.from, a.to), `blocked/invalid arrow ${a.from}->${a.to} in ${beat.id}`).toBe(true);
          }
        });
      }
    });
  }
});

describe('Ruy master-class orientation', () => {
  // The Ruy Lopez is a White opening — the student always plays White.
  // Every variation lesson must orient the board White-at-bottom; a
  // stray 'black' (the 2026-05-20 Marshall/Arkhangelsk bug) shows the
  // student the wrong side. Guard all lessons, not just the two we fixed.
  for (const lesson of lessons) {
    it(`${lesson.title}: student plays White`, () => {
      expect(lesson.orientation, `${lesson.title} should orient White`).toBe('white');
    });
  }
});
