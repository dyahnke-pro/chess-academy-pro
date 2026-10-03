/**
 * Setup Trainer page (hand walk of the Tactics tab, iPhone viewport,
 * 2026-10-03):
 *  1. the page could not scroll — Show Solution / End session were off-screen;
 *  2. "End session" with zero attempts claimed "No setup positions found",
 *     a message only a null pick can honestly say;
 *  3. the board gets the puzzle's place in the session, so the intro rotates.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { TacticSetupPage } from './TacticSetupPage';
import { buildSetupPuzzle, resetFactoryCounter } from '../../test/factories';
import type { SetupTrainerItem } from '../../services/setupTrainerService';

const mockPick = vi.fn<() => Promise<SetupTrainerItem | null>>();
vi.mock('../../services/setupTrainerService', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../services/setupTrainerService')>();
  return { ...orig, pickSetupPuzzle: (): Promise<SetupTrainerItem | null> => mockPick() };
});
vi.mock('../../services/puzzleService', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../services/puzzleService')>();
  return { ...orig, seedPuzzles: vi.fn().mockResolvedValue(undefined) };
});
vi.mock('../../services/appAuditor', () => ({ logAppAudit: vi.fn().mockResolvedValue(undefined) }));

let boardOnComplete: ((correct: boolean) => void) | null = null;
vi.mock('./TacticSetupBoard', () => ({
  TacticSetupBoard: ({ sequence, onComplete }: { sequence: number; onComplete: (c: boolean) => void }) => {
    boardOnComplete = onComplete;
    return <div data-testid="stub-setup-board" data-sequence={sequence} />;
  },
}));

function item(): SetupTrainerItem {
  const puzzle = buildSetupPuzzle();
  return { puzzle, rating: 1200 } as SetupTrainerItem;
}

describe('TacticSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
    boardOnComplete = null;
  });

  it('the root is a scroller (flex-1 min-h-0 overflow-y-auto) so nothing falls off a phone screen', () => {
    render(<TacticSetupPage />);
    const root = screen.getByTestId('setup-trainer-page');
    for (const cls of ['flex-1', 'min-h-0', 'overflow-y-auto']) expect(root.className).toContain(cls);
    expect(root.className).not.toContain('min-h-[80vh]');
  });

  it('End session with zero attempts says the session ended — never "no positions found"', async () => {
    mockPick.mockResolvedValue(item());
    render(<TacticSetupPage />);
    fireEvent.click(screen.getByTestId('difficulty-1'));
    await screen.findByTestId('stub-setup-board');
    fireEvent.click(screen.getByTestId('end-session'));
    expect(screen.getByTestId('session-summary')).toBeInTheDocument();
    expect(screen.getByTestId('summary-ended')).toBeInTheDocument();
    expect(screen.queryByTestId('summary-none-found')).not.toBeInTheDocument();
    expect(screen.queryByText(/No setup positions found/)).not.toBeInTheDocument();
  });

  it('a null first pick is the ONE case that says no positions were found', async () => {
    mockPick.mockResolvedValue(null);
    render(<TacticSetupPage />);
    fireEvent.click(screen.getByTestId('difficulty-3'));
    await screen.findByTestId('summary-none-found');
    expect(screen.getByText(/No setup positions found/)).toBeInTheDocument();
    expect(screen.queryByTestId('summary-ended')).not.toBeInTheDocument();
  });

  it('ending after attempts shows the score and no not-found message; the board gets its session index', async () => {
    mockPick.mockResolvedValue(item());
    render(<TacticSetupPage />);
    fireEvent.click(screen.getByTestId('difficulty-1'));
    const first = await screen.findByTestId('stub-setup-board');
    expect(first).toHaveAttribute('data-sequence', '0');
    await act(async () => { boardOnComplete!(true); });
    await waitFor(() => expect(screen.getByTestId('stub-setup-board')).toHaveAttribute('data-sequence', '1'));
    fireEvent.click(screen.getByTestId('end-session'));
    expect(screen.getByTestId('summary-score')).toHaveTextContent('1/1');
    expect(screen.queryByTestId('summary-none-found')).not.toBeInTheDocument();
    expect(screen.queryByTestId('summary-ended')).not.toBeInTheDocument();
  });
});
