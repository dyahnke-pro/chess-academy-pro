import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { GameDatabasePage } from './GameDatabasePage';
import { db } from '../../db/schema';
import { buildGameRecord } from '../../test/factories';
import type { GameRecord } from '../../types';

vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: ({ initialFen }: { initialFen?: string }) => (
    <div data-testid="chess-board" data-fen={initialFen}>Board</div>
  ),
}));

vi.mock('../Openings/MoveTree', () => ({
  MoveTree: () => <div data-testid="move-tree">Moves</div>,
}));

function createGame(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: 'g1',
    pgn: '[Event "Test"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0',
    white: 'Alice',
    black: 'Bob',
    result: '1-0',
    date: '2026-03-04',
    event: 'Test',
    eco: 'C44',
    whiteElo: 1500,
    blackElo: 1400,
    source: 'import',
    annotations: null,
    coachAnalysis: null,
    isMasterGame: false,
    openingId: null,
    ...overrides,
  };
}

describe('GameDatabasePage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('renders the game database page', async () => {
    render(<GameDatabasePage />);
    await waitFor(() => {
      expect(screen.getByTestId('game-database-page')).toBeInTheDocument();
    });
    expect(screen.getByText('Games')).toBeInTheDocument();
  });

  it('shows empty state when no games', async () => {
    render(<GameDatabasePage />);
    await waitFor(() => {
      expect(screen.getByText(/No games yet/)).toBeInTheDocument();
    });
  });

  it('shows game cards when games exist', async () => {
    await db.games.put(createGame());
    render(<GameDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-card-g1')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice vs Bob')).toBeInTheDocument();
  });

  it('has import button that toggles import panel', async () => {
    render(<GameDatabasePage />);
    await waitFor(() => {
      expect(screen.getByTestId('import-toggle-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('import-toggle-btn'));
    expect(screen.getByTestId('import-panel')).toBeInTheDocument();
  });

  it('has ECO and source filters', async () => {
    render(<GameDatabasePage />);
    await waitFor(() => {
      expect(screen.getByTestId('eco-filter')).toBeInTheDocument();
      expect(screen.getByTestId('source-filter')).toBeInTheDocument();
    });
  });

  it('clicking a game opens the viewer', async () => {
    await db.games.put(createGame());
    render(<GameDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-card-g1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('game-card-g1'));
    expect(screen.getByTestId('game-viewer')).toBeInTheDocument();
  });

  it('viewer has navigation controls', async () => {
    await db.games.put(createGame());
    render(<GameDatabasePage />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('game-card-g1'));
    });

    expect(screen.getByTestId('nav-start')).toBeInTheDocument();
    expect(screen.getByTestId('nav-prev')).toBeInTheDocument();
    expect(screen.getByTestId('nav-next')).toBeInTheDocument();
    expect(screen.getByTestId('nav-end')).toBeInTheDocument();
  });

  it('viewer has export PGN button', async () => {
    await db.games.put(createGame());
    render(<GameDatabasePage />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('game-card-g1'));
    });

    expect(screen.getByTestId('export-pgn-btn')).toBeInTheDocument();
  });

  it('viewer can be closed', async () => {
    await db.games.put(createGame());
    render(<GameDatabasePage />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('game-card-g1'));
    });

    fireEvent.click(screen.getByTestId('close-viewer-btn'));
    expect(screen.getByTestId('game-database-page')).toBeInTheDocument();
  });

  it('Import Games button renders', async () => {
    render(<GameDatabasePage />);
    await waitFor(() => {
      expect(screen.getByTestId('import-online-btn')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-online-btn')).toHaveTextContent('Import Games');
  });

  it('game cards render with result and date content', async () => {
    await db.games.put(createGame({ id: 'g-details', result: '0-1', date: '2025-12-25', eco: 'B20' }));
    render(<GameDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-card-g-details')).toBeInTheDocument();
    });

    expect(screen.getByText('0-1')).toBeInTheDocument();
    expect(screen.getByText('2025-12-25')).toBeInTheDocument();
    expect(screen.getByText('B20')).toBeInTheDocument();
  });

  it('empty state shows chess piece icon and import prompt', async () => {
    render(<GameDatabasePage />);
    await waitFor(() => {
      expect(screen.getByText(/No games yet/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Import a PGN to get started/)).toBeInTheDocument();
  });

  it('renders multiple game cards using factory', async () => {
    const game1 = buildGameRecord({ id: 'factory-1', white: 'Magnus', black: 'Hikaru' });
    const game2 = buildGameRecord({ id: 'factory-2', white: 'Ian', black: 'Ding' });
    await db.games.bulkPut([game1, game2]);

    render(<GameDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-card-factory-1')).toBeInTheDocument();
      expect(screen.getByTestId('game-card-factory-2')).toBeInTheDocument();
    });

    expect(screen.getByText('Magnus vs Hikaru')).toBeInTheDocument();
    expect(screen.getByText('Ian vs Ding')).toBeInTheDocument();
  });

  it('game card shows Elo rating when available', async () => {
    await db.games.put(createGame({ id: 'g-elo', whiteElo: 2800 }));
    render(<GameDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-card-g-elo')).toBeInTheDocument();
    });

    expect(screen.getByText('2800')).toBeInTheDocument();
  });

  it('game card shows source label', async () => {
    await db.games.put(createGame({ id: 'g-src', source: 'lichess' }));
    render(<GameDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-card-g-src')).toBeInTheDocument();
    });

    expect(screen.getByText('lichess')).toBeInTheDocument();
  });
});
