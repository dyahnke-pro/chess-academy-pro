import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { MemoryRouter } from 'react-router-dom';
import { ModelGameViewer } from './ModelGameViewer';
import { buildModelGame } from '../../test/factories';

interface BoardOptions {
  position?: string;
  onSquareClick?: (args: { square: string; piece: null }) => void;
}

// Stub the board but expose onSquareClick via clickable square buttons so the
// click-to-move explore path can be exercised.
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: BoardOptions }) => (
    <div data-testid="chessboard" data-position={options?.position}>
      {options?.onSquareClick &&
        ['e2', 'e4', 'e7', 'e5'].map((sq) => (
          <button
            key={sq}
            type="button"
            data-testid={`sq-${sq}`}
            onClick={() => options.onSquareClick?.({ square: sq, piece: null })}
          />
        ))}
    </div>
  ),
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({ evaluation: 0.2, isMate: false }),
    getBestMove: vi.fn().mockResolvedValue('e7e5'),
  },
}));

// LessonScaffold now mounts the inline coach chat (GameChatPanel), which needs
// a Router + the coach stack. Stub it so these viewer tests stay focused.
vi.mock('../Coach/GameChatPanel', () => ({
  GameChatPanel: () => <div data-testid="game-chat-panel" />,
}));

function renderViewer(
  overrides?: Partial<Parameters<typeof ModelGameViewer>[0]>,
): ReturnType<typeof render> {
  const game = buildModelGame({
    pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
    criticalMoments: [
      {
        moveNumber: 3,
        color: 'white',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        annotation: 'Knight develops to the ideal square.',
        concept: 'Development',
      },
    ],
  });

  return render(
    // MemoryRouter: the viewer's inline coach affordances (VoiceChatMic)
    // call useNavigate, which needs a Router context in the test.
    <MemoryRouter>
      <MotionConfig transition={{ duration: 0 }}>
        <ModelGameViewer
          game={game}
          boardOrientation="white"
          onExit={vi.fn()}
          {...overrides}
        />
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('ModelGameViewer', () => {
  it('renders the game header', () => {
    renderViewer();
    expect(screen.getByText(/Morphy vs Duke of Brunswick/)).toBeInTheDocument();
    expect(screen.getByText(/Paris Opera/)).toBeInTheDocument();
  });

  it('shows overview at starting position', () => {
    renderViewer();
    expect(screen.getByTestId('model-game-overview')).toBeInTheDocument();
  });

  it('navigates forward through moves', async () => {
    renderViewer();
    const nextBtn = screen.getByTestId('model-game-next');
    await userEvent.click(nextBtn);
    // After one click, we're at move index 0 (e4)
    expect(screen.queryByTestId('model-game-overview')).not.toBeInTheDocument();
  });

  it('navigates backward through moves', async () => {
    renderViewer();
    const nextBtn = screen.getByTestId('model-game-next');
    const prevBtn = screen.getByTestId('model-game-prev');

    await userEvent.click(nextBtn);
    await userEvent.click(nextBtn);
    await userEvent.click(prevBtn);
    // Back to index 0 (e4) — overview should NOT be visible
    expect(screen.queryByTestId('model-game-overview')).not.toBeInTheDocument();
  });

  it('shows critical moment annotation', async () => {
    renderViewer();
    const nextBtn = screen.getByTestId('model-game-next');
    // Critical moment is at moveNumber 3, color white = Nf3 which is move index 2
    // (e4=idx0, e5=idx1, Nf3=idx2)
    // But moveNumber in parseGameMoves: e4 = move 1 white, e5 = move 1 black, Nf3 = move 2 white
    // So our critical moment is moveNumber:3 white but the parsed move is moveNumber:2 white
    // Let me fix: navigate to index 4 (Bc4 = move 3 white)
    await userEvent.click(nextBtn); // e4 (move 1 white)
    await userEvent.click(nextBtn); // e5 (move 1 black)
    await userEvent.click(nextBtn); // Nf3 (move 2 white)
    await userEvent.click(nextBtn); // Nc6 (move 2 black)
    await userEvent.click(nextBtn); // Bc4 (move 3 white)
    expect(screen.getByTestId('model-game-critical-moment')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
  });

  it('jumps to first and last positions', async () => {
    renderViewer();
    const lastBtn = screen.getByTestId('model-game-last');
    await userEvent.click(lastBtn);
    expect(screen.getByTestId('model-game-lesson')).toBeInTheDocument();

    const firstBtn = screen.getByTestId('model-game-first');
    await userEvent.click(firstBtn);
    expect(screen.getByTestId('model-game-overview')).toBeInTheDocument();
  });

  it('enters explore mode and accepts a click-to-move (works without dragging)', async () => {
    renderViewer();
    // Enter explore mode via the compass button.
    await userEvent.click(screen.getByTestId('model-game-explore'));
    expect(screen.getByText(/Make a move to see what happens/)).toBeInTheDocument();

    // Click source then target — no drag required.
    await userEvent.click(screen.getByTestId('sq-e2'));
    await userEvent.click(screen.getByTestId('sq-e4'));

    // The student's move registered, and the engine replied (mocked e7e5).
    await waitFor(() => {
      expect(screen.getByText(/Exploring:/)).toHaveTextContent('e4');
    });
  });

  it('calls onExit when back button is clicked', async () => {
    const onExit = vi.fn();
    renderViewer({ onExit });
    await userEvent.click(screen.getByTestId('model-game-back'));
    expect(onExit).toHaveBeenCalled();
  });
});
