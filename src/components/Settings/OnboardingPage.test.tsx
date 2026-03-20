import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { OnboardingPage } from './OnboardingPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { UserProfile } from '../../types';

vi.mock('../../services/cryptoService', () => ({
  encryptApiKey: vi.fn().mockResolvedValue({ encrypted: 'enc', iv: 'iv' }),
}));

function createProfile(): UserProfile {
  return {
    id: 'main',
    name: 'Player',
    isKidMode: false,
    currentRating: 1200,
    puzzleRating: 1200,
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
      aiProvider: 'deepseek',
      apiKeyEncrypted: null,
      apiKeyIv: null,
      anthropicApiKeyEncrypted: null,
      anthropicApiKeyIv: null,
      preferredModel: { commentary: 'haiku', analysis: 'sonnet', reports: 'opus' },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      elevenlabsVoiceId: null,
      voiceSpeed: 1.0,
      kokoroEnabled: true,
      kokoroVoiceId: 'af_heart',
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

describe('OnboardingPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders step 1 welcome screen', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<OnboardingPage />);
    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    expect(screen.getByText('Chess Academy Pro')).toBeInTheDocument();
    expect(screen.getByTestId('get-started-btn')).toBeInTheDocument();
  });

  it('advances to step 2 on Get Started click', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<OnboardingPage />);
    fireEvent.click(screen.getByTestId('get-started-btn'));
    expect(screen.getByTestId('onboarding-api-key')).toBeInTheDocument();
    expect(screen.getByText('API Key Setup')).toBeInTheDocument();
  });

  it('shows skip button on step 2', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<OnboardingPage />);
    fireEvent.click(screen.getByTestId('get-started-btn'));
    expect(screen.getByTestId('skip-api-key-btn')).toBeInTheDocument();
  });

  it('skipping advances to step 3', async () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<OnboardingPage />);
    fireEvent.click(screen.getByTestId('get-started-btn'));
    fireEvent.click(screen.getByTestId('skip-api-key-btn'));

    // Wait for async meta write, then check step 3
    await vi.waitFor(() => {
      expect(screen.getByTestId('onboarding-name')).toBeInTheDocument();
    });
  });

  it('step 3 shows profile fields and coach selector', async () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<OnboardingPage />);
    fireEvent.click(screen.getByTestId('get-started-btn'));
    fireEvent.click(screen.getByTestId('skip-api-key-btn'));

    await vi.waitFor(() => {
      expect(screen.getByTestId('onboarding-name')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-elo')).toBeInTheDocument();
      expect(screen.getByTestId('start-training-btn')).toBeInTheDocument();
    });
  });
});
