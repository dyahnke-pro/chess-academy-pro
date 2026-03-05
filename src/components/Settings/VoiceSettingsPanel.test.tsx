import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { UserProfile } from '../../types';

vi.mock('../../services/cryptoService', () => ({
  encryptApiKey: vi.fn().mockResolvedValue({ encrypted: 'enc', iv: 'iv' }),
}));

function createProfile(): UserProfile {
  return {
    id: 'main',
    name: 'Tester',
    isKidMode: false,
    coachPersonality: 'danya',
    currentRating: 1400,
    puzzleRating: 1400,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 0,
    lastActiveDate: '2026-03-04',
    achievements: [],
    unlockedCoaches: ['danya'],
    skillRadar: { opening: 50, tactics: 50, endgame: 50, memory: 50, calculation: 50 },
    badHabits: [],
    preferences: {
      theme: 'dark-premium',
      boardColor: 'classic',
      pieceSet: 'staunton',
      showEvalBar: true,
      showEngineLines: false,
      soundEnabled: true,
      voiceEnabled: true,
      dailySessionMinutes: 45,
      apiKeyEncrypted: null,
      apiKeyIv: null,
      preferredModel: { commentary: 'haiku', analysis: 'sonnet', reports: 'opus' },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      voiceIdDanya: 'voice-danya',
      voiceIdKasparov: 'voice-kasparov',
      voiceIdFischer: 'voice-fischer',
    },
  };
}

describe('VoiceSettingsPanel', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders the voice settings panel', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-settings-panel')).toBeInTheDocument();
  });

  it('shows ElevenLabs key input', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('elevenlabs-key-input')).toBeInTheDocument();
  });

  it('shows voice ID inputs for all 3 personalities', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-id-danya')).toBeInTheDocument();
    expect(screen.getByTestId('voice-id-kasparov')).toBeInTheDocument();
    expect(screen.getByTestId('voice-id-fischer')).toBeInTheDocument();
  });

  it('pre-fills voice IDs from profile', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-id-danya')).toHaveValue('voice-danya');
  });

  it('has save buttons', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('save-elevenlabs-key-btn')).toBeInTheDocument();
    expect(screen.getByTestId('save-voice-ids-btn')).toBeInTheDocument();
  });
});
