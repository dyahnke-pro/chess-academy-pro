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

  it('picking a band seeds BOTH ratings and calls onDone', async () => {
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

    const persisted = await db.profiles.get('main');
    expect(persisted?.currentRating).toBe(600);
    expect(persisted?.puzzleRating).toBe(600);
    expect(persisted?.strengthCalibrated).toBe(true);

    expect(useAppStore.getState().activeProfile?.puzzleRating).toBe(600);
  });
});
