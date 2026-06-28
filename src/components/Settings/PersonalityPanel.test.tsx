import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { PersonalityPanel } from './PersonalityPanel';
import { db } from '../../db/schema';
import { buildUserProfile } from '../../test/factories';
import * as appAuditor from '../../services/appAuditor';
import type { UserProfile } from '../../types';

const logAppAuditSpy = vi.spyOn(appAuditor, 'logAppAudit').mockImplementation(async () => {});

describe('PersonalityPanel', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    logAppAuditSpy.mockClear();
  });

  function setup(): { profile: UserProfile; setProfile: ReturnType<typeof vi.fn> } {
    const profile = buildUserProfile();
    const setProfile = vi.fn();
    render(<PersonalityPanel profile={profile} setProfile={setProfile} />);
    return { profile, setProfile };
  }

  it('renders the row with current personality summary', () => {
    setup();
    expect(screen.getByTestId('personality-row')).toBeInTheDocument();
    // Default profile → "Default · all clean" (all-ages: only mockery, off).
    expect(screen.getByText(/Default · all clean/i)).toBeInTheDocument();
  });

  it('opens the modal panel on row click — all-ages card set (no flirtatious)', () => {
    setup();
    fireEvent.click(screen.getByTestId('personality-row'));
    expect(screen.getByTestId('personality-panel')).toBeInTheDocument();
    // 4 picker cards — flirtatious removed for the all-ages contract.
    expect(screen.getByTestId('personality-card-default')).toBeInTheDocument();
    expect(screen.getByTestId('personality-card-soft')).toBeInTheDocument();
    expect(screen.getByTestId('personality-card-edgy')).toBeInTheDocument();
    expect(screen.getByTestId('personality-card-drill-sergeant')).toBeInTheDocument();
    expect(screen.queryByTestId('personality-card-flirtatious')).not.toBeInTheDocument();
  });

  it('the profanity + flirt dials are GONE; only Mockery remains', () => {
    setup();
    fireEvent.click(screen.getByTestId('personality-row'));
    expect(screen.queryByTestId('dial-profanity-hard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dial-flirt-medium')).not.toBeInTheDocument();
    expect(screen.getByTestId('dial-mockery-none')).toBeInTheDocument();
  });

  it('selecting a personality auto-seeds the mockery dial default', () => {
    setup();
    fireEvent.click(screen.getByTestId('personality-row'));
    fireEvent.click(screen.getByTestId('personality-card-drill-sergeant'));
    // Drill sergeant default mockery = hard.
    expect(screen.getByTestId('dial-mockery-hard')).toHaveAttribute('aria-checked', 'true');
  });

  it('user can override the mockery dial after picking a personality', () => {
    setup();
    fireEvent.click(screen.getByTestId('personality-row'));
    fireEvent.click(screen.getByTestId('personality-card-drill-sergeant'));
    fireEvent.click(screen.getByTestId('dial-mockery-medium'));
    expect(screen.getByTestId('dial-mockery-medium')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('dial-mockery-hard')).toHaveAttribute('aria-checked', 'false');
  });

  it('auto-saves picker change, forcing profanity + flirt OFF (WO-AUTOSAVE-01 + all-ages)', async () => {
    const profile = buildUserProfile();
    await db.profiles.put(profile);
    const setProfile = vi.fn();
    render(<PersonalityPanel profile={profile} setProfile={setProfile} />);
    fireEvent.click(screen.getByTestId('personality-row'));
    fireEvent.click(screen.getByTestId('personality-card-edgy'));
    await waitFor(() => {
      expect(setProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            coachPersonality: 'edgy',
            coachProfanity: 'none', // locked off
            coachMockery: 'hard',
            coachFlirt: 'none', // locked off
          }),
        }),
      );
    });
    const stored = await db.profiles.get(profile.id);
    expect(stored?.preferences.coachPersonality).toBe('edgy');
    expect(stored?.preferences.coachProfanity).toBe('none');
    expect(stored?.preferences.coachFlirt).toBe('none');
    expect(logAppAuditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'coach-personality-changed',
        category: 'subsystem',
      }),
    );
  });

  it('Done button closes the modal (settings already auto-persisted)', async () => {
    const { setProfile } = setup();
    fireEvent.click(screen.getByTestId('personality-row'));
    fireEvent.click(screen.getByTestId('personality-card-edgy'));
    await waitFor(() => expect(setProfile).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('personality-done'));
    await waitFor(() => {
      expect(screen.queryByTestId('personality-panel')).not.toBeInTheDocument();
    });
  });

  it('Reset dials resets the mockery dial to the draft personality default', () => {
    setup();
    fireEvent.click(screen.getByTestId('personality-row'));
    fireEvent.click(screen.getByTestId('personality-card-drill-sergeant'));
    // Override mockery down to none.
    fireEvent.click(screen.getByTestId('dial-mockery-none'));
    expect(screen.getByTestId('dial-mockery-none')).toHaveAttribute('aria-checked', 'true');
    // Reset → drill sergeant default mockery = hard.
    fireEvent.click(screen.getByTestId('personality-reset-dials'));
    expect(screen.getByTestId('dial-mockery-hard')).toHaveAttribute('aria-checked', 'true');
  });

  it('row summary updates after auto-save', async () => {
    const profile = buildUserProfile();
    let saved: UserProfile = profile;
    const setProfile = vi.fn((p: UserProfile) => {
      saved = p;
    });
    const { rerender } = render(<PersonalityPanel profile={profile} setProfile={setProfile} />);
    fireEvent.click(screen.getByTestId('personality-row'));
    fireEvent.click(screen.getByTestId('personality-card-edgy'));
    await waitFor(() => expect(setProfile).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('personality-done'));
    await waitFor(() => expect(screen.queryByTestId('personality-panel')).not.toBeInTheDocument());
    rerender(<PersonalityPanel profile={saved} setProfile={setProfile} />);
    const row = screen.getByTestId('personality-row');
    expect(row.textContent).toMatch(/Edgy/);
    // Edgy default mockery = hard.
    expect(row.textContent).toMatch(/Mockery: Hard/);
  });

  it('voice picker per personality renders with sensible defaults (no flirtatious)', () => {
    setup();
    fireEvent.click(screen.getByTestId('personality-row'));
    expect((screen.getByTestId('personality-voice-default')).value).toBe('ruth');
    expect((screen.getByTestId('personality-voice-soft')).value).toBe('joanna');
    expect((screen.getByTestId('personality-voice-edgy')).value).toBe('stephen');
    expect((screen.getByTestId('personality-voice-drill-sergeant')).value).toBe('matthew');
    expect(screen.queryByTestId('personality-voice-flirtatious')).not.toBeInTheDocument();
  });

  it('persists the FULL per-personality voice map (R8: lock pairings, no diff-only resets)', async () => {
    const profile = buildUserProfile();
    await db.profiles.put(profile);
    const setProfile = vi.fn();
    render(<PersonalityPanel profile={profile} setProfile={setProfile} />);
    fireEvent.click(screen.getByTestId('personality-row'));
    fireEvent.change(screen.getByTestId('personality-voice-edgy'), { target: { value: 'ruth' } });
    await waitFor(() => expect(setProfile).toHaveBeenCalled());
    const stored = await db.profiles.get(profile.id);
    expect(stored?.preferences.coachPersonalityVoices).toEqual({
      default: 'ruth',
      soft: 'joanna',
      edgy: 'ruth',
      'drill-sergeant': 'matthew',
    });
  });
});
