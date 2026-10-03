import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../../test/utils';
import { PuzzleBoard } from './PuzzleBoard';
import type { PuzzleRecord } from '../../types';

// Live walk 2026-10-03, on the post-solve teaching of every PuzzleBoard
// surface: the heading of a themed drill named the wrong theme, the spoken
// concept bypassed the voiceFacts chokepoint, and a failed puzzle reached the
// misconception bucket only through the batch spine.

let latestOnMove: ((m: { from: string; to: string; san: string }) => void) | null = null;
vi.mock('../../hooks/usePositionNarration', () => ({
  usePositionNarration: () => ({ narrate: vi.fn().mockResolvedValue(undefined), cancel: vi.fn(), isNarrating: false, currentText: '', error: null }),
}));
vi.mock('../Board/ControlledChessBoard', () => ({
  ControlledChessBoard: (props: { onMove?: (m: { from: string; to: string; san: string }) => void }) => {
    latestOnMove = props.onMove ?? null;
    return <div data-testid="chess-board">Board</div>;
  },
}));
vi.mock('../../hooks/useChessGame', () => ({
  useChessGame: () => ({
    fen: 'start', boardOrientation: 'white',
    makeMove: vi.fn().mockReturnValue({ san: 'Qc3' }),
    undoMove: vi.fn(), loadFen: vi.fn().mockReturnValue(true), setOrientation: vi.fn(),
  }),
}));
vi.mock('../Coach/HintButton', () => ({ HintButton: () => <button>Hint</button> }));
vi.mock('../../hooks/usePieceSound', () => {
  const f = vi.fn();
  return { usePieceSound: () => ({ playMoveSound: f, playCelebration: f, playEncouragement: f, playErrorPing: f, playSuccessChime: f }) };
});
vi.mock('../../hooks/useHintSystem', () => {
  const requestHint = vi.fn(); const resetHints = vi.fn();
  const hintState = { level: 0 as const, arrows: [] as never[], ghostMove: null, nudgeText: '', isAnalyzing: false };
  return { useHintSystem: () => ({ hintState, requestHint, resetHints }) };
});
vi.mock('../../hooks/useBoardContext', () => ({ useBoardContext: vi.fn() }));
vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});
vi.mock('../../hooks/useStruggleDetection', () => { const reset = vi.fn(); return { useStruggleDetection: () => ({ reset }) }; });
vi.mock('../../services/tacticAlertService', () => ({ recordTacticOutcome: vi.fn() }));
vi.mock('../../stores/appStore', () => ({ useAppStore: () => null }));
vi.mock('../../hooks/useStudentRecord', () => ({ useStudentRecord: () => ({ current: { weaknesses: [], capabilities: null } }) }));
vi.mock('../../services/capabilityEvidence', () => ({ recordCapabilityEvidence: vi.fn().mockResolvedValue(1) }));
vi.mock('../../services/wrongTryRefutation', async (orig) => ({
  ...(await orig<typeof import('../../services/wrongTryRefutation')>()),
  readWrongTry: vi.fn().mockResolvedValue(null),
}));
const { voiceFacts, logPuzzleMisconception } = vi.hoisted(() => ({
  voiceFacts: vi.fn(async (facts: string) => `voiced:${facts}`),
  logPuzzleMisconception: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../services/coachApi', () => ({ voiceFacts }));
vi.mock('../../services/puzzleMissService', () => ({
  recordPuzzleMiss: vi.fn().mockResolvedValue(true),
  logPuzzleMisconception,
}));

// A real Lichess puzzle (0CCT1): Qc3, then …Ne2+ Kf1 Nxc3 wins the queen.
const PUZZLE: PuzzleRecord = {
  id: '0CCT1',
  fen: '7R/1p4r1/1kp1P3/1p4p1/1q3nBp/5N1P/1PQ2PP1/6K1 w - - 3 33',
  moves: 'c2c3 f4e2 g1f1 e2c3', rating: 1500, themes: ['crushing', 'discoveredAttack', 'fork', 'middlegame', 'short'],
  openingTags: null, popularity: 80, nbPlays: 1000, srsInterval: 0, srsEaseFactor: 2.5,
  srsRepetitions: 0, srsDueDate: '2026-10-01', srsLastReview: null, userRating: 1200, attempts: 0, successes: 0,
};

async function ready(props: Partial<Parameters<typeof PuzzleBoard>[0]> = {}): Promise<void> {
  render(<PuzzleBoard surface="drill" puzzle={PUZZLE} onComplete={vi.fn()} {...props} />);
  await screen.findByTestId('chess-board');
  await waitFor(() => expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument(), { timeout: 2000 });
}

describe('PuzzleBoard post-solve teaching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestOnMove = null;
  });

  it('a themed drill heads the puzzle with the DRILLED theme', async () => {
    await ready({ focusThemes: ['discoveredAttack'] });
    expect(screen.getByTestId('tactic-type-heading').textContent).toBe('Discovered Attack');
  });

  it('without a focus the heading is the puzzle\'s own lead tactic', async () => {
    await ready();
    expect(screen.getByTestId('tactic-type-heading').textContent).toBe('Fork');
  });

  it('a terminal fail logs the misconception at once, with the solving move', async () => {
    await ready({ maxWrongAttempts: 1 });
    act(() => { latestOnMove!({ from: 'f4', to: 'd5', san: 'Nd5' }); });
    await waitFor(() => expect(logPuzzleMisconception).toHaveBeenCalledTimes(1));
    expect(logPuzzleMisconception).toHaveBeenCalledWith(expect.objectContaining({
      puzzleId: '0CCT1', themes: PUZZLE.themes, bestSan: 'Ne2+',
    }));
  });

  it('the resolved concept is spoken through voiceFacts (preferRaw), and only that text', async () => {
    const { voiceService } = await import('../../services/voiceService');
    await ready({ maxWrongAttempts: 1 });
    act(() => { latestOnMove!({ from: 'f4', to: 'd5', san: 'Nd5' }); });
    const card = await screen.findByTestId('puzzle-concept-explanation');
    expect(card.textContent).toMatch(/forks queen on c3 and king on g1/);
    expect(card.textContent).not.toMatch(/trains on|pressure they have to answer/);
    await waitFor(() => expect(voiceFacts).toHaveBeenCalled());
    const [facts, opts] = voiceFacts.mock.calls[0] as unknown as [string, { preferRaw?: boolean }];
    expect(opts.preferRaw).toBe(true);
    expect(facts).toMatch(/Ne2\+/);
    await waitFor(() => expect(voiceService.speak).toHaveBeenCalledWith(`voiced:${facts}`, expect.anything()));
  });
});
