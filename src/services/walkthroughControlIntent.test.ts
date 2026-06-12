import { describe, it, expect } from 'vitest';
import {
  classifyWalkthroughControl,
  isWalkthroughControlPhrase,
} from './walkthroughControlIntent';

describe('classifyWalkthroughControl', () => {
  it('classifies bare continue words as resume', () => {
    for (const t of [
      'start',
      'Start',
      'begin',
      'resume',
      'continue',
      'go',
      'go on',
      'go ahead',
      'keep going',
      'next',
      'proceed',
      'unpause',
      'continue the lesson',
      'resume the walkthrough',
    ]) {
      expect(classifyWalkthroughControl(t)).toBe('resume');
    }
  });

  it('classifies explicit new-lesson asks as new', () => {
    for (const t of [
      'new lesson',
      'start a new lesson',
      'start a different lesson',
      'teach me something else',
      'show me a different opening',
      'give me another line',
      'switch lessons',
      'switch openings',
      "let's switch to a different one",
      'pick a new opening',
      'learn something new',
    ]) {
      expect(classifyWalkthroughControl(t)).toBe('new');
    }
  });

  it('classifies stop/end asks as stop', () => {
    for (const t of [
      'stop',
      'end',
      'quit',
      'cancel',
      'never mind',
      'nevermind',
      'end the walkthrough',
      'stop this lesson',
      'end this',
      "i'm done",
      'forget the lesson',
    ]) {
      expect(classifyWalkthroughControl(t)).toBe('stop');
    }
  });

  it('does NOT misclassify opening names or real questions', () => {
    for (const t of [
      'teach me the Italian',
      'show me the Sicilian',
      'Vienna',
      'London System',
      "King's Indian Defense",
      'what is the best move here?',
      'walk me through the Caro-Kann',
      'I played e4. Your move.',
      'continue with the catalan', // not a bare resume word
      'why is this move good?',
    ]) {
      expect(classifyWalkthroughControl(t)).toBeNull();
    }
  });

  it('isWalkthroughControlPhrase mirrors classify', () => {
    expect(isWalkthroughControlPhrase('start')).toBe(true);
    expect(isWalkthroughControlPhrase('stop')).toBe(true);
    expect(isWalkthroughControlPhrase('new lesson')).toBe(true);
    expect(isWalkthroughControlPhrase('teach me the Vienna')).toBe(false);
    expect(isWalkthroughControlPhrase('London')).toBe(false);
  });

  it('ignores overly long inputs (those are real sentences)', () => {
    expect(
      classifyWalkthroughControl(
        'can you start by explaining the main ideas behind this whole opening system in detail',
      ),
    ).toBeNull();
  });
});
