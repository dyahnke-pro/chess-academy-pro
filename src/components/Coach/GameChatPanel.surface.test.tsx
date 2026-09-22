/**
 * THE DRAWER'S ASK CARRIES THE SURFACE OF THE ROUTE IT SITS ON (WO-STANDARD-01 H2).
 *
 * A real native user asked for a lesson from home, was navigated to Learn, and
 * asked again through the same drawer — which still said `surface: 'home-chat'`
 * (a constant), so the walkthrough tool refused a lesson on `/coach/teach`.
 * Ten `coach_tool_call_error`s, no lesson.
 *
 * Proof is the OUTPUT: the input handed to `dispatchCoachTurn`. The negative
 * control is the same panel at `/`, which must still say home-chat — a test
 * that only checked Learn could pass on a constant of 'teach'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { GameChatPanel } from './GameChatPanel';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

const mockDispatch = vi.fn();

vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn() },
}));
vi.mock('../../services/voiceInputService', () => ({
  voiceInputService: {
    isSupported: vi.fn().mockReturnValue(false),
    startListening: vi.fn().mockReturnValue(false),
    stopListening: vi.fn(),
    onResult: vi.fn(),
  },
}));
vi.mock('../../coach/dispatchCoachTurn', () => ({
  dispatchCoachTurn: (...args: unknown[]): Promise<unknown> => mockDispatch(...args) as Promise<unknown>,
}));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function mountDrawerAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <MotionConfig transition={{ duration: 0 }}>
        <GameChatPanel
          fen={START}
          pgn=""
          moveNumber={1}
          playerColor="white"
          turn="w"
          isGameOver={true}
          gameResult=""
          hideHeader
        />
      </MotionConfig>
    </MemoryRouter>,
  );
}

async function ask(text: string): Promise<{ surface: string; liveSurface: string }> {
  const input = screen.getByTestId('chat-text-input');
  act(() => { fireEvent.change(input, { target: { value: text } }); });
  act(() => { fireEvent.click(screen.getByTestId('chat-send-btn')); });
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(1));
  const [inputArg] = mockDispatch.mock.calls[0] as [{ surface: string; liveState: { surface: string } }];
  return { surface: inputArg.surface, liveSurface: inputArg.liveState.surface };
}

describe('the global drawer derives its surface from the route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockResolvedValue({ text: 'Sure.', toolCallIds: [], dispatchedToolNames: [], provider: 'deepseek' });
    const profile = buildUserProfile({ id: 'main', name: 'Player', aiDataConsent: 'granted' });
    useAppStore.setState({ activeProfile: profile });
  });

  it('on /coach/teach the ask is filed as the TEACH surface — the walkthrough host', async () => {
    mountDrawerAt('/coach/teach');
    const got = await ask('Can you teach me the Italian Game?');
    expect(got.surface).toBe('teach');
    expect(got.liveSurface).toBe('teach');
  });

  it('on /coach/review/:id it is the REVIEW surface', async () => {
    mountDrawerAt('/coach/review/game-42');
    const got = await ask('Where did this game turn?');
    expect(got.surface).toBe('review');
  });

  it('NEGATIVE CONTROL — at home it is still home chat, so the tag is derived, not a new constant', async () => {
    mountDrawerAt('/');
    const got = await ask('Can you teach me the Italian Game?');
    expect(got.surface).toBe('home-chat');
    expect(got.liveSurface).toBe('home-chat');
  });
});
