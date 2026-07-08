// ANTI-OPENING NARRATION BOARD-ACCURACY GATE — (2026-07-08).
//
// The 24 Counter-Weapons (anti-*) lessons live in the runtime LESSONS /
// VARIATION_LESSONS map (./index) ONLY — like the pro-rep set, they are NOT in
// registry.ts, so lessonIntegrity.test.ts / narrationAccuracy.test.ts (which
// iterate ALL_LESSONS) never checked their spoken board-FACT claims. This gate
// closes that hole, mirroring proRepNarrationAccuracy.test.ts exactly:
//   1. LEGALITY — every beat's move list is chess.js-legal.
//   2. HYPHEN-FORM ACCURACY — a `<square>-<piece>` claim ("the c5-knight") is
//      valid iff that piece TYPE stood on that square at some frame of the
//      beat's own line. The prose form ("the knight on c5") is deliberately NOT
//      gated (it cries wolf on maxims/comparisons — see the pro-rep gate note).
//
// Baseline-free: 0 legality + 0 hyphen-accuracy violations across every anti-*
// lesson today. A new violation fails the build.

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { getAllLessonScripts } from './index';

const PIECE_LETTER: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};
const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;

const antiLessons = getAllLessonScripts().filter(
  ({ key, lesson }) => (lesson.openingId || '').startsWith('anti-') || key.startsWith('anti-'),
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

describe('anti-opening narration board-accuracy (LESSONS map — outside registry.ts)', () => {
  it('covers the anti-* lessons (>0)', () => {
    expect(antiLessons.length).toBeGreaterThan(0);
  });

  it('every anti-* beat move list is chess.js-legal', () => {
    const fails: string[] = [];
    for (const { key, lesson } of antiLessons) {
      for (const beat of lesson.beats) {
        const { illegal } = groundedFacts(beat.moves);
        if (illegal) fails.push(`${key} / ${beat.id}: illegal move "${illegal}" in [${beat.moves.join(' ')}]`);
      }
    }
    expect(fails, fails.join('\n')).toEqual([]);
  });

  it('every "square-piece" narration claim occurs in its beat line', () => {
    const fails: string[] = [];
    for (const { key, lesson } of antiLessons) {
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
