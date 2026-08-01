// A concept question EXPLAINS the opening, so its prose ranges over the whole
// line (David 2026-08-01: "that narration was explaining the opening. Nd5 is a
// move that happens"). Grading it against one position deleted 22 TRUE
// sentences in a single Alekhine lesson — checked at move 0 the knight is not
// on d5 yet, checked at the terminus the early pieces have moved on.
//
// These run the real graders. The point is that the line gate keeps what is
// true SOMEWHERE on the line while still dropping what is true NOWHERE.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gradeNarrationText, gradeNarrationAcrossLine } from './coachAnswerGates';

/** Every position the line passes through, start included. */
const lineFens = (sans: string[]): string[] => {
  const c = new Chess();
  const out = [c.fen()];
  for (const s of sans) {
    c.move(s);
    out.push(c.fen());
  }
  return out;
};

// The exact line David's run walked.
const ALEKHINE = ['e4', 'Nf6', 'e5', 'Nd5', 'c4', 'Nb6', 'c5', 'Nd5', 'Bc4', 'e6', 'Nc3', 'd6'];

describe('line-scoped grading', () => {
  it('keeps a claim about a piece that arrives LATER in the line', () => {
    const text = 'The knight on d5 is the point of the whole system.';
    const fens = lineFens(ALEKHINE);
    // Graded at move 0 — the old behaviour — this is "false" and gets cut.
    expect(gradeNarrationText(text, fens[0], 'test')).not.toContain('d5');
    // Graded across the line it survives, because the knight really does land there.
    expect(gradeNarrationAcrossLine(text, fens, 'test')).toContain('d5');
  });

  it('still drops a claim that is true at NO position on the line', () => {
    const text = 'The rook on d5 dominates the board.';
    const fens = lineFens(ALEKHINE);
    const out = gradeNarrationAcrossLine(text, fens, 'test');
    // A rook never reaches d5 in this line — the gate must not go soft.
    expect(out).not.toContain('rook on d5');
  });

  it('keeps a sentence true only at the FINAL position', () => {
    const text = 'The pawn on d6 challenges the wedge.';
    const fens = lineFens(ALEKHINE);
    expect(gradeNarrationAcrossLine(text, fens, 'test')).toContain('d6');
  });

  it('is identical to single-position grading when given one position', () => {
    const fens = lineFens(ALEKHINE);
    const text = 'The knight on d5 is well placed.';
    expect(gradeNarrationAcrossLine(text, [fens[4]], 'test')).toBe(
      gradeNarrationText(text, fens[4], 'test'),
    );
  });

  it('returns empty when EVERY sentence is false everywhere — the honest answer', () => {
    // What to do with nothing is the caller's call, not the gate's. Handing the
    // original back here would let a wholly false claim through untouched.
    const text = 'The rook on a5 and the queen on h8 rule everything.';
    expect((gradeNarrationAcrossLine(text, lineFens(ALEKHINE), 'test') ?? '').trim()).toBe('');
  });

  it('passes prose through when there is no line to check against', () => {
    const text = 'Some claim about d5.';
    expect(gradeNarrationAcrossLine(text, [], 'test')).toBe(text);
  });
});
