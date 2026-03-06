import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { render } from '../../test/utils';
import { DrillMode } from './DrillMode';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';

/* eslint-disable @typescript-eslint/require-await */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRecordDrillAttempt = vi.fn().mockResolvedValue(undefined);
const mockUpdateWoodpecker = vi.fn().mockResolvedValue(undefined);
const mockUpdateVariationProgress = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/openingService', () => ({
  recordDrillAttempt: (...args: unknown[]): unknown => mockRecordDrillAttempt(...args),
  updateDrillProgress: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: (...args: unknown[]): unknown => mockUpdateWoodpecker(...args),
  updateVariationProgress: (...args: unknown[]): unknown => mockUpdateVariationProgress(...args),
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
  id: 'drill-test-white',
  name: 'Vienna Game',
  pgn: 'e4 e5 Nc3',
  color: 'white',
  overview: 'Flexible opening with Nc3.',
  variations: [
    { name: 'Vienna Gambit', pgn: 'e4 e5 Nc3 Nf6 f4', explanation: 'Sharp gambit play' },
  ],
  woodpeckerReps: 0,
  woodpeckerSpeed: null,
});

const drilledOpening: OpeningRecord = buildOpeningRecord({
  id: 'drill-test-drilled',
  name: 'Sicilian Defense',
  pgn: 'e4 c5',
  color: 'black',
  woodpeckerReps: 3,
  woodpeckerSpeed: 12,
});

