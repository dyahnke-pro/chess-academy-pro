// Unity U7 (Learn walk #27/#28): "Drop everything — your queen on d5 is
// attacked", then "Which of your pieces could they win right now?" — a question
// asked right after its own answer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { questionAlreadyAnswered } from './useThinkingLesson';

describe('a question never follows its own answer', () => {
  it('held when the turn already named every square it asks for', () => {
    expect(questionAlreadyAnswered(['d5'], ['d5', 'c3'])).toBe(true);
  });
  it('asked when it wants a square the turn did not name, or nothing was said', () => {
    expect(questionAlreadyAnswered(['d5', 'f6'], ['d5'])).toBe(false);
    expect(questionAlreadyAnswered(['d5'], [])).toBe(false);
    expect(questionAlreadyAnswered([], ['d5'])).toBe(false);
  });
  it('Learn asks the turn\'s question only after the instant decision has set the lead', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const decided = src.indexOf('turnLeadRef.current = instant.lead ?');
    const asked = src.lastIndexOf('askTurnQuestion();');
    expect(decided).toBeGreaterThan(0);
    expect(asked).toBeGreaterThan(decided);
  });
});
