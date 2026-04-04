import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/speechService', () => ({
  speechService: {
    getAvailableVoices: vi.fn().mockReturnValue([]),
    onVoicesChanged: vi.fn().mockReturnValue(() => undefined),
    setRate: vi.fn(),
    setVoice: vi.fn(),
    speak: vi.fn(),
    stop: vi.fn(),
  },
}));

describe('VoiceSettingsPanel', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders the voice settings panel', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-settings-panel')).toBeInTheDocument();
  });

  it('shows Cloud Voice (AI) section', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('Cloud Voice (AI)')).toBeInTheDocument();
  });

  it('shows Polly toggle', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('polly-toggle')).toBeInTheDocument();
  });

  it('shows Polly voice selector when enabled', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({
      id: 'main',
      preferences: { pollyEnabled: true },
    }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('polly-voice-select')).toBeInTheDocument();
  });

  it('shows preview button when Polly enabled', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({
      id: 'main',
      preferences: { pollyEnabled: true },
    }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('polly-preview-btn')).toBeInTheDocument();
  });

  it('shows test API endpoint button when Polly enabled', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({
      id: 'main',
      preferences: { pollyEnabled: true },
    }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('polly-test-btn')).toBeInTheDocument();
  });

  it('shows System Voices section', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('System Voices (Free)')).toBeInTheDocument();
  });

  it('shows system voice preview button', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('system-voice-preview-btn')).toBeInTheDocument();
  });

  it('has voice speed slider', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-speed-slider')).toBeInTheDocument();
  });

  it('hides Polly controls when disabled', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({
      id: 'main',
      preferences: { pollyEnabled: false },
    }));
    render(<VoiceSettingsPanel />);
    expect(screen.queryByTestId('polly-voice-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('polly-preview-btn')).not.toBeInTheDocument();
  });
});
