import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { ExplainPositionSessionView } from './ExplainPositionSessionView';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), speakIfFree: vi.fn().mockResolvedValue(undefined), stop: vi.fn() },
}));
vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'e2e4', evaluation: 30, isMate: false, mateIn: null, depth: 18,
      topLines: [{ rank: 1, evaluation: 30, moves: ['e2e4'], mate: null }], nodesPerSecond: 1000000,
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../coach/coachService', () => ({
  coachService: { ask: vi.fn().mockResolvedValue({ text: 'The centre is open.' }) },
}));
const mockDispatch = vi.fn();
vi.mock('../../coach/dispatchCoachTurn', () => ({
  dispatchCoachTurn: (...a: unknown[]): unknown => mockDispatch(...a) as unknown,
}));

describe('ExplainPositionSessionView follow-up', () => {
  // All-screens walk 2026-10-09: a door answer does not stream, and the view
  // showed only streamed text; the door was also handed an app wrapper
  // instead of the student's words.
  it('shows a door answer that did not stream, under the explanation, from the student\'s words', async () => {
    useAppStore.setState({ activeProfile: buildUserProfile({ id: 'main', name: 'Player', aiDataConsent: 'granted' }) });
    mockDispatch.mockResolvedValue({ text: 'The best move is e4.' });
    render(<ExplainPositionSessionView orientation="white" onExit={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('explain-position-text')).toHaveTextContent('The centre is open.'));
    await waitFor(() => expect(screen.getByTestId('chat-text-input')).not.toBeDisabled());
    act(() => { fireEvent.change(screen.getByTestId('chat-text-input'), { target: { value: "what's the best move here?" } }); });
    act(() => { fireEvent.click(screen.getByTestId('chat-send-btn')); });
    await waitFor(() => expect(screen.getByTestId('explain-position-text')).toHaveTextContent(/The centre is open\.\s+The best move is e4\./));
    expect((mockDispatch.mock.calls[0][0] as { ask: string }).ask).toBe("what's the best move here?");
  });
});
