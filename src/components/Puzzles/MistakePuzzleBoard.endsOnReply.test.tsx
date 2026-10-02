/** A generated line ending on the opponent's reply still completes. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';
import type { MoveResult } from '../../hooks/useChessGame';

const recordCapabilityEvidence = vi.fn().mockResolvedValue(1);
vi.mock('../../services/capabilityEvidence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/capabilityEvidence')>()),
  recordCapabilityEvidence: (...a: unknown[]) => recordCapabilityEvidence(...a),
}));

vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});
vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({ playMoveSound: vi.fn(), playCelebration: vi.fn(), playEncouragement: vi.fn() }),
}));
// The hint system reaches the engine; stub it so [show me] is a pure click.
// IDENTITIES MUST BE STABLE: the board's puzzle-change effect depends on
// `resetHints`, so a fresh vi.fn() per render re-fires the effect every render
// — an infinite loop that hung this file with zero output before this note.
const stableHintState = { level: 0, arrows: [], nudgeText: null, ghostMove: null, isAnalyzing: false, hintsUsed: 0, resolvedBestMove: null };
const stableRequestHint = vi.fn();
const stableResetHints = vi.fn();
vi.mock('../../hooks/useHintSystem', () => ({
  useHintSystem: () => ({ hintState: stableHintState, requestHint: stableRequestHint, resetHints: stableResetHints }),
}));

// Capture the board's latest onMove so the test can play moves directly.
let latestOnMove: ((m: MoveResult) => void) | null = null;
vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: (props: { onMove: (m: MoveResult) => void }) => {
    latestOnMove = props.onMove;
    return <div data-testid="mock-board" />;
  },
}));

function mv(from: string, to: string, san: string): MoveResult {
  return { from, to, san, fen: '', pgn: '', history: [], moveNumber: 0, turn: 'w' };
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));


/** Tactics walk 2026-10-01: three of four generated lines ended on the
 *  OPPONENT's reply, and the board sat at "n/n" forever — never solved. */
describe('MistakePuzzleBoard — a line that ends on the opponent\'s reply', () => {
  beforeEach(() => { vi.clearAllMocks(); resetFactoryCounter(); latestOnMove = null; });

  it('is solved once that reply lands: the Next button appears and the evidence is written', async () => {
    const puzzle = buildMistakePuzzle({ moves: 'd2d4 d7d5' });
    render(<MistakePuzzleBoard puzzle={puzzle} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');
    await act(async () => { await sleep(100); });
    await act(async () => { latestOnMove!(mv('d2', 'd4', 'd4')); });
    await act(async () => { await sleep(900); });
    expect(screen.getByTestId('puzzle-next-btn')).toBeInTheDocument();
    expect(recordCapabilityEvidence).toHaveBeenCalledTimes(1);
  });
});
