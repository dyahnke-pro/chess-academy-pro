import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { FirstRunStrength } from './FirstRunStrength';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';

describe('FirstRunStrength — the one-time strength question', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('asks a new player, and New to chess turns on beginner mode at 600', async () => {
    const profile = buildUserProfile({ aiDataConsent: 'granted', strengthCalibrated: false, currentRating: 400 });
    await db.profiles.put(profile);
    useAppStore.getState().setActiveProfile(profile);
    render(<FirstRunStrength />);
    expect(screen.getByTestId('first-run-strength')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('first-run-band-newcomer'));
    expect(screen.queryByTestId('first-run-strength')).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect((await db.profiles.get(profile.id))?.skillBand).toBe('newcomer');
    expect(useAppStore.getState().activeProfile?.currentRating).toBe(600);
  });

  it('Skip closes it and keeps the app adaptive', async () => {
    const profile = buildUserProfile({ aiDataConsent: 'granted', strengthCalibrated: false, currentRating: 400 });
    await db.profiles.put(profile);
    useAppStore.getState().setActiveProfile(profile);
    render(<FirstRunStrength />);
    fireEvent.click(screen.getByTestId('first-run-skip'));
    expect(screen.queryByTestId('first-run-strength')).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(useAppStore.getState().activeProfile?.currentRating).toBe(400);
  });

  it('never asks a student whose games already measured them', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ aiDataConsent: 'granted', strengthCalibrated: true }));
    render(<FirstRunStrength />);
    expect(screen.queryByTestId('first-run-strength')).not.toBeInTheDocument();
  });
});
