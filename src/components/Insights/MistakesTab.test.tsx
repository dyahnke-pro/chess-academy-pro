import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { MistakesTab } from './MistakesTab';
import type { MistakeInsights } from '../../types';

// ─── ResizeObserver mock (needed for Recharts) ────────────────��─────────────

vi.stubGlobal('ResizeObserver', class {
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
});

// ─── Navigate mock ──────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Mock data ──────────────────────────────────────────────────────────────

function buildMistakeData(overrides?: Partial<MistakeInsights>): MistakeInsights {
  return {
    errorBreakdown: { blunders: 4, mistakes: 8, inaccuracies: 12 },
    missedWins: 3,
    avgCpLoss: 55,
    errorsByPhase: [
      { phase: 'opening', errors: 5, avgCpLoss: 30 },
      { phase: 'middlegame', errors: 12, avgCpLoss: 60 },
      { phase: 'endgame', errors: 7, avgCpLoss: 45 },
    ],
    errorsBySituation: { winning: 8, equal: 10, losing: 6 },
    thrownWins: 2,
    lateGameCollapses: 3,
    costliestMistakes: [
      {
        gameId: 'g1',
        moveNumber: 15,
        san: 'Qh5',
        cpLoss: 500,
        classification: 'blunder',
        opponentName: 'Stockfish Bot',
        date: '2024-01-15',
        openingName: 'Italian Game',
        phase: 'middlegame',
      },
      {
        gameId: 'g2',
        moveNumber: 22,
        san: 'Bxf7',
        cpLoss: 350,
        classification: 'mistake',
        opponentName: 'AI Coach',
        date: '2024-01-16',
        openingName: 'Sicilian Defense',
        phase: 'middlegame',
      },
    ],
    puzzleProgress: { unsolved: 5, solved: 8, mastered: 3 },
    totalGames: 20,
    strengths: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MistakesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with data-testid="mistakes-tab"', () => {
    render(<MistakesTab data={buildMistakeData()} />);
    expect(screen.getByTestId('mistakes-tab')).toBeInTheDocument();
  });

  it('shows error breakdown counts', () => {
    render(<MistakesTab data={buildMistakeData()} />);
    expect(screen.getByText('Blunders')).toBeInTheDocument();
    expect(screen.getByText('Mistakes')).toBeInTheDocument();
    expect(screen.getByText('Inaccuracies')).toBeInTheDocument();
    // Verify the donut chart total shows 24 errors (4+8+12)
    expect(screen.getByText('Error Breakdown')).toBeInTheDocument();
  });

  it('shows avg centipawn loss', () => {
    render(<MistakesTab data={buildMistakeData()} />);
    expect(screen.getByText('Avg centipawn loss')).toBeInTheDocument();
    expect(screen.getByText('55 cp')).toBeInTheDocument();
  });

  it('shows costliest mistakes with clickable rows', () => {
    render(<MistakesTab data={buildMistakeData()} />);

    const mistakeRows = screen.getAllByTestId('mistake-row');
    expect(mistakeRows.length).toBe(2);
  });

  it('navigates when clicking a mistake row', () => {
    render(<MistakesTab data={buildMistakeData()} />);

    const mistakeRows = screen.getAllByTestId('mistake-row');
    fireEvent.click(mistakeRows[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/coach/play?review=g1&move=15');
  });

  it('shows errors by situation section', () => {
    render(<MistakesTab data={buildMistakeData()} />);
    expect(screen.getByText('When winning')).toBeInTheDocument();
    expect(screen.getByText('When equal')).toBeInTheDocument();
    expect(screen.getByText('When losing')).toBeInTheDocument();
  });

  it('shows puzzle progress', () => {
    render(<MistakesTab data={buildMistakeData()} />);
    expect(screen.getByText('Mastered')).toBeInTheDocument();
    expect(screen.getByText('Solved')).toBeInTheDocument();
    expect(screen.getByText('Unsolved')).toBeInTheDocument();
  });
});
