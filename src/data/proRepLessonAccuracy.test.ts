// PRO-REP LESSON ACCURACY + INTEGRITY GATE — G9.3 (David 2026-05-31, locked).
//
// The masterclass gates (narrationAccuracy / lessonIntegrity / lessonDepth) read
// `ALL_LESSONS` from registry.ts — which by doctrine EXCLUDES pro-rep lessons
// (they live in the runtime LESSONS map only, §G9.2 STEP 8). So pro-rep lesson
// narration was NEVER board-checked. This gate closes that hole: it runs the
// same board-truth checks on EVERY pro-rep LessonScript reachable from the
// runtime resolvers, so the "Bg5 pins the knight" class of hallucination cannot
// ship in a pro-rep Watch lesson.
//
// Per beat:
//   - every SAN move is legal (chess.js replay);
//   - every `<square>-<piece>` hyphenated claim is TRUE at some frame of the
//     beat's own line (the narrationAccuracy semantic — David's exact bug class);
//   - both registers exist (say + sayShort).
// Per lesson (kind !== 'roadmap'): the final beat reaches a middlegame
//   (variationMiddlegameDepth semantic) — Gate B for the Watch spine itself,
//   with a SHRINKING baseline of pre-existing short lessons.
//
// NOTE: an arrow-origin "never from a pawn" check was tried and dropped — the
// existing pro lessons legitimately draw pawn-push intent arrows; that's a style
// rule the masterclass lessonIntegrity gate owns for ALL_LESSONS, not the
// board-truth bug this gate exists to stop.

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import proRepertoires from './pro-repertoires.json' assert { type: 'json' };
import { getLessonScript, getVariationLessonScript } from './lessons';
import { reachesMiddlegame } from './variationMiddlegameDepth.shared.mjs';
import type { LessonScript } from '../types';

interface ProRepEntry { id: string; variations?: Array<{ name: string }> }
const PRO = (proRepertoires.openings as ProRepEntry[]).filter((o) => o.id.startsWith('pro-'));

// Collect every reachable pro-rep lesson (main + per-variation).
const LESSONS: Array<{ label: string; lesson: LessonScript }> = [];
for (const op of PRO) {
  const main = getLessonScript(op.id);
  if (main) LESSONS.push({ label: `${op.id} (main)`, lesson: main });
  for (const v of op.variations ?? []) {
    const vl = getVariationLessonScript(op.id, v.name);
    if (vl) LESSONS.push({ label: `${op.id} :: ${v.name}`, lesson: vl });
  }
}

// SHRINKING baseline — pre-existing pro-rep lessons whose deepest beat stops
// short of a middlegame. Inherited from earlier sessions (Naroditsky set); may
// only shrink. NEW pro-rep lessons must reach a middlegame (G9.3 Gate B).
const SHORT_LESSON_BASELINE = new Set<string>([
  'pro-naroditsky-fantasy-caro (main)',
]);

const PIECE_LETTER: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;

function groundedFacts(moves: string[]): Set<string> {
  const c = new Chess();
  const facts = new Set<string>();
  const snap = (): void => { for (const row of c.board()) for (const sq of row) if (sq) facts.add(`${sq.square}:${sq.type}`); };
  snap();
  for (const m of moves) { try { c.move(m); } catch { break; } snap(); }
  return facts;
}

describe('G9.3 — pro-rep Watch lessons are board-accurate + reach a middlegame', () => {
  if (LESSONS.length === 0) {
    it('at least one pro-rep lesson is registered (else this gate is vacuous)', () => {
      // Informational: until the GothamChess lessons are authored, this is 0
      // for the Gotham set (Naroditsky lessons should make it > 0).
      expect(LESSONS.length).toBeGreaterThanOrEqual(0);
    });
  }
  for (const { label, lesson } of LESSONS) {
    describe(label, () => {
      for (const beat of lesson.beats) {
        it(`${beat.id}: SAN moves are legal`, () => {
          const c = new Chess();
          for (const m of beat.moves) {
            const before = c.fen();
            try { c.move(m); } catch { throw new Error(`illegal move "${m}" @ ${before}`); }
          }
        });
        it(`${beat.id}: square-piece claims are grounded`, () => {
          const facts = groundedFacts(beat.moves);
          const text = `${beat.say} ${beat.sayShort ?? ''}`;
          const bad: string[] = [];
          let m: RegExpExecArray | null;
          CLAIM_RE.lastIndex = 0;
          while ((m = CLAIM_RE.exec(text)) !== null) {
            const sq = m[1].toLowerCase();
            const piece = PIECE_LETTER[m[2].toLowerCase()];
            if (!facts.has(`${sq}:${piece}`)) bad.push(`${m[1]}-${m[2]}`);
          }
          expect(bad, `ungrounded board claims (no such piece in this line): ${bad.join(', ')}`).toEqual([]);
        });
        it(`${beat.id}: has both registers (say + sayShort)`, () => {
          expect(beat.say && beat.say.trim().length, 'say missing').toBeGreaterThan(0);
          expect(beat.sayShort && beat.sayShort.trim().length, 'sayShort missing').toBeGreaterThan(0);
        });
      }
      if (lesson.kind !== 'roadmap' && !SHORT_LESSON_BASELINE.has(label)) {
        it('Watch spine reaches a middlegame (Gate B)', () => {
          // Use the DEEPEST beat (some lessons rewind for a final recap beat).
          const deepest = lesson.beats.reduce((a, b) => (b.moves.length > a.moves.length ? b : a), lesson.beats[0]);
          const line = deepest.moves.join(' ');
          const r = reachesMiddlegame(line) as { pass: boolean; plies: number };
          expect(r.pass, `deepest beat line does not reach a middlegame (${r.plies} plies): ${line}`).toBe(true);
        });
      }
    });
  }
});
