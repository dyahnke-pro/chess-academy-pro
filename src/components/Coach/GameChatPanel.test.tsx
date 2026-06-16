 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { createRef } from 'react';
import { GameChatPanel } from './GameChatPanel';
import type { GameChatPanelHandle } from './GameChatPanel';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import type { BoardAnnotationCommand } from '../../types';

const mockGetCoachChatResponse = vi.fn();

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/voiceInputService', () => ({
  voiceInputService: {
    isSupported: vi.fn().mockReturnValue(false),
    startListening: vi.fn().mockReturnValue(false),
    stopListening: vi.fn(),
    onResult: vi.fn(),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: (...args: unknown[]): Promise<string> => mockGetCoachChatResponse(...args) as Promise<string>,
}));

const defaultProps = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  pgn: '1.e4',
  moveNumber: 1,
  playerColor: 'white' as const,
  turn: 'b' as const,
  isGameOver: false,
  gameResult: 'ongoing',
};

describe('GameChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCoachChatResponse.mockResolvedValue('I see a strong position for white.');
    const profile = buildUserProfile({ id: 'main', name: 'Player' });
    useAppStore.setState({ activeProfile: profile });
  });

  it('renders the chat panel container', () => {
    render(<GameChatPanel {...defaultProps} />);
    expect(screen.getByTestId('game-chat-panel')).toBeInTheDocument();
  });

  it('shows Game Chat header', () => {
    render(<GameChatPanel {...defaultProps} />);
    expect(screen.getByText('Game Chat')).toBeInTheDocument();
  });

  it('hides header when hideHeader is true', () => {
    render(<GameChatPanel {...defaultProps} hideHeader />);
    expect(screen.queryByText('Game Chat')).not.toBeInTheDocument();
  });

  it('shows Online status when not streaming', () => {
    render(<GameChatPanel {...defaultProps} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows empty state message when no messages', () => {
    render(<GameChatPanel {...defaultProps} />);
    expect(screen.getByText('Chat with your coach')).toBeInTheDocument();
    expect(screen.getByText(/Ask about the position/)).toBeInTheDocument();
  });

  it('renders chat input with placeholder', () => {
    render(<GameChatPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Ask your coach/)).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<GameChatPanel {...defaultProps} />);
    expect(screen.getByTestId('chat-send-btn')).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    render(<GameChatPanel {...defaultProps} />);
    expect(screen.getByTestId('chat-send-btn')).toBeDisabled();
  });

  it('send button enables when text is entered', () => {
    render(<GameChatPanel {...defaultProps} />);
    const input = screen.getByTestId('chat-text-input');
    fireEvent.change(input, { target: { value: 'What should I play?' } });
    expect(screen.getByTestId('chat-send-btn')).not.toBeDisabled();
  });

  it('applies custom className', () => {
    render(<GameChatPanel {...defaultProps} className="test-class" />);
    const panel = screen.getByTestId('game-chat-panel');
    expect(panel.className).toContain('test-class');
  });

  // ─── Board Annotation Tests ─────────────────────────────────────────────────

  // Arrows are CODE-DERIVED from the SAN the coach NAMES (the G0 arrow
  // inversion): the LLM no longer emits [BOARD: arrow] markers — the spine
  // strips any it writes and re-derives geometry from the named move. So a
  // response naming "e5" (legal for Black here) produces an e7-e5 arrow.
  it('derives an arrow from a SAN named in the response', async () => {
    const onBoardAnnotation = vi.fn();
    mockGetCoachChatResponse.mockResolvedValue(
      'Good question — e5 strikes back in the center.',
    );

    render(<GameChatPanel {...defaultProps} onBoardAnnotation={onBoardAnnotation} />);

    const input = screen.getByTestId('chat-text-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'What should I play?' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('chat-send-btn'));
    });

    await waitFor(() => {
      // First call: clear on send. Second call: arrow annotations from response.
      expect(onBoardAnnotation).toHaveBeenCalledTimes(2);
    });

    // First call is a clear
    const clearCall = onBoardAnnotation.mock.calls[0][0] as BoardAnnotationCommand[];
    expect(clearCall).toHaveLength(1);
    expect(clearCall[0].type).toBe('clear');

    // Second call has the code-derived arrow for the named move e5 (e7-e5).
    const annotationCall = onBoardAnnotation.mock.calls[1][0] as BoardAnnotationCommand[];
    expect(annotationCall).toHaveLength(1);
    expect(annotationCall[0].type).toBe('arrow');
    expect(annotationCall[0].arrows).toHaveLength(1);
    expect(annotationCall[0].arrows![0].startSquare).toBe('e7');
    expect(annotationCall[0].arrows![0].endSquare).toBe('e5');
  });

  // Under the G0 inversion the LLM no longer draws the board: a literal
  // [BOARD: highlight] marker it writes is STRIPPED from the display and is
  // NOT rendered as an annotation (only code-derived arrows from named moves
  // surface here). The marker must not leak as text, and no highlight
  // annotation should fire.
  it('strips an LLM highlight marker and does not render it', async () => {
    const onBoardAnnotation = vi.fn();
    mockGetCoachChatResponse.mockResolvedValue(
      'These central squares are key [BOARD: highlight:e4:yellow,d5:yellow].',
    );

    render(<GameChatPanel {...defaultProps} onBoardAnnotation={onBoardAnnotation} />);

    const input = screen.getByTestId('chat-text-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'What squares matter?' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('chat-send-btn'));
    });

    await waitFor(() => {
      expect(screen.queryByText(/central squares are key/)).toBeInTheDocument();
    });
    // The marker is stripped from the visible text.
    expect(screen.queryByText(/\[BOARD:/)).not.toBeInTheDocument();
    // No highlight annotation is produced (no clear→highlight pair) — at most
    // the initial clear fires.
    const highlightCalls = onBoardAnnotation.mock.calls.filter(
      (c) => (c[0] as BoardAnnotationCommand[]).some((cmd) => cmd.type === 'highlight'),
    );
    expect(highlightCalls).toHaveLength(0);
  });

  it('only sends clear when response has no board tags', async () => {
    const onBoardAnnotation = vi.fn();
    mockGetCoachChatResponse.mockResolvedValue('This is a normal response with no annotations.');

    render(<GameChatPanel {...defaultProps} onBoardAnnotation={onBoardAnnotation} />);

    const input = screen.getByTestId('chat-text-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'Hello' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('chat-send-btn'));
    });

    await waitFor(() => {
      expect(screen.queryByText('This is a normal response with no annotations.')).toBeInTheDocument();
    });

    // Only the initial clear call, no annotation call
    expect(onBoardAnnotation).toHaveBeenCalledTimes(1);
    const clearCall = onBoardAnnotation.mock.calls[0][0] as BoardAnnotationCommand[];
    expect(clearCall[0].type).toBe('clear');
  });

  it('strips board tags from displayed message text', async () => {
    mockGetCoachChatResponse.mockResolvedValue(
      'Move here [BOARD: arrow:e2-e4:green] for advantage.',
    );

    render(<GameChatPanel {...defaultProps} />);

    const input = screen.getByTestId('chat-text-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'Advice?' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('chat-send-btn'));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Move here/)).toBeInTheDocument();
    });

    // The [BOARD:] tag should be stripped from the displayed text
    expect(screen.queryByText(/\[BOARD:/)).not.toBeInTheDocument();
  });

  it('stores the code-derived arrow annotation in message metadata', async () => {
    const onBoardAnnotation = vi.fn();
    // Names Nf6 (legal for Black here) → code derives a g8-f6 arrow. The LLM's
    // own [BOARD:] markers are stripped; only the derived arrow is rendered.
    mockGetCoachChatResponse.mockResolvedValue(
      'Check this line — Nf6 develops and hits the e4 pawn.',
    );

    render(<GameChatPanel {...defaultProps} onBoardAnnotation={onBoardAnnotation} />);

    const input = screen.getByTestId('chat-text-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'Show me' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('chat-send-btn'));
    });

    await waitFor(() => {
      // 1 clear + 1 code-derived arrow call
      expect(onBoardAnnotation).toHaveBeenCalledTimes(2);
    });

    const cmds = onBoardAnnotation.mock.calls[1][0] as BoardAnnotationCommand[];
    expect(cmds).toHaveLength(1);
    expect(cmds[0].type).toBe('arrow');
    expect(cmds[0].arrows![0].startSquare).toBe('g8');
    expect(cmds[0].arrows![0].endSquare).toBe('f6');
  });

  it('exposes injectAssistantMessage via ref', async () => {
    const ref = createRef<GameChatPanelHandle>();
    render(<GameChatPanel {...defaultProps} ref={ref} />);

    expect(ref.current).not.toBeNull();

    act(() => {
      ref.current!.injectAssistantMessage('Here is a hint.');
    });

    await waitFor(() => {
      expect(screen.getByText('Here is a hint.')).toBeInTheDocument();
    });
  });
});
