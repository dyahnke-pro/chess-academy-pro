import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test/utils';
import { DrillMode } from './DrillMode';
import { buildOpeningRecord } from '../../test/factories';
import type { OpeningRecord } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen, orientation, interactive }: {
    initialFen?: string;
    orientation?: string;
    interactive?: boolean;
  }) => (
    <div
      data-testid="chess-board"
      data-fen={initialFen}
      data-orientation={orientation}
      data-interactive={String(interactive)}
    >
      Board
    </div>
  ),
}));

vi.mock('../../services/openingService', () => ({
  updateDrillProgress: vi.fn().mockResolvedValue(undefined),
  updateWoodpecker: vi.fn().mockResolvedValue(undefined),
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
  woodpeckerReps: 0,
  woodpeckerSpeed: null,
});

const blackOpening: OpeningRecord = buildOpeningRecord({
  id: 'drill-test-black',
  name: 'Sicilian Defense',
  pgn: 'e4 c5',
  color: 'black',
  woodpeckerReps: 3,
  woodpeckerSpeed: 12,
});

function renderDrill(
  opening: OpeningRecord = whiteOpening,
  overrides: { onComplete?: () => void; onExit?: () => void } = {},
): { onComplete: ReturnType<typeof vi.fn>; onExit: ReturnType<typeof vi.fn> } {
  const onComplete = overrides.onComplete
    ? (vi.fn(overrides.onComplete) as ReturnType<typeof vi.fn>)
    : vi.fn();
  const onExit = overrides.onExit
    ? (vi.fn(overrides.onExit) as ReturnType<typeof vi.fn>)
    : vi.fn();

  render(
    <DrillMode opening={opening} onComplete={onComplete} onExit={onExit} />,
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
    renderDrill(blackOpening);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'black');
  });

  it('shows "Play the correct move" prompt initially', () => {
    renderDrill();
    expect(screen.getByTestId('drill-message')).toHaveTextContent('Play the correct move');
  });

  it('exit button renders', () => {
    renderDrill();
    expect(screen.getByTestId('drill-exit')).toBeInTheDocument();
  });

  it('exit button calls onExit when clicked', () => {
    const { onExit } = renderDrill();
    screen.getByTestId('drill-exit').click();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('exit button shows "Back to Explorer" text initially', () => {
    renderDrill();
    expect(screen.getByTestId('drill-exit')).toHaveTextContent('Back to Explorer');
  });

  it('timer element renders', () => {
    renderDrill();
    expect(screen.getByTestId('drill-timer')).toBeInTheDocument();
  });

  it('timer starts at 0:00', () => {
    renderDrill();
    expect(screen.getByTestId('drill-timer')).toHaveTextContent('0:00');
  });

  it('progress bar renders', () => {
    renderDrill();
    expect(screen.getByTestId('drill-progress')).toBeInTheDocument();
  });

  it('progress bar starts at 0%', () => {
    renderDrill();
    const bar = screen.getByTestId('drill-progress');
    expect(bar.style.width).toBe('0%');
  });

  it('shows woodpecker stats when reps > 0', () => {
    renderDrill(blackOpening);
    expect(screen.getByTestId('woodpecker-reps')).toHaveTextContent('3 reps');
  });

  it('does not show woodpecker stats when reps is 0', () => {
    renderDrill(whiteOpening);
    expect(screen.queryByTestId('woodpecker-reps')).not.toBeInTheDocument();
  });

  it('does not show retry button when in playing state', () => {
    renderDrill();
    expect(screen.queryByTestId('drill-retry')).not.toBeInTheDocument();
  });
});
