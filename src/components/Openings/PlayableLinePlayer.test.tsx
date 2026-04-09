import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { PlayableLinePlayer } from './PlayableLinePlayer';
import type { PlayableMiddlegameLine } from '../../types';

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock('react-chessboard', () => ({
  Chessboard: ({ options = {} }: {
    options?: {
      position?: string;
      allowDragging?: boolean;
      onPieceDrop?: (args: { sourceSquare: string; targetSquare: string; piece: { pieceType: string } }) => boolean;
      onSquareClick?: (args: { piece: null; square: string }) => void;
    };
  }) => (
    <div
      data-testid="mock-chessboard"
      data-position={typeof options.position === 'string' ? options.position : ''}
      data-draggable={String(options.allowDragging ?? true)}
    >
      {/* Simulate correct drop: d3→d4 */}
      <button
        data-testid="drop-d3-d4"
        onClick={() =>
          options.onPieceDrop?.({
            sourceSquare: 'd3',
            targetSquare: 'd4',
            piece: { pieceType: 'wP' },
          })
        }
      >
        drop d3→d4
      </button>
      {/* Simulate wrong drop: a2→a3 */}
      <button
        data-testid="drop-wrong"
        onClick={() =>
          options.onPieceDrop?.({
            sourceSquare: 'a2',
            targetSquare: 'a3',
            piece: { pieceType: 'wP' },
          })
        }
      >
        drop wrong
      </button>
    </div>
  ),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    speakFast: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    warmup: vi.fn().mockResolvedValue(undefined),
    prefetchAudio: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
    playErrorPing: vi.fn(),
    playSuccessChime: vi.fn(),
  }),
}));

vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      boardColor: 'classic',
      pieceSet: 'classic',
      soundEnabled: true,
    },
  }),
}));

vi.mock('../../services/boardColorService', () => ({
  getBoardColor: () => ({
    darkSquare: '#779952',
    lightSquare: '#edeed1',
    borderGlow: null,
    whitePieceFilter: undefined,
    blackPieceFilter: undefined,
  }),
}));

vi.mock('../../services/pieceSetService', () => ({
  buildPieceRenderer: () => undefined,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

// Use a real chess position where d4 is legal for White
const TEST_LINE: PlayableMiddlegameLine = {
  fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 0 8',
  moves: ['d4', 'exd4', 'cxd4', 'Bb6'],
  annotations: [
    'White strikes in the center with d4.',
    'Black captures the d4 pawn.',
    'White recaptures, opening the center.',
    'Black retreats the bishop to b6.',
  ],
  arrows: [
    [{ from: 'd3', to: 'd4' }],
    [{ from: 'e5', to: 'd4' }],
    [{ from: 'c3', to: 'd4' }],
    [{ from: 'c5', to: 'b6' }],
  ],
  title: 'Central Expansion: d4 Break',
};

function renderPlayer(
  overrides?: Partial<Parameters<typeof PlayableLinePlayer>[0]>,
): ReturnType<typeof render> {
  return render(
    <MotionConfig transition={{ duration: 0 }}>
      <PlayableLinePlayer
        line={TEST_LINE}
        boardOrientation="white"
        onComplete={vi.fn()}
        onExit={vi.fn()}
        {...overrides}
      />
    </MotionConfig>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('PlayableLinePlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders in demonstration phase by default', () => {
    renderPlayer();
    expect(screen.getByTestId('line-player-demo')).toBeInTheDocument();
    expect(screen.getByText('Central Expansion: d4 Break')).toBeInTheDocument();
    expect(screen.getByText('Watch & Learn')).toBeInTheDocument();
  });

  it('shows play/pause and skip to memory buttons', () => {
    renderPlayer();
    expect(screen.getByTestId('demo-play-pause')).toBeInTheDocument();
    expect(screen.getByTestId('skip-to-memory')).toBeInTheDocument();
  });

  it('displays progress in demo mode', () => {
    renderPlayer();
    expect(screen.getByText(/Move 0 \/ 4/)).toBeInTheDocument();
  });

  it('advances to first annotation after initial delay', async () => {
    vi.useRealTimers();
    renderPlayer();

    // Wait for the initial delay (1000ms) + move advance
    await waitFor(
      () => {
        expect(screen.getByTestId('demo-annotation')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText('White strikes in the center with d4.')).toBeInTheDocument();
  });

  it('switches to memory phase when skip button is clicked', async () => {
    vi.useRealTimers();
    renderPlayer();
    await userEvent.click(screen.getByTestId('skip-to-memory'));
    expect(screen.getByTestId('line-player-memory')).toBeInTheDocument();
    expect(screen.getByText('Your Turn — Replay from Memory')).toBeInTheDocument();
  });

  it('shows memory progress bar starting at 0', async () => {
    vi.useRealTimers();
    renderPlayer();
    await userEvent.click(screen.getByTestId('skip-to-memory'));
    expect(screen.getByText(/Move 0 \/ 4/)).toBeInTheDocument();
  });

  it('shows wrong flash on incorrect move in memory phase', async () => {
    vi.useRealTimers();
    renderPlayer();
    await userEvent.click(screen.getByTestId('skip-to-memory'));

    // Click the wrong drop button
    await userEvent.click(screen.getByTestId('drop-wrong'));
    expect(screen.getByTestId('wrong-flash')).toBeInTheDocument();
  });

  it('calls onExit when back button is clicked in demo phase', async () => {
    vi.useRealTimers();
    const onExit = vi.fn();
    renderPlayer({ onExit });
    await userEvent.click(screen.getByTestId('line-player-back'));
    expect(onExit).toHaveBeenCalled();
  });

  it('has replay demo button in memory phase', async () => {
    vi.useRealTimers();
    renderPlayer();
    await userEvent.click(screen.getByTestId('skip-to-memory'));
    expect(screen.getByTestId('replay-demo')).toBeInTheDocument();
    expect(screen.getByText('Watch Again')).toBeInTheDocument();
  });

  it('switches back to demo when Watch Again is clicked', async () => {
    vi.useRealTimers();
    renderPlayer();
    await userEvent.click(screen.getByTestId('skip-to-memory'));
    expect(screen.getByTestId('line-player-memory')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('replay-demo'));
    expect(screen.getByTestId('line-player-demo')).toBeInTheDocument();
  });

  it('renders board with starting FEN', () => {
    renderPlayer();
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-position')).toBe(TEST_LINE.fen);
  });

  it('disables dragging in demo phase', () => {
    renderPlayer();
    const board = screen.getByTestId('mock-chessboard');
    expect(board.getAttribute('data-draggable')).toBe('false');
  });
});
