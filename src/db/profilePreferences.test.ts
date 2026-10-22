import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { buildUserProfile } from '../test/factories';
import { changedPreferences, preferencesPatch } from './profilePreferences';

describe('a preferences write names only its own keys', () => {
  beforeEach(async () => { await db.profiles.clear(); });

  it('two writers from the SAME old copy both survive (the lost update, 2026-10-22)', async () => {
    await db.profiles.put(buildUserProfile({ id: 'main' }));
    const copy = (await db.profiles.get('main'))!;
    // The map saves the Campaign track…
    await db.profiles.update('main', changedPreferences(copy.preferences, { ...copy.preferences, campaignTrack: 'intermediate' }));
    // …then a writer holding the copy read BEFORE it saves its own key.
    await db.profiles.update('main', changedPreferences(copy.preferences, { ...copy.preferences, estimatedSpend: 3 }));
    const stored = (await db.profiles.get('main'))!;
    expect(stored.preferences.campaignTrack).toBe('intermediate');
    expect(stored.preferences.estimatedSpend).toBe(3);
  });

  it('the old whole-object write loses the first change — the failure this replaces', async () => {
    await db.profiles.put(buildUserProfile({ id: 'main' }));
    const copy = (await db.profiles.get('main'))!;
    await db.profiles.update('main', { preferences: { ...copy.preferences, campaignTrack: 'intermediate' } });
    await db.profiles.update('main', { preferences: { ...copy.preferences, estimatedSpend: 3 } });
    expect((await db.profiles.get('main'))!.preferences.campaignTrack).toBeUndefined();
  });

  it('a patch writes exactly its keys; an unchanged key is not written', () => {
    expect(preferencesPatch({ campaignTrack: 'advanced' })).toEqual({ 'preferences.campaignTrack': 'advanced' });
    const prefs = buildUserProfile().preferences;
    expect(changedPreferences(prefs, { ...prefs })).toEqual({});
    expect(changedPreferences(prefs, { ...prefs, soundEnabled: !prefs.soundEnabled })).toEqual({ 'preferences.soundEnabled': !prefs.soundEnabled });
  });
});
