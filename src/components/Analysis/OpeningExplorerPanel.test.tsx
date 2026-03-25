import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { OpeningExplorerPanel } from './OpeningExplorerPanel';
import * as explorerService from '../../services/lichessExplorerService';

vi.mock('../../services/openingService', () => ({
  getOpeningByEco: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/lichessExplorerService', () => ({
  fetchLichessExplorer: vi.fn(),
  fetchCloudEval: vi.fn(),
  formatCloudEval: vi.fn((pv: { cp?: number; mate?: number }) => {
    if (pv.mate !== undefined) return pv.mate > 0 ? `M${pv.mate}` : `-M${Math.abs(pv.mate)}`;
    if (pv.cp !== undefined) {
      const pawns = pv.cp / 100;
      return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
    }
    return '0.00';
  }),
}));

const mockFetchExplorer = vi.mocked(explorerService.fetchLichessExplorer);
const mockFetchCloudEval = vi.mocked(explorerService.fetchCloudEval);

const TEST_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const mockExplorerResult = {
  white: 4200,
  draws: 1800,
  black: 4000,
  moves: [
    { uci: 'e2e4', san: 'e4', averageRating: 1850, white: 2100, draws: 900, black: 2000, game: null },
    { uci: 'd2d4', san: 'd4', averageRating: 1820, white: 1400, draws: 600, black: 1200, game: null },
  ],
  topGames: [],
  opening: { eco: 'E00', name: 'Starting Position' },
};

const mockCloudEval = {
  fen: TEST_FEN,
  knodes: 2547,
  depth: 40,
  pvs: [{ moves: 'e2e4 e7e5', cp: 28 }],
};

describe('OpeningExplorerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchExplorer.mockResolvedValue(mockExplorerResult);
    mockFetchCloudEval.mockResolvedValue(mockCloudEval);
  });

  it('renders source tabs', () => {
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    expect(screen.getByTestId('explorer-source-lichess')).toBeInTheDocument();
    expect(screen.getByTestId('explorer-source-masters')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    mockFetchExplorer.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    expect(screen.getByTestId('explorer-loading')).toBeInTheDocument();
  });

  it('displays moves after loading', async () => {
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByTestId('explorer-moves')).toBeInTheDocument();
    });
    expect(screen.getByTestId('explorer-move-e4')).toBeInTheDocument();
    expect(screen.getByTestId('explorer-move-d4')).toBeInTheDocument();
  });

  it('shows opening name and total games', async () => {
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Starting Position')).toBeInTheDocument();
    });
  });

  it('displays cloud eval when available', async () => {
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByTestId('cloud-eval')).toBeInTheDocument();
    });
  });

  it('switches to masters source on tab click', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await user.click(screen.getByTestId('explorer-source-masters'));
    await waitFor(() => {
      expect(mockFetchExplorer).toHaveBeenCalledWith(TEST_FEN, 'masters');
    });
  });

  it('shows no-data message when moves array is empty', async () => {
    mockFetchExplorer.mockResolvedValue({ ...mockExplorerResult, moves: [] });
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByTestId('no-explorer-data')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockFetchExplorer.mockRejectedValue(new Error('Network error'));
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByTestId('explorer-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('does not show cloud eval when null', async () => {
    mockFetchCloudEval.mockResolvedValue(null);
    render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByTestId('explorer-moves')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('cloud-eval')).not.toBeInTheDocument();
  });

  it('refetches when FEN changes', async () => {
    const { rerender } = render(<MemoryRouter><OpeningExplorerPanel fen={TEST_FEN} /></MemoryRouter>);
    await waitFor(() => expect(mockFetchExplorer).toHaveBeenCalledTimes(1));

    const newFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    rerender(<MemoryRouter><OpeningExplorerPanel fen={newFen} /></MemoryRouter>);
    await waitFor(() => expect(mockFetchExplorer).toHaveBeenCalledTimes(2));
    expect(mockFetchExplorer).toHaveBeenLastCalledWith(newFen, 'lichess');
  });
});
