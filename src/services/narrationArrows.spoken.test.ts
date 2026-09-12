import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNarrationArrows } from './narrationArrows';

// ── THE SPOKEN REGISTER DRAWS ARROWS (David 2026-09-12) ──────────────────────
//
// He walked the Accelerated Dragon on /coach/teach and reported hearing lines
// that recited moves with nothing on the board pointing at them. The cause was
// not the look-ahead, and not the corpus: this deriver only understood SAN,
// while every narration rule in the project pushes prose AWAY from SAN (G9.4
// bans move-number prefixes; the house voice writes "the queen's knight to c3",
// never "2.Nc3", because the TTS sanitiser reads bare SAN as robotic).
//
// So "knight to c3" hit the trailing "to " in SQUARE_PREPOSITION_BEFORE, was
// classified "square reference, not a move", and drew nothing — on 3,152 of
// 7,086 narrated nodes (44.5%), while the lead-the-eye rule reported no problem.
// Teaching the deriver the spoken register recovered 1,670 of them.
//
// These are his actual sentences. The rejection cases below matter just as much:
// the fix must not turn every square the coach NAMES into an arrow.

const at = (sans: readonly string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};
const drawn = (text: string, sans: readonly string[]): string[] =>
  deriveNarrationArrows(text, at(sans), []).arrows.map((a) => `${a.from}-${a.to}`);

describe('spoken-register moves draw arrows', () => {
  it('draws both moves of "the pawn to d6 and d4"', () => {
    expect(drawn('The traditional Dragon runs through the pawn to d6 and d4.', ['e4', 'c5', 'Nf3']))
      .toEqual(['d7-d6', 'd2-d4']);
  });

  it('draws the opponent setup the coach names ahead of it', () => {
    // Neither move is legal for the side to move; both resolve through the
    // null-move flip, which is how prose names the opponent's plan.
    expect(drawn("We're facing the knight to c3 and the bishop to e3.", ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4']))
      .toEqual(['b1-c3', 'c1-e3']);
  });

  it('draws each move of a recited sequence, chaining the board', () => {
    const text =
      "Through the early moves — the knight to c3, our bishop onto the long diagonal, " +
      "White's bishop to e3, our knight to f6 —";
    // "onto the long diagonal" names no destination square, so it draws nothing —
    // correct: there is no square to point at.
    expect(drawn(text, ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'g6']))
      .toEqual(['b1-c3', 'c1-e3', 'g8-f6']);
  });

  it('draws a named alternative and its refutation', () => {
    expect(drawn('The bishop to e2 is the old move, and the pawn to d5 equalizes.', ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4']))
      .toEqual(['f1-e2', 'd7-d5']);
  });

  it('resolves a spoken capture', () => {
    expect(drawn('The knight takes d4.', ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4'])).toEqual(['f3-d4']);
  });
});

describe('a square the coach NAMES is still not a move', () => {
  const SQUARE_REFS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['The pawn on e4 controls d5 and f5.', ['e4', 'c5', 'Nf3']],
    ['The knight eyes the d5 outpost and the f5 square.', ['e4', 'c5', 'Nf3']],
    ['Black has a weakness on d6 and a hole on f5.', ['e4', 'c5', 'Nf3']],
  ];

  it.each(SQUARE_REFS)('draws nothing for %j', (text, sans) => {
    expect(drawn(text, sans)).toEqual([]);
  });
});

describe('ambiguity draws nothing rather than the wrong piece', () => {
  it('skips a spoken move two pieces of the same type could make', () => {
    // Both knights reach d2 here. Pointing at one of them would be a guess, and
    // a wrong arrow teaches a wrong move (G3) — silence is the honest answer.
    // White to move, knights on b1 and f3, d2 vacated — Nbd2 and Nfd2 both legal.
    const fen = at(['Nf3', 'd5', 'd4', 'Nf6']);
    const both = new Chess(fen).moves({ verbose: true }).filter((m) => m.to === 'd2' && m.piece === 'n');
    expect(both.length).toBeGreaterThan(1); // the premise of the test
    expect(deriveNarrationArrows('The knight to d2 holds everything together.', fen, []).arrows).toEqual([]);
  });
});
