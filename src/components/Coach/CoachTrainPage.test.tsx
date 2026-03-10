import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { CoachTrainPage } from './CoachTrainPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import type { TrainingRecommendation } from '../../services/coachTrainingService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGetCoachGreeting = vi.fn();
const mockGetTrainingRecommendations = vi.fn();
vi.mock('../../services/coachTrainingService', () => ({
  getCoachGreeting: (...args: unknown[]) => mockGetCoachGreeting(...args) as string,
  getTrainingRecommendations: (...args: unknown[]) =>
    mockGetTrainingRecommendations(...args) as Promise<TrainingRecommendation[]>,
}));

const MOCK_RECS: TrainingRecommendation[] = [
  {
    id: 'guided-1',
    type: 'guided_lesson',
    title: 'Review Your Last Coach Game',
    description: 'Walk through your recent game.',
    priority: 1,
    data: { gameId: 'game-abc' },
    estimatedMinutes: 10,
  },
  {
    id: 'weakness-tactics',
    type: 'tactic_drill',
    title: 'Work on Tactics',
    description: 'Your tactics need improvement.',
    priority: 2,
    data: { puzzleTheme: 'tactics' },
    estimatedMinutes: 15,
  },
  {
    id: 'flashcard-review',
    type: 'flashcard_review',
    title: 'Review Due Flashcards',
    description: 'You have 12 flashcards waiting.',
    priority: 3,
    data: {},
    estimatedMinutes: 10,
  },
];

describe('CoachTrainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    mockGetCoachGreeting.mockReturnValue("Good morning, Test Player! Let's sharpen your game.");
    mockGetTrainingRecommendations.mockResolvedValue(MOCK_RECS);
  });

  it('renders page container', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('coach-train-page')).toBeInTheDocument();
    });
  });

  it('renders coach greeting', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('coach-greeting')).toHaveTextContent(
        "Good morning, Test Player! Let's sharpen your game."
      );
    });
  });

  it('shows streak badge when streak > 0', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ currentStreak: 5 }));
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('streak-badge')).toHaveTextContent('5-day streak');
    });
  });

  it('hides streak badge when streak is 0', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ currentStreak: 0 }));
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    // Never resolve recommendations to keep loading
    mockGetTrainingRecommendations.mockReturnValue(new Promise(() => {}));
    render(<CoachTrainPage />);
    expect(screen.getByTestId('train-loading')).toHaveTextContent(
      'Preparing your training plan...'
    );
  });

  it('shows empty state when no recommendations', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    mockGetTrainingRecommendations.mockResolvedValue([]);
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('no-recommendations')).toBeInTheDocument();
    });
    expect(screen.getByText('Play a game or import your games')).toBeInTheDocument();
    expect(screen.getByText('Play a Game')).toBeInTheDocument();
  });

  it('renders recommendation cards with titles and times', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('recommendations')).toBeInTheDocument();
    });
    const cards = screen.getAllByTestId('training-card');
    expect(cards).toHaveLength(3);
    expect(screen.getByText('Review Your Last Coach Game')).toBeInTheDocument();
    expect(screen.getByText('Work on Tactics')).toBeInTheDocument();
    expect(screen.getByText('Review Due Flashcards')).toBeInTheDocument();
    expect(screen.getAllByText('~10m')).toHaveLength(2);
    expect(screen.getByText('~15m')).toBeInTheDocument();
  });

  it('renders quick action buttons', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('quick-play')).toBeInTheDocument();
    });
    expect(screen.getByTestId('quick-analyse')).toBeInTheDocument();
    expect(screen.getByTestId('quick-chat')).toBeInTheDocument();
  });

  it('renders "Today\'s Training" heading', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('training-heading')).toHaveTextContent("Today's Training");
    });
  });

  it('renders "Or choose your own" section', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByText('Or choose your own')).toBeInTheDocument();
    });
  });

  it('does not fetch when no profile', async () => {
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('coach-train-page')).toBeInTheDocument();
    });
    expect(mockGetCoachGreeting).not.toHaveBeenCalled();
    expect(mockGetTrainingRecommendations).not.toHaveBeenCalled();
  });

  it('navigates to correct route when clicking a training card', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('recommendations')).toBeInTheDocument();
    });
    const cards = screen.getAllByTestId('training-card');
    cards[0].click();
    expect(mockNavigate).toHaveBeenCalledWith('/coach/play?review=game-abc');
  });

  it('navigates to /coach/play when clicking quick-play', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('quick-play')).toBeInTheDocument();
    });
    screen.getByTestId('quick-play').click();
    expect(mockNavigate).toHaveBeenCalledWith('/coach/play');
  });

  it('navigates to /coach/play on empty state Play a Game button', async () => {
    useAppStore.getState().setActiveProfile(buildUserProfile());
    mockGetTrainingRecommendations.mockResolvedValue([]);
    render(<CoachTrainPage />);
    await waitFor(() => {
      expect(screen.getByTestId('no-recommendations')).toBeInTheDocument();
    });
    screen.getByText('Play a Game').click();
    expect(mockNavigate).toHaveBeenCalledWith('/coach/play');
  });
});
