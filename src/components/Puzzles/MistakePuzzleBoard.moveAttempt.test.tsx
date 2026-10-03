/**
 * The game-mistake drill emits a `move-attempt` row on EVERY move input, in
 * the same shape PuzzleBoard does (walk 2026-10-03: My Weaknesses drills wrote
 * no per-move rows, so the hint-effectiveness join and the per-puzzle attempt
 * count were blind there). Right and wrong, both.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { db } from '../../db/schema';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';
import type { MoveResult } from '../../hooks/useChessGame';

const auditSpy = vi.hoisted(() => vi.fn());
vi.mock('../../services/appAuditor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/appAuditor')>();
  return {
    ...actual,
    logAppAudit: (...args: unknown[]): Promise<void> => { auditSpy(...args); return Promise.resolve(); },
  };
});
vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});
vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({ playMoveSound: vi.fn(), playCelebration: vi.fn(), playEncouragement: vi.fn() }),
}));
const stableHintState = { level: 0, arrows: [], nudgeText: null, ghostMove: null, isAnalyzing: false, hintsUsed: 0, resolvedBestMove: null };
const stableRequestHint = vi.fn();
const stableResetHints = vi.fn();
vi.mock('../../hooks/useHintSystem', () => ({
  useHintSystem: () => ({ hintState: stableHintState, requestHint: stableRequestHint, resetHints: stableResetHints }),
}));
let latestOnMove: ((m: MoveResult) => void) | null = null;
vi.mock('../Board/ChessBoard', () => ({
  ChessBoard: (props: { onMove: (m: MoveResult) => void }) => {
    latestOnMove = props.onMove;
    return <div data-testid="mock-board" />;
  },
}));

const AFTER_1E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface AttemptDetails {
  surface: string;
  fen: string;
  attemptedSan: string;
  correctSan: string;
  isCorrect: boolean;
  sourceId: string;
}
function attempts(): AttemptDetails[] {
  return auditSpy.mock.calls
    .map((c) => c[0] as { kind: string; details?: string })
    .filter((e) => e.kind === 'move-attempt')
    .map((e) => JSON.parse(e.details ?? '{}') as AttemptDetails);
}

describe('MistakePuzzleBoard — move-attempt rows', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    auditSpy.mockClear();
    latestOnMove = null;
    await db.delete();
    await db.open();
  });

  it('a wrong try then the right move each emit one row, keyed on the board BEFORE the attempt', async () => {
    const puzzle = buildMistakePuzzle({
      fen: AFTER_1E4_E5, playerMove: 'f2f4', playerMoveSan: 'f4',
      bestMove: 'g1f3', bestMoveSan: 'Nf3', moves: 'g1f3', playerColor: 'white', cpLoss: 120,
      narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onResolved={vi.fn()} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');
    await act(async () => { await sleep(150); });

    await act(async () => {
      latestOnMove!({ from: 'd2', to: 'd4', san: 'd4', fen: '', pgn: '', history: [], moveNumber: 2, turn: 'w' });
    });
    await act(async () => { await sleep(1700); }); // back to playing after the miss
    await act(async () => {
      latestOnMove!({ from: 'g1', to: 'f3', san: 'Nf3', fen: '', pgn: '', history: [], moveNumber: 2, turn: 'w' });
    });

    const rows = attempts();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      surface: 'mistake-puzzle', attemptedSan: 'd4', isCorrect: false, correctSan: 'g1f3', fen: AFTER_1E4_E5, sourceId: puzzle.id,
    });
    expect(rows[1]).toMatchObject({ attemptedSan: 'Nf3', isCorrect: true, fen: AFTER_1E4_E5 });
  });
});
