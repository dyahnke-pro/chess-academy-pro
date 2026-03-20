import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/cryptoService', () => ({
  encryptApiKey: vi.fn().mockResolvedValue({ encrypted: 'enc', iv: 'iv' }),
}));

vi.mock('../../services/kokoroService', () => ({
  kokoroService: {
    getStatus: vi.fn().mockReturnValue('idle'),
    getDownloadProgress: vi.fn().mockReturnValue(0),
    isReady: vi.fn().mockReturnValue(false),
    isPlaying: vi.fn().mockReturnValue(false),
    onStatusChange: vi.fn().mockReturnValue(() => undefined),
    onProgress: vi.fn().mockReturnValue(() => undefined),
    loadModel: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    unload: vi.fn(),
  },
  KOKORO_VOICES: [
    { id: 'af_heart', name: 'Heart', accent: 'American', gender: 'Female' },
    { id: 'bm_daniel', name: 'Daniel', accent: 'British', gender: 'Male' },
  ],
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

  it('shows Kokoro HD Voice section', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('HD Voice (Kokoro)')).toBeInTheDocument();
  });

  it('shows Kokoro toggle', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('kokoro-toggle')).toBeInTheDocument();
  });

  it('shows download button when model not loaded', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({
      id: 'main',
      preferences: { kokoroEnabled: true },
    }));
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('kokoro-download-btn')).toBeInTheDocument();
  });

  it('shows voice selector', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({
      id: 'main',
      preferences: { kokoroEnabled: true },
    }));
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
});
