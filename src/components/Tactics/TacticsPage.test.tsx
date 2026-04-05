import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { TacticsPage } from './TacticsPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { UserProfile } from '../../types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const profile: UserProfile = {
    id: 'main',
    name: 'Tester',
    isKidMode: false,
    currentRating: 1500,
    puzzleRating: 1600,
    xp: 250,
    level: 1,
    currentStreak: 5,
    longestStreak: 10,
    streakFreezes: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    skillRadar: { opening: 60, tactics: 70, endgame: 40, memory: 55, calculation: 65 },
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
      kokoroVoiceId: 'af_bella',
      systemVoiceURI: null,
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
      pollyEnabled: false,
      pollyVoice: 'ruth',
      masterAllOff: false,
    },
    ...overrides,
  };
  useAppStore.getState().setActiveProfile(profile);
  return profile;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TacticsPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
    vi.clearAllMocks();
  });

  it('renders empty fragment when no profile', () => {
    render(<TacticsPage />);
    expect(screen.queryByTestId('tactics-page')).not.toBeInTheDocument();
  });

  it('renders the page with title', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tactics-page')).toBeInTheDocument();
    });
    expect(screen.getByText('Tactical Training')).toBeInTheDocument();
  });

  it('shows My Profile and My Mistakes sections', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('section-spot')).toBeInTheDocument();
    });
    expect(screen.getByTestId('section-my mistakes')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('My Mistakes')).toBeInTheDocument();
  });

  it('shows Daily Training and Setup Trainer sections', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('section-daily')).toBeInTheDocument();
    });
    expect(screen.getByTestId('section-setup')).toBeInTheDocument();
    expect(screen.getByText('Daily Training')).toBeInTheDocument();
    expect(screen.getByText('Setup Trainer')).toBeInTheDocument();
  });

  it('shows tactic theme categories', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Forks')).toBeInTheDocument();
    });
    expect(screen.getByText('Pins & Skewers')).toBeInTheDocument();
    expect(screen.getByText('Back Rank Mates')).toBeInTheDocument();
    expect(screen.getByText('Mating Nets')).toBeInTheDocument();
  });

  it('My Profile spans full width', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('section-spot')).toBeInTheDocument();
    });
    expect(screen.getByTestId('section-spot').className).toContain('col-span-2');
  });

  it('theme cards are square', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('section-forks')).toBeInTheDocument();
    });
    expect(screen.getByTestId('section-forks').className).toContain('aspect-square');
  });
});
