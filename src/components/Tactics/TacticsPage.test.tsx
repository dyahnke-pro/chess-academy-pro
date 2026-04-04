import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { TacticsPage } from './TacticsPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { UserProfile, TacticalProfile } from '../../types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetClassifiedTacticCount = vi.fn<() => Promise<number>>();

vi.mock('../../services/tacticClassifierService', () => ({
  getClassifiedTacticCount: (): unknown => mockGetClassifiedTacticCount(),
  backfillClassifiedTactics: (): Promise<number> => Promise.resolve(0),
}));

const mockGetStoredTacticalProfile = vi.fn<() => Promise<TacticalProfile | null>>();
vi.mock('../../services/tacticalProfileService', () => ({
  getStoredTacticalProfile: (): unknown => mockGetStoredTacticalProfile(),
  tacticTypeLabel: (t: string): string => {
    const labels: Record<string, string> = {
      fork: 'Fork', pin: 'Pin', skewer: 'Skewer', discovered_attack: 'Discovered Attack',
      back_rank: 'Back Rank', hanging_piece: 'Hanging Piece', promotion: 'Promotion',
      deflection: 'Deflection', overloaded_piece: 'Overloaded Piece', trapped_piece: 'Trapped Piece',
      clearance: 'Clearance', interference: 'Interference', zwischenzug: 'Zwischenzug',
      x_ray: 'X-Ray', double_check: 'Double Check', tactical_sequence: 'Tactical Sequence',
    };
    return labels[t] ?? t.replace(/_/g, ' ');
  },
}));

const mockGetTacticDrillCounts = vi.fn();
vi.mock('../../services/tacticDrillService', () => ({
  getTacticDrillCounts: (): unknown => mockGetTacticDrillCounts(),
}));

const mockGetContextDepth = vi.fn();
vi.mock('../../services/tacticCreateService', () => ({
  getContextDepth: (): unknown => mockGetContextDepth(),
}));

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

    mockGetClassifiedTacticCount.mockResolvedValue(0);
    mockGetStoredTacticalProfile.mockResolvedValue(null);
    mockGetTacticDrillCounts.mockResolvedValue(new Map());
    mockGetContextDepth.mockResolvedValue(8);
  });

  it('renders empty fragment when no profile', () => {
    render(<TacticsPage />);
    expect(screen.queryByTestId('tactics-page')).not.toBeInTheDocument();
  });

  it('renders the tactics page with profile', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tactics-page')).toBeInTheDocument();
    });
    expect(screen.getByText('Tactical Training')).toBeInTheDocument();
  });

  it('shows all 4 layer cards', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('layer-1-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('layer-2-card')).toBeInTheDocument();
    expect(screen.getByTestId('layer-3-card')).toBeInTheDocument();
    expect(screen.getByTestId('layer-4-card')).toBeInTheDocument();
    expect(screen.getByText('Spot')).toBeInTheDocument();
    expect(screen.getByText('Drill')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('shows empty state when no tactics classified', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tactics-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('No Tactics Yet')).toBeInTheDocument();
  });

  it('shows stats row when tactics exist', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(15);
    mockGetStoredTacticalProfile.mockResolvedValue({
      stats: [{ tacticType: 'fork' }, { tacticType: 'pin' }],
      weakestTypes: ['fork'],
      totalGamesAnalyzed: 10,
      totalGamesMissed: 15,
    } as unknown as TacticalProfile);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-row')).toBeInTheDocument();
    });
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Found')).toBeInTheDocument();
    expect(screen.getAllByText('Fork').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Weakest')).toBeInTheDocument();
  });

  it('hides stats row when no tactics', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(0);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tactics-empty')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('stats-row')).not.toBeInTheDocument();
  });

  it('shows drill count on layer card', async () => {
    setProfile();
    mockGetTacticDrillCounts.mockResolvedValue(new Map([['fork', 5], ['pin', 3]]));
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('8 drills ready')).toBeInTheDocument();
    });
  });

  it('refresh button reloads data', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tactics-refresh-btn')).toBeInTheDocument();
    });
    expect(mockGetClassifiedTacticCount).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('tactics-refresh-btn'));

    await waitFor(() => {
      expect(mockGetClassifiedTacticCount).toHaveBeenCalledTimes(2);
    });
  });

  it('shows subtitle with tactic count', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(10);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('10 missed tactics from your games')).toBeInTheDocument();
    });
  });

  it('shows summary when profile exists', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(5);
    mockGetStoredTacticalProfile.mockResolvedValue({
      stats: [{ tacticType: 'fork' }],
      weakestTypes: ['fork'],
      totalGamesAnalyzed: 8,
      totalGamesMissed: 5,
    } as unknown as TacticalProfile);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/8 games analyzed/)).toBeInTheDocument();
    });
    expect(screen.getByText(/5 tactical positions found/)).toBeInTheDocument();
  });

  it('shows context depth on Create layer card', async () => {
    setProfile();
    mockGetContextDepth.mockResolvedValue(12);
    mockGetStoredTacticalProfile.mockResolvedValue({
      stats: [{ tacticType: 'fork' }],
      weakestTypes: ['fork'],
      totalGamesAnalyzed: 5,
      totalGamesMissed: 3,
    } as unknown as TacticalProfile);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Depth: 12 moves')).toBeInTheDocument();
    });
  });
});
