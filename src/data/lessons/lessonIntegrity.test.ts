import { describe, it, expect } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { RUY_TRAP_LESSONS, RUY_TRAP_DEFS, getRuyTrapPlayableLine } from './ruyTrapLessons';
import { buildLessonReferenceBlock } from './index';
import { ALL_LESSONS, expectedOrientation } from './registry';
import { maxAnchorPly, longestAnchorPly, proIdFromOpeningId, MIN_DB_ANCHOR_PLY } from '../../utils/dbAnchor';

// Universal masterclass-lesson integrity gate. Sweeps the WHOLE lesson
// registry (ALL_LESSONS) — main + variation + trap, every opening — so a
// newly-built opening is covered the moment its lessons are added to
// registry.ts. (Before 2026-05-22 this hardcoded the Ruy+Vienna arrays and
// passed vacuously on anything else — "Hole 2".)

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
    expect(buildLessonReferenceBlock('how do I play the Grob Attack')).toBe('');
  });
  it('returns empty for empty input', () => {
    expect(buildLessonReferenceBlock('')).toBe('');
  });
});

describe('masterclass integrity — legal moves + valid arrows (all lessons)', () => {
  for (const { scope, key, lesson } of ALL_LESSONS) {
    describe(`[${scope}] ${key}`, () => {
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
            expect(sees(c, a.from, a.to), `blocked/invalid arrow ${a.from}->${a.to} in ${beat.id}`).toBe(true);
          }
        });
      }
    });
  }
});

// ── Hole 1: G3 DB-anchoring on the moves themselves ─────────────────────
// lessonIntegrity used to check LEGALITY only — a legal-but-INVENTED line
// (a fabricated "variation" that's chess.js-legal but isn't real theory)
// sailed straight through. This gate anchors every lesson's spine in the
// canonical openings DB: some beat must reach a real ≥6-ply DB move-prefix.
// The continuation past the anchor is the middlegame (legal play beyond
// book) and is fine; what this catches is a line that never enters
// canonical territory at all.
describe('masterclass G3 — every lesson anchors a real DB opening line', () => {
  for (const { scope, key, lesson } of ALL_LESSONS) {
    it(`[${scope}] ${key}: spine anchors ≥ ${MIN_DB_ANCHOR_PLY} plies in openings-lichess.json`, () => {
      // Pro lessons anchor on the pro's own game dump too — his real games ARE
      // the database for his tab (David 2026-05-28, LOCKED rule).
      const proId = proIdFromOpeningId(lesson.openingId) ?? undefined;
      const anchor = maxAnchorPly(lesson.beats.map((b) => b.moves), proId);
      expect(
        anchor,
        `${key}: deepest DB anchor is only ${anchor} plies — no beat's opening spine matches a real line in openings-lichess.json / masters DB / the pro's own game dump. ` +
          `Either the line is invented (G3 violation — remove it) or it's a real sub-line none of our DBs cover.`,
      ).toBeGreaterThanOrEqual(MIN_DB_ANCHOR_PLY);
    });
  }
});

// David 2026-05-21: when the named traps gained Watch/Learn/Practice/Play,
// the hand-written beat narration MUST survive the transition into the
// Learn/Practice playable line. Proves the converter carries each prefix
// beat's `say` text VERBATIM onto the move it lands on, the line is legal,
// and every routed trap converts.
describe('Ruy named-trap → playable-line transition (narration survives)', () => {
  for (const def of RUY_TRAP_DEFS) {
    it(`${def.id}: converts to a legal line carrying the beat narration verbatim`, () => {
      const line = getRuyTrapPlayableLine(def.id);
      expect(line, `no playable line for ${def.id}`).toBeTruthy();
      if (!line) return;

      const c = new Chess(line.fen);
      line.moves.forEach((san) => {
        const before = c.fen();
        try { c.move(san); } catch { /* surfaced below */ }
        expect(c.fen(), `illegal move "${san}" in ${def.id} line`).not.toBe(before);
      });
      expect(line.annotations.length).toBe(line.moves.length);

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

// ── Hole 2: orientation driven by repertoire.json color, not a hardcoded
// white-only loop. White openings orient white-at-bottom, black openings
// black-at-bottom — read from the DB so a new opening of either colour is
// covered automatically. Subsumes the old pircIntegrity orientation check.
describe('masterclass orientation — matches the student side from repertoire.json', () => {
  for (const { scope, key, lesson } of ALL_LESSONS) {
    it(`[${scope}] ${key}: oriented for the student side`, () => {
      const expected = expectedOrientation(lesson.openingId);
      expect(expected, `${key}: opening "${lesson.openingId}" has no repertoire.json entry to source orientation from`).not.toBeNull();
      expect(
        lesson.orientation,
        `${key}: lesson orients ${lesson.orientation} but ${lesson.openingId} is a ${expected} opening`,
      ).toBe(expected);
      for (const beat of lesson.beats) {
        if (beat.orientation) {
          expect(beat.orientation, `${key} beat ${beat.id}: overrides orientation to the wrong side`).toBe(expected);
        }
      }
    });
  }
});

// Sanity: the anchor helper actually reads the DB (guards a silently-empty
// prefix set making every G3 assertion vacuously pass).
describe('db-anchor helper sanity', () => {
  it('anchors a known real line and rejects an invented one', () => {
    expect(longestAnchorPly(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'])).toBeGreaterThanOrEqual(6);
    expect(longestAnchorPly(['a3', 'h6', 'a4', 'h5'])).toBeLessThan(MIN_DB_ANCHOR_PLY);
  });
});
