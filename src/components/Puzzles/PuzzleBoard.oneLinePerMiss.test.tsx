import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../../test/utils';
import { PuzzleBoard, type PuzzleOutcome } from './PuzzleBoard';
import type { PuzzleRecord } from '../../types';

// ONE LINE PER MISS (PostHog, David's phone, 2026-10-02): the struggle
// coach's method beat and the wrong-try refutation were spoken separately ~80ms
// apart, so the refutation cut the method off mid-sentence. The method that a
// miss earns now waits for the refutation and is spoken WITH it.

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
  (globalThis as { __requestHint?: unknown }).__requestHint = requestHint;
  const hintState = { level: 0 as const, arrows: [] as never[], ghostMove: null, nudgeText: '', isAnalyzing: false };
  return { useHintSystem: () => ({ hintState, requestHint, resetHints }) };
});
vi.mock('../../hooks/useBoardContext', () => ({ useBoardContext: vi.fn() }));
vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  const voiceService = buildVoiceServiceMock();
  voiceService.speakWhenIdle.mockImplementation((_t: string, o?: { onStart?: () => void }): void => { o?.onStart?.(); });
  return { voiceService };
});
let latestOnCoach: ((m: string, t: string) => void) | null = null;
vi.mock('../../hooks/useStruggleDetection', () => {
  const reset = vi.fn();
  return { useStruggleDetection: (o: { onCoach: (m: string, t: string) => void }) => { latestOnCoach = o.onCoach; return { reset }; } };
});
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

describe('PuzzleBoard — one spoken line per miss', () => {
  beforeEach(() => { vi.clearAllMocks(); latestOnMove = null; latestOnCoach = null; });

  it('the method beat the miss earned is spoken WITH the refutation, never cut by it', async () => {
    let resolveRead: (v: unknown) => void = () => undefined;
    readWrongTry.mockReturnValue(new Promise((r) => { resolveRead = r; }));
    const { voiceService } = await import('../../services/voiceService');
    render(<PuzzleBoard surface="classic" puzzle={PUZZLE} onComplete={vi.fn<(o: PuzzleOutcome) => void>()} maxWrongAttempts={5} />);
    await screen.findByTestId('chess-board');
    await waitFor(() => expect(screen.queryByTestId('puzzle-loading')).not.toBeInTheDocument(), { timeout: 2000 });
    act(() => { latestOnMove!({ from: 'e2', to: 'e3', san: 'Qe3' }); });
    // The struggle coach reacts to the miss BEFORE the refutation is read.
    act(() => { latestOnCoach!('This was the moment to slow down', 'nudge'); });
    expect(voiceService.speak).not.toHaveBeenCalled();
    expect(voiceService.speakWhenIdle).not.toHaveBeenCalled();
    await act(async () => { resolveRead({ kind: 'refuted', text: 'Qe3? Then Qxe2.', replySan: 'Qxe2', replyFrom: 'd8', replyTo: 'e2' }); });
    await waitFor(() => expect(voiceService.speak).toHaveBeenCalledTimes(1));
    expect(voiceService.speak).toHaveBeenCalledWith('Qe3? Then Qxe2. This was the moment to slow down.');
  });

  it('with no miss pending, a struggle line waits for the voice to be free — never cuts, never drops', async () => {
    const { voiceService } = await import('../../services/voiceService');
    render(<PuzzleBoard surface="classic" puzzle={PUZZLE} onComplete={vi.fn<(o: PuzzleOutcome) => void>()} />);
    await screen.findByTestId('chess-board');
    act(() => { latestOnCoach!('Take your time.', 'nudge'); });
    // Never over a line already playing: it waits its turn, it is not dropped.
    expect(voiceService.speakWhenIdle).toHaveBeenCalledWith('Take your time.', expect.objectContaining({ stale: expect.any(Function) }));
    expect(voiceService.stop).not.toHaveBeenCalled();
  });
});
