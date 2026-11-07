/** The spot line after a solve. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';
import { voiceService } from '../../services/voiceService';
import { spotForPuzzle } from '../../services/spotCue';
import type { MoveResult } from '../../hooks/useChessGame';

const recordCapabilityEvidence = vi.fn().mockResolvedValue(1);
// These tests are about the solve: no step question before it (that has its
// own test, MistakePuzzleBoard.slipQuestion.test.tsx).
vi.mock('../../services/thinkingLessonStart', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/thinkingLessonStart')>()),
  slipKitForBoard: () => Promise.resolve(null),
}));
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
  return { from, to, san, fen: '', pgn: '', history: [], moveNumber: 0, turn: 'w', gameOver: false };
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));


/** HOW TO SPOT IT NEXT TIME (David 2026-11-07: "a sentence as to how to spot
 *  it in the future … something specific"). A solved puzzle says the move's
 *  reason, then the line that finds the pattern next time: the one the live
 *  board filed with the miss, else the motif's. */
describe('MistakePuzzleBoard — the spot line after a solve', () => {
  beforeEach(() => { vi.clearAllMocks(); resetFactoryCounter(); latestOnMove = null; });
  const PUZZLE_FEN = buildMistakePuzzle().fen;
  const spoken = (): string[] => (voiceService.speak as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));

  async function solve(over: Parameters<typeof buildMistakePuzzle>[0]): Promise<void> {
    const puzzle = buildMistakePuzzle({ moves: 'd2d4 d7d5', narration: { intro: '', moveNarrations: ['d4 takes the centre with tempo.', ''], conceptHint: '' }, ...over });
    render(<MistakePuzzleBoard puzzle={puzzle} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');
    await act(async () => { await sleep(100); });
    await act(async () => { latestOnMove!(mv('d2', 'd4', 'd4')); });
    await act(async () => { await sleep(900); });
  }

  it('after the move\'s reason, the motif\'s spot line is spoken', async () => {
    await solve({ tacticType: 'fork' });
    const said = spoken();
    const reasonAt = said.indexOf('d4 takes the centre with tempo.');
    const spotAt = said.indexOf(spotForPuzzle({ tacticType: 'fork', fen: PUZZLE_FEN, moves: 'd2d4 d7d5' })!);
    expect(reasonAt).toBeGreaterThanOrEqual(0);
    expect(spotAt).toBeGreaterThan(reasonAt);
  });

  it('the line the live board filed with the miss wins over the motif\'s', async () => {
    const own = 'Their pawn on d5 was hitting your knight on e4. Next time, check what their last pawn move attacks.';
    await solve({ tacticType: 'fork', spot: own });
    expect(spoken()).toContain(own);
    expect(spoken()).not.toContain(spotForPuzzle({ tacticType: 'fork', fen: PUZZLE_FEN, moves: 'd2d4 d7d5' }));
  });

  it('no motif and no filed line: nothing extra is said', async () => {
    await solve({ tacticType: null });
    expect(spoken()).toEqual(['d4 takes the centre with tempo.']);
  });
});
