import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { StatsPage } from './StatsPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildBadHabit } from '../../test/factories';
import type { UserProfile, WeaknessProfile } from '../../types';
import type { ThemeSkill } from '../../services/puzzleService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetThemeSkills = vi.fn<() => Promise<ThemeSkill[]>>();
const mockDetectBadHabits = vi.fn();
const mockGetStoredWeaknessProfile = vi.fn<() => Promise<WeaknessProfile | null>>();
const mockComputeWeaknessProfile = vi.fn<() => Promise<WeaknessProfile>>();

vi.mock('../../services/puzzleService', () => ({
  getThemeSkills: (): unknown => mockGetThemeSkills(),
}));

vi.mock('../../services/coachFeatureService', () => ({
  detectBadHabits: (...args: unknown[]): unknown => mockDetectBadHabits(...args),
}));

vi.mock('../../services/weaknessAnalyzer', () => ({
  getStoredWeaknessProfile: (): unknown => mockGetStoredWeaknessProfile(),
  computeWeaknessProfile: (): unknown => mockComputeWeaknessProfile(),
  filterWeaknessesByCategory: (profile: WeaknessProfile, category: string) =>
    profile.items.filter((item) => item.category === category),
}));

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_WEAKNESS_PROFILE: WeaknessProfile = {
  computedAt: new Date().toISOString(),
  items: [],
  strengths: [],
  strengthItems: [],
  overallAssessment: '',
};

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
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
}

function setProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const profile = createProfile(overrides);
  useAppStore.getState().setActiveProfile(profile);
  return profile;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StatsPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
    vi.clearAllMocks();

    mockGetThemeSkills.mockResolvedValue([]);
    mockDetectBadHabits.mockResolvedValue([]);
    mockGetStoredWeaknessProfile.mockResolvedValue(EMPTY_WEAKNESS_PROFILE);
    mockComputeWeaknessProfile.mockResolvedValue(EMPTY_WEAKNESS_PROFILE);
  });

  // ─── Basic rendering ──────────────────────────────────────────────────────

  it('renders the stats page with profile data', async () => {
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.getByText('Stats & Progress')).toBeInTheDocument();
  });

  it('renders empty state when no profile', () => {
    render(<StatsPage />);
    expect(screen.queryByTestId('stats-page')).not.toBeInTheDocument();
  });

  // ─── Header stats cards ────────────────────────────────────────────────────

  it('shows Puzzle Rating and Game ELO cards', async () => {
    setProfile({ puzzleRating: 1600, currentRating: 1500 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('1600')).toBeInTheDocument();
    });
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('Puzzle Rating')).toBeInTheDocument();
    expect(screen.getByText('Game ELO')).toBeInTheDocument();
  });

  it('does not show XP or Level cards', async () => {
    setProfile({ xp: 999, level: 5 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Total XP')).not.toBeInTheDocument();
    expect(screen.queryByText('Lv 5')).not.toBeInTheDocument();
  });

  // ─── Skill breakdown ──────────────────────────────────────────────────────

  it('shows all five skill bars', async () => {
    setProfile({
      skillRadar: { opening: 80, tactics: 90, endgame: 30, memory: 45, calculation: 72 },
    });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('opening')).toBeInTheDocument();
    });
    expect(screen.getByText('tactics')).toBeInTheDocument();
    expect(screen.getByText('endgame')).toBeInTheDocument();
    expect(screen.getByText('memory')).toBeInTheDocument();
    expect(screen.getByText('calculation')).toBeInTheDocument();
  });

  it('skill bars are clickable and expand drill-down', async () => {
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-toggle-tactics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skill-toggle-tactics'));

    await waitFor(() => {
      expect(screen.getByTestId('drilldown-tactics')).toBeInTheDocument();
    });
  });

  it('clicking expanded skill bar collapses it', async () => {
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-toggle-tactics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skill-toggle-tactics'));
    await waitFor(() => {
      expect(screen.getByTestId('drilldown-tactics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skill-toggle-tactics'));
    await waitFor(() => {
      expect(screen.queryByTestId('drilldown-tactics')).not.toBeInTheDocument();
    });
  });

  it('drill-down shows weakness items for category', async () => {
    const wp: WeaknessProfile = {
      ...EMPTY_WEAKNESS_PROFILE,
      items: [
        {
          category: 'tactics',
          label: 'Weak at forks',
          metric: '30% accuracy (10 attempts)',
          severity: 70,
          detail: 'Focus on fork patterns.',
          trainingAction: { route: '/puzzles', buttonLabel: 'Train forks' },
        },
      ],
    };
    mockGetStoredWeaknessProfile.mockResolvedValue(wp);
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-toggle-tactics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skill-toggle-tactics'));

    await waitFor(() => {
      expect(screen.getByText('Weak at forks')).toBeInTheDocument();
      expect(screen.getByText('Focus on fork patterns.')).toBeInTheDocument();
      expect(screen.getByText('Train forks')).toBeInTheDocument();
    });
  });

  it('drill-down shows strength items for category', async () => {
    const wp: WeaknessProfile = {
      ...EMPTY_WEAKNESS_PROFILE,
      strengthItems: [
        {
          title: 'Pin Mastery',
          detail: 'Great at pins',
          category: 'tactics',
          metric: '92% accuracy',
        },
      ],
    };
    mockGetStoredWeaknessProfile.mockResolvedValue(wp);
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('skill-toggle-tactics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skill-toggle-tactics'));

    await waitFor(() => {
      expect(screen.getByText('Pin Mastery')).toBeInTheDocument();
      expect(screen.getByText('92% accuracy')).toBeInTheDocument();
    });
  });

  // ─── Tactical themes ──────────────────────────────────────────────────────

  it('shows tactical themes when data available', async () => {
    setProfile();
    mockGetThemeSkills.mockResolvedValue([
      { theme: 'fork', accuracy: 0.85, attempts: 20 },
      { theme: 'pin', accuracy: 0.60, attempts: 15 },
    ]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tactical Themes')).toBeInTheDocument();
    });
    expect(screen.getByText('fork')).toBeInTheDocument();
    expect(screen.getByText('pin')).toBeInTheDocument();
  });

  it('shows attempt count per theme', async () => {
    setProfile();
    mockGetThemeSkills.mockResolvedValue([
      { theme: 'fork', accuracy: 0.85, attempts: 20 },
    ]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('20 tries')).toBeInTheDocument();
    });
  });

  it('hides tactical themes when no data', async () => {
    setProfile();
    mockGetThemeSkills.mockResolvedValue([]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tactical Themes')).not.toBeInTheDocument();
  });

  // ─── Bad habits ────────────────────────────────────────────────────────────

  it('shows bad habits when detected', async () => {
    setProfile();
    mockDetectBadHabits.mockResolvedValue([
      buildBadHabit({ id: 'h1', description: 'Struggles with pins', occurrences: 5, isResolved: false }),
    ]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bad Habits')).toBeInTheDocument();
    });
    expect(screen.getByText('Struggles with pins')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
  });

  it('shows resolved badge for resolved habits', async () => {
    setProfile();
    mockDetectBadHabits.mockResolvedValue([
      buildBadHabit({ id: 'h2', description: 'Weak at forks', occurrences: 3, isResolved: true }),
    ]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bad Habits')).toBeInTheDocument();
    });
    expect(screen.getByText('Weak at forks')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('hides bad habits when none detected', async () => {
    setProfile();
    mockDetectBadHabits.mockResolvedValue([]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Bad Habits')).not.toBeInTheDocument();
  });

  // ─── Refresh button ────────────────────────────────────────────────────────

  it('shows refresh button', async () => {
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('refresh-btn')).toBeInTheDocument();
    });
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  // ─── Auto-refresh (staleness check) ───────────────────────────────────────

  it('uses stored profile if fresh enough', async () => {
    const freshProfile: WeaknessProfile = {
      ...EMPTY_WEAKNESS_PROFILE,
      computedAt: new Date().toISOString(), // just computed
    };
    mockGetStoredWeaknessProfile.mockResolvedValue(freshProfile);
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    // Should NOT have called compute since the stored profile is fresh
    expect(mockComputeWeaknessProfile).not.toHaveBeenCalled();
  });

  it('recomputes when stored profile is stale', async () => {
    const staleProfile: WeaknessProfile = {
      ...EMPTY_WEAKNESS_PROFILE,
      computedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours old
    };
    mockGetStoredWeaknessProfile.mockResolvedValue(staleProfile);
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(mockComputeWeaknessProfile).toHaveBeenCalled();
    });
  });

  it('recomputes when no stored profile', async () => {
    mockGetStoredWeaknessProfile.mockResolvedValue(null);
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(mockComputeWeaknessProfile).toHaveBeenCalled();
    });
  });
});
