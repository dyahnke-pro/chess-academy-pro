import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { StrengthCalibrationBubble } from './StrengthCalibrationBubble';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildUserProfile } from '../../test/factories';

describe('StrengthCalibrationBubble', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders all skill bands', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<StrengthCalibrationBubble onDone={() => {}} />);
    expect(screen.getByTestId('strength-calibration-bubble')).toBeInTheDocument();
    expect(screen.getByTestId('skill-band-newcomer')).toBeInTheDocument();
    expect(screen.getByTestId('skill-band-beginner')).toBeInTheDocument();
    expect(screen.getByTestId('skill-band-intermediate')).toBeInTheDocument();
    expect(screen.getByTestId('skill-band-advanced')).toBeInTheDocument();
  });

  it('picking a band seeds BOTH ratings (background write) and calls onDone', async () => {
    const profile = buildUserProfile({
      id: 'main',
      currentRating: 800,
      puzzleRating: 800,
      strengthCalibrated: false,
    });
    await db.profiles.put(profile);
    useAppStore.getState().setActiveProfile(profile);
    const onDone = vi.fn();

    render(<StrengthCalibrationBubble onDone={onDone} />);
    fireEvent.click(screen.getByTestId('skill-band-newcomer'));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    // Persistence is a background write now — it lands shortly after dismiss.
    await waitFor(async () => {
      const persisted = await db.profiles.get('main');
      expect(persisted?.currentRating).toBe(600);
      expect(persisted?.puzzleRating).toBe(600);
      expect(persisted?.strengthCalibrated).toBe(true);
    });
  });

  it('dismisses OPTIMISTICALLY — store updates + onDone fire without awaiting the Dexie write', async () => {
    // The freeze fix (David 2026-06-06): the bubble must NOT block on the
    // profile write, which the cold deferred seed can starve for 15s+. The
    // store reflects the pick and onDone fires synchronously on click, before
    // any awaited persistence.
    const profile = buildUserProfile({
      id: 'main',
      currentRating: 800,
      puzzleRating: 800,
      strengthCalibrated: false,
    });
    await db.profiles.put(profile);
    useAppStore.getState().setActiveProfile(profile);
    const onDone = vi.fn();

    render(<StrengthCalibrationBubble onDone={onDone} />);
    fireEvent.click(screen.getByTestId('skill-band-intermediate'));

    // Synchronous, same tick as the click — no await between.
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().activeProfile?.currentRating).toBe(1300);
    expect(useAppStore.getState().activeProfile?.puzzleRating).toBe(1300);
    expect(useAppStore.getState().activeProfile?.strengthCalibrated).toBe(true);
  });
});
