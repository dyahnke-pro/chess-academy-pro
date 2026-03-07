import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { FairyTaleChapterPage } from './FairyTaleChapterPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { testChapter } = vi.hoisted(() => {
  return {
    testChapter: {
      id: 'pawn',
      title: 'The Humble Hero',
      subtitle: 'A humble hero answers the call',
      icon: '\u265F',
      storyIntro: 'In the enchanted Kingdom of Sixty-Four Squares, a brave pawn steps forward.',
      storyOutro: 'The humble hero proved his worth!',
      requiredPuzzleScore: 1,
      lessons: [
        {
          id: 'ft-pawn-1',
          title: 'The Call to Adventure',
          story: 'The pawn heard the call of destiny.',
          fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
          highlightSquares: ['e3', 'e4'],
          instruction: 'Guide the pawn forward.',
        },
      ],
      puzzles: [
        {
          id: 'ft-pawn-p1',
          fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
          solution: ['e4'],
          hint: 'The pawn must take its first step!',
          successMessage: 'The hero advances!',
        },
      ],
    },
  };
});

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ onMove, initialFen }: { onMove?: (move: unknown) => void; initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>
      <button data-testid="mock-move-btn" onClick={() => onMove?.({ from: 'e2', to: 'e4', san: 'e4', fen: '4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1' })}>
        Move
      </button>
    </div>
  ),
}));

vi.mock('./StarDisplay', () => ({
  StarDisplay: ({ earned, total }: { earned: number; total: number }) => (
    <div data-testid="star-display">
      {earned}/{total}
    </div>
  ),
}));

vi.mock('../../services/journeyService', () => ({
  getGameProgress: vi.fn(),
  initGameProgress: vi.fn(),
  completeGameLesson: vi.fn(),
  recordGamePuzzleAttempt: vi.fn(),
  completeGameChapter: vi.fn(),
  getChapterProgress: vi.fn(),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn() },
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
    chapters: [testChapter],
    chapterOrder: ['pawn', 'rook'],
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderChapterPage(): ReturnType<typeof rtlRender> {
  return rtlRender(
    <MemoryRouter initialEntries={['/kid/fairy-tale/pawn']}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/kid/fairy-tale/:chapterId" element={<FairyTaleChapterPage />} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

const defaultProgress = {
  chapters: {},
  currentChapterId: 'pawn' as const,
  startedAt: new Date().toISOString(),
  completedAt: null,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FairyTaleChapterPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile({ isKidMode: true }));

    const {
      getGameProgress,
      initGameProgress,
      completeGameLesson,
      recordGamePuzzleAttempt,
      completeGameChapter,
      getChapterProgress,
    } = await import('../../services/journeyService');

    vi.mocked(getGameProgress).mockResolvedValue(null);
    vi.mocked(initGameProgress).mockResolvedValue({ ...defaultProgress });
    vi.mocked(completeGameLesson).mockResolvedValue({ ...defaultProgress });
    vi.mocked(recordGamePuzzleAttempt).mockResolvedValue({ ...defaultProgress });
    vi.mocked(completeGameChapter).mockResolvedValue({
      ...defaultProgress,
      currentChapterId: 'rook',
    });
    vi.mocked(getChapterProgress).mockReturnValue({
      chapterId: 'pawn',
      lessonsCompleted: 0,
      puzzlesCompleted: 0,
      puzzlesCorrect: 0,
      completed: false,
      bestScore: 0,
      completedAt: null,
    });
  });

  it('renders intro phase with fairy tale storyIntro', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-intro')).toBeInTheDocument();
    });

    const titles = screen.getAllByText('The Humble Hero');
    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('In the enchanted Kingdom of Sixty-Four Squares, a brave pawn steps forward.'),
    ).toBeInTheDocument();
  });

  it('Begin button transitions to lesson phase', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-begin-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-lesson')).toBeInTheDocument();
    });

    expect(screen.getByText('The Call to Adventure')).toBeInTheDocument();
  });

  it('lesson Next button advances to puzzle phase', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-begin-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-next-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-next-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-puzzle')).toBeInTheDocument();
    });
  });

  it('correct puzzle move shows success feedback', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-begin-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-next-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-next-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-puzzle')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mock-move-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-feedback')).toBeInTheDocument();
    });

    expect(screen.getByText('Correct!')).toBeInTheDocument();
  });

  it('back button is rendered', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-back-btn')).toBeInTheDocument();
    });
  });
});
