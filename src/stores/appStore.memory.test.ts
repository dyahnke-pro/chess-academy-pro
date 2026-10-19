import { describe, it, expect, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { db } from '../db/schema';
import { useAppStore, hydrateRememberedSettings } from './appStore';
import { recallSetting } from '../services/studentMemory';

beforeEach(async () => { db.close(); await db.delete(); await db.open(); useAppStore.setState({ coachDifficulty: 'medium' }); });

describe('Play difficulty survives a close-and-reopen (persistent memory)', () => {
  it('a chosen difficulty is remembered and restored at boot', async () => {
    useAppStore.getState().setCoachDifficulty('hard');
    await waitFor(async () => expect(await recallSetting('coach-difficulty', '')).toBe('hard'));
    useAppStore.setState({ coachDifficulty: 'medium' }); // the app closed
    db.close(); await db.open();
    await hydrateRememberedSettings();
    expect(useAppStore.getState().coachDifficulty).toBe('hard');
  });

  it('nothing remembered leaves the default', async () => {
    await hydrateRememberedSettings();
    expect(useAppStore.getState().coachDifficulty).toBe('medium');
  });
});
