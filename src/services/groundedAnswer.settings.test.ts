import { describe, it, expect } from 'vitest';
import { assembleSettingsAnswer } from './groundedAnswer';
import { isSettingsQuestion } from '../coach/questionIntents';

// F17 settings — DATA half. The coach voices the user's CURRENT preferences,
// read from the profile in code (never guessed). Command verbs are actions,
// not queries, and must not route here.

describe('isSettingsQuestion (query half)', () => {
  it('matches settings QUERIES', () => {
    for (const q of [
      'is voice on?',
      'is my narration muted?',
      "what's my verbosity?",
      'what are my settings?',
      'what is my narration level?',
      'how am I set up?',
      'are hints on?',
    ]) {
      expect(isSettingsQuestion(q), q).toBe(true);
    }
  });

  it('does NOT match settings COMMANDS (those are actions)', () => {
    for (const q of [
      'turn on voice',
      'set my verbosity to brief',
      'enable hints',
      'switch to dark theme',
      'disable narration',
    ]) {
      expect(isSettingsQuestion(q), q).toBe(false);
    }
  });

  it('does NOT match unrelated chat', () => {
    for (const q of ['hi', "what's the best move?", 'teach me the Caro-Kann']) {
      expect(isSettingsQuestion(q), q).toBe(false);
    }
  });
});

describe('assembleSettingsAnswer', () => {
  it('voices the current preference values', () => {
    const a = assembleSettingsAnswer({
      voiceOn: true,
      narration: 'brief',
      showHints: false,
      pollyEnabled: true,
      personality: 'default',
    });
    expect(a).not.toBeNull();
    expect(a!.facts).toContain('Voice narration is on');
    expect(a!.facts).toMatch(/narration level is brief/);
    expect(a!.facts).toContain('Hints are off');
    expect(a!.sources).toEqual(['app:settings']);
  });

  it('reports voice off + device voice when Polly is disabled', () => {
    const a = assembleSettingsAnswer({ voiceOn: false, pollyEnabled: false });
    expect(a!.facts).toContain('Voice narration is off');
    expect(a!.facts).toContain('device voice');
  });

  it('names a non-default personality but hides the default', () => {
    expect(assembleSettingsAnswer({ personality: 'edgy', voiceOn: true })!.facts).toContain('edgy');
    expect(assembleSettingsAnswer({ personality: 'default', voiceOn: true })!.facts).not.toMatch(/personality/i);
  });

  it('returns null when nothing is known', () => {
    expect(assembleSettingsAnswer({})).toBeNull();
  });
});
