import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { StatsPage } from './StatsPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildSessionRecord, buildBadHabit } from '../../test/factories';
import type { UserProfile } from '../../types';
import type { PuzzleStats, ThemeSkill } from '../../services/puzzleService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetPuzzleStats = vi.fn<() => Promise<PuzzleStats | null>>();
const mockGetThemeSkills = vi.fn<() => Promise<ThemeSkill[]>>();
const mockGetRecentSessions = vi.fn();
const mockDetectBadHabits = vi.fn();

vi.mock('../../services/puzzleService', () => ({
  getPuzzleStats: (): unknown => mockGetPuzzleStats(),
  getThemeSkills: (): unknown => mockGetThemeSkills(),
}));

vi.mock('../../services/sessionGenerator', () => ({
  getRecentSessions: (...args: unknown[]): unknown => mockGetRecentSessions(...args),
}));

vi.mock('../../services/coachFeatureService', () => ({
  detectBadHabits: (...args: unknown[]): unknown => mockDetectBadHabits(...args),
}));

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'main',
    name: 'Tester',
    isKidMode: false,
    coachPersonality: 'danya',
    currentRating: 1500,
    puzzleRating: 1600,
    xp: 250,
    level: 1,
    currentStreak: 5,
    longestStreak: 10,
    streakFreezes: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    achievements: ['first_puzzle', 'streak_3'],
    unlockedCoaches: ['danya'],
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
      apiKeyEncrypted: null,
      apiKeyIv: null,
      preferredModel: { commentary: 'haiku', analysis: 'sonnet', reports: 'opus' },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      voiceIdDanya: '',
      voiceIdKasparov: '',
      voiceIdFischer: '',
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

    mockGetPuzzleStats.mockResolvedValue(null);
    mockGetThemeSkills.mockResolvedValue([]);
    mockGetRecentSessions.mockResolvedValue([]);
    mockDetectBadHabits.mockResolvedValue([]);
  });

  // ─── Original tests (preserved) ──────────────────────────────────────────

  it('renders the stats page with profile data', async () => {
    const profile = createProfile();
    useAppStore.getState().setActiveProfile(profile);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.getByText('Stats & Progress')).toBeInTheDocument();
  });

  it('shows header stats cards', async () => {
    const profile = createProfile();
    useAppStore.getState().setActiveProfile(profile);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('1600')).toBeInTheDocument();
    });
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('shows XP progress bar', async () => {
    const profile = createProfile({ xp: 250 });
    useAppStore.getState().setActiveProfile(profile);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('xp-bar')).toBeInTheDocument();
    });
  });

  it('shows skill breakdown bars', async () => {
    const profile = createProfile();
    useAppStore.getState().setActiveProfile(profile);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('opening')).toBeInTheDocument();
      expect(screen.getByText('tactics')).toBeInTheDocument();
    });
  });

  it('shows achievements grid with earned and locked', async () => {
    const profile = createProfile({ achievements: ['first_puzzle'] });
    useAppStore.getState().setActiveProfile(profile);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('achievements-grid')).toBeInTheDocument();
      expect(screen.getByTestId('achievement-first_puzzle')).toBeInTheDocument();
      expect(screen.getByTestId('achievement-streak_3')).toBeInTheDocument();
    });
  });

  it('shows activity dots for last 7 days', async () => {
    const profile = createProfile();
    useAppStore.getState().setActiveProfile(profile);

    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  it('renders empty state when no profile', () => {
    render(<StatsPage />);
    expect(screen.queryByTestId('stats-page')).not.toBeInTheDocument();
  });

  // ─── New tests: Header stats row ─────────────────────────────────────────

  it('shows level title in header stats', async () => {
    setProfile({ level: 1 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Lv 1')).toBeInTheDocument();
      // "Beginner" appears in both the stat card and the XP bar section
      expect(screen.getAllByText('Beginner').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows ELO in header stats', async () => {
    setProfile({ currentRating: 1800 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('1800')).toBeInTheDocument();
      expect(screen.getByText('ELO')).toBeInTheDocument();
    });
  });

  it('shows Total XP label in header stats', async () => {
    setProfile({ xp: 750 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('750')).toBeInTheDocument();
      expect(screen.getByText('Total XP')).toBeInTheDocument();
    });
  });

  it('shows Puzzle Rating label in header stats', async () => {
    setProfile({ puzzleRating: 1900 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('1900')).toBeInTheDocument();
      expect(screen.getByText('Puzzle Rating')).toBeInTheDocument();
    });
  });

  // ─── New tests: XP progress bar details ───────────────────────────────────

  it('XP progress bar shows current/needed text', async () => {
    setProfile({ xp: 300 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('300/500 XP to next level')).toBeInTheDocument();
    });
  });

  it('XP progress bar shows correct percentage width', async () => {
    setProfile({ xp: 250 });
    render(<StatsPage />);

    await waitFor(() => {
      const bar = screen.getByTestId('xp-bar');
      expect(bar).toHaveStyle({ width: '50%' });
    });
  });

  // ─── New tests: Activity dots ─────────────────────────────────────────────

  it('renders 7 activity dots', async () => {
    setProfile();
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });

    // The component renders 7 days, each with a data-testid like activity-dot-YYYY-MM-DD
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      expect(screen.getByTestId(`activity-dot-${dateStr}`)).toBeInTheDocument();
    }
  });

  it('shows streak day count in activity section', async () => {
    setProfile({ currentStreak: 12 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('12 day streak')).toBeInTheDocument();
    });
  });

  // ─── New tests: Skill breakdown (all 5 skills) ───────────────────────────

  it('shows all five skill bars with values', async () => {
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
    // SkillBar renders the numeric value
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  // ─── New tests: Tactical themes ──────────────────────────────────────────

  it('shows tactical theme breakdown when theme skills are available', async () => {
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

  it('hides tactical theme section when no theme skills', async () => {
    setProfile();
    mockGetThemeSkills.mockResolvedValue([]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tactical Themes')).not.toBeInTheDocument();
  });

  it('shows theme accuracy as percentage in tactical themes', async () => {
    setProfile();
    mockGetThemeSkills.mockResolvedValue([
      { theme: 'discoveredAttack', accuracy: 0.73, attempts: 10 },
    ]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('discoveredAttack')).toBeInTheDocument();
    });
    // SkillBar renders Math.round(0.73*100) = 73
    expect(screen.getByText('73')).toBeInTheDocument();
  });

  // ─── New tests: Puzzle stats panel ────────────────────────────────────────

  it('shows puzzle stats panel when data is available', async () => {
    setProfile();
    mockGetPuzzleStats.mockResolvedValue({
      totalAttempted: 100,
      totalCorrect: 75,
      overallAccuracy: 0.75,
      averageRating: 1450,
      totalPuzzles: 500,
      duePuzzles: 20,
    });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Puzzle Stats')).toBeInTheDocument();
    });
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('1450')).toBeInTheDocument();
  });

  it('shows puzzle stats labels', async () => {
    setProfile();
    mockGetPuzzleStats.mockResolvedValue({
      totalAttempted: 50,
      totalCorrect: 30,
      overallAccuracy: 0.6,
      averageRating: 1300,
      totalPuzzles: 200,
      duePuzzles: 10,
    });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Attempted')).toBeInTheDocument();
    });
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.getByText('Avg Rating')).toBeInTheDocument();
  });

  it('hides puzzle stats when no data', async () => {
    setProfile();
    mockGetPuzzleStats.mockResolvedValue(null);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Puzzle Stats')).not.toBeInTheDocument();
  });

  // ─── New tests: Session history ───────────────────────────────────────────

  it('shows session history when sessions exist', async () => {
    setProfile();
    mockGetRecentSessions.mockResolvedValue([
      buildSessionRecord({
        id: 'sess-1',
        date: '2026-03-01',
        durationMinutes: 30,
        puzzlesSolved: 10,
        xpEarned: 200,
        completed: true,
      }),
      buildSessionRecord({
        id: 'sess-2',
        date: '2026-03-02',
        durationMinutes: 20,
        puzzlesSolved: 5,
        xpEarned: 100,
        completed: false,
      }),
    ]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Session History')).toBeInTheDocument();
    });
    expect(screen.getByText('2026-03-01')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('10 puzzles')).toBeInTheDocument();
    expect(screen.getByText('200 XP')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('hides session history when no sessions', async () => {
    setProfile();
    mockGetRecentSessions.mockResolvedValue([]);
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Session History')).not.toBeInTheDocument();
  });

  // ─── New tests: Bad habits ────────────────────────────────────────────────

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

  // ─── New tests: Achievements grid detail ──────────────────────────────────

  it('earned achievements show XP reward text', async () => {
    setProfile({ achievements: ['first_puzzle'] });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('achievement-first_puzzle')).toBeInTheDocument();
    });
    // first_puzzle has xpReward of 50
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
  });

  it('locked achievements show description text', async () => {
    setProfile({ achievements: [] });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('achievement-first_puzzle')).toBeInTheDocument();
    });
    // first_puzzle description is "Attempt your first puzzle"
    expect(screen.getByText('Attempt your first puzzle')).toBeInTheDocument();
  });

  it('achievements grid renders all defined achievements', async () => {
    setProfile({ achievements: [] });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('achievements-grid')).toBeInTheDocument();
    });
    // Check a few specific achievement test IDs
    expect(screen.getByTestId('achievement-first_puzzle')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-ten_puzzles')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-streak_3')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-streak_7')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-reach_1500')).toBeInTheDocument();
  });

  // ─── New tests: Level titles ──────────────────────────────────────────────

  it('level 5 shows Rook title', async () => {
    setProfile({ level: 5 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Lv 5')).toBeInTheDocument();
      // "Rook" appears in both the stat card and the XP bar section
      expect(screen.getAllByText('Rook').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('level 7+ shows Grandmaster title', async () => {
    setProfile({ level: 8, xp: 3900 });
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByText('Lv 8')).toBeInTheDocument();
      // getLevelTitle shows Grandmaster in both the stat card and the XP bar section
      expect(screen.getAllByText('Grandmaster').length).toBeGreaterThanOrEqual(1);
    });
  });
});
