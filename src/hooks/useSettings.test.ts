import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';

describe('useSettings', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('returns default settings when no profile is loaded', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.highlightLastMove).toBe(true);
    expect(result.current.settings.showLegalMoves).toBe(true);
    expect(result.current.settings.pieceAnimationSpeed).toBe('medium');
    expect(result.current.settings.moveQualityFlash).toBe(false);
    expect(result.current.settings.masterAllOff).toBe(false);
    expect(result.current.raw).toBeNull();
  });

  it('returns stored preferences when profile exists', () => {
    const profile = buildUserProfile({
      preferences: {
        ...buildUserProfile().preferences,
        highlightLastMove: false,
        moveMethod: 'click',
        autoPromoteQueen: false,
      },
    });
    useAppStore.getState().setActiveProfile(profile);

    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.highlightLastMove).toBe(false);
    expect(result.current.settings.moveMethod).toBe('click');
    expect(result.current.settings.autoPromoteQueen).toBe(false);
  });

  it('masterAllOff overrides affected fields', () => {
    const profile = buildUserProfile({
      preferences: {
        ...buildUserProfile().preferences,
        masterAllOff: true,
        showHints: true,
        highlightLastMove: true,
        showLegalMoves: true,
        voiceEnabled: true,
        moveQualityFlash: true,
        pieceAnimationSpeed: 'slow',
      },
    });
    useAppStore.getState().setActiveProfile(profile);

    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.showHints).toBe(false);
    expect(result.current.settings.highlightLastMove).toBe(false);
    expect(result.current.settings.showLegalMoves).toBe(false);
    expect(result.current.settings.voiceEnabled).toBe(false);
    expect(result.current.settings.moveQualityFlash).toBe(false);
    expect(result.current.settings.pieceAnimationSpeed).toBe('none');
    expect(result.current.settings.masterAllOff).toBe(true);
  });

  it('masterAllOff does NOT override sound, theme, or game behavior', () => {
    const profile = buildUserProfile({
      preferences: {
        ...buildUserProfile().preferences,
        masterAllOff: true,
        soundEnabled: true,
        theme: 'midnight-blue',
        moveMethod: 'drag',
        moveConfirmation: true,
        autoPromoteQueen: false,
      },
    });
    useAppStore.getState().setActiveProfile(profile);

    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.soundEnabled).toBe(true);
    expect(result.current.settings.theme).toBe('midnight-blue');
    expect(result.current.settings.moveMethod).toBe('drag');
    expect(result.current.settings.moveConfirmation).toBe(true);
    expect(result.current.settings.autoPromoteQueen).toBe(false);
  });

  it('updateSetting persists to Dexie and updates Zustand', async () => {
    const profile = buildUserProfile({ id: 'main' });
    await db.profiles.add(profile);
    useAppStore.getState().setActiveProfile(profile);

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSetting('showHints', false);
    });

    expect(result.current.settings.showHints).toBe(false);
    const stored = await db.profiles.get('main');
    expect(stored?.preferences.showHints).toBe(false);
  });

  it('updateSettings batch update works', async () => {
    const profile = buildUserProfile({ id: 'main' });
    await db.profiles.add(profile);
    useAppStore.getState().setActiveProfile(profile);

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({
        moveMethod: 'click',
        autoPromoteQueen: false,
        showCoordinates: false,
      });
    });

    expect(result.current.settings.moveMethod).toBe('click');
    expect(result.current.settings.autoPromoteQueen).toBe(false);
    expect(result.current.settings.showCoordinates).toBe(false);

    const stored = await db.profiles.get('main');
    expect(stored?.preferences.moveMethod).toBe('click');
    expect(stored?.preferences.autoPromoteQueen).toBe(false);
    expect(stored?.preferences.showCoordinates).toBe(false);
  });

  it('updateSetting is a no-op when no profile', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSetting('showHints', false);
    });

    expect(result.current.settings.showHints).toBe(true);
  });

  it('toggling masterAllOff off restores real values', () => {
    const profile = buildUserProfile({
      preferences: {
        ...buildUserProfile().preferences,
        masterAllOff: true,
        showHints: true,
        highlightLastMove: true,
      },
    });
    useAppStore.getState().setActiveProfile(profile);

    const { result, rerender } = renderHook(() => useSettings());
    expect(result.current.settings.showHints).toBe(false);
    expect(result.current.settings.highlightLastMove).toBe(false);

    const restored = buildUserProfile({
      preferences: {
        ...profile.preferences,
        masterAllOff: false,
      },
    });
    useAppStore.getState().setActiveProfile(restored);
    rerender();

    expect(result.current.settings.showHints).toBe(true);
    expect(result.current.settings.highlightLastMove).toBe(true);
  });

  it('raw exposes stored preferences without overrides', () => {
    const profile = buildUserProfile({
      preferences: {
        ...buildUserProfile().preferences,
        masterAllOff: true,
        showHints: true,
      },
    });
    useAppStore.getState().setActiveProfile(profile);

    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.showHints).toBe(false);
    expect(result.current.raw?.showHints).toBe(true);
  });
});
