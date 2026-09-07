import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { MasterclassCoachChat } from './MasterclassCoachChat';
import { useCoachBoardStore } from '../../stores/coachBoardStore';
import { useAppStore } from '../../stores/appStore';

// Build #2 (David 2026-09-07: "anywhere a user can ask about a board position
// this needs to be accessible to the coach. Even the opening tab in WLPP!").
// The WLPP rung publishes its live FEN to the coach-board store; this proves the
// opening chat READS it and threads it into the grounded ask — so a question is
// answered about the position on screen, not the opening in the abstract.

const dispatchSpy = vi.fn(async () => ({ text: 'ok', toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek', actionOffer: [] }));
vi.mock('../../coach/dispatchCoachTurn', () => ({ dispatchCoachTurn: (...a: unknown[]) => dispatchSpy(...(a as [])) }));
// A real masterclass scope so the chat renders (buildCourseScope → non-null).
vi.mock('../../data/lessons', () => ({
  buildCourseScope: () => ({ label: 'Caro-Kann', greeting: 'Welcome', systemAddition: 'scope' }),
}));
// Light chat primitives so we can drive onSend directly.
vi.mock('../Coach/ChatInput', () => ({ ChatInput: ({ onSend }: { onSend: (t: string) => void }) => (
  <button data-testid="send" onClick={() => onSend('is this sac sound?')}>send</button>
) }));
vi.mock('../Coach/ChatMessage', () => ({ ChatMessage: () => <div /> }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('MasterclassCoachChat — answers about the ON-SCREEN board', () => {
  beforeEach(() => {
    dispatchSpy.mockClear();
    useCoachBoardStore.getState().clear();
    useAppStore.getState().setGlobalBoardContext(null);
  });

  it('threads the WLPP-published FEN + student colour into the grounded ask', async () => {
    // A WLPP rung publishes the position the student is looking at.
    const FEN = 'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
    useCoachBoardStore.getState().setFen(FEN, 'wlpp-watch');
    useCoachBoardStore.getState().setContext({ studentColor: 'white', source: 'opening' });

    render(<MasterclassCoachChat openingId="caro-kann" />);
    fireEvent.click(screen.getByTestId('masterclass-coach-open'));
    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
    const [input] = dispatchSpy.mock.calls[0] as [{ liveState: { fen?: string; studentColor?: string; whoseTurn?: string } }];
    expect(input.liveState.fen).toBe(FEN);
    expect(input.liveState.studentColor).toBe('white');
    expect(input.liveState.whoseTurn).toBe('white');
  });

  it('falls back to the app-wide globalBoardContext (legacy players / other surfaces)', async () => {
    const FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
    useAppStore.getState().setGlobalBoardContext({
      fen: FEN, pgn: '1. e4 c5', moveNumber: 2, playerColor: 'black', turn: 'white',
      lastMove: null, history: ['e4', 'c5'], timestamp: Date.now(),
    });
    render(<MasterclassCoachChat openingId="caro-kann" />);
    fireEvent.click(screen.getByTestId('masterclass-coach-open'));
    fireEvent.click(screen.getByTestId('send'));
    await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
    const [input] = dispatchSpy.mock.calls[0] as [{ liveState: { fen?: string; studentColor?: string } }];
    expect(input.liveState.fen).toBe(FEN);
    expect(input.liveState.studentColor).toBe('black');
  });

  it('with no board published, asks WITHOUT a fen (opening-scoped answer, unchanged)', async () => {
    render(<MasterclassCoachChat openingId="caro-kann" />);
    fireEvent.click(screen.getByTestId('masterclass-coach-open'));
    fireEvent.click(screen.getByTestId('send'));

    await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
    const [input] = dispatchSpy.mock.calls[0] as [{ liveState: { fen?: string } }];
    expect(input.liveState.fen).toBeUndefined();
  });
});
