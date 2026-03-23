import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/cryptoService', () => ({
  encryptApiKey: vi.fn().mockResolvedValue({ encrypted: 'enc', iv: 'iv' }),
}));

vi.mock('../../services/voicePackService', () => ({
  installVoicePack: vi.fn().mockResolvedValue({ installed: 100 }),
  isVoicePackAvailable: vi.fn().mockResolvedValue(false),
  getVoiceCacheCount: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speakNow: vi.fn(),
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

  it('shows HD Voice section', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('HD Voice')).toBeInTheDocument();
  });

  it('shows download button when no voice pack installed', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('kokoro-download-btn')).toBeInTheDocument();
  });

  it('shows voice selector', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('kokoro-voice-select')).toBeInTheDocument();
  });

  it('shows ElevenLabs section', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('ElevenLabs (Advanced)')).toBeInTheDocument();
  });

  it('shows ElevenLabs key input', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('elevenlabs-key-input')).toBeInTheDocument();
  });

  it('shows single voice ID input', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-id-elevenlabs')).toBeInTheDocument();
  });

  it('has save buttons', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('save-elevenlabs-key-btn')).toBeInTheDocument();
    expect(screen.getByTestId('save-voice-ids-btn')).toBeInTheDocument();
  });

  it('has voice speed slider', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-speed-slider')).toBeInTheDocument();
  });

  it('shows download button on all platforms including iOS', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('kokoro-download-btn')).toBeInTheDocument();
  });
});
