import { describe, it, expect } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';
import { RUY_TRAP_LESSONS, RUY_TRAP_DEFS, getRuyTrapPlayableLine } from './ruyTrapLessons';
import { buildLessonReferenceBlock } from './index';

const lessons = [
  RUY_LOPEZ_LESSON,
  ...Object.values(RUY_VARIATION_LESSONS),
  ...Object.values(RUY_TRAP_LESSONS),
];

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

// David 2026-05-21: when the named traps gained Watch/Learn/Practice/Play,
// the hand-written beat narration MUST survive the transition into the
// Learn/Practice playable line — "make sure the narration survives." This
// proves the converter carries each prefix beat's `say` text VERBATIM onto
// the move it lands on, the line is legal, and every routed trap converts.
describe('Ruy named-trap → playable-line transition (narration survives)', () => {
  for (const def of RUY_TRAP_DEFS) {
    it(`${def.id}: converts to a legal line carrying the beat narration verbatim`, () => {
      const line = getRuyTrapPlayableLine(def.id);
      expect(line, `no playable line for ${def.id}`).toBeTruthy();
      if (!line) return;

      // Line is legal end-to-end.
      const c = new Chess(line.fen);
      line.moves.forEach((san) => {
        const before = c.fen();
        try { c.move(san); } catch { /* surfaced below */ }
        expect(c.fen(), `illegal move "${san}" in ${def.id} line`).not.toBe(before);
      });
      expect(line.annotations.length).toBe(line.moves.length);

      // Every beat that sits on the teaching line keeps its say text VERBATIM.
      const lesson = RUY_TRAP_LESSONS[def.id];
      for (const beat of lesson.beats) {
        const isPrefix =
          beat.moves.length <= line.moves.length &&
          beat.moves.every((m, i) => m === line.moves[i]);
        if (!isPrefix) continue; // trap-branch beats stay Watch-only
        const ply = beat.moves.length - 1;
        expect(
          line.annotations[ply],
          `${def.id}: beat ${beat.id} narration dropped at ply ${ply}`,
        ).toBe(beat.say);
      }
    });
  }

  it('every routed trap def has a matching lesson + non-empty line', () => {
    for (const def of RUY_TRAP_DEFS) {
      expect(RUY_TRAP_LESSONS[def.id], `lesson missing for ${def.id}`).toBeTruthy();
      expect(getRuyTrapPlayableLine(def.id)?.moves.length ?? 0).toBeGreaterThan(0);
    }
  });
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
