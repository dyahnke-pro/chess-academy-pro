import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { VoiceChatMic } from './VoiceChatMic';

vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: vi.fn((
    _messages: unknown,
    _systemAddition: unknown,
    onStream?: (chunk: string) => void,
  ) => {
    const response = 'That is a solid opening move.';
    if (onStream) {
      for (const word of response.split(' ')) {
        onStream(word + ' ');
      }
    }
    return Promise.resolve(response);
  }),
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(() => Promise.resolve({
      bestMove: 'e2e4',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 14,
      topLines: [
        { rank: 1, evaluation: 30, moves: ['e2e4', 'e7e5'], mate: null },
      ],
      nodesPerSecond: 1000000,
    })),
    initialize: vi.fn(),
    stop: vi.fn(),
  },
}));

const mockSpeak = vi.fn();
vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: (text: string): void => { mockSpeak(text); },
    speakForced: (text: string): Promise<void> => { mockSpeak(text); return Promise.resolve(); },
    speakQueuedForced: (text: string): void => { mockSpeak(text); },
    stop: (): void => { /* noop */ },
  },
}));

const mockOnResult = vi.fn();
const mockStartListening = vi.fn(() => true);
const mockStopListening = vi.fn();

vi.mock('../../services/voiceInputService', () => ({
  voiceInputService: {
    isSupported: () => true,
    startListening: (): boolean => mockStartListening(),
    stopListening: (): void => { mockStopListening(); },
    isListening: (): boolean => false,
    prewarmMic: async (): Promise<void> => { /* no-op in tests */ },
    onResult: (handler: (text: string) => void) => {
      mockOnResult(handler);
    },
  },
}));

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('VoiceChatMic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the mic button with Ask label', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);
    const btn = screen.getByTestId('voice-chat-mic-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Ask');
  });

  it('starts listening when mic button is clicked', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);
    fireEvent.click(screen.getByTestId('voice-chat-mic-btn'));
    expect(mockStartListening).toHaveBeenCalled();
  });

  it('stops listening when mic button is clicked while listening', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);
    fireEvent.click(screen.getByTestId('voice-chat-mic-btn'));
    fireEvent.click(screen.getByTestId('voice-chat-mic-btn'));
    expect(mockStopListening).toHaveBeenCalled();
  });

  it('speaks the LLM response aloud with no text bubble', async () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);

    const handler = mockOnResult.mock.calls[0][0] as (text: string) => void;
    handler('What should I play here?');

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
    });

    // No text bubble should exist
    expect(screen.queryByTestId('voice-chat-bubble')).not.toBeInTheDocument();
  });

  it('calls onOpeningRequest when user asks to play an opening', async () => {
    const onOpeningRequest = vi.fn();
    render(<VoiceChatMic fen={DEFAULT_FEN} onOpeningRequest={onOpeningRequest} />);

    const handler = mockOnResult.mock.calls[0][0] as (text: string) => void;
    handler('Can you play the French defense against me?');

    await waitFor(() => {
      expect(onOpeningRequest).toHaveBeenCalledWith('French Defense');
    });
  });

  it('does not call onOpeningRequest for non-opening messages', async () => {
    const onOpeningRequest = vi.fn();
    render(<VoiceChatMic fen={DEFAULT_FEN} onOpeningRequest={onOpeningRequest} />);

    const handler = mockOnResult.mock.calls[0][0] as (text: string) => void;
    handler('What is the best move here?');

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
    });

    expect(onOpeningRequest).not.toHaveBeenCalled();
  });
});
