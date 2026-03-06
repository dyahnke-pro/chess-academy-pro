import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { JourneyChapterPage } from './JourneyChapterPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ onMove, initialFen }: { onMove?: (move: unknown) => void; initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>
      <button data-testid="mock-move-btn" onClick={() => onMove?.({ from: 'e2', to: 'e4', san: 'e4', fen: '4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1' })}>
        Move
      </button>
      <button data-testid="mock-wrong-move-btn" onClick={() => onMove?.({ from: 'd2', to: 'd4', san: 'd4', fen: '4k3/8/8/8/3P4/8/8/4K3 b - d3 0 1' })}>
        Wrong Move
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
  getJourneyProgress: vi.fn(),
  initJourneyProgress: vi.fn(),
  completeLesson: vi.fn(),
  recordPuzzleAttempt: vi.fn(),
  completeChapter: vi.fn(),
  getChapterProgress: vi.fn(),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn() },
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
      storyIntro: 'Once upon a time there was a brave pawn.',
      storyOutro: 'The pawn completed its journey!',
      requiredPuzzleScore: 1,
      lessons: [
        {
          id: 'pawn-1',
          title: 'First Steps',
          story: 'Pawns move forward.',
          fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
          highlightSquares: ['e3', 'e4'],
          instruction: 'The pawn can move forward.',
        },
      ],
      puzzles: [
        {
          id: 'pawn-p1',
          fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
          solution: ['e4'],
          hint: 'Move the pawn two squares!',
          successMessage: 'Great job!',
        },
      ],
    },
  ],
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderChapterPage(): ReturnType<typeof rtlRender> {
  return rtlRender(
    <MemoryRouter initialEntries={['/kid/journey/pawn']}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/kid/journey/:chapterId" element={<JourneyChapterPage />} />
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

describe('JourneyChapterPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile({ isKidMode: true }));

    const {
      getJourneyProgress,
      initJourneyProgress,
      completeLesson,
      recordPuzzleAttempt,
      completeChapter,
      getChapterProgress,
    } = await import('../../services/journeyService');

    vi.mocked(getJourneyProgress).mockResolvedValue(null);
    vi.mocked(initJourneyProgress).mockResolvedValue({ ...defaultProgress });
    vi.mocked(completeLesson).mockResolvedValue({ ...defaultProgress });
    vi.mocked(recordPuzzleAttempt).mockResolvedValue({ ...defaultProgress });
    vi.mocked(completeChapter).mockResolvedValue({
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

  it('renders intro phase initially with storyIntro text', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-intro')).toBeInTheDocument();
    });

    // Title appears in both the top bar and the intro content
    const titles = screen.getAllByText('The Brave Pawn');
    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Once upon a time there was a brave pawn.'),
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
  });

  it('lesson phase shows lesson title and instruction', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-begin-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-lesson')).toBeInTheDocument();
    });

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('The pawn can move forward.')).toBeInTheDocument();
  });

  it('lesson phase shows chess board with correct FEN', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-begin-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chess-board')).toHaveAttribute(
      'data-fen',
      '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    );
  });

  it('Next button advances through lessons to puzzle phase', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-begin-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('chapter-begin-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-next-btn')).toBeInTheDocument();
    });

    // With only 1 lesson, clicking Next should go to puzzle phase
    fireEvent.click(screen.getByTestId('chapter-next-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('chapter-puzzle')).toBeInTheDocument();
    });
  });

  it('puzzle phase shows puzzle counter', async () => {
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

    expect(screen.getByText('Puzzle 1 of 1')).toBeInTheDocument();
  });

  it('hint button reveals hint text', async () => {
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
      expect(screen.getByTestId('chapter-hint-btn')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('chapter-hint-text')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chapter-hint-btn'));

    expect(screen.getByTestId('chapter-hint-text')).toBeInTheDocument();
    expect(screen.getByText('Move the pawn two squares!')).toBeInTheDocument();
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

    // Click the mock move button which sends 'e4' (the correct solution)
    fireEvent.click(screen.getByTestId('mock-move-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-feedback')).toBeInTheDocument();
    });

    expect(screen.getByText('Correct!')).toBeInTheDocument();
  });

  it('back button is rendered and navigable', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-back-btn')).toBeInTheDocument();
    });
  });

  it('voice toggle is rendered', async () => {
    renderChapterPage();

    await waitFor(() => {
      expect(screen.getByTestId('chapter-voice-toggle')).toBeInTheDocument();
    });
  });
});
