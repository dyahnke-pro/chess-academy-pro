import { describe, it, expect } from 'vitest';
import { namedStep } from './learnBoardTeaching';
import { teachingFact, type TeachingFact } from './teachingFact';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { NO_PROOF } from './proof';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const hint = (text: string, claims: string[]): TeachingFact =>
  teachingFact('blunderCheck', { computer: 'blunderCheck', kind: 'rule', seat: 'student', fen: FEN, names: NAMES_NO_MOVE, proof: NO_PROOF.method, text, squares: [], claims }, { event: null, arrows: [] });

describe('a method line names its thinking step', () => {
  it('blunder check → "Is my move safe?", from the claim, never the prose', () => {
    const out = namedStep(hint('Before you let go of a piece, ask what they can take', ['method:blunder-check']));
    expect(out.text).toMatch(/^Before you let go of a piece, ask what they can take\. (That is the “Is my move safe\?” habit\.|Habit: “Is my move safe\?”)$/);
  });
  it('a line with no method claim is untouched', () => {
    const h = hint('Recapture toward the centre.', ['recapture-e5']);
    expect(namedStep(h)).toBe(h);
  });
});
