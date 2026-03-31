import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { TacticsPage } from './TacticsPage';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { UserProfile, TacticMotifStats, ClassifiedTactic } from '../../types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetTacticMotifStats = vi.fn<() => Promise<TacticMotifStats[]>>();
const mockGetRecentClassifiedTactics = vi.fn<() => Promise<ClassifiedTactic[]>>();
const mockGetClassifiedTacticCount = vi.fn<() => Promise<number>>();

vi.mock('../../services/tacticClassifierService', () => ({
  getTacticMotifStats: (): unknown => mockGetTacticMotifStats(),
  getRecentClassifiedTactics: (): unknown => mockGetRecentClassifiedTactics(),
  getClassifiedTacticCount: (): unknown => mockGetClassifiedTacticCount(),
  backfillClassifiedTactics: (): Promise<number> => Promise.resolve(0),
  TACTIC_LABELS: {
    fork: 'Fork',
    pin: 'Pin',
    skewer: 'Skewer',
    discovered_attack: 'Discovered Attack',
    back_rank: 'Back Rank',
    hanging_piece: 'Hanging Piece',
    promotion: 'Promotion',
    deflection: 'Deflection',
    overloaded_piece: 'Overloaded Piece',
    trapped_piece: 'Trapped Piece',
    clearance: 'Clearance',
    interference: 'Interference',
    zwischenzug: 'Zwischenzug',
    x_ray: 'X-Ray',
    double_check: 'Double Check',
    tactical_sequence: 'Tactical Sequence',
  },
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

    mockGetTacticMotifStats.mockResolvedValue([]);
    mockGetRecentClassifiedTactics.mockResolvedValue([]);
    mockGetClassifiedTacticCount.mockResolvedValue(0);
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

  it('shows empty state when no tactics classified', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(0);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tactics-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('No Tactics Yet')).toBeInTheDocument();
  });

  it('shows tactic motif breakdown when data exists', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(15);
    mockGetTacticMotifStats.mockResolvedValue([
      { tacticType: 'fork', missedInGames: 8, puzzleAttempts: 20, puzzleAccuracy: 75, gameAwareness: 50 },
      { tacticType: 'pin', missedInGames: 5, puzzleAttempts: 10, puzzleAccuracy: 60, gameAwareness: 65 },
    ]);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('motif-breakdown')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Fork').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pin')).toBeInTheDocument();
    expect(screen.getByText('8x missed')).toBeInTheDocument();
    expect(screen.getByText('5x missed')).toBeInTheDocument();
  });

  it('expands motif detail on click', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(5);
    mockGetTacticMotifStats.mockResolvedValue([
      { tacticType: 'fork', missedInGames: 3, puzzleAttempts: 10, puzzleAccuracy: 80, gameAwareness: 40 },
    ]);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('motif-toggle-fork')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('motif-toggle-fork'));

    await waitFor(() => {
      expect(screen.getByTestId('motif-detail-fork')).toBeInTheDocument();
    });
  });

  it('collapses motif detail on second click', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(5);
    mockGetTacticMotifStats.mockResolvedValue([
      { tacticType: 'fork', missedInGames: 3, puzzleAttempts: 10, puzzleAccuracy: 80, gameAwareness: 40 },
    ]);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('motif-toggle-fork')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('motif-toggle-fork'));
    await waitFor(() => {
      expect(screen.getByTestId('motif-detail-fork')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('motif-toggle-fork'));
    await waitFor(() => {
      expect(screen.queryByTestId('motif-detail-fork')).not.toBeInTheDocument();
    });
  });

  it('shows recent missed tactics', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(3);
    mockGetRecentClassifiedTactics.mockResolvedValue([
      {
        id: 'ct-1',
        sourceGameId: 'g1',
        moveIndex: 5,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        bestMoveUci: 'e2e4',
        bestMoveSan: 'e4',
        playerMoveUci: 'h2h3',
        playerMoveSan: 'h3',
        playerColor: 'white',
        tacticType: 'fork',
        evalSwing: 250,
        explanation: 'Missed fork with e4 (2.5 pawns lost)',
        opponentName: 'Magnus',
        gameDate: '2026-03-15',
        openingName: null,
        puzzleAttempts: 0,
        puzzleSuccesses: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('recent-tactics')).toBeInTheDocument();
    });
    expect(screen.getByText('Recent Missed Tactics')).toBeInTheDocument();
    expect(screen.getByText('Fork')).toBeInTheDocument();
    expect(screen.getByText(/vs Magnus/)).toBeInTheDocument();
  });

  it('shows summary cards with data', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(15);
    mockGetTacticMotifStats.mockResolvedValue([
      { tacticType: 'fork', missedInGames: 8, puzzleAttempts: 20, puzzleAccuracy: 75, gameAwareness: 50 },
      { tacticType: 'pin', missedInGames: 5, puzzleAttempts: 10, puzzleAccuracy: 60, gameAwareness: 65 },
    ]);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
    expect(screen.getByText('Tactics Found')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Motif Types
    expect(screen.getAllByText('Fork').length).toBeGreaterThanOrEqual(1); // Top Weakness + motif list
  });

  it('refresh button is rendered and clickable', async () => {
    setProfile();
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tactics-refresh-btn')).toBeInTheDocument();
    });

    // Initial load called it once
    expect(mockGetTacticMotifStats).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('tactics-refresh-btn'));

    // Verify the function was called again
    await waitFor(() => {
      expect(mockGetTacticMotifStats.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows description text when tactics exist', async () => {
    setProfile();
    mockGetClassifiedTacticCount.mockResolvedValue(10);
    render(<TacticsPage />);

    await waitFor(() => {
      expect(screen.getByText('10 missed tactics classified from your games')).toBeInTheDocument();
    });
  });
});
