import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';

// THE QUESTION BEFORE A MISTAKE PUZZLE (David 2026-10-23: in-game step
// questions go in My Mistakes; Review stays question-free). Before the solve
// begins — and before the intro, which names what the move allowed — the step
// whose habit would have caught the slip asks its question on the same board.

const mockSpeak = vi.fn().mockResolvedValue(undefined);
const slipKit = vi.fn();

vi.mock('../../services/thinkingLessonStart', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../services/thinkingLessonStart')>();
  return {
    ...real,
    slipKitForBoard: (...args: unknown[]) => slipKit(...args) as Promise<unknown>,
    // The engine agrees with the key (the check itself is tested in the door).
    liveBoard: (kit: { step: string }, fen: string) => Promise.resolve({ fen, origin: 'game', checked: { [kit.step]: true } }),
    recordLessonAnswer: () => Promise.resolve(),
  };
});
vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return {
    voiceService: buildVoiceServiceMock({
      speak: vi.fn((...args: unknown[]): Promise<void> => mockSpeak(...args) as Promise<void>),
      speakGrounded: vi.fn((...args: unknown[]): Promise<void> => mockSpeak(...args) as Promise<void>),
    }),
  };
});
vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({ playMoveSound: vi.fn(), playCelebration: vi.fn(), playEncouragement: vi.fn() }),
}));

// White to move; the black knight on c6 is loose and nothing attacks it yet.
const FEN = '4k3/8/2n5/8/8/8/8/4K2R w - - 0 1';
const INTRO = 'You played Kd2, and it left their knight alone.';

function puzzle(): ReturnType<typeof buildMistakePuzzle> {
  return buildMistakePuzzle({
    fen: FEN, playerMove: 'e1d2', playerMoveSan: 'Kd2', bestMove: 'h1h8', bestMoveSan: 'Rh8+', moves: 'h1h8',
    playerColor: 'white', sourceGameId: 'g-slip',
    narration: { intro: INTRO, moveNarrations: [], outro: '', conceptHint: '' },
  });
}

describe('MistakePuzzleBoard — the step question before the solve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
  });

  it('asks the slip\'s step question first, on the puzzle board, and only then speaks the intro', async () => {
    const { kitForStep } = await import('../../services/thinkingLessonStart');
    slipKit.mockResolvedValue(kitForStep('their-targets'));
    render(<MistakePuzzleBoard puzzle={puzzle()} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);

    const question = await screen.findByTestId('mistake-slip-question');
    expect(slipKit).toHaveBeenCalledWith('g-slip', FEN);
    expect(screen.getByTestId('thinking-lesson')).toHaveAttribute('data-fen', FEN);
    // The question's answer is the intro's — the intro waits, and so does the solve prompt.
    expect(mockSpeak).not.toHaveBeenCalledWith(INTRO);
    expect(screen.queryByTestId('prompt-text')).not.toBeInTheDocument();
    expect(question).toBeInTheDocument();

    // Answered (here: "I don't know" until it is shown) → the solve begins.
    for (let i = 0; i < 6 && screen.queryByTestId('thinking-lesson-dont-know'); i++) {
      fireEvent.click(screen.getByTestId('thinking-lesson-dont-know'));
      await new Promise((r) => setTimeout(r, 50));
    }
    await waitFor(() => expect(screen.queryByTestId('mistake-slip-question')).not.toBeInTheDocument(), { timeout: 8000 });
    await waitFor(() => expect(mockSpeak).toHaveBeenCalledWith(INTRO), { timeout: 8000 });
    expect(screen.getByTestId('prompt-text')).toHaveTextContent('Find the best move');
  }, 20000);

  it('with nothing fair to ask, the solve begins as before', async () => {
    slipKit.mockResolvedValue(null);
    render(<MistakePuzzleBoard puzzle={puzzle()} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await waitFor(() => expect(mockSpeak).toHaveBeenCalledWith(INTRO));
    expect(screen.queryByTestId('mistake-slip-question')).not.toBeInTheDocument();
  });
});
