import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../../test/utils';
import { PuzzleBoard } from './PuzzleBoard';
import type { PuzzleRecord } from '../../types';

// A MISS STILL TEACHES THE LINE (David 2026-10-01: "make sure we are not
// slacking on the teaching aspect"). Deep Run ends on one miss; with
// `revealOnFail` the refutation is read and then the solution is PLAYED OUT on
// the board, instead of leaving a dead board.

const makeMoveSpy = vi.hoisted(() => vi.fn().mockReturnValue({ san: 'Nbd7' }));
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
    makeMove: makeMoveSpy,
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
vi.mock('../../services/voiceService', () => ({
  voiceService: { speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), isPlaying: vi.fn().mockReturnValue(false), warmup: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../hooks/useStruggleDetection', () => { const reset = vi.fn(); return { useStruggleDetection: () => ({ reset }) }; });
vi.mock('../../services/tacticAlertService', () => ({ recordTacticOutcome: vi.fn() }));
vi.mock('../../services/tacticClassifierService', () => ({
  getTacticTypeFromThemes: vi.fn().mockReturnValue(null), getPrimaryThemeLabel: vi.fn().mockReturnValue(null),
}));
vi.mock('../../stores/appStore', () => ({ useAppStore: () => null }));
vi.mock('../../hooks/useStudentRecord', () => ({ useStudentRecord: () => ({ current: { weaknesses: [], capabilities: null } }) }));
vi.mock('../../services/capabilityEvidence', () => ({ recordCapabilityEvidence: vi.fn().mockResolvedValue(1) }));
const readWrongTry = vi.fn();
vi.mock('../../services/wrongTryRefutation', () => ({ readWrongTry: (...a: unknown[]) => readWrongTry(...a) }));

const PUZZLE: PuzzleRecord = {
  id: '0Flch',
  fen: 'rn1qkb1r/pp2ppp1/3p1n1p/2pP4/4N3/2P5/PP2QPPP/RNB1K2R b KQkq - 1 9',
  moves: 'b8d7 e4d6', rating: 1393, themes: ['mate', 'mateIn1', 'pin', 'smotheredMate'],
  openingTags: null, popularity: 80, nbPlays: 1000, srsInterval: 0, srsEaseFactor: 2.5,
  srsRepetitions: 0, srsDueDate: '2026-10-01', srsLastReview: null, userRating: 1200, attempts: 0, successes: 0,
};

describe('PuzzleBoard revealOnFail', () => {
  beforeEach(() => { vi.clearAllMocks(); latestOnMove = null; readWrongTry.mockResolvedValue({ kind: 'refuted', text: 'Qe3? Then Qxe2.', replySan: 'Qxe2', replyFrom: 'd8', replyTo: 'e2' }); });

  async function play(reveal: boolean): Promise<void> {
    render(<PuzzleBoard puzzle={PUZZLE} onComplete={vi.fn()} maxWrongAttempts={1} revealOnFail={reveal} />);
    await screen.findByTestId('chess-board');
    await waitFor(() => expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument(), { timeout: 2000 });
    makeMoveSpy.mockClear();
    act(() => { latestOnMove!({ from: 'e2', to: 'e3', san: 'Qe3' }); });
  }

  it('a miss on the last try reads the refutation, then PLAYS the solution on the board', async () => {
    const { voiceService } = await import('../../services/voiceService');
    await play(true);
    await waitFor(() => expect(voiceService.speak).toHaveBeenCalledWith('Qe3? Then Qxe2.'));
    await waitFor(() => expect(makeMoveSpy).toHaveBeenCalledWith('e4', 'd6', undefined), { timeout: 6000 });
  });

  it('without revealOnFail nothing is played for the student', async () => {
    await play(false);
    await new Promise((r) => setTimeout(r, 4000));
    expect(makeMoveSpy).not.toHaveBeenCalled();
  });
});
