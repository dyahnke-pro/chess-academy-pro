import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { VoiceChatMic } from './VoiceChatMic';

// Mock coachApi
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

// Mock voiceService
vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn(),
  },
}));

// Mock voiceInputService
const mockOnResult = vi.fn();
const mockStartListening = vi.fn(() => true);
const mockStopListening = vi.fn();
const mockIsListening = vi.fn(() => false);

vi.mock('../../services/voiceInputService', () => ({
  voiceInputService: {
    isSupported: () => true,
    startListening: (): boolean => mockStartListening(),
    stopListening: (): void => { mockStopListening(); },
    isListening: (): boolean => mockIsListening(),
    onResult: (handler: (text: string) => void) => {
      mockOnResult(handler);
    },
  },
}));

// Mock appStore
vi.mock('../../stores/appStore', () => ({
  useAppStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({ coachVoiceOn: false }),
    {
      getState: () => ({ coachVoiceOn: false }),
    },
  ),
}));

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('VoiceChatMic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the mic button', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);
    expect(screen.getByTestId('voice-chat-mic-btn')).toBeInTheDocument();
  });

  it('renders the speak toggle button', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);
    expect(screen.getByTestId('voice-chat-speak-toggle')).toBeInTheDocument();
  });

  it('starts listening when mic button is clicked', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);
    fireEvent.click(screen.getByTestId('voice-chat-mic-btn'));
    expect(mockStartListening).toHaveBeenCalled();
  });

  it('stops listening when mic button is clicked while listening', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);

    // Start listening
    fireEvent.click(screen.getByTestId('voice-chat-mic-btn'));
    expect(mockStartListening).toHaveBeenCalled();

    // Stop listening
    fireEvent.click(screen.getByTestId('voice-chat-mic-btn'));
    expect(mockStopListening).toHaveBeenCalled();
  });

  it('sends transcript to coach and shows response bubble', async () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);

    // Get the registered handler
    const handler = mockOnResult.mock.calls[0][0] as (text: string) => void;

    // Simulate a voice result
    handler('What should I play here?');

    await waitFor(() => {
      expect(screen.getByTestId('voice-chat-bubble')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/solid opening move/)).toBeInTheDocument();
    });
  });

  it('closes the response bubble when close button is clicked', async () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);

    const handler = mockOnResult.mock.calls[0][0] as (text: string) => void;
    handler('What should I play here?');

    await waitFor(() => {
      expect(screen.getByTestId('voice-chat-bubble')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('voice-chat-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('voice-chat-bubble')).not.toBeInTheDocument();
    });
  });

  it('toggles speak enabled state', () => {
    render(<VoiceChatMic fen={DEFAULT_FEN} />);
    const toggleBtn = screen.getByTestId('voice-chat-speak-toggle');

    // Initially muted (coachVoiceOn is false in mock)
    expect(toggleBtn).toHaveAttribute('aria-label', 'Enable coach voice');

    // Toggle on
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-label', 'Mute coach voice');

    // Toggle off
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-label', 'Enable coach voice');
  });
});
