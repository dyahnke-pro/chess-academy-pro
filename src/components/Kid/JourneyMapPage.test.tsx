import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { JourneyMapPage } from './JourneyMapPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import type { JourneyProgress } from '../../types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetJourneyProgress = vi.fn<() => Promise<JourneyProgress | null>>();
const mockIsChapterUnlocked = vi.fn<(chapterId: string, progress: JourneyProgress) => boolean>();
const mockGetChapterProgress = vi.fn<(chapterId: string) => import('../../types').JourneyChapterProgress>();

vi.mock('../../services/journeyService', () => ({
  getJourneyProgress: (...args: unknown[]) => mockGetJourneyProgress(...(args as [])),
  isChapterUnlocked: (...args: unknown[]) => mockIsChapterUnlocked(...(args as [string, JourneyProgress])),
  getChapterProgress: (...args: unknown[]) => mockGetChapterProgress(...(args as [string])),
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

vi.mock('../../data/journeyChapters', () => ({
  JOURNEY_CHAPTERS: [
    {
      id: 'pawn',
      title: 'The Brave Pawn',
      subtitle: 'Learn pawn moves',
      icon: '\u265F',
      lessons: [],
      puzzles: [],
      storyIntro: '',
      storyOutro: '',
      requiredPuzzleScore: 2,
    },
    {
      id: 'rook',
      title: 'The Castle Tower',
      subtitle: 'Master the rook',
      icon: '\u265C',
      lessons: [],
      puzzles: [],
      storyIntro: '',
      storyOutro: '',
      requiredPuzzleScore: 2,
    },
  ],
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('JourneyMapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(
      buildUserProfile({ isKidMode: true, name: 'TestKid' }),
    );

    // Default: no progress yet
    mockGetJourneyProgress.mockResolvedValue(null);
    mockIsChapterUnlocked.mockReturnValue(false);
    mockGetChapterProgress.mockReturnValue({
      chapterId: 'pawn',
      lessonsCompleted: 0,
      puzzlesCompleted: 0,
      puzzlesCorrect: 0,
      completed: false,
      bestScore: 0,
      completedAt: null,
    });
  });

  it('shows loading state initially', () => {
    // Never resolve the promise so we stay in loading
    mockGetJourneyProgress.mockReturnValue(new Promise(() => {}));
    render(<JourneyMapPage />);

    expect(screen.getByTestId('journey-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading your journey...')).toBeInTheDocument();
  });

  it('renders chapter cards after loading', async () => {
    mockGetJourneyProgress.mockResolvedValue(null);
    render(<JourneyMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('journey-map-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chapter-card-pawn')).toBeInTheDocument();
    expect(screen.getByTestId('chapter-card-rook')).toBeInTheDocument();
    expect(screen.getByText('The Brave Pawn')).toBeInTheDocument();
    expect(screen.getByText('The Castle Tower')).toBeInTheDocument();
  });

  it('first chapter (pawn) is clickable when no progress exists', async () => {
    mockGetJourneyProgress.mockResolvedValue(null);
    render(<JourneyMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chapter-card-pawn')).toBeInTheDocument();
    });

    const pawnCard = screen.getByTestId('chapter-card-pawn');
    expect(pawnCard).not.toBeDisabled();
  });

  it('locked chapters are disabled', async () => {
    const progressData: JourneyProgress = {
      chapters: {},
      currentChapterId: 'pawn',
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    mockGetJourneyProgress.mockResolvedValue(progressData);
    mockIsChapterUnlocked.mockImplementation((chapterId) => chapterId === 'pawn');

    render(<JourneyMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chapter-card-rook')).toBeInTheDocument();
    });

    const rookCard = screen.getByTestId('chapter-card-rook');
    expect(rookCard).toBeDisabled();
  });

  it('completed chapters show star display', async () => {
    const progressData: JourneyProgress = {
      chapters: {
        pawn: {
          chapterId: 'pawn',
          lessonsCompleted: 3,
          puzzlesCompleted: 3,
          puzzlesCorrect: 2,
          completed: true,
          bestScore: 2,
          completedAt: new Date().toISOString(),
        },
      },
      currentChapterId: 'rook',
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    mockGetJourneyProgress.mockResolvedValue(progressData);
    mockIsChapterUnlocked.mockReturnValue(true);
    mockGetChapterProgress.mockImplementation((chapterId: string) => {
      if (chapterId === 'pawn' && progressData.chapters.pawn) {
        return progressData.chapters.pawn;
      }
      return {
        chapterId: chapterId as import('../../types').JourneyChapterId,
        lessonsCompleted: 0,
        puzzlesCompleted: 0,
        puzzlesCorrect: 0,
        completed: false,
        bestScore: 0,
        completedAt: null,
      };
    });

    render(<JourneyMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('star-display')).toBeInTheDocument();
    });
  });

  it('back button navigates to /kid', async () => {
    mockGetJourneyProgress.mockResolvedValue(null);
    render(<JourneyMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('journey-back-btn')).toBeInTheDocument();
    });

    screen.getByTestId('journey-back-btn').click();
    expect(mockNavigate).toHaveBeenCalledWith('/kid');
  });

  it('voice toggle button is rendered', async () => {
    mockGetJourneyProgress.mockResolvedValue(null);
    render(<JourneyMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('journey-voice-toggle')).toBeInTheDocument();
    });

    expect(screen.getByTestId('journey-voice-toggle')).toHaveAttribute(
      'aria-label',
      'Mute voice',
    );
  });

  it('shows progress text', async () => {
    const progressData: JourneyProgress = {
      chapters: {
        pawn: {
          chapterId: 'pawn',
          lessonsCompleted: 3,
          puzzlesCompleted: 3,
          puzzlesCorrect: 3,
          completed: true,
          bestScore: 3,
          completedAt: new Date().toISOString(),
        },
      },
      currentChapterId: 'rook',
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    mockGetJourneyProgress.mockResolvedValue(progressData);
    mockIsChapterUnlocked.mockReturnValue(true);
    mockGetChapterProgress.mockReturnValue({
      chapterId: 'pawn',
      lessonsCompleted: 0,
      puzzlesCompleted: 0,
      puzzlesCorrect: 0,
      completed: false,
      bestScore: 0,
      completedAt: null,
    });

    render(<JourneyMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('journey-progress-text')).toBeInTheDocument();
    });

    expect(screen.getByTestId('journey-progress-text')).toHaveTextContent('Chapter 1 of 2');
  });
});
