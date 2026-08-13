import { describe, it, expect } from 'vitest';
import { matchTrainingAidRoute } from '../services/trainingAidRouter';
import { isProgressQuestion, isAppHelpQuestion } from './questionIntents';
describe('varied-sweep guards', () => {
  it('question-shaped asks never drill; imperatives still do', () => {
    expect(matchTrainingAidRoute('why am I good at puzzles but bad in games?')).toBeNull();
    expect(matchTrainingAidRoute('do I blunder in time trouble?')).toBeNull();
    expect(matchTrainingAidRoute('give me a fork puzzle')).not.toBeNull();
  });
  it('the tab ask is app-help, not the habit profile', () => {
    expect(isProgressQuestion("what's the Weaknesses tab for?")).toBe(false);
    expect(isAppHelpQuestion("what's the Weaknesses tab for?")).toBe(true);
    expect(isProgressQuestion('what mistakes do I keep making?')).toBe(true);
  });
});