function renderDrill(
  opening: OpeningRecord = whiteOpening,
  overrides: { onComplete?: () => void; onExit?: () => void; variationIndex?: number } = {},
): { onComplete: ReturnType<typeof vi.fn>; onExit: ReturnType<typeof vi.fn> } {
  const onComplete = overrides.onComplete
    ? (vi.fn(overrides.onComplete) as ReturnType<typeof vi.fn>)
    : vi.fn();
  const onExit = overrides.onExit
    ? (vi.fn(overrides.onExit) as ReturnType<typeof vi.fn>)
    : vi.fn();

  render(
    <DrillMode
      opening={opening}
      variationIndex={overrides.variationIndex}
      onComplete={onComplete}
      onExit={onExit}
    />,
  );

  return { onComplete, onExit };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DrillMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the drill-mode container', () => {
    renderDrill();
    expect(screen.getByTestId('drill-mode')).toBeInTheDocument();
  });

  it('renders the chess board', () => {
    renderDrill();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('board uses correct orientation for white opening', () => {
    renderDrill(whiteOpening);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'white');
  });

  it('board uses correct orientation for black opening', () => {
    renderDrill(drilledOpening);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'black');
  });

  it('starts in demonstration phase with "Watch & Learn" label', () => {
    renderDrill();
    expect(screen.getByText('Watch & Learn')).toBeInTheDocument();
  });

  it('progress bar renders', () => {
    renderDrill();
    expect(screen.getByTestId('drill-progress')).toBeInTheDocument();
  });

  it('shows step indicator with move count', () => {
    renderDrill();
    expect(screen.getByText(/Move 0 \/ 3/)).toBeInTheDocument();
  });

  it('demonstration auto-advances moves and shows explanation', async () => {
    renderDrill();

    // First move auto-plays after 800ms
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    await waitFor(() => {
      expect(screen.getByText(/Move 1 \/ 3/)).toBeInTheDocument();
    });

    // Should show explanation card
    await waitFor(() => {
      expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
    });
  });

  it('shows Next Move button during demonstration explanation', async () => {
    renderDrill();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    await waitFor(() => {
      expect(screen.getByTestId('explanation-action')).toHaveTextContent('Next Move');
    });
  });

  it('back button calls onExit when clicked', () => {
    const { onExit } = renderDrill();
    screen.getByTestId('drill-back').click();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('transitions to natural play phase after demonstration completes', async () => {
    renderDrill();

    // Fast-forward through all demo moves (3 moves × ~800ms each + user click)
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        vi.advanceTimersByTime(900);
      });
      // Click "Next Move" to advance
      await waitFor(() => {
        const actionBtn = screen.queryByTestId('explanation-action');
        if (actionBtn) actionBtn.click();
      });
    }

    // Wait for transition delay
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    await waitFor(() => {
      expect(screen.getByText('Play From Memory')).toBeInTheDocument();
    });
  });

  it('shows timer during natural play phase', async () => {
    renderDrill();

    // Skip through demo
    for (let i = 0; i < 3; i++) {
      await act(async () => { vi.advanceTimersByTime(900); });
      await waitFor(() => {
        const btn = screen.queryByTestId('explanation-action');
        if (btn) btn.click();
      });
    }
    await act(async () => { vi.advanceTimersByTime(700); });

    await waitFor(() => {
      expect(screen.getByTestId('drill-timer')).toBeInTheDocument();
    });
  });

  it('wrong move triggers shake and explanation without revealing correct move', async () => {
    renderDrill();

    // Skip to natural play
    for (let i = 0; i < 3; i++) {
      await act(async () => { vi.advanceTimersByTime(900); });
      await waitFor(() => {
        const btn = screen.queryByTestId('explanation-action');
        if (btn) btn.click();
      });
    }
    await act(async () => { vi.advanceTimersByTime(700); });

    await waitFor(() => {
      expect(screen.getByText('Play From Memory')).toBeInTheDocument();
    });

    // Make wrong move
    const wrongBtn = screen.queryByTestId('make-wrong-move');
    if (wrongBtn) {
      await act(async () => { wrongBtn.click(); });

      await waitFor(() => {
        expect(screen.getByTestId('explanation-card')).toBeInTheDocument();
        // Should NOT contain the correct move
        expect(screen.getByTestId('explanation-card').textContent).not.toContain('e4');
      });
    }
  });

  it('Ask For Help only appears after 2 failed attempts', async () => {
    renderDrill();

    // Skip to natural play
    for (let i = 0; i < 3; i++) {
      await act(async () => { vi.advanceTimersByTime(900); });
      await waitFor(() => {
        const btn = screen.queryByTestId('explanation-action');
        if (btn) btn.click();
      });
    }
    await act(async () => { vi.advanceTimersByTime(700); });

    await waitFor(() => {
      expect(screen.getByText('Play From Memory')).toBeInTheDocument();
    });

    // First wrong attempt — no Ask For Help
    const wrongBtn = screen.queryByTestId('make-wrong-move');
    if (wrongBtn) {
      await act(async () => { wrongBtn.click(); });
      expect(screen.queryByTestId('ask-help-btn')).not.toBeInTheDocument();

      // Dismiss the explanation
      const dismissBtn = screen.queryByLabelText('Dismiss');
      if (dismissBtn) {
        await act(async () => { dismissBtn.click(); });
      }

      // Re-query after dismiss since board re-renders with new key
      await waitFor(() => {
        expect(screen.getByTestId('make-wrong-move')).toBeInTheDocument();
      });

      // Second wrong attempt — Ask For Help should appear
      const wrongBtn2 = screen.getByTestId('make-wrong-move');
      await act(async () => { wrongBtn2.click(); });

      // Dismiss card first to see the button
      const dismissBtn2 = screen.queryByLabelText('Dismiss');
      if (dismissBtn2) {
        await act(async () => { dismissBtn2.click(); });
      }

      await waitFor(() => {
        expect(screen.getByTestId('ask-help-btn')).toBeInTheDocument();
      });
    }
  });

  it('shows woodpecker reps when reps > 0', async () => {
    renderDrill(drilledOpening);

    // Skip to natural play where woodpecker stats show
    for (let i = 0; i < 2; i++) {
      await act(async () => { vi.advanceTimersByTime(900); });
      await waitFor(() => {
        const btn = screen.queryByTestId('explanation-action');
        if (btn) btn.click();
      });
    }
    await act(async () => { vi.advanceTimersByTime(700); });

    await waitFor(() => {
      expect(screen.getByTestId('woodpecker-reps')).toHaveTextContent('3');
    });
  });

  it('does not show woodpecker stats when reps is 0', async () => {
    renderDrill(whiteOpening);

    // Skip to natural play
    for (let i = 0; i < 3; i++) {
      await act(async () => { vi.advanceTimersByTime(900); });
      await waitFor(() => {
        const btn = screen.queryByTestId('explanation-action');
        if (btn) btn.click();
      });
    }
    await act(async () => { vi.advanceTimersByTime(700); });

    await waitFor(() => {
      expect(screen.queryByTestId('woodpecker-reps')).not.toBeInTheDocument();
    });
  });

  it('displays opening name in header', () => {
    renderDrill();
    expect(screen.getByText('Vienna Game')).toBeInTheDocument();
  });
});
