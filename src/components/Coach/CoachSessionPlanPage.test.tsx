import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { CoachSessionPlanPage } from './CoachSessionPlanPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    speakForced: vi.fn().mockResolvedValue(undefined),
    speakIfFree: vi.fn().mockResolvedValue(undefined),
    speakAlert: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    getLastSpeakDiagnostic: vi.fn().mockReturnValue({
      text: '',
      tier: 'muted',
      pollyAttempted: false,
      pollyOk: null,
      pollyStatus: null,
      audioContextState: 'suspended',
      error: null,
      timestamp: 0,
    }),
  },
}));

// CoachSessionPlanPage now routes through coachService.ask (the
// unified Coach Brain Spine). Mock simulates the streaming
// onChunk callback so the UI fills with the expected text, then
// resolves with the same text in `result.text`.
vi.mock('../../coach/coachService', () => ({
  coachService: {
    ask: vi.fn().mockImplementation(async (
      _input: unknown,
      options: { onChunk?: (chunk: string) => void },
    ) => {
      const text = 'Here is your training plan for today.';
      if (options.onChunk) options.onChunk(text);
      return { text, toolCallIds: [], provider: 'deepseek' };
    }),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachCommentary: vi.fn().mockImplementation(
    (_task: string, _context: unknown, onStream?: (chunk: string) => void) => {
      if (onStream) {
        onStream('Here is your training plan for today.');
      }
      return Promise.resolve('Here is your training plan for today.');
    },
  ),
}));

vi.mock('../../services/sessionGenerator', () => ({
  generateCoachSession: vi.fn().mockResolvedValue({
    blocks: [
      { type: 'opening_review', targetMinutes: 11, completed: false },
      { type: 'puzzle_drill', targetMinutes: 16, puzzleTheme: 'fork', completed: false },
      { type: 'flashcards', targetMinutes: 7, completed: false },
      { type: 'endgame_drill', targetMinutes: 11, completed: false },
    ],
    totalMinutes: 45,
  }),
  createSession: vi.fn().mockResolvedValue({
    id: 'session-1',
    date: '2026-03-05',
    profileId: 'main',
    durationMinutes: 0,
    plan: { blocks: [], totalMinutes: 45 },
    completed: false,
    puzzlesSolved: 0,
    puzzleAccuracy: 0,
    xpEarned: 0,
    coachSummary: null,
  }),
}));

const mockProfile = buildUserProfile({
  id: 'main',
  name: 'Player',
  currentRating: 1420,
  puzzleRating: 1400,
});

describe('CoachSessionPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      activeProfile: mockProfile,
    });
  });

  it('renders the session plan page', () => {
    render(<CoachSessionPlanPage />);
    expect(screen.getByTestId('coach-session-plan-page')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<CoachSessionPlanPage />);
    expect(screen.getByText(/Creating your personalised plan/)).toBeInTheDocument();
  });

  it('shows plan after loading', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByText("Today's Plan")).toBeInTheDocument();
    });
  });

  it('shows start session button after loading', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByTestId('start-session-btn')).toBeInTheDocument();
    });
  });

  it('shows coach explanation after loading', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByTestId('plan-explanation')).toBeInTheDocument();
    });
  });

  it('renders pushback input', () => {
    render(<CoachSessionPlanPage />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('shows session block cards after loading', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('Opening Review')).toBeInTheDocument();
      expect(screen.getByText('Puzzle Training')).toBeInTheDocument();
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
      expect(screen.getByText('Endgame Practice')).toBeInTheDocument();
    });
  });

  it('shows time allocations for each block', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      // Two blocks have 11 min (opening_review and endgame_drill)
      const elevenMinEls = screen.getAllByText(/11 min/);
      expect(elevenMinEls.length).toBe(2);
      expect(screen.getByText(/16 min/)).toBeInTheDocument();
      expect(screen.getByText(/7 min/)).toBeInTheDocument();
    });
  });

  it('shows total session duration', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByText(/45 minutes/)).toBeInTheDocument();
    });
  });

  it('shows plan title as Today\'s Plan', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByText("Today's Plan")).toBeInTheDocument();
    });
  });

  it('start session button has correct text', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      const btn = screen.getByTestId('start-session-btn');
      expect(btn).toHaveTextContent('Start Session');
    });
  });

  it('shows Session Plan in header', () => {
    render(<CoachSessionPlanPage />);
    expect(screen.getByText(/Session Plan/)).toBeInTheDocument();
  });

  it('shows puzzle theme focus when block has puzzleTheme', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('Focus: fork')).toBeInTheDocument();
    });
  });

  it('loading state hides start session button', () => {
    render(<CoachSessionPlanPage />);
    // During loading, start button should not be visible
    expect(screen.queryByTestId('start-session-btn')).not.toBeInTheDocument();
  });

  it('shows coach explanation text after loading', async () => {
    render(<CoachSessionPlanPage />);
    await waitFor(() => {
      expect(screen.getByTestId('plan-explanation')).toHaveTextContent('Here is your training plan for today.');
    });
  });
});
