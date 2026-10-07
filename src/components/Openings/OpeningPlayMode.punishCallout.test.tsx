/**
 * Punish-callout WIRING test (David 2026-07-24 play audit). The detector logic
 * is unit-proven in gemCrushLines/engineDeltaLines; THIS proves the live Play
 * surface wires it end-to-end: a detected winning single-shot on the student's
 * move renders the callout banner (WITHHOLDING the move), the Show-the-line
 * button reveals the move + speaks it. The engine eval is mocked to a clear
 * single-best winning line so detectEnginePunish fires deterministically.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import { OpeningPlayMode } from './OpeningPlayMode';
import { buildOpeningRecord, buildUserProfile } from '../../test/factories';
import { useAppStore } from '../../stores/appStore';
import { voiceService } from '../../services/voiceService';

vi.mock('../../services/coachGameEngine', () => ({
  getAdaptiveMove: vi.fn().mockResolvedValue({
    move: 'f7f5',
    analysis: { evaluation: 0, bestMove: 'f7f5', isMate: false, mateIn: null, depth: 10, topLines: [], nodesPerSecond: 0 },
  }),
  getRandomLegalMove: vi.fn().mockReturnValue('f7f5'),
  getTargetStrength: () => 1320,
}));

// A clearly winning single-best line for WHITE (student): Nf3 at +3.4, the
// runner-up far behind — so detectEnginePunish fires (bestCp≥150, gap≥150).
vi.mock('../../services/stockfishEngine', () => {
  // A forcing SEQUENCE for WHITE (student) after 1.e4 f5: exf5 g6 fxg6 — the
  // pawn won stands once …hxg6 retakes (settled count, WO-MATERIAL-01). The old
  // fixture (1.e4 e5 Qh5 Nc6 exf5+) dropped the queen to …Nxe5.
  const WIN = {
    bestMove: 'e4f5', evaluation: 210, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 0,
    topLines: [
      { rank: 1, evaluation: 210, moves: ['e4f5', 'g7g6', 'f5g6'], mate: null },
      { rank: 2, evaluation: 40, moves: ['g1f3'], mate: null },
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
    render(<OpeningPlayMode opening={buildOpeningRecord({ id: 'callout-test', name: 'Vienna Game', pgn: 'e4 f5 exf5', color: 'white' })} onExit={vi.fn()} />);

    // Real timers: wait out the ~3s pregame, then play a move so the game
    // advances to the student's turn where the mocked winning eval drives the
    // callout. Click e4 if/when the board is interactive.
    const e4 = await screen.findByTestId('play-e4', {}, { timeout: 8000 });
    act(() => { fireEvent.click(e4); });

    // The callout banner appears once the mocked winning eval lands.
    const banner = await screen.findByTestId('punish-callout', {}, { timeout: 8000 });
    expect(banner).toBeInTheDocument();

    // Contract 1: the callout WITHHOLDS the moves (no SAN in the probe).
    const text = screen.getByTestId('punish-callout-text').textContent ?? '';
    expect(text).not.toMatch(/exf5/);
    expect(text.toLowerCase()).toMatch(/combination|sequence|tactic|find|do you see/);

    // Contract 2: Show-the-line reveals the move + speaks it.
    const showBtn = screen.getByTestId('show-the-line');
    act(() => { fireEvent.click(showBtn); });

    await waitFor(() => {
      expect(screen.getByTestId('punish-callout-text').textContent ?? '').toMatch(/exf5/);
    });
    // The reveal was spoken (voice fired with the move-naming line).
    expect(speakSpy).toHaveBeenCalled();
    const spokenReveal = speakSpy.mock.calls.some((c) => c[0].includes('exf5'));
    expect(spokenReveal).toBe(true);
    // The bar's Play line has nothing left to reveal (no Why line yet) — greyed,
    // never hidden, so every board keeps the same six buttons.
    expect(screen.getByTestId('show-the-line')).toBeDisabled();
  }, 20000); // mounts the whole Play rung (engine, read, bar) — 4s alone, slower under the suite
});
