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

describe('round-3 lane-yield guards', () => {
  it('the color and last-game asks are never swallowed by record-vs', async () => {
    const { recordVsTarget } = await import('./questionIntents');
    expect(recordVsTarget('am I better as White or Black?')).toBeNull();
    expect(recordVsTarget('how did my most recent game go?')).toBeNull();
    expect(recordVsTarget('my record against Magnus')).toBe('Magnus');
  });
  it('question-shaped puzzle/time asks never become training requests', async () => {
    const { trainingRequestKind } = await import('./questionIntents');
    expect(trainingRequestKind('do I blunder in time trouble?')).toBeNull();
    expect(trainingRequestKind('am I better at puzzles than games?')).toBeNull();
    expect(trainingRequestKind('how good is my puzzle rush?')).toBeNull();
    expect(trainingRequestKind('drill my mistakes')).toBe('mistakes');
  });
});
