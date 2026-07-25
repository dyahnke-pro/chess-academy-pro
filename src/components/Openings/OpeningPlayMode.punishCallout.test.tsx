/**
 * Punish-callout WIRING test (David 2026-07-24 play audit). The detector logic
 * is unit-proven in gemCrushLines/engineDeltaLines; THIS proves the live Play
 * surface wires it end-to-end: a detected winning single-shot on the student's
 * move renders the callout banner (WITHHOLDING the move), the Show-the-line
 * button reveals the move + speaks it. The engine eval is mocked to a clear
 * single-best winning line so detectEnginePunish fires deterministically.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import { OpeningPlayMode } from './OpeningPlayMode';
import { buildOpeningRecord, buildUserProfile } from '../../test/factories';
import { useAppStore } from '../../stores/appStore';
import { voiceService } from '../../services/voiceService';

vi.mock('../../services/coachGameEngine', () => ({
  getAdaptiveMove: vi.fn().mockResolvedValue({
    move: 'e7e5',
    analysis: { evaluation: 0, bestMove: 'e7e5', isMate: false, mateIn: null, depth: 10, topLines: [], nodesPerSecond: 0 },
  }),
  getRandomLegalMove: vi.fn().mockReturnValue('e7e5'),
  getTargetStrength: () => 1320,
}));

// A clearly winning single-best line for WHITE (student): Nf3 at +3.4, the
// runner-up far behind — so detectEnginePunish fires (bestCp≥150, gap≥150).
vi.mock('../../services/stockfishEngine', () => {
  // Clearly winning single-best line for WHITE (student): Nf3 at +3.4, runner-up
  // far behind → detectEnginePunish fires (bestCp≥150, gap≥150).
  const WIN = {
    bestMove: 'g1f3', evaluation: 340, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 0,
    topLines: [
      { rank: 1, evaluation: 340, moves: ['g1f3', 'b8c6', 'f1c4'], mate: null },
      { rank: 2, evaluation: 60, moves: ['b1c3'], mate: null },
    ],
  };
  return {
    stockfishEngine: {
      analyzePosition: vi.fn().mockResolvedValue(WIN),
      analyzeWithBudget: vi.fn().mockResolvedValue(WIN),
      getBestMove: vi.fn().mockResolvedValue('e2e4'),
      isBusy: vi.fn().mockReturnValue(false),
      queueAnalysis: vi.fn().mockResolvedValue(WIN),
      forceRestart: vi.fn(),
    },
  };
});

// Board mock: exposes a button that plays a real opening move so the game
// advances to the student's turn where the eval (mocked) drives the callout.
vi.mock('../Board/ControlledChessBoard', () => ({
  ControlledChessBoard: (props: Record<string, unknown>) => {
    const game = props.game as { fen?: string } | undefined;
    const interactive = props.interactive as boolean | undefined;
    const onMove = props.onMove as ((r: { from: string; to: string; san: string; fen: string }) => void) | undefined;
    return (
      <div data-testid="chess-board" data-fen={game?.fen ?? ''} data-interactive={String(interactive ?? true)}>
        Board
        {interactive && onMove && (
          <button
            data-testid="play-e4"
            onClick={() => onMove({ from: 'e2', to: 'e4', san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' })}
          >e4</button>
        )}
      </div>
    );
  },
}));

describe('OpeningPlayMode — live punishment callout wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ activeProfile: buildUserProfile({ currentRating: 900 }) });
  });

  it('renders the callout (move withheld) and Show-the-line reveals + speaks it', async () => {
    const speakSpy = vi.spyOn(voiceService, 'speak').mockResolvedValue(undefined);
    render(<OpeningPlayMode opening={buildOpeningRecord({ id: 'callout-test', name: 'Vienna Game', pgn: 'e4 e5 Nc3', color: 'white' })} onExit={vi.fn()} />);

    // Real timers: wait out the ~3s pregame, then play a move so the game
    // advances to the student's turn where the mocked winning eval drives the
    // callout. Click e4 if/when the board is interactive.
    const e4 = await screen.findByTestId('play-e4', {}, { timeout: 8000 });
    act(() => { fireEvent.click(e4); });

    // The callout banner appears once the mocked winning eval lands.
    const banner = await screen.findByTestId('punish-callout', {}, { timeout: 8000 });
    expect(banner).toBeInTheDocument();

    // Contract 1: the callout WITHHOLDS the move (no "Nf3" in the probe).
    const text = screen.getByTestId('punish-callout-text').textContent ?? '';
    expect(text).not.toMatch(/Nf3/);
    expect(text.toLowerCase()).toMatch(/shot|punish|find it/);

    // Contract 2: Show-the-line reveals the move + speaks it.
    const showBtn = screen.getByTestId('show-the-line');
    act(() => { fireEvent.click(showBtn); });

    await waitFor(() => {
      expect(screen.getByTestId('punish-callout-text').textContent ?? '').toMatch(/Nf3/);
    });
    // The reveal was spoken (voice fired with the move-naming line).
    expect(speakSpy).toHaveBeenCalled();
    const spokenReveal = speakSpy.mock.calls.some((c) => String(c[0]).includes('Nf3'));
    expect(spokenReveal).toBe(true);
    // Button gone after reveal.
    expect(screen.queryByTestId('show-the-line')).not.toBeInTheDocument();
  });
});
