// P4 — THE COMPUTED VOICE GRADED BLIND AGAINST THE WRITTEN NOTES (WO-THINK-01,
// WO-ALL-OPENINGS-01 item 4: "computer narration in the written style, graded
// blind against the written notes"). For every hand-written beat of the
// masterclass lessons, the line the computer says at the SAME move — the one
// line every lesson and opening page speaks (`lessonThought`, the teach
// register), with the lesson's own memory, the line it sets up and the move
// before it. David grades the pairs without knowing which is which; the grade
// decides whether computed narration can stand where the written notes do.
//
//   P4_PAIRS=1 npx vitest run src/services/writtenVsComputed.measure.test.ts
//
// Writes audit-reports/p4-pairs.json. Never runs in ship-check (gated).
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { getLessonScript } from '../data/lessons';
import { BRIEFING_LINE_PLIES, newLessonVoice } from './reviewMoveBriefing';
import { lessonThought } from './moveThoughtFacts';
import { captureContextsAlong } from './pvPlayback';

const RUN = process.env.P4_PAIRS === '1';

/** The masterclass lessons the pairs come from (main lines, hand-written). */
const OPENINGS = [
  'ruy-lopez', 'italian-game', 'scotch-game', 'vienna-game', 'kings-gambit', 'four-knights-game',
  'caro-kann', 'french-defence', 'scandinavian-defence', 'alekhine-defence', 'pirc-defence', 'sicilian-dragon',
  'nimzo-indian', 'dutch-defence', 'benko-gambit', 'glek-system',
];

interface Pair { opening: string; beat: string; ply: number; fenBefore: string; san: string; mover: 'white' | 'black'; seat: 'student' | 'opponent'; written: string; computed: string }

describe.skipIf(!RUN)('P4 — written notes vs the computed voice, same move', () => {
  it('pairs every hand-written beat with the line the computer says there', { timeout: 300_000 }, () => {
    const pairs: Pair[] = [];
    for (const id of OPENINGS) {
      const lesson = getLessonScript(id);
      if (!lesson) continue;
      // The lesson's full line: the longest beat's moves (beats walk it in order).
      const line = [...lesson.beats].sort((a, b) => b.moves.length - a.moves.length)[0]?.moves ?? [];
      const runs = captureContextsAlong(new Chess().fen(), line);
      const fens: string[] = [new Chess().fen()];
      { const c = new Chess(); for (const s of line) { try { c.move(s); fens.push(c.fen()); } catch { break; } } }
      const voice = newLessonVoice();
      for (const b of lesson.beats) {
        const n = b.moves.length;
        if (n === 0 || !b.say.trim()) continue;
        // Only beats ON the lesson's line (a rewind or a branch is its own story).
        if (!b.moves.every((m, k) => line[k] === m) || n > fens.length - 1) continue;
        const san = b.moves[n - 1];
        const mover: 'white' | 'black' = n % 2 === 1 ? 'white' : 'black';
        const moverIsStudent = mover === lesson.orientation;
        let computed = '';
        try {
          computed = lessonThought({
            fenBefore: fens[n - 1], san, prev: runs[n - 1], moverIsStudent,
            line: line.slice(n, n + BRIEFING_LINE_PLIES),
            theirLast: n >= 2 ? { fenBefore: fens[n - 2], san: line[n - 2] } : null,
          }, voice);
        } catch { computed = ''; }
        if (!computed.trim()) continue;
        pairs.push({ opening: id, beat: b.id, ply: n, fenBefore: fens[n - 1], san, mover, seat: moverIsStudent ? 'student' : 'opponent', written: b.say.trim(), computed: computed.trim() });
      }
    }
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/p4-pairs.json', JSON.stringify(pairs, null, 1));
    console.log(`[p4] ${pairs.length} pairs over ${new Set(pairs.map((p) => p.opening)).size} openings`);
    expect(pairs.length).toBeGreaterThan(20);
  });
});
