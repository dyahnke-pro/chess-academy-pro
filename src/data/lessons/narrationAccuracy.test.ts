import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';
import { RUY_TRAP_LESSONS } from './ruyTrapLessons';
import type { LessonScript } from '../../types';

// Narration-accuracy gate. Every hand-written spoken line that names a
// piece by its square ("the b3-bishop", "the e4-knight", "the e6-bishop")
// is a factual claim about the board. The "bishop error" class of bug is
// naming a piece that was never actually on that square in the line being
// shown. This guard catches it.
//
// Grounding semantic: a `<square>-<piece>` claim is valid if that piece
// TYPE occupied that square at ANY position reached while replaying the
// beat's own move list (start + after each move). Narration legitimately
// speaks in past/future tense ("Rxe4 collects the knight... the e4-knight
// falls" is spoken AFTER the rook has landed on e4), so we ground against
// the whole line the beat shows, not just its final frame. Color is not
// asserted — the hyphenated form rarely encodes it and context fixes it.

const lessons: LessonScript[] = [
  RUY_LOPEZ_LESSON,
  ...Object.values(RUY_VARIATION_LESSONS),
  ...Object.values(RUY_TRAP_LESSONS),
];

const PIECE_LETTER: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};

const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;

/** All (square -> pieceType) facts true at any frame of the beat's line. */
function groundedFacts(moves: string[]): Set<string> {
  const c = new Chess();
  const facts = new Set<string>();
  const snapshot = (): void => {
    for (const row of c.board()) {
      for (const sq of row) {
        if (sq) facts.add(`${sq.square}:${sq.type}`);
      }
    }
  };
  snapshot();
  for (const m of moves) {
    try { c.move(m); } catch { /* legality is the other test's job */ break; }
    snapshot();
  }
  return facts;
}

describe('lesson narration accuracy — square-piece claims are grounded', () => {
  for (const lesson of lessons) {
    describe(lesson.title, () => {
      for (const beat of lesson.beats) {
        it(`${beat.id}: every "square-piece" claim occurs in the line`, () => {
          const facts = groundedFacts(beat.moves);
          const text = `${beat.say} ${beat.sayShort ?? ''}`;
          const seen = new Set<string>();
          for (const match of text.matchAll(CLAIM_RE)) {
            const square = match[1].toLowerCase();
            const piece = match[2].toLowerCase();
            const key = `${square}:${PIECE_LETTER[piece]}`;
            if (seen.has(key)) continue;
            seen.add(key);
            expect(
              facts.has(key),
              `${beat.id}: narration names the ${square}-${piece}, but no ${piece} ever stands on ${square} in this line`,
            ).toBe(true);
          }
        });
      }
    });
  }
});

// Sanity: the grounding helper actually reads the board (guards against a
// silently-empty fact set making every assertion vacuously pass).
describe('narration grounding helper', () => {
  it('captures starting-position facts', () => {
    const facts = groundedFacts([]);
    expect(facts.has('e1:k')).toBe(true);
    expect(facts.has('d1:q')).toBe(true);
    expect(facts.has('a8:r')).toBe(true);
  });
  it('flags a piece that never reaches a square', () => {
    const facts = groundedFacts(['e4', 'e5']);
    expect(facts.has('h4:q')).toBe(false);
  });
});
