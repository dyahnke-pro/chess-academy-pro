import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { ALL_LESSONS } from './registry';

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

const lessons = ALL_LESSONS.map((l) => l.lesson);

const PIECE_LETTER: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};

// Hyphenated form: "the e4-knight", "the b3-bishop". This is the RELIABLE
// claim form — the hyphen binds the square to the piece as an assertion of
// presence, so a mismatch is unambiguously a board-fact error.
const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;
//
// Hole 3 (prose form, e.g. "the knight on e4") was TRIED and deliberately
// NOT shipped. A measured pass over the Ruy/Pirc/Vienna masterclasses
// produced 4 false positives and 0 real hallucinations — the prose form is
// used legitimately for maxims ("a knight on f5 cannot be repelled"),
// cross-opening comparisons ("the bishop on a4-b3-c2", a Ruy reference),
// possessives ("on e5's defender's square"), and negated comparisons
// ("doesn't expose the knight on e4 the way it does in the Nf6 line"). A
// static regex can't separate those from a claim, and a gate that cries
// wolf is worse than no gate. Prose-level hallucination is caught instead
// by: (1) author-time grounding (the brain sees the board + masterclass
// context), (2) the narration listener tool that audits what's actually
// spoken (G7 / playbook §9), and (3) David's ear on prod. The static gate
// owns the hyphenated form only — where it's certain.

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
          const check = (square: string, piece: string): void => {
            const key = `${square.toLowerCase()}:${PIECE_LETTER[piece.toLowerCase()]}`;
            if (seen.has(key)) return;
            seen.add(key);
            expect(
              facts.has(key),
              `${beat.id}: narration names the ${piece} on ${square}, but no ${piece} ever stands on ${square} in this line`,
            ).toBe(true);
          };
          for (const m of text.matchAll(CLAIM_RE)) check(m[1], m[2]);
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
