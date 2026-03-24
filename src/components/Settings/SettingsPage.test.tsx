import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { SettingsPage } from './SettingsPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

vi.mock('../../services/cryptoService', () => ({
  encryptApiKey: vi.fn().mockResolvedValue({ encrypted: 'enc', iv: 'iv' }),
}));

describe('SettingsPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders the settings page', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows all 5 tabs', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
    expect(screen.getByTestId('tab-board')).toBeInTheDocument();
    expect(screen.getByTestId('tab-coach')).toBeInTheDocument();
    expect(screen.getByTestId('tab-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('tab-about')).toBeInTheDocument();
  });

  it('shows profile tab by default', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    expect(screen.getByTestId('name-input')).toHaveValue('Test Player');
  });

  it('switches to board tab on click', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-board'));
    expect(screen.getByTestId('board-tab')).toBeInTheDocument();
    expect(screen.getByTestId('master-all-off-toggle')).toBeInTheDocument();
  });

  it('switches to coach tab on click', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-coach'));
    expect(screen.getByTestId('coach-tab')).toBeInTheDocument();
    expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
  });

  it('switches to appearance tab on click', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-appearance'));
    expect(screen.getByTestId('appearance-tab')).toBeInTheDocument();
  });

  it('appearance tab only shows theme picker', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-appearance'));
    expect(screen.getByTestId('appearance-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('board-color-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('piece-set-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sound-toggle')).not.toBeInTheDocument();
  });

  it('switches to about tab on click', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-about'));
    expect(screen.getByTestId('about-tab')).toBeInTheDocument();
    expect(screen.getByText('Chess Academy Pro')).toBeInTheDocument();
  });

  it('about tab has reset button with confirmation', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-about'));
    expect(screen.getByTestId('reset-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reset-btn'));
    expect(screen.getByTestId('confirm-reset-btn')).toBeInTheDocument();
  });

  it('renders empty when no profile', () => {
    render(<SettingsPage />);
    expect(screen.queryByTestId('settings-page')).not.toBeInTheDocument();
  });

  describe('Board & Gameplay tab', () => {
    it('renders all board display controls', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      expect(screen.getByTestId('highlight-last-move-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('show-legal-moves-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('show-coordinates-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('animation-speed-select')).toBeInTheDocument();
      expect(screen.getByTestId('board-orientation-toggle')).toBeInTheDocument();
    });

    it('renders board appearance controls', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      expect(screen.getByTestId('board-color-select')).toBeInTheDocument();
      expect(screen.getByTestId('piece-set-select')).toBeInTheDocument();
    });

    it('renders feedback and game behavior controls', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      expect(screen.getByTestId('move-quality-flash-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('show-hints-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('voice-narration-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('move-method-select')).toBeInTheDocument();
      expect(screen.getByTestId('move-confirmation-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('auto-promote-queen-toggle')).toBeInTheDocument();
    });

    it('renders audio and engine controls', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      expect(screen.getByTestId('sound-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('eval-bar-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('engine-lines-toggle')).toBeInTheDocument();
    });

    it('master all-off button toggles and shows confirmation text', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      const masterBtn = screen.getByTestId('master-all-off-toggle');
      expect(masterBtn).toHaveTextContent('Master All Off');

      fireEvent.click(masterBtn);
      expect(masterBtn).toHaveTextContent('Master Off');
    });

    it('master all-off disables affected toggle inputs', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      fireEvent.click(screen.getByTestId('master-all-off-toggle'));

      expect(screen.getByTestId('highlight-last-move-toggle')).toBeDisabled();
      expect(screen.getByTestId('show-legal-moves-toggle')).toBeDisabled();
      expect(screen.getByTestId('show-hints-toggle')).toBeDisabled();
      expect(screen.getByTestId('move-quality-flash-toggle')).toBeDisabled();
      expect(screen.getByTestId('voice-narration-toggle')).toBeDisabled();
      expect(screen.getByTestId('animation-speed-select')).toBeDisabled();
    });

    it('master all-off does NOT disable sound or game behavior', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      fireEvent.click(screen.getByTestId('master-all-off-toggle'));

      expect(screen.getByTestId('sound-toggle')).not.toBeDisabled();
      expect(screen.getByTestId('move-method-select')).not.toBeDisabled();
      expect(screen.getByTestId('move-confirmation-toggle')).not.toBeDisabled();
      expect(screen.getByTestId('auto-promote-queen-toggle')).not.toBeDisabled();
    });

    it('turning master all-off back off re-enables affected toggles', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      const masterBtn = screen.getByTestId('master-all-off-toggle');
      fireEvent.click(masterBtn); // turn ON
      expect(screen.getByTestId('voice-narration-toggle')).toBeDisabled();

      fireEvent.click(masterBtn); // turn OFF
      expect(screen.getByTestId('voice-narration-toggle')).not.toBeDisabled();
      expect(screen.getByTestId('voice-narration-toggle')).toBeChecked();
      expect(screen.getByTestId('show-hints-toggle')).not.toBeDisabled();
      expect(screen.getByTestId('highlight-last-move-toggle')).not.toBeDisabled();
    });

    it('has a save button', () => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
      render(<SettingsPage />);
      fireEvent.click(screen.getByTestId('tab-board'));

      expect(screen.getByTestId('save-board-btn')).toBeInTheDocument();
    });
  });
});
