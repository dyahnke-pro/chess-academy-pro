import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { CoachPanel } from './CoachPanel';
import type { CoachContext } from '../../types';

const MOCK_CONTEXT: CoachContext = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  lastMoveSan: null,
  moveNumber: 0,
  pgn: '',
  openingName: null,
  stockfishAnalysis: null,
  playerMove: null,
  moveClassification: null,
  playerProfile: { rating: 1200, weaknesses: [] },
};

vi.mock('../../services/coachApi', () => ({
  getCoachCommentary: vi.fn().mockResolvedValue('Great move! You found the fork.'),
}));

vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      activeProfile: {
        id: 'main',
        name: 'Test User',
        currentRating: 1200,
        badHabits: [],
        preferences: { apiKeyEncrypted: 'test-key' },
      },
    }),
  ),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), isPlaying: vi.fn().mockReturnValue(false) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CoachPanel', () => {
  it('renders the ask button initially', () => {
    render(<CoachPanel context={MOCK_CONTEXT} />);
    expect(screen.getByTestId('coach-ask-btn')).toBeInTheDocument();
  });

  it('shows Ask Coach on button', () => {
    render(<CoachPanel context={MOCK_CONTEXT} />);
    expect(screen.getByTestId('coach-ask-btn')).toHaveTextContent('Ask Coach');
  });

  it('shows coach panel after clicking ask', async () => {
    render(<CoachPanel context={MOCK_CONTEXT} />);
    fireEvent.click(screen.getByTestId('coach-ask-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('coach-panel')).toBeInTheDocument();
    });
  });

  it('displays coach response', async () => {
    render(<CoachPanel context={MOCK_CONTEXT} />);
    fireEvent.click(screen.getByTestId('coach-ask-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('coach-message')).toHaveTextContent('Great move! You found the fork.');
    });
  });
});
