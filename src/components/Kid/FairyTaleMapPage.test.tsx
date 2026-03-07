import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { FairyTaleMapPage } from './FairyTaleMapPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockGetGameProgress, mockIsChapterUnlocked, mockGetChapterProgress, testChapters } = vi.hoisted(() => {
  const chapters = [
    {
      id: 'pawn',
      title: 'The Humble Hero',
      subtitle: 'A humble hero answers the call',
      icon: '\u265F',
      lessons: [],
      puzzles: [],
      storyIntro: '',
      storyOutro: '',
      requiredPuzzleScore: 2,
    },
    {
      id: 'rook',
      title: 'The Stone Guardian',
      subtitle: 'Awaken the fortress protector',
      icon: '\u265C',
      lessons: [],
      puzzles: [],
      storyIntro: '',
      storyOutro: '',
      requiredPuzzleScore: 2,
    },
  ];

  return {
    mockGetGameProgress: vi.fn(),
    mockIsChapterUnlocked: vi.fn(),
    mockGetChapterProgress: vi.fn(),
    testChapters: chapters,
  };
});

vi.mock('../../services/journeyService', () => ({
  getGameProgress: (...args: unknown[]) => mockGetGameProgress(...(args as [])) as unknown,
  isChapterUnlocked: (...args: unknown[]) => mockIsChapterUnlocked(...(args as [string])) as unknown,
  getChapterProgress: (...args: unknown[]) => mockGetChapterProgress(...(args as [string])) as unknown,
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

vi.mock('../../data/kidGameConfigs', () => ({
  FAIRY_TALE_CONFIG: {
    gameId: 'fairy-tale',
    title: 'Fairy Tale Quest',
    icon: '\uD83C\uDFF0',
    routePrefix: '/kid/fairy-tale',
    chapters: testChapters,
    chapterOrder: ['pawn', 'rook'],
  },
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

describe('FairyTaleMapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(
      buildUserProfile({ isKidMode: true, name: 'TestKid' }),
    );

    mockGetGameProgress.mockResolvedValue(null);
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

  it('renders the fairy tale map page with correct title', async () => {
    render(<FairyTaleMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('journey-map-page')).toBeInTheDocument();
    });

    expect(screen.getByText('Fairy Tale Quest')).toBeInTheDocument();
  });

  it('renders chapter cards with fairy tale titles', async () => {
    render(<FairyTaleMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('chapter-card-pawn')).toBeInTheDocument();
    });

    expect(screen.getByText('The Humble Hero')).toBeInTheDocument();
    expect(screen.getByText('The Stone Guardian')).toBeInTheDocument();
  });

  it('back button navigates to /kid', async () => {
    render(<FairyTaleMapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('journey-back-btn')).toBeInTheDocument();
    });

    screen.getByTestId('journey-back-btn').click();
    expect(mockNavigate).toHaveBeenCalledWith('/kid');
  });

  it('shows loading state initially', () => {
    mockGetGameProgress.mockReturnValue(new Promise(() => {}));
    render(<FairyTaleMapPage />);

    expect(screen.getByTestId('journey-loading')).toBeInTheDocument();
  });
});
