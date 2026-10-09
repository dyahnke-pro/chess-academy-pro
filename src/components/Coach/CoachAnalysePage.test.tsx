import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { CoachAnalysePage } from './CoachAnalysePage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    speakIfFree: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 18,
      topLines: [
        { rank: 1, evaluation: 30, moves: ['e2e4'], mate: null },
        { rank: 2, evaluation: 20, moves: ['d2d4'], mate: null },
      ],
      nodesPerSecond: 1000000,
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachCommentary: vi.fn().mockResolvedValue('This position is equal.'),
}));

const mockDispatch = vi.fn();
vi.mock('../../coach/dispatchCoachTurn', () => ({
  dispatchCoachTurn: (...a: unknown[]): unknown => mockDispatch(...a) as unknown,
}));

const mockProfile = buildUserProfile({
  id: 'main',
  name: 'Player',
  aiDataConsent: 'granted',
  currentRating: 1420,
  puzzleRating: 1400,
});

describe('CoachAnalysePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      activeProfile: mockProfile,
    });
  });

  it('renders the analyse page', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('coach-analyse-page')).toBeInTheDocument();
  });

  it('shows FEN input field', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('fen-input')).toBeInTheDocument();
  });

  it('shows analyse button', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('load-fen-btn')).toBeInTheDocument();
  });

  it('shows header with Position Analysis', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByText(/Position Analysis/)).toBeInTheDocument();
  });

  it('renders follow-up input', () => {
    render(<CoachAnalysePage />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  // All-screens walk 2026-10-09: a door answer does not stream, and the page
  // showed only streamed text — the answer was spoken and never shown. And
  // the door was handed an app wrapper ("Student question: … Answer in 2-4
  // sentences") instead of what the student typed.
  it('shows a door answer that did not stream, and asks the door in the student\'s words', async () => {
    mockDispatch.mockResolvedValue({ text: 'The best move is e4. [BOARD: arrow:e2-e4:green]' });
    render(<CoachAnalysePage />);
    act(() => { fireEvent.change(screen.getByTestId('chat-text-input'), { target: { value: "what's the best move here?" } }); });
    act(() => { fireEvent.click(screen.getByTestId('chat-send-btn')); });
    await waitFor(() => expect(screen.getByTestId('coach-explanation')).toHaveTextContent('The best move is e4.'));
    expect((mockDispatch.mock.calls[0][0] as { ask: string }).ask).toBe("what's the best move here?");
    expect(screen.getByTestId('coach-explanation')).not.toHaveTextContent('[BOARD:');
  });
});
