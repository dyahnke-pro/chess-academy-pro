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
    currentRating: 1400,
    puzzleRating: 1400,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 0,
    lastActiveDate: '2026-03-04',
    achievements: [],
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
      elevenlabsVoiceId: 'voice-elevenlabs',
      voiceSpeed: 1.0,
      highlightLastMove: true,
      showLegalMoves: true,
      showCoordinates: true,
      pieceAnimationSpeed: 'medium',
      boardOrientation: true,
      moveQualityFlash: true,
      showHints: true,
      moveMethod: 'both',
      moveConfirmation: false,
      autoPromoteQueen: true,
      masterAllOff: false,
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

  it('shows single voice ID input', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-id-elevenlabs')).toBeInTheDocument();
  });

  it('pre-fills voice ID from profile', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('voice-id-elevenlabs')).toHaveValue('voice-elevenlabs');
  });

  it('has save buttons', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<VoiceSettingsPanel />);
    expect(screen.getByTestId('save-elevenlabs-key-btn')).toBeInTheDocument();
    expect(screen.getByTestId('save-voice-ids-btn')).toBeInTheDocument();
  });
});
