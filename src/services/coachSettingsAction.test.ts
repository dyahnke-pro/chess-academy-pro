import { describe, it, expect } from 'vitest';
import { resolveSettingsCommand } from './coachSettingsAction';

// Settings-as-actions: the coach mutates SAFE prefs on command. The setting +
// value are resolved from a fixed whitelist in code — the LLM never decides.

describe('resolveSettingsCommand', () => {
  it('turns voice narration on/off', () => {
    expect(resolveSettingsCommand('turn on voice')?.prefsPatch).toMatchObject({ coachVoiceOn: true });
    expect(resolveSettingsCommand('turn off narration')?.prefsPatch).toMatchObject({ coachVoiceOn: false });
    expect(resolveSettingsCommand('mute the coach voice')?.prefsPatch).toMatchObject({ coachVoiceOn: false });
    expect(resolveSettingsCommand('enable voice')?.confirmation).toMatch(/on now/);
  });

  it('sets the narration level', () => {
    expect(resolveSettingsCommand('set my narration to brief')?.prefsPatch).toMatchObject({ coachNarration: 'brief' });
    expect(resolveSettingsCommand('set verbosity to full')?.prefsPatch).toMatchObject({ coachNarration: 'full' });
    expect(resolveSettingsCommand('make narration silent')?.prefsPatch).toMatchObject({ coachNarration: 'silent' });
    // synonyms normalize
    expect(resolveSettingsCommand('set narration to short')?.prefsPatch).toMatchObject({ coachNarration: 'brief' });
  });

  it('toggles hints', () => {
    expect(resolveSettingsCommand('enable hints')?.prefsPatch).toMatchObject({ showHints: true });
    expect(resolveSettingsCommand('turn off hints')?.prefsPatch).toMatchObject({ showHints: false });
  });

  it('toggles the premium voice', () => {
    expect(resolveSettingsCommand('disable the premium voice')?.prefsPatch).toMatchObject({ pollyEnabled: false });
    expect(resolveSettingsCommand('turn on polly')?.prefsPatch).toMatchObject({ pollyEnabled: true });
  });

  it('returns null for a QUERY (not a command)', () => {
    expect(resolveSettingsCommand('is voice on?')).toBeNull();
    expect(resolveSettingsCommand('what are my settings?')).toBeNull();
  });

  it('returns null for unsafe / unrecognized settings (never guesses)', () => {
    expect(resolveSettingsCommand('change my api key')).toBeNull();
    expect(resolveSettingsCommand('delete my data')).toBeNull();
    expect(resolveSettingsCommand('turn on the oven')).toBeNull();
    expect(resolveSettingsCommand('hello there')).toBeNull();
  });
});
