import { describe, it, expect } from 'vitest';
import { namedStep, type TeachingHint } from './learnBoardTeaching';

const hint = (text: string, claims: string[]): TeachingHint =>
  ({ lane: 'blunderCheck', text, squares: [], claims, event: null, arrows: [] }) as unknown as TeachingHint;

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
