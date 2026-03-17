import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { fireEvent } from '@testing-library/react';
import { MyMistakesPage } from './MyMistakesPage';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';
import type { MistakePuzzle } from '../../types';
import type { MistakePuzzleStats } from '../../services/mistakePuzzleService';

// Mock the service
const mockPuzzles: MistakePuzzle[] = [];
const mockStats: MistakePuzzleStats = {
  total: 0,
  unsolved: 0,
  solved: 0,
  mastered: 0,
  byClassification: { inaccuracy: 0, mistake: 0, blunder: 0 },
  dueCount: 0,
};

vi.mock('../../services/mistakePuzzleService', () => ({
  getAllMistakePuzzles: vi.fn(() => Promise.resolve(mockPuzzles)),
  getMistakePuzzleStats: vi.fn(() => Promise.resolve(mockStats)),
  gradeMistakePuzzle: vi.fn(() => Promise.resolve()),
  deleteMistakePuzzle: vi.fn(() => Promise.resolve()),
}));

// Mock sound hooks
vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({
    playMoveSound: vi.fn(),
    playCelebration: vi.fn(),
    playEncouragement: vi.fn(),
  }),
}));

function setMockData(puzzles: MistakePuzzle[], stats?: Partial<MistakePuzzleStats>): void {
  mockPuzzles.length = 0;
  mockPuzzles.push(...puzzles);
  Object.assign(mockStats, {
    total: puzzles.length,
    unsolved: puzzles.filter((p) => p.status === 'unsolved').length,
    solved: puzzles.filter((p) => p.status === 'solved').length,
    mastered: puzzles.filter((p) => p.status === 'mastered').length,
    byClassification: {
      inaccuracy: puzzles.filter((p) => p.classification === 'inaccuracy').length,
      mistake: puzzles.filter((p) => p.classification === 'mistake').length,
      blunder: puzzles.filter((p) => p.classification === 'blunder').length,
    },
    dueCount: puzzles.length,
    ...stats,
  });
}

describe('MyMistakesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
    setMockData([]);
  });

  it('shows empty state when no puzzles exist', async () => {
    render(<MyMistakesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('No mistakes yet')).toBeInTheDocument();
  });

  it('renders puzzle list when puzzles exist', async () => {
    setMockData([
      buildMistakePuzzle({ id: 'p1', classification: 'blunder', moveNumber: 5 }),
      buildMistakePuzzle({ id: 'p2', classification: 'mistake', moveNumber: 12 }),
    ]);

    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('puzzle-card')).toHaveLength(2);
    });

    expect(screen.getByText('Move 5 — d4')).toBeInTheDocument();
    expect(screen.getByText('Move 12 — d4')).toBeInTheDocument();
  });

  it('displays stats bar with counts', async () => {
    setMockData([
      buildMistakePuzzle({ id: 'p1', status: 'unsolved' }),
      buildMistakePuzzle({ id: 'p2', status: 'solved' }),
      buildMistakePuzzle({ id: 'p3', status: 'mastered' }),
    ]);

    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-bar')).toBeInTheDocument();
    });

    expect(screen.getByText('3 total')).toBeInTheDocument();
    expect(screen.getByText('1 unsolved')).toBeInTheDocument();
    expect(screen.getByText('1 solved')).toBeInTheDocument();
    expect(screen.getByText('1 mastered')).toBeInTheDocument();
  });

  it('filters by classification', async () => {
    setMockData([
      buildMistakePuzzle({ id: 'p1', classification: 'blunder', moveNumber: 3 }),
      buildMistakePuzzle({ id: 'p2', classification: 'inaccuracy', moveNumber: 7 }),
    ]);

    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('puzzle-card')).toHaveLength(2);
    });

    // Filter to blunders only
    fireEvent.change(screen.getByTestId('classification-filter'), {
      target: { value: 'blunder' },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('puzzle-card')).toHaveLength(1);
    });
    expect(screen.getByText('Move 3 — d4')).toBeInTheDocument();
  });

  it('filters by source', async () => {
    setMockData([
      buildMistakePuzzle({ id: 'p1', sourceMode: 'coach', moveNumber: 3 }),
      buildMistakePuzzle({ id: 'p2', sourceMode: 'lichess', moveNumber: 7 }),
    ]);

    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('puzzle-card')).toHaveLength(2);
    });

    fireEvent.change(screen.getByTestId('source-filter'), {
      target: { value: 'lichess' },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('puzzle-card')).toHaveLength(1);
    });
  });

  it('filters by status', async () => {
    setMockData([
      buildMistakePuzzle({ id: 'p1', status: 'unsolved' }),
      buildMistakePuzzle({ id: 'p2', status: 'mastered' }),
    ]);

    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('puzzle-card')).toHaveLength(2);
    });

    fireEvent.change(screen.getByTestId('status-filter'), {
      target: { value: 'mastered' },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('puzzle-card')).toHaveLength(1);
    });
  });

  it('enters solving mode when clicking a puzzle', async () => {
    setMockData([
      buildMistakePuzzle({ id: 'p1', moveNumber: 5 }),
    ]);

    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('solve-button'));

    await waitFor(() => {
      expect(screen.getByTestId('solving-mode')).toBeInTheDocument();
    });
  });

  it('shows no-matches state when filters exclude all puzzles', async () => {
    setMockData([
      buildMistakePuzzle({ id: 'p1', classification: 'blunder' }),
    ]);

    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('puzzle-card')).toBeInTheDocument();
    });

    // Filter to inaccuracies (none exist)
    fireEvent.change(screen.getByTestId('classification-filter'), {
      target: { value: 'inaccuracy' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('no-matches')).toBeInTheDocument();
    });
  });

  it('has filter controls', async () => {
    setMockData([buildMistakePuzzle({ id: 'p1' })]);
    render(<MyMistakesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('filters')).toBeInTheDocument();
    });

    expect(screen.getByTestId('classification-filter')).toBeInTheDocument();
    expect(screen.getByTestId('source-filter')).toBeInTheDocument();
    expect(screen.getByTestId('status-filter')).toBeInTheDocument();
  });
});
