import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { FlashcardStudyPage } from './FlashcardStudyPage';

const { mockReviewFlashcard, mockGetFlashcardsByMode, mockGetDueFlashcardCount, sampleCards } = vi.hoisted(() => {
  const sampleCards = [
    {
      id: 'fc-1',
      openingId: 'italian-game',
      type: 'name_opening',
      questionFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      questionText: 'Name this opening position.',
      answerMove: null,
      answerText: 'Italian Game (ECO C50)',
      srsInterval: 0,
      srsEaseFactor: 2.5,
      srsRepetitions: 0,
      srsDueDate: '2026-03-04',
      srsLastReview: null,
    },
    {
      id: 'fc-2',
      openingId: 'italian-game',
      type: 'explain_idea',
      questionFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      questionText: 'What are the key ideas in the Italian Game?',
      answerMove: null,
      answerText: 'Control the center | Develop pieces | Castle early',
      srsInterval: 0,
      srsEaseFactor: 2.5,
      srsRepetitions: 0,
      srsDueDate: '2026-03-04',
      srsLastReview: null,
    },
  ];

  return {
    mockReviewFlashcard: vi.fn().mockResolvedValue(undefined),
    mockGetFlashcardsByMode: vi.fn().mockResolvedValue(sampleCards),
    mockGetDueFlashcardCount: vi.fn().mockResolvedValue(5),
    sampleCards,
  };
});

vi.mock('../../services/flashcardService', () => ({
  generateAllRepertoireFlashcards: vi.fn().mockResolvedValue(undefined),
  getDueFlashcards: vi.fn().mockResolvedValue([]),
  getDueFlashcardCount: mockGetDueFlashcardCount,
  reviewFlashcard: mockReviewFlashcard,
  getFlashcardStats: vi.fn().mockResolvedValue({
    total: 10,
    due: 2,
    byOpening: { 'italian-game': 5 },
  }),
  getFlashcardsByMode: mockGetFlashcardsByMode,
}));

vi.mock('chess.js', () => {
  class Chess {
    fen(): string { return 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'; }
    turn(): string { return 'b'; }
    isGameOver(): boolean { return false; }
    inCheck(): boolean { return false; }
    isCheck(): boolean { return false; }
    isCheckmate(): boolean { return false; }
    isDraw(): boolean { return false; }
    isStalemate(): boolean { return false; }
    isInsufficientMaterial(): boolean { return false; }
    isThreefoldRepetition(): boolean { return false; }
    history(): string[] { return []; }
    moves(): string[] { return []; }
    move(): null { return null; }
    undo(): null { return null; }
    reset(): void { /* noop */ }
    load(): void { /* noop */ }
    board(): never[] { return []; }
  }
  return { Chess };
});

vi.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="chessboard">Board</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFlashcardsByMode.mockResolvedValue(sampleCards);
  mockGetDueFlashcardCount.mockResolvedValue(5);
});

describe('FlashcardStudyPage', () => {
  describe('mode selector', () => {
    it('renders the mode selector on mount', async () => {
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('flashcard-modes')).toBeInTheDocument();
      });
    });

    it('shows page title', async () => {
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByText('Flashcard Drills')).toBeInTheDocument();
      });
    });

    it('shows due count badge', async () => {
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('due-badge')).toHaveTextContent('5 due');
      });
    });

    it('renders all 10 mode buttons', async () => {
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('mode-due_review')).toBeInTheDocument();
        expect(screen.getByTestId('mode-random')).toBeInTheDocument();
        expect(screen.getByTestId('mode-favorites')).toBeInTheDocument();
        expect(screen.getByTestId('mode-previously_studied')).toBeInTheDocument();
        expect(screen.getByTestId('mode-traps')).toBeInTheDocument();
        expect(screen.getByTestId('mode-warnings')).toBeInTheDocument();
        expect(screen.getByTestId('mode-variations')).toBeInTheDocument();
        expect(screen.getByTestId('mode-weakest')).toBeInTheDocument();
        expect(screen.getByTestId('mode-position_recognition')).toBeInTheDocument();
        expect(screen.getByTestId('mode-move_order')).toBeInTheDocument();
      });
    });

    it('clicking a mode loads cards and shows drill', async () => {
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('mode-random')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mode-random'));

      await waitFor(() => {
        expect(mockGetFlashcardsByMode).toHaveBeenCalledWith('random', 30);
        expect(screen.getByTestId('flashcard-study')).toBeInTheDocument();
      });
    });
  });

  describe('drill view', () => {
    async function enterDrill(): Promise<void> {
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('mode-due_review')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('mode-due_review'));
      await waitFor(() => {
        expect(screen.getByTestId('flashcard-study')).toBeInTheDocument();
      });
    }

    it('shows the question text', async () => {
      await enterDrill();
      expect(screen.getByTestId('flashcard-question')).toHaveTextContent('Name this opening position.');
    });

    it('shows card count progress', async () => {
      await enterDrill();
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('shows reveal button', async () => {
      await enterDrill();
      expect(screen.getByTestId('reveal-btn')).toBeInTheDocument();
    });

    it('reveals answer when reveal button is clicked', async () => {
      await enterDrill();

      fireEvent.click(screen.getByTestId('reveal-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-answer')).toHaveTextContent('Italian Game (ECO C50)');
      });
    });

    it('shows SRS grade buttons after revealing', async () => {
      await enterDrill();

      fireEvent.click(screen.getByTestId('reveal-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('srs-grade-buttons')).toBeInTheDocument();
      });
    });

    it('advances to next card after grading', async () => {
      await enterDrill();

      fireEvent.click(screen.getByTestId('reveal-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('grade-good')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('grade-good'));

      await waitFor(() => {
        expect(mockReviewFlashcard).toHaveBeenCalledWith('fc-1', 'good');
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });
    });

    it('shows completion screen when all cards reviewed', async () => {
      mockGetFlashcardsByMode.mockResolvedValueOnce([sampleCards[0]]);
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('mode-due_review')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('mode-due_review'));
      await waitFor(() => {
        expect(screen.getByTestId('reveal-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reveal-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('grade-good')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('grade-good'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-complete')).toBeInTheDocument();
        expect(screen.getByText('Session Complete')).toBeInTheDocument();
      });
    });

    it('skips to next card without grading', async () => {
      await enterDrill();

      fireEvent.click(screen.getByTestId('skip-btn'));

      await waitFor(() => {
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });
    });

    it('shows no cards message when mode returns empty', async () => {
      mockGetFlashcardsByMode.mockResolvedValueOnce([]);
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('mode-favorites')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mode-favorites'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-complete')).toBeInTheDocument();
        expect(screen.getByText('No Cards Available')).toBeInTheDocument();
      });
    });

    it('back to modes button returns to mode selector', async () => {
      mockGetFlashcardsByMode.mockResolvedValueOnce([]);
      render(<FlashcardStudyPage />);
      await waitFor(() => {
        expect(screen.getByTestId('mode-favorites')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mode-favorites'));

      await waitFor(() => {
        expect(screen.getByTestId('back-to-modes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('back-to-modes'));

      await waitFor(() => {
        expect(screen.getByTestId('flashcard-modes')).toBeInTheDocument();
      });
    });
  });
});
