import { describe, it, expect } from 'vitest';
import { resolveVerbosity } from './coachCommentaryPolicy';
import { buildUserProfile } from '../test/factories';

describe('resolveVerbosity', () => {
  it('defaults to key-moments when the preference is unset', () => {
    const profile = buildUserProfile();
    delete profile.preferences.coachCommentaryVerbosity;
    expect(resolveVerbosity(profile)).toBe('key-moments');
  });

  it('defaults to key-moments when no profile is provided', () => {
    expect(resolveVerbosity(null)).toBe('key-moments');
    expect(resolveVerbosity(undefined)).toBe('key-moments');
  });

  it('honors an explicit preference', () => {
    const every = buildUserProfile();
    every.preferences.coachCommentaryVerbosity = 'every-move';
    expect(resolveVerbosity(every)).toBe('every-move');

    const off = buildUserProfile();
    off.preferences.coachCommentaryVerbosity = 'off';
    expect(resolveVerbosity(off)).toBe('off');
  });

  it('coachNarration overrides the legacy coachCommentaryVerbosity', () => {
    const silent = buildUserProfile();
    silent.preferences.coachNarration = 'silent';
    silent.preferences.coachCommentaryVerbosity = 'every-move';
    expect(resolveVerbosity(silent)).toBe('off');

    const brief = buildUserProfile();
    brief.preferences.coachNarration = 'brief';
    brief.preferences.coachCommentaryVerbosity = 'every-move';
    expect(resolveVerbosity(brief)).toBe('key-moments');

    const full = buildUserProfile();
    full.preferences.coachNarration = 'full';
    full.preferences.coachCommentaryVerbosity = 'off';
    expect(resolveVerbosity(full)).toBe('every-move');
  });
});
