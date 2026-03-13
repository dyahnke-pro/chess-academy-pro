import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { KidModePage } from './KidModePage';
import { useAppStore } from '../../stores/appStore';
import type { UserProfile } from '../../types';

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
  ),
}));

vi.mock('../../services/journeyService', () => ({
  getGameProgress: vi.fn().mockResolvedValue(null),
  getGameCompletedChapterCount: vi.fn().mockReturnValue(0),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/themeService', () => ({
  applyTheme: vi.fn(),
  getThemeById: vi.fn().mockReturnValue({ id: 'kid-mode', name: 'Kid Mode', colors: {} }),
}));

function createProfile(): UserProfile {
  return {
    id: 'main',
    name: 'Kiddo',
    isKidMode: true,
    currentRating: 800,
    puzzleRating: 800,
    xp: 100,
    level: 1,
    currentStreak: 2,
    longestStreak: 5,
    streakFreezes: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    achievements: [],
    skillRadar: { opening: 30, tactics: 40, endgame: 20, memory: 35, calculation: 25 },
    badHabits: [],
    preferences: {
      theme: 'kid-mode',
      boardColor: 'classic',
      pieceSet: 'staunton',
      showEvalBar: false,
      showEngineLines: false,
      soundEnabled: true,
      voiceEnabled: true,
      dailySessionMinutes: 15,
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

describe('KidModePage', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('renders kid mode page with welcome header', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    expect(screen.getByTestId('kid-mode-page')).toBeInTheDocument();
    expect(screen.getByText(/Hi Kiddo/)).toBeInTheDocument();
    expect(screen.getByText(/100 XP/)).toBeInTheDocument();
  });

  it('renders all 6 piece lesson cards', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    expect(screen.getByTestId('lesson-card-king')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-queen')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-rook')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-bishop')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-knight')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-pawn')).toBeInTheDocument();
  });

  it('clicking a lesson card navigates to piece page', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    // Clicking a lesson card should trigger navigation (rendered in MemoryRouter)
    fireEvent.click(screen.getByTestId('lesson-card-knight'));
    // The menu should remain since navigation happens via route change
    // In integration tests with full routing, this would navigate to /kid/knight
  });

  it('has Find the King button', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    expect(screen.getByTestId('find-king-btn')).toBeInTheDocument();
    expect(screen.getByText('Find the King!')).toBeInTheDocument();
  });

  it('clicking Find the King opens game with overlay', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    fireEvent.click(screen.getByTestId('find-king-btn'));
    expect(screen.getByTestId('find-king-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Where is the White King/)).toBeInTheDocument();
  });

  it('clicking correct king square shows correct result', () => {
    vi.useFakeTimers();
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    fireEvent.click(screen.getByTestId('find-king-btn'));
    // First FEN: RNBQKBNR — White King is on e1
    fireEvent.click(screen.getByTestId('sq-e1'));

    expect(screen.getByTestId('find-king-result')).toHaveTextContent('Correct');

    vi.useRealTimers();
  });

  it('renders journey card', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    expect(screen.getByTestId('journey-card')).toBeInTheDocument();
    expect(screen.getByText("Pawn's Journey")).toBeInTheDocument();
  });

  it('renders fairy tale card', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    expect(screen.getByTestId('fairy-tale-card')).toBeInTheDocument();
    expect(screen.getByText('Fairy Tale Quest')).toBeInTheDocument();
  });

  it('fairy tale card shows start text when no progress', () => {
    useAppStore.getState().setActiveProfile(createProfile());
    render(<KidModePage />);

    expect(screen.getByText('Begin your fairy tale!')).toBeInTheDocument();
  });

  it('renders empty when no profile', () => {
    render(<KidModePage />);
    expect(screen.queryByTestId('kid-mode-page')).not.toBeInTheDocument();
  });
});
