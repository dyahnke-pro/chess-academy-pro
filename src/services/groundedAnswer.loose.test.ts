// "Loose" is its own question (walk 2026-10-04, defect 13): "which of their
// pieces are loose?" was answered "Nothing of theirs is hanging" while their
// queen on b4 had no defender. Loose = no defender; hanging = loses material.
import { describe, it, expect } from 'vitest';
import { answerBoardQuestion } from './groundedAnswer';

// Student is Black. White's queen on b4 has no defender and nothing attacks it.
const FEN = '6k1/5ppp/8/8/1Q6/8/5PPP/6K1 b - - 0 1';

describe('chat answers LOOSE from the loose computer, and hanging separately', () => {
  it('names the undefended queen the walk asked about', () => {
    const a = answerBoardQuestion(FEN, 'which of their pieces are loose?', 'black');
    expect(a?.answer.facts).toBe('Their queen on b4 is loose — nothing defends it, though nothing attacks it yet. Nothing of theirs is hanging right now.');
    expect(a?.answer.facts).not.toMatch(/^Nothing of theirs is hanging/);
  });
  it('an unowned "what is loose?" reads both sides', () => {
    const a = answerBoardQuestion(FEN, 'what is loose?', 'black');
    expect(a?.answer.facts).toMatch(/^None of your pieces is loose/);
    expect(a?.answer.facts).toMatch(/Their queen on b4 is loose/);
  });
  it('a loose piece that also hangs is said as hanging, once', () => {
    // Black knight e5 undefended, hit by the d4 pawn. Student White.
    const fen = '6k1/5ppp/8/4n3/3P4/8/5PPP/6K1 w - - 0 1';
    const a = answerBoardQuestion(fen, 'are any of their pieces loose?', 'white');
    expect(a?.answer.facts).toMatch(/Their knight on e5 is loose — you can win about 3 points\./);
    expect(a?.answer.facts.match(/e5/g)).toHaveLength(1);
  });
  it('a hanging question is unchanged (no loose read when not asked)', () => {
    expect(answerBoardQuestion(FEN, 'is anything hanging?', 'black')?.answer.facts).toBe('Nothing is hanging on either side right now.');
  });
});
