import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoachChatPage } from './CoachChatPage';
import { useAppStore } from '../../stores/appStore';
import type { UserProfile, ChatMessage as ChatMessageType } from '../../types';

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue('Hello! How can I help?'),
}));

const mockProfile: UserProfile = {
  id: 'main',
  name: 'Player',
  isKidMode: false,
  coachPersonality: 'danya',
  currentRating: 1420,
  puzzleRating: 1400,
  xp: 500,
  level: 3,
  currentStreak: 0,
  longestStreak: 0,
  streakFreezes: 1,
  lastActiveDate: '2026-03-05',
  achievements: [],
  unlockedCoaches: ['danya'],
  skillRadar: { opening: 50, tactics: 50, endgame: 50, memory: 50, calculation: 50 },
  badHabits: [],
  preferences: {
    theme: 'dark-modern',
    boardColor: 'classic',
    pieceSet: 'staunton',
    showEvalBar: true,
    showEngineLines: false,
    soundEnabled: true,
    voiceEnabled: true,
    dailySessionMinutes: 45,
    apiKeyEncrypted: null,
    apiKeyIv: null,
    preferredModel: { commentary: 'c', analysis: 'c', reports: 'c' },
    monthlyBudgetCap: null,
    estimatedSpend: 0,
    elevenlabsKeyEncrypted: null,
    elevenlabsKeyIv: null,
    voiceIdDanya: '',
    voiceIdKasparov: '',
    voiceIdFischer: '',
    voiceSpeed: 1.0,
  },
};

// Mock scrollIntoView for JSDOM
Element.prototype.scrollIntoView = vi.fn();

describe('CoachChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      activeProfile: mockProfile,
      chatMessages: [],
      coachExpression: 'neutral',
      coachSpeaking: false,
    });
  });

  it('renders the chat page', () => {
    render(<CoachChatPage />);
    expect(screen.getByTestId('coach-chat-page')).toBeInTheDocument();
  });

  it('shows coach name in header', () => {
    render(<CoachChatPage />);
    expect(screen.getByText(/Chat with Danya/)).toBeInTheDocument();
  });

  it('shows empty state prompt', () => {
    render(<CoachChatPage />);
    expect(screen.getByText(/Ask me anything about chess/)).toBeInTheDocument();
  });

  it('renders chat input', () => {
    render(<CoachChatPage />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('renders text input', () => {
    render(<CoachChatPage />);
    expect(screen.getByTestId('chat-text-input')).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<CoachChatPage />);
    expect(screen.getByTestId('chat-send-btn')).toBeInTheDocument();
  });

  it('shows existing messages', () => {
    useAppStore.setState({
      chatMessages: [
        { id: '1', role: 'user', content: 'Hello coach!', timestamp: 1000 },
        { id: '2', role: 'assistant', content: 'Hello! Ready to train?', timestamp: 1001 },
      ],
    });

    render(<CoachChatPage />);
    expect(screen.getByText('Hello coach!')).toBeInTheDocument();
    expect(screen.getByText('Hello! Ready to train?')).toBeInTheDocument();
  });

  it('renders user messages with user role test id', () => {
    useAppStore.setState({
      chatMessages: [
        { id: '1', role: 'user', content: 'What opening should I play?', timestamp: 1000 },
      ],
    });

    render(<CoachChatPage />);
    expect(screen.getByTestId('chat-message-user')).toBeInTheDocument();
  });

  it('renders assistant messages with assistant role test id', () => {
    useAppStore.setState({
      chatMessages: [
        { id: '2', role: 'assistant', content: 'Try the Italian Game!', timestamp: 1001 },
      ],
    });

    render(<CoachChatPage />);
    expect(screen.getByTestId('chat-message-assistant')).toBeInTheDocument();
  });

  it('hides empty state when messages exist', () => {
    useAppStore.setState({
      chatMessages: [
        { id: '1', role: 'user', content: 'Hello!', timestamp: 1000 },
      ],
    });

    render(<CoachChatPage />);
    expect(screen.queryByText(/Ask me anything about chess/)).not.toBeInTheDocument();
  });

  it('displays Online status when not streaming', () => {
    render(<CoachChatPage />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows correct coach name for kasparov personality', () => {
    useAppStore.setState({
      activeProfile: { ...mockProfile, coachPersonality: 'kasparov' },
    });

    render(<CoachChatPage />);
    expect(screen.getByText(/Chat with Kasparov/)).toBeInTheDocument();
  });

  it('shows correct coach name for fischer personality', () => {
    useAppStore.setState({
      activeProfile: { ...mockProfile, coachPersonality: 'fischer' },
    });

    render(<CoachChatPage />);
    expect(screen.getByText(/Chat with Fischer/)).toBeInTheDocument();
  });

  it('send button is initially disabled when input is empty', () => {
    render(<CoachChatPage />);
    const sendBtn = screen.getByTestId('chat-send-btn');
    expect(sendBtn).toBeDisabled();
  });

  it('renders coach avatar in the header', () => {
    render(<CoachChatPage />);
    // The header has a coach avatar
    const avatars = screen.getAllByTestId('coach-avatar');
    expect(avatars.length).toBeGreaterThanOrEqual(1);
  });

  it('renders action tag buttons when assistant message has actions', () => {
    const msgWithActions: ChatMessageType = {
      id: '3',
      role: 'assistant',
      content: 'You should practice the Sicilian!',
      timestamp: 1002,
      metadata: {
        actions: [
          { type: 'drill_opening', id: 'sicilian' },
          { type: 'puzzle_theme', id: 'fork' },
        ],
      },
    };
    useAppStore.setState({
      chatMessages: [msgWithActions],
    });

    render(<CoachChatPage />);
    expect(screen.getByTestId('action-drill_opening')).toBeInTheDocument();
    expect(screen.getByTestId('action-puzzle_theme')).toBeInTheDocument();
  });

  it('action buttons have correct labels', () => {
    const msgWithActions: ChatMessageType = {
      id: '3',
      role: 'assistant',
      content: 'Review this game.',
      timestamp: 1002,
      metadata: {
        actions: [
          { type: 'review_game', id: 'game1' },
        ],
      },
    };
    useAppStore.setState({
      chatMessages: [msgWithActions],
    });

    render(<CoachChatPage />);
    expect(screen.getByTestId('action-review_game')).toHaveTextContent('Review Game');
  });
});
