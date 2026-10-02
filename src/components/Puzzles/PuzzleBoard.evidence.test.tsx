import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../../test/utils';
import { PuzzleBoard } from './PuzzleBoard';
import type { PuzzleRecord } from '../../types';

// Lichess puzzles wrote NOTHING to the student model (hand walk 2026-10-01):
// solve fifty pins and the coach never learned it. The first answer is the
// evidence, origin 'puzzle' (generic position — can support, never prove alone).

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
    makeMove: vi.fn().mockReturnValue({ san: 'Nbd7' }),
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
vi.mock('../../services/tacticClassifierService', () => ({
  getTacticTypeFromThemes: vi.fn().mockReturnValue(null), getPrimaryThemeLabel: vi.fn().mockReturnValue(null),
}));
vi.mock('../../stores/appStore', () => ({ useAppStore: () => null }));
vi.mock('../../hooks/useStudentRecord', () => ({ useStudentRecord: () => ({ current: { weaknesses: [], capabilities: null } }) }));
vi.mock('../../services/capabilityEvidence', () => ({ recordCapabilityEvidence: vi.fn().mockResolvedValue(1) }));
const readWrongTry = vi.fn();
vi.mock('../../services/wrongTryRefutation', async (orig) => ({ ...(await orig<typeof import('../../services/wrongTryRefutation')>()), readWrongTry: (...a: unknown[]) => readWrongTry(...a) }));

const PUZZLE: PuzzleRecord = {
  id: '0Flch',
  fen: 'rn1qkb1r/pp2ppp1/3p1n1p/2pP4/4N3/2P5/PP2QPPP/RNB1K2R b KQkq - 1 9',
  moves: 'b8d7 e4d6', rating: 1393, themes: ['mate', 'mateIn1', 'pin', 'smotheredMate'],
  openingTags: null, popularity: 80, nbPlays: 1000, srsInterval: 0, srsEaseFactor: 2.5,
  srsRepetitions: 0, srsDueDate: '2026-10-01', srsLastReview: null, userRating: 1200, attempts: 0, successes: 0,
};
const AFTER_OPP = 'r2qkb1r/pp1nppp1/3p1n1p/2pP4/4N3/2P5/PP2QPPP/RNB1K2R w KQkq - 2 10';

async function ready(): Promise<void> {
  render(<PuzzleBoard surface="classic" puzzle={PUZZLE} onComplete={vi.fn()} />);
  await screen.findByTestId('chess-board');
  await waitFor(() => expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument(), { timeout: 2000 });
}

describe('PuzzleBoard writes the first answer to the record', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    latestOnMove = null;
  });

  it('a clean first answer is HELD, origin puzzle, unprompted', async () => {
    const { recordCapabilityEvidence } = await import('../../services/capabilityEvidence');
    await ready();
    act(() => { latestOnMove!({ from: 'e4', to: 'd6', san: 'Nd6#' }); });
    expect(recordCapabilityEvidence).toHaveBeenCalledTimes(1);
    expect(recordCapabilityEvidence).toHaveBeenCalledWith(expect.objectContaining({
      fenBefore: AFTER_OPP, playedSan: 'Nd6#', moverColor: 'white', cpLoss: 0, origin: 'puzzle', prompted: false,
    }));
  });

  it('a genuinely wrong first answer is BROKEN at the puzzle\'s stakes', async () => {
    const { recordCapabilityEvidence } = await import('../../services/capabilityEvidence');
    readWrongTry.mockResolvedValue({ kind: 'refuted', text: 'x', replySan: 'Qxe2', replyFrom: 'd8', replyTo: 'e2' });
    await ready();
    act(() => { latestOnMove!({ from: 'e2', to: 'e3', san: 'Qe3' }); });
    await waitFor(() => expect(recordCapabilityEvidence).toHaveBeenCalledTimes(1));
    expect(recordCapabilityEvidence).toHaveBeenCalledWith(expect.objectContaining({
      playedSan: 'Qe3', cpLoss: 300, origin: 'puzzle', prompted: false,
    }));
  });

  it('a first answer that still wins is not a failure — nothing recorded', async () => {
    const { recordCapabilityEvidence } = await import('../../services/capabilityEvidence');
    readWrongTry.mockResolvedValue({ kind: 'also-good', text: 'x' });
    await ready();
    act(() => { latestOnMove!({ from: 'e2', to: 'e3', san: 'Qe3' }); });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(recordCapabilityEvidence).not.toHaveBeenCalled();
  });
});
