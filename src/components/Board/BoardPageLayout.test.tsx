import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { BoardPageLayout } from './BoardPageLayout';

const mockUseIsMobile = vi.fn().mockReturnValue(false);

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: (...args: unknown[]): boolean => mockUseIsMobile(...args) as boolean,
}));

vi.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="chessboard">Board</div>,
}));

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    init: vi.fn(),
    analyze: vi.fn(),
    stop: vi.fn(),
    onStatusChange: vi.fn(),
    getStatus: vi.fn().mockReturnValue('idle'),
  },
}));

vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: vi.fn(),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn(),
    stop: vi.fn(),
    isSpeaking: vi.fn().mockReturnValue(false),
  },
}));

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const defaultChat = {
  fen: START_FEN,
  pgn: '',
  moveNumber: 0,
  playerColor: 'white' as const,
  turn: 'w' as const,
  isGameOver: false,
  gameResult: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseIsMobile.mockReturnValue(false);
});

describe('BoardPageLayout', () => {
  describe('desktop layout', () => {
    it('renders with header, board, and right panel', () => {
      render(
        <BoardPageLayout
          header={{ title: 'Test Page', onBack: vi.fn() }}
          boardFen={START_FEN}
          chat={defaultChat}
          testId="layout"
        />,
      );

      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByTestId('chessboard')).toBeInTheDocument();
      expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    });

    it('renders header subtitle', () => {
      render(
        <BoardPageLayout
          header={{ title: 'Game', subtitle: '~1500 ELO', onBack: vi.fn() }}
          boardFen={START_FEN}
          chat={defaultChat}
        />,
      );

      expect(screen.getByText('~1500 ELO')).toBeInTheDocument();
    });

    it('renders header right controls', () => {
      render(
        <BoardPageLayout
          header={{
            title: 'Test',
            onBack: vi.fn(),
            rightControls: <button data-testid="ctrl">Ctrl</button>,
          }}
          boardFen={START_FEN}
          chat={defaultChat}
        />,
      );

      expect(screen.getByTestId('ctrl')).toBeInTheDocument();
    });

    it('renders aboveBoard and belowBoard slots', () => {
      render(
        <BoardPageLayout
          boardFen={START_FEN}
          chat={defaultChat}
          aboveBoard={<div data-testid="above">Above</div>}
          belowBoard={<div data-testid="below">Below</div>}
        />,
      );

      expect(screen.getByTestId('above')).toBeInTheDocument();
      expect(screen.getByTestId('below')).toBeInTheDocument();
    });

    it('renders boardOverlay slot', () => {
      render(
        <BoardPageLayout
          boardFen={START_FEN}
          chat={defaultChat}
          boardOverlay={<div data-testid="overlay">Overlay</div>}
        />,
      );

      expect(screen.getByTestId('overlay')).toBeInTheDocument();
    });

    it('shows resizable divider when rightPanelTop is provided', () => {
      render(
        <BoardPageLayout
          boardFen={START_FEN}
          chat={defaultChat}
          rightPanelTop={<div data-testid="top-panel">Top</div>}
        />,
      );

      expect(screen.getByTestId('panel-divider')).toBeInTheDocument();
      expect(screen.getByTestId('right-panel-top')).toBeInTheDocument();
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    });

    it('hides divider when no rightPanelTop — chat fills entire right column', () => {
      render(
        <BoardPageLayout
          boardFen={START_FEN}
          chat={defaultChat}
        />,
      );

      expect(screen.queryByTestId('panel-divider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-panel-top')).not.toBeInTheDocument();
    });

    it('calls header onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(
        <BoardPageLayout
          header={{ title: 'Test', onBack }}
          boardFen={START_FEN}
          chat={defaultChat}
        />,
      );

      screen.getByTestId('header-back-btn').click();
      expect(onBack).toHaveBeenCalledOnce();
    });
  });

  describe('mobile layout', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('hides the right panel on mobile', () => {
      render(
        <BoardPageLayout
          boardFen={START_FEN}
          chat={defaultChat}
          testId="layout"
        />,
      );

      expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument();
    });

    it('shows mobile chat toggle button', () => {
      render(
        <BoardPageLayout
          boardFen={START_FEN}
          chat={defaultChat}
        />,
      );

      expect(screen.getByTestId('mobile-chat-toggle')).toBeInTheDocument();
    });

    it('opens mobile chat drawer when toggle is clicked', async () => {
      render(
        <BoardPageLayout
          boardFen={START_FEN}
          chat={defaultChat}
        />,
      );

      expect(screen.queryByTestId('mobile-chat-drawer')).not.toBeInTheDocument();

      screen.getByTestId('mobile-chat-toggle').click();

      await waitFor(() => {
        expect(screen.getByTestId('mobile-chat-drawer')).toBeInTheDocument();
      });
    });

    it('still renders board and header on mobile', () => {
      render(
        <BoardPageLayout
          header={{ title: 'Mobile Test', onBack: vi.fn() }}
          boardFen={START_FEN}
          chat={defaultChat}
        />,
      );

      expect(screen.getByText('Mobile Test')).toBeInTheDocument();
      expect(screen.getByTestId('chessboard')).toBeInTheDocument();
    });
  });
});
