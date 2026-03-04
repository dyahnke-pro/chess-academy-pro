import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { FlashcardStudyPage } from './FlashcardStudyPage';

const { mockReviewFlashcard, mockGetDueFlashcards } = vi.hoisted(() => ({
  mockReviewFlashcard: vi.fn().mockResolvedValue(undefined),
  mockGetDueFlashcards: vi.fn(),
}));

mockGetDueFlashcards.mockResolvedValue([
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
]);

vi.mock('../../services/flashcardService', () => ({
  generateAllRepertoireFlashcards: vi.fn().mockResolvedValue(undefined),
  getDueFlashcards: mockGetDueFlashcards,
  reviewFlashcard: mockReviewFlashcard,
  getFlashcardStats: vi.fn().mockResolvedValue({
    total: 10,
    due: 2,
    byOpening: { 'italian-game': 5 },
  }),
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
});

describe('FlashcardStudyPage', () => {
  it('renders the flashcard study page with due cards', async () => {
    render(<FlashcardStudyPage />);
    await waitFor(() => {
      expect(screen.getByTestId('flashcard-study')).toBeInTheDocument();
    });
  });

  it('shows the question text', async () => {
    render(<FlashcardStudyPage />);
    await waitFor(() => {
      expect(screen.getByTestId('flashcard-question')).toHaveTextContent('Name this opening position.');
    });
  });

  it('shows card count progress', async () => {
    render(<FlashcardStudyPage />);
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  it('shows reveal button before answer is shown', async () => {
    render(<FlashcardStudyPage />);
    await waitFor(() => {
      expect(screen.getByTestId('reveal-btn')).toBeInTheDocument();
    });
  });

  it('reveals answer when reveal button is clicked', async () => {
    render(<FlashcardStudyPage />);
    await waitFor(() => {
      expect(screen.getByTestId('reveal-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('reveal-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('flashcard-answer')).toHaveTextContent('Italian Game (ECO C50)');
    });
  });

  it('shows SRS grade buttons after revealing', async () => {
    render(<FlashcardStudyPage />);
    await waitFor(() => {
      expect(screen.getByTestId('reveal-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('reveal-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('srs-grade-buttons')).toBeInTheDocument();
    });
  });

  it('advances to next card after grading', async () => {
    render(<FlashcardStudyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('reveal-btn')).toBeInTheDocument();
    });

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

  it('shows completion screen when all cards are reviewed', async () => {
    mockGetDueFlashcards.mockResolvedValueOnce([
      {
        id: 'fc-single',
        openingId: 'italian-game',
        type: 'name_opening',
        questionFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        questionText: 'Name this opening position.',
        answerMove: null,
        answerText: 'Italian Game',
        srsInterval: 0,
        srsEaseFactor: 2.5,
        srsRepetitions: 0,
        srsDueDate: '2026-03-04',
        srsLastReview: null,
      },
    ]);

    render(<FlashcardStudyPage />);

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
    render(<FlashcardStudyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('skip-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skip-btn'));

    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });
  });

  it('shows complete screen when no cards are due', async () => {
    mockGetDueFlashcards.mockResolvedValueOnce([]);

    render(<FlashcardStudyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('flashcard-complete')).toBeInTheDocument();
    });
  });
});
