import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { CoachHomePage } from './CoachHomePage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile, buildSessionRecord } from '../../test/factories';

const mockGetRecentSessions = vi.fn();

vi.mock('../../services/sessionGenerator', () => ({
  getRecentSessions: (...args: unknown[]) => mockGetRecentSessions(...args),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/coachTemplates', () => ({
  getScenarioTemplate: vi.fn().mockReturnValue('Hello!'),
}));

vi.mock('../../db/schema', () => ({
  db: {
    profiles: { update: vi.fn().mockResolvedValue(undefined) },
  },
}));

describe('CoachHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    mockGetRecentSessions.mockResolvedValue([]);
  });

  function setupProfile(): void {
    const profile = buildUserProfile({
      coachPersonality: 'danya',
      unlockedCoaches: ['danya'],
      level: 1,
    });
    useAppStore.getState().setActiveProfile(profile);
  }

  it('renders coach avatar when profile has unlocked coaches', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-avatar')).toBeInTheDocument();
    });
  });

  it('renders coach home page container', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-home-page')).toBeInTheDocument();
    });
  });

  it('renders all four action buttons', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-action-play')).toBeInTheDocument();
      expect(screen.getByTestId('coach-action-chat')).toBeInTheDocument();
      expect(screen.getByTestId('coach-action-analyse')).toBeInTheDocument();
      expect(screen.getByTestId('coach-action-plan')).toBeInTheDocument();
    });
  });

  it('renders Play a Game button with correct text', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-action-play')).toHaveTextContent('Play a Game');
    });
  });

  it('renders Just Chat button with correct text', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-action-chat')).toHaveTextContent('Just Chat');
    });
  });

  it('renders Analyse Position button with correct text', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-action-analyse')).toHaveTextContent('Analyse Position');
    });
  });

  it('renders Plan My Session button with correct text', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('coach-action-plan')).toHaveTextContent('Plan My Session');
    });
  });

  it('displays personality name for danya', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Coach Danya')).toBeInTheDocument();
    });
  });

  it('displays personality name for kasparov', async () => {
    const profile = buildUserProfile({
      coachPersonality: 'kasparov',
      unlockedCoaches: ['kasparov'],
      level: 5,
    });
    useAppStore.getState().setActiveProfile(profile);
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Coach Kasparov')).toBeInTheDocument();
    });
  });

  it('shows last session info when a recent session exists', async () => {
    setupProfile();
    const session = buildSessionRecord({
      date: '2026-02-15',
      durationMinutes: 30,
      puzzlesSolved: 5,
      xpEarned: 120,
    });
    mockGetRecentSessions.mockResolvedValue([session]);

    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Last Session')).toBeInTheDocument();
      expect(screen.getByText('2026-02-15')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('5 puzzles')).toBeInTheDocument();
      expect(screen.getByText('+120 XP')).toBeInTheDocument();
    });
  });

  it('shows coach summary when last session has one', async () => {
    setupProfile();
    const session = buildSessionRecord({
      coachSummary: 'Great progress today!',
    });
    mockGetRecentSessions.mockResolvedValue([session]);

    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByText(/Great progress today!/)).toBeInTheDocument();
    });
  });

  it('shows coach selection screen when no coaches unlocked', () => {
    const profile = buildUserProfile({
      unlockedCoaches: [],
    });
    useAppStore.getState().setActiveProfile(profile);
    render(<CoachHomePage />);

    expect(screen.getByTestId('coach-selection-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('coach-home-page')).not.toBeInTheDocument();
  });

  it('renders Change Coach button', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Change Coach')).toBeInTheDocument();
    });
  });

  it('clicking Change Coach shows selection screen', async () => {
    setupProfile();
    render(<CoachHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Change Coach')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Coach'));

    expect(screen.getByTestId('coach-selection-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('coach-home-page')).not.toBeInTheDocument();
  });
});
