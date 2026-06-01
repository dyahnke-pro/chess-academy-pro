// PRO-REP NARRATION BOARD-ACCURACY GATE — (audit 2026-06-01).
//
// The masterclass set is board-truth-gated by narrationAccuracy.test.ts +
// lessonIntegrity.test.ts, which both iterate ALL_LESSONS from registry.ts.
// Pro-rep lessons (Naroditsky / GothamChess / Hikaru / EricRosen / Caruana /
// SamayRaina) live in the runtime LESSONS map (./index) ONLY and are NOT in
// registry.ts — so their spoken `say`/`sayShort` board-FACT claims were never
// checked. The G9.4 voice gate (proRepNarrationVoice.test.ts) closed the
// *format* hole (move-number prefixes, cue length) but NOT the *accuracy*
// hole: a beat could name "the e4-knight" with no knight on e4 and ship.
// G9.3's premise ("Gate A brings pro-rep narration UNDER the accuracy gate")
// only holds if a gate actually iterates the pro-rep LESSONS map — this is it.
//
// Two checks, both the RELIABLE forms the masterclass gates already trust:
//   1. LEGALITY — every beat's move list is chess.js-legal (lessonIntegrity's
//      job for masterclass; pro-rep had no equivalent).
//   2. HYPHEN-FORM ACCURACY — a `<square>-<piece>` claim ("the e4-knight") is
//      valid iff that piece TYPE occupied that square at ANY frame of the
//      beat's own line. This is narrationAccuracy's exact semantic. The PROSE
//      form ("the knight on e4") is deliberately NOT gated here — it cries
//      wolf on maxims/comparisons (narrationAccuracy Hole 3); a measured pass
//      2026-06-01 found 9 prose candidates across the non-Samay pros, all
//      legit. Samay's 28 lessons are 0/0/0 clean on every form.
//
// Baseline-free: 0 hyphen-accuracy + 0 legality violations across all 235
// pro-rep lessons today. A new violation fails the build.

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { getAllLessonScripts } from './index';

const PIECE_LETTER: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};
const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;

// pro-rep = any registered lesson whose openingId / key starts with "pro-".
const proLessons = getAllLessonScripts().filter(
  ({ key, lesson }) => (lesson.openingId || '').startsWith('pro-') || key.startsWith('pro-'),
);

/** All (square:pieceType) facts true at any frame while replaying `moves`. */
function groundedFacts(moves: string[]): { facts: Set<string>; illegal: string | null } {
  const c = new Chess();
  const facts = new Set<string>();
  const snapshot = (): void => {
    for (const row of c.board()) for (const sq of row) if (sq) facts.add(`${sq.square}:${sq.type}`);
  };
  snapshot();
  for (const m of moves) {
    try { c.move(m); } catch { return { facts, illegal: m }; }
    snapshot();
  }
  return { facts, illegal: null };
}

describe('pro-rep narration board-accuracy (LESSONS map — outside registry.ts)', () => {
  it(`covers the pro-rep lessons (>0)`, () => {
    expect(proLessons.length).toBeGreaterThan(0);
  });

  it('every pro-rep beat move list is chess.js-legal', () => {
    const fails: string[] = [];
    for (const { key, lesson } of proLessons) {
      for (const beat of lesson.beats) {
        const { illegal } = groundedFacts(beat.moves);
        if (illegal) fails.push(`${key} / ${beat.id}: illegal move "${illegal}" in [${beat.moves.join(' ')}]`);
      }
    }
    expect(fails, fails.join('\n')).toEqual([]);
  });

  it('every "square-piece" narration claim occurs in its beat line', () => {
    const fails: string[] = [];
    for (const { key, lesson } of proLessons) {
      for (const beat of lesson.beats) {
        const { facts } = groundedFacts(beat.moves);
        const text = `${beat.say} ${beat.sayShort ?? ''}`;
        const seen = new Set<string>();
        for (const m of text.matchAll(CLAIM_RE)) {
          const square = m[1].toLowerCase();
          const piece = m[2].toLowerCase();
          const fkey = `${square}:${PIECE_LETTER[piece]}`;
          if (seen.has(fkey)) continue;
          seen.add(fkey);
          if (!facts.has(fkey)) {
            fails.push(`${key} / ${beat.id}: names the ${piece} on ${square}, but no ${piece} ever stands on ${square} in this line`);
          }
        }
      }
    }
    expect(fails, fails.join('\n')).toEqual([]);
  });
});
