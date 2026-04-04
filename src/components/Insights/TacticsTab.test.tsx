import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { TacticsTab } from './TacticsTab';
import type { TacticInsights, TacticalMoment } from '../../types';

// ─── ResizeObserver mock (needed for Recharts) ──────────────────────────────

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

function buildMoment(overrides?: Partial<TacticalMoment>): TacticalMoment {
  return {
    gameId: 'g1',
    moveNumber: 15,
    san: 'Nxe5',
    fen: 'some-fen',
    evalSwing: 300,
    tacticType: 'fork',
    explanation: 'Brilliant move',
    opponentName: 'Stockfish Bot',
    date: '2024-01-15',
    openingName: 'Italian Game',
    ...overrides,
  };
}

function buildTacticData(overrides?: Partial<TacticInsights>): TacticInsights {
  return {
    tacticsFound: { brilliant: 5, great: 12 },
    avgBrilliantsPerGame: 0.5,
    avgGreatPerGame: 1.2,
    tacticsByType: [],
    bestSequences: [
      buildMoment({ gameId: 'g1', explanation: 'Brilliant move', evalSwing: 500 }),
      buildMoment({ gameId: 'g2', explanation: 'Great move', evalSwing: 300 }),
    ],
    worstMisses: [
      buildMoment({ gameId: 'g3', explanation: 'Missed a knight fork', evalSwing: -400, tacticType: 'fork' }),
    ],
    missedByType: [
      { type: 'fork', count: 3, avgCost: 200 },
      { type: 'pin', count: 2, avgCost: 150 },
    ],
    foundVsMissed: { found: 17, missed: 5 },
    awarenessRate: 77,
    missedByPhase: [
      { phase: 'opening', count: 1 },
      { phase: 'middlegame', count: 3 },
      { phase: 'endgame', count: 1 },
    ],
    totalGames: 10,
    strengths: ['77% tactical awareness rate'],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TacticsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with data-testid="tactics-tab"', () => {
    render(<TacticsTab data={buildTacticData()} />);
    expect(screen.getByTestId('tactics-tab')).toBeInTheDocument();
  });

  it('shows tactics found counts', () => {
    render(<TacticsTab data={buildTacticData()} />);
    expect(screen.getByText('Brilliant')).toBeInTheDocument();
    expect(screen.getByText('Great')).toBeInTheDocument();
    expect(screen.getByText('Tactics Found in Games')).toBeInTheDocument();
  });

  it('shows average per-game stats', () => {
    render(<TacticsTab data={buildTacticData()} />);
    expect(screen.getByText('Avg brilliant moves / game')).toBeInTheDocument();
    expect(screen.getByText('0.5')).toBeInTheDocument();
    expect(screen.getByText('Avg great moves / game')).toBeInTheDocument();
    expect(screen.getByText('1.2')).toBeInTheDocument();
  });

  it('shows best tactical sequences', () => {
    render(<TacticsTab data={buildTacticData()} />);
    expect(screen.getByText('Best Tactical Sequences')).toBeInTheDocument();
  });

  it('shows worst tactical misses', () => {
    render(<TacticsTab data={buildTacticData()} />);
    expect(screen.getByText('Worst Tactical Misses')).toBeInTheDocument();
  });

  it('navigates when clicking a tactic row', () => {
    render(<TacticsTab data={buildTacticData()} />);

    const tacticRows = screen.getAllByTestId('tactic-row');
    fireEvent.click(tacticRows[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/coach/play?review=g1&move=15');
  });

  it('shows awareness rate', () => {
    render(<TacticsTab data={buildTacticData()} />);
    expect(screen.getByText('Tactical awareness rate')).toBeInTheDocument();
    expect(screen.getByText('77%')).toBeInTheDocument();
  });

  it('shows strengths card when strengths exist', () => {
    render(<TacticsTab data={buildTacticData()} />);
    expect(screen.getByTestId('strengths-card')).toBeInTheDocument();
    expect(screen.getByText('77% tactical awareness rate')).toBeInTheDocument();
  });
});
