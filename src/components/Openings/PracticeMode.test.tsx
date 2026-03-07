import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { render } from '../../test/utils';
import { PracticeMode } from './PracticeMode';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';

/* eslint-disable @typescript-eslint/require-await */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRecordDrillAttempt = vi.fn().mockResolvedValue(undefined);
const mockUpdateVariationProgress = vi.fn().mockResolvedValue(undefined);
const mockMarkLinePerfected = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/openingService', () => ({
  recordDrillAttempt: (...args: unknown[]): unknown => mockRecordDrillAttempt(...args),
  updateDrillProgress: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: vi.fn().mockResolvedValue(undefined),
  updateVariationProgress: (...args: unknown[]): unknown => mockUpdateVariationProgress(...args),
  markLinePerfected: (...args: unknown[]): unknown => mockMarkLinePerfected(...args),
}));

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen, orientation, interactive, onMove }: {
    initialFen?: string;
    orientation?: string;
    interactive?: boolean;
    onMove?: (result: { from: string; to: string; san: string; fen: string }) => void;
  }) => (
    <div
      data-testid="chess-board"
      data-fen={initialFen}
      data-orientation={orientation}
      data-interactive={String(interactive)}
    >
      Board
      {interactive && onMove && (
        <>
          <button
            data-testid="make-correct-move"
            onClick={() => onMove({ from: 'e2', to: 'e4', san: 'e4', fen: '' })}
          >
            Correct
          </button>
          <button
            data-testid="make-wrong-move"
            onClick={() => onMove({ from: 'a2', to: 'a3', san: 'a3', fen: '' })}
          >
            Wrong
          </button>
        </>
      )}
    </div>
  ),
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

vi.mock('../../services/speechService', () => ({
  speechService: {
    speak: vi.fn(),
    stop: vi.fn(),
    setEnabled: vi.fn(),
    setRate: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const whiteOpening: OpeningRecord = buildOpeningRecord({
  id: 'practice-test-white',
  name: 'Vienna Game',
  pgn: 'e4 e5 Nc3',
  color: 'white',
  variations: [
    { name: 'Vienna Gambit', pgn: 'e4 e5 Nc3 Nf6 f4', explanation: 'Sharp gambit play' },
  ],
});

function renderPractice(
  opening: OpeningRecord = whiteOpening,
  overrides: { onComplete?: (correct: boolean) => void; onExit?: () => void; variationIndex?: number } = {},
): { onComplete: ReturnType<typeof vi.fn<(correct: boolean) => void>>; onExit: ReturnType<typeof vi.fn<() => void>> } {
  const onComplete = overrides.onComplete
    ? vi.fn<(correct: boolean) => void>(overrides.onComplete)
    : vi.fn<(correct: boolean) => void>();
  const onExit = overrides.onExit
    ? vi.fn<() => void>(overrides.onExit)
    : vi.fn<() => void>();

  render(
    <PracticeMode
      opening={opening}
      variationIndex={overrides.variationIndex}
      onComplete={onComplete}
      onExit={onExit}
    />,
  );

  return { onComplete, onExit };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PracticeMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the practice-mode container', () => {
    renderPractice();
    expect(screen.getByTestId('practice-mode')).toBeInTheDocument();
  });

  it('renders the chess board', () => {
    renderPractice();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('shows "Practice" in header', () => {
    renderPractice();
    expect(screen.getByText(/Practice Vienna Game/)).toBeInTheDocument();
  });

  it('shows "What\'s the best move?" prompt with no explanations', () => {
    renderPractice();
    expect(screen.getByTestId('practice-prompt')).toHaveTextContent("What's the best move?");
    // No explanation card should be present
    expect(screen.queryByTestId('explanation-card')).not.toBeInTheDocument();
  });

  it('progress bar renders', () => {
    renderPractice();
    expect(screen.getByTestId('practice-progress')).toBeInTheDocument();
  });

  it('shows move counter', () => {
    renderPractice();
    expect(screen.getByText(/Move 0 \/ 3/)).toBeInTheDocument();
  });

  it('correct move shows green flash and advances', async () => {
    renderPractice();

    const correctBtn = screen.getByTestId('make-correct-move');
    await act(async () => { correctBtn.click(); });

    await waitFor(() => {
      expect(screen.getByTestId('correct-flash')).toBeInTheDocument();
    });
  });

  it('wrong move shows red X and Undo button', async () => {
    renderPractice();

    const wrongBtn = screen.getByTestId('make-wrong-move');
    await act(async () => { wrongBtn.click(); });

    await waitFor(() => {
      expect(screen.getByTestId('wrong-flash')).toBeInTheDocument();
      expect(screen.getByText('Incorrect move. Try again.')).toBeInTheDocument();
      expect(screen.getByTestId('undo-btn')).toBeInTheDocument();
    });
  });

  it('undo button dismisses wrong state', async () => {
    renderPractice();

    const wrongBtn = screen.getByTestId('make-wrong-move');
    await act(async () => { wrongBtn.click(); });

    await waitFor(() => {
      expect(screen.getByTestId('undo-btn')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId('undo-btn').click();
    });

    // Advance timers for AnimatePresence exit
    await act(async () => { vi.advanceTimersByTime(500); });

    // Board should be interactive again
    await waitFor(() => {
      expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'true');
    });

    // Wrong error card should be gone
    expect(screen.queryByText('Incorrect move. Try again.')).not.toBeInTheDocument();
  });

  it('back button calls onExit', () => {
    const { onExit } = renderPractice();
    screen.getByTestId('practice-back').click();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('board is interactive on player turn', () => {
    renderPractice();
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'true');
  });

  it('does NOT show any hint or explanation text', () => {
    renderPractice();
    // Should not have any explanation card with move guidance
    const cards = screen.queryAllByTestId('explanation-card');
    expect(cards.length).toBe(0);
  });
});
