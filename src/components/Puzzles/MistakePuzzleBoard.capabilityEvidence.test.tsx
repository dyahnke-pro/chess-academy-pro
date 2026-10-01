/**
 * THE DRILL WRITES CAPABILITY EVIDENCE — the heat map's GREEN (WO-3 S3).
 *
 * Before 2026-09-19 a drill solved correctly moved the misconception SRS and
 * wrote NO capability evidence: `recordTagDrillResult` never imported it. So the
 * one surface where a student demonstrably proves competence could never turn a
 * tag green. This gate proves the drill board calls the evidence door, with the
 * outcome computed from the FIRST answer and `prompted` from [show me] — three
 * cases, three distinct records. Negative control: delete the call in the
 * board's solve branch and every case here goes red.
 *
 * The door itself (`capabilitiesPosed` / `movePlayedCleanly`) is session A's
 * computer with its own tests; this file asserts the SURFACE feeds it honestly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';
import type { MoveResult } from '../../hooks/useChessGame';

const recordCapabilityEvidence = vi.fn().mockResolvedValue(1);
vi.mock('../../services/capabilityEvidence', () => ({
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

/** Factory line: student d4, opponent d5 (auto, 500ms), student Bb5 = solved. */
async function solveCleanly(): Promise<void> {
  await act(async () => { latestOnMove!(mv('d2', 'd4', 'd4')); });
  await act(async () => { await sleep(700); });           // opponent's auto-reply lands
  await act(async () => { latestOnMove!(mv('c4', 'b5', 'Bb5')); });
}

describe('MistakePuzzleBoard writes capability evidence at the solve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
    latestOnMove = null;
  });

  it('HELD — a clean first-try solve records cpLoss 0, unprompted, origin drill', async () => {
    const puzzle = buildMistakePuzzle();
    render(<MistakePuzzleBoard puzzle={puzzle} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');
    expect(latestOnMove).not.toBeNull();

    await solveCleanly();

    expect(recordCapabilityEvidence).toHaveBeenCalledTimes(1);
    expect(recordCapabilityEvidence).toHaveBeenCalledWith(expect.objectContaining({
      fenBefore: puzzle.fen,
      playedSan: puzzle.bestMoveSan,
      moverColor: 'white',
      cpLoss: 0,
      origin: 'drill',
      prompted: false,
      sourceGameId: puzzle.sourceGameId,
    }));
  });

  // Hand walk 2026-10-01: the result rode the "Next puzzle" tap, so solving
  // and backing out recorded nothing. It must land at the solve, no tap.
  it('the solve itself records — onResolved fires without Next, once', async () => {
    const onResolved = vi.fn();
    const onComplete = vi.fn();
    render(<MistakePuzzleBoard puzzle={buildMistakePuzzle()} onResolved={onResolved} onComplete={onComplete} skipReplayContext />);
    await screen.findByTestId('mock-board');
    await solveCleanly();
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(true, expect.any(Number));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('a wrong first try resolves as a miss', async () => {
    const onResolved = vi.fn();
    render(<MistakePuzzleBoard puzzle={buildMistakePuzzle({ cpLoss: 150 })} onResolved={onResolved} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');
    await act(async () => { latestOnMove!(mv('a2', 'a3', 'a3')); });
    await act(async () => { await sleep(1700); });
    await solveCleanly();
    expect(onResolved).toHaveBeenCalledWith(false, expect.any(Number));
  });

  it('BROKEN — a wrong first answer records the measured cost of the slip, still unprompted', async () => {
    const puzzle = buildMistakePuzzle({ cpLoss: 150 });
    render(<MistakePuzzleBoard puzzle={puzzle} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');

    await act(async () => { latestOnMove!(mv('a2', 'a3', 'a3')); });   // wrong
    await act(async () => { await sleep(1700); });                       // 'incorrect' -> 'playing'
    await solveCleanly();

    expect(recordCapabilityEvidence).toHaveBeenCalledTimes(1);
    expect(recordCapabilityEvidence).toHaveBeenCalledWith(expect.objectContaining({
      cpLoss: 150,
      prompted: false,
      origin: 'drill',
    }));
  });

  it('PROMPTED — [show me] before solving marks the record prompted (grey, not green)', async () => {
    const puzzle = buildMistakePuzzle();
    render(<MistakePuzzleBoard puzzle={puzzle} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');

    const hintArea = await screen.findByTestId('puzzle-hint-area');
    const showMe = hintArea.querySelector('button');
    expect(showMe).not.toBeNull();
    await act(async () => { showMe!.click(); });
    await solveCleanly();

    expect(recordCapabilityEvidence).toHaveBeenCalledTimes(1);
    expect(recordCapabilityEvidence).toHaveBeenCalledWith(expect.objectContaining({
      prompted: true,
      origin: 'drill',
    }));
  });

  it('a data-corrupt puzzle (no moves) records NOTHING — the student never answered', async () => {
    const puzzle = buildMistakePuzzle({ moves: '' });
    render(<MistakePuzzleBoard puzzle={puzzle} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await act(async () => { await sleep(50); });
    expect(recordCapabilityEvidence).not.toHaveBeenCalled();
  });
});
