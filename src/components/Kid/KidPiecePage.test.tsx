import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { KidPiecePage } from './KidPiecePage';
import { useAppStore } from '../../stores/appStore';
import type { UserProfile } from '../../types';

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ piece: 'knight' }),
    useNavigate: () => vi.fn(),
  };
});

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
  };
}

describe('KidPiecePage', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(createProfile());
    vi.clearAllMocks();
  });

  it('renders the piece page with title', () => {
    render(<KidPiecePage />);
    expect(screen.getByTestId('kid-piece-knight')).toBeInTheDocument();
    expect(screen.getByText('The Knight')).toBeInTheDocument();
  });

  it('renders large instruction box', () => {
    render(<KidPiecePage />);
    expect(screen.getByTestId('kid-instruction-box')).toBeInTheDocument();
    expect(screen.getByTestId('kid-instruction-text')).toHaveTextContent(
      'Moves in an L-shape: 2+1 squares'
    );
  });

  it('renders speaker button', () => {
    render(<KidPiecePage />);
    expect(screen.getByTestId('kid-speak-btn')).toBeInTheDocument();
  });

  it('renders voice toggle button', () => {
    render(<KidPiecePage />);
    expect(screen.getByTestId('kid-voice-toggle')).toBeInTheDocument();
  });

  it('speaks instructions on mount', async () => {
    const { voiceService } = await import('../../services/voiceService');
    render(<KidPiecePage />);
    // Voice service speak is called after a 500ms delay
    await vi.waitFor(() => {
      expect(voiceService.speak).toHaveBeenCalled();
    });
  });

  it('clicking speaker button triggers voice', async () => {
    const { voiceService } = await import('../../services/voiceService');
    render(<KidPiecePage />);
    vi.clearAllMocks();

    fireEvent.click(screen.getByTestId('kid-speak-btn'));
    expect(voiceService.speak).toHaveBeenCalled();
  });

  it('renders chess board with correct FEN', () => {
    render(<KidPiecePage />);
    const board = screen.getByTestId('chess-board');
    expect(board).toHaveAttribute('data-fen', '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1');
  });

  it('renders got it button', () => {
    render(<KidPiecePage />);
    expect(screen.getByTestId('got-it-btn')).toBeInTheDocument();
  });
});
