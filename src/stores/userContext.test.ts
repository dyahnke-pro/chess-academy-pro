import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';
import {
  USER_CONTEXT_DEFAULTS,
  selectActiveProfile,
  selectAiProvider,
  selectCoachVerbosity,
  selectHasLlmKey,
  selectIsKidMode,
  selectPuzzleRating,
  selectUserLevel,
  selectUserName,
  selectUserRating,
  selectUserXp,
} from './userContext';
import { buildUserProfile } from '../test/factories';

beforeEach(() => {
  useAppStore.getState().reset();
});

describe('userContext selectors — null profile defaults', () => {
  it('selectActiveProfile returns null when not hydrated', () => {
    expect(selectActiveProfile(useAppStore.getState())).toBeNull();
  });

  it('selectUserName falls back to default', () => {
    expect(selectUserName(useAppStore.getState())).toBe(USER_CONTEXT_DEFAULTS.name);
  });

  it('selectUserRating falls back to default rating', () => {
    expect(selectUserRating(useAppStore.getState())).toBe(
      USER_CONTEXT_DEFAULTS.rating,
    );
  });

  it('selectPuzzleRating falls back to default puzzleRating', () => {
    expect(selectPuzzleRating(useAppStore.getState())).toBe(
      USER_CONTEXT_DEFAULTS.puzzleRating,
    );
  });

  it('selectUserLevel falls back to default level', () => {
    expect(selectUserLevel(useAppStore.getState())).toBe(
      USER_CONTEXT_DEFAULTS.level,
    );
  });

  it('selectUserXp falls back to default xp', () => {
    expect(selectUserXp(useAppStore.getState())).toBe(USER_CONTEXT_DEFAULTS.xp);
  });

  it('selectIsKidMode falls back to false', () => {
    expect(selectIsKidMode(useAppStore.getState())).toBe(false);
  });

  it('selectAiProvider falls back to default provider', () => {
    expect(selectAiProvider(useAppStore.getState())).toBe(
      USER_CONTEXT_DEFAULTS.aiProvider,
    );
  });

  it('selectCoachVerbosity falls back to unlimited', () => {
    expect(selectCoachVerbosity(useAppStore.getState())).toBe('unlimited');
  });

  it('selectHasLlmKey is false when profile is null', () => {
    expect(selectHasLlmKey(useAppStore.getState())).toBe(false);
  });
});

describe('userContext selectors — hydrated profile', () => {
  it('reads canonical fields from the active profile', () => {
    const profile = buildUserProfile({
      name: 'Mateo',
      currentRating: 1650,
      puzzleRating: 1700,
      level: 7,
      xp: 420,
      isKidMode: true,
    });
    useAppStore.getState().setActiveProfile(profile);

    const state = useAppStore.getState();
    expect(selectUserName(state)).toBe('Mateo');
    expect(selectUserRating(state)).toBe(1650);
    expect(selectPuzzleRating(state)).toBe(1700);
    expect(selectUserLevel(state)).toBe(7);
    expect(selectUserXp(state)).toBe(420);
    expect(selectIsKidMode(state)).toBe(true);
  });

  it('selectHasLlmKey is true when deepseek key is set', () => {
    const profile = buildUserProfile({
      preferences: {
        ...buildUserProfile().preferences,
        apiKeyEncrypted: 'cipher',
        apiKeyIv: 'iv',
      },
    });
    useAppStore.getState().setActiveProfile(profile);
    expect(selectHasLlmKey(useAppStore.getState())).toBe(true);
  });

  it('selectHasLlmKey is true when only anthropic key is set', () => {
    const profile = buildUserProfile({
      preferences: {
        ...buildUserProfile().preferences,
        apiKeyEncrypted: null,
        anthropicApiKeyEncrypted: 'cipher',
        anthropicApiKeyIv: 'iv',
      },
    });
    useAppStore.getState().setActiveProfile(profile);
    expect(selectHasLlmKey(useAppStore.getState())).toBe(true);
  });

  it('selectAiProvider reflects the profile preference', () => {
    const profile = buildUserProfile({
      preferences: { ...buildUserProfile().preferences, aiProvider: 'anthropic' },
    });
    useAppStore.getState().setActiveProfile(profile);
    expect(selectAiProvider(useAppStore.getState())).toBe('anthropic');
  });

  it('selectCoachVerbosity reflects an explicit override', () => {
    const profile = buildUserProfile({
      preferences: { ...buildUserProfile().preferences, coachVerbosity: 'fast' },
    });
    useAppStore.getState().setActiveProfile(profile);
    expect(selectCoachVerbosity(useAppStore.getState())).toBe('fast');
  });
});
