import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { RowClearerPage } from './RowClearerPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../services/voiceService', () => ({
  voiceService: {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/themeService', () => ({
  applyTheme: vi.fn(),
  getThemeById: vi.fn().mockReturnValue({ id: 'kid-mode', name: 'Kid Mode', colors: {} }),
}));

vi.mock('../../services/rookGameService', async () => {
  const actual = await vi.importActual<typeof import('../../services/rookGameService')>(
    '../../services/rookGameService',
  );
  return {
    ...actual,
    completeClearerLevel: vi.fn().mockResolvedValue({ rookMaze: {}, rowClearer: {} }),
  };
});

vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { onSquareClick?: (args: { square: string }) => void } }) => (
    <div data-testid="mock-chessboard">
      <button data-testid="sq-a1" onClick={() => options.onSquareClick?.({ square: 'a1' })}>a1</button>
      <button data-testid="sq-c1" onClick={() => options.onSquareClick?.({ square: 'c1' })}>c1</button>
      <button data-testid="sq-c6" onClick={() => options.onSquareClick?.({ square: 'c6' })}>c6</button>
      <button data-testid="sq-f6" onClick={() => options.onSquareClick?.({ square: 'f6' })}>f6</button>
      <button data-testid="sq-f1" onClick={() => options.onSquareClick?.({ square: 'f1' })}>f1</button>
      <button data-testid="sq-h8" onClick={() => options.onSquareClick?.({ square: 'h8' })}>h8</button>
      <button data-testid="sq-b2" onClick={() => options.onSquareClick?.({ square: 'b2' })}>b2</button>
    </div>
  ),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRoute(level: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/kid/row-clearer/${level}`]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/kid/row-clearer/:level" element={<RowClearerPage />} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RowClearerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(
      buildUserProfile({ isKidMode: true, name: 'TestKid' }),
    );
  });

  it('renders the row clearer page for level 1', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('row-clearer-page')).toBeInTheDocument();
    expect(screen.getByText('Row Clearer: First Sweep')).toBeInTheDocument();
  }, 15_000);

  it('shows counters', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('clearer-counters')).toBeInTheDocument();
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
    expect(screen.getByText('Captured: 0/4')).toBeInTheDocument();
    expect(screen.getByText('Par: 4')).toBeInTheDocument();
  });

  it('renders the chessboard', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
  });

  it('captures enemy pawn and updates counter', () => {
    renderWithRoute('1');
    // Level 1: rook a1, enemies c1, f1, c6, f6
    // Rook auto-selected since single rook
    // c1 is a legal capture (same rank, enemy there)
    fireEvent.click(screen.getByTestId('sq-c1'));
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
    expect(screen.getByText('Captured: 1/4')).toBeInTheDocument();
  });

  it('completes level when all enemies captured', async () => {
    renderWithRoute('1');
    // Level 1: rook a1, enemies c1, f1, c6, f6
    // Optimal: a1→c1(capture), c1→c6(capture), c6→f6(capture), f6→f1(capture)
    fireEvent.click(screen.getByTestId('sq-c1')); // capture c1
    fireEvent.click(screen.getByTestId('sq-c6')); // capture c6
    fireEvent.click(screen.getByTestId('sq-f6')); // capture f6
    fireEvent.click(screen.getByTestId('sq-f1')); // capture f1

    await waitFor(() => {
      expect(screen.getByTestId('clearer-win-screen')).toBeInTheDocument();
    });

    expect(screen.getByText('All Clear!')).toBeInTheDocument();
    expect(screen.getByText('4 moves (par: 4)')).toBeInTheDocument();
  });

  it('undo reverts last move and restores captured piece', () => {
    renderWithRoute('1');
    fireEvent.click(screen.getByTestId('sq-c1'));
    expect(screen.getByText('Captured: 1/4')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('clearer-undo-btn'));
    expect(screen.getByText('Captured: 0/4')).toBeInTheDocument();
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('reset restarts the level', () => {
    renderWithRoute('1');
    fireEvent.click(screen.getByTestId('sq-c1'));
    fireEvent.click(screen.getByTestId('clearer-reset-btn'));
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
    expect(screen.getByText('Captured: 0/4')).toBeInTheDocument();
  });

  it('back button navigates to rook games', () => {
    renderWithRoute('1');
    fireEvent.click(screen.getByTestId('clearer-back-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/kid/rook-games');
  });

  it('voice toggle button is rendered', () => {
    renderWithRoute('1');
    expect(screen.getByTestId('clearer-voice-toggle')).toBeInTheDocument();
  });

  it('renders level 2', () => {
    renderWithRoute('2');
    expect(screen.getByText('Row Clearer: Double Row')).toBeInTheDocument();
    expect(screen.getByText('Par: 7')).toBeInTheDocument();
  });

  it('renders level 3 with multi-rook hint', () => {
    renderWithRoute('3');
    expect(screen.getByText('Row Clearer: Rook Duo')).toBeInTheDocument();
    expect(screen.getByTestId('clearer-rook-hint')).toBeInTheDocument();
  });

  it('selects rook in multi-rook level', () => {
    renderWithRoute('3');
    // Level 3: rooks a1, h8. Click h8 to select second rook.
    fireEvent.click(screen.getByTestId('sq-h8'));
    // No move should happen — just selection
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });
});
