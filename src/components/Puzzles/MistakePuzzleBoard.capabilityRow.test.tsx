/**
 * A REAL ROW COMES OUT — not a spy, the store (WO-3 S3).
 *
 * "A wire that does not fire is not a wire" (CLAUDE.md). The sibling file
 * proves the drill board CALLS the evidence door with honest arguments; this
 * one runs the real door and reads the real store. It uses the position session
 * A's own `capabilityEvidence.test.ts` proves POSES a capability — after 1.e4
 * e5, White's Nf3 — because a quiet developing move in the factory puzzle
 * (…Nf6 position, d4) poses nothing, and a gate that could pass on an empty set
 * is worse than no gate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test/utils';
import { db } from '../../db/schema';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { buildMistakePuzzle, resetFactoryCounter } from '../../test/factories';
import type { MoveResult } from '../../hooks/useChessGame';

vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});
vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({ playMoveSound: vi.fn(), playCelebration: vi.fn(), playEncouragement: vi.fn() }),
}));
// Stable identities — see the sibling file for why a fresh fn per render hangs.
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

/** After 1.e4 e5 — the position `capabilityEvidence.test.ts` proves Nf3 poses on. */
const AFTER_1E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

describe('a solved drill lands a HELD row in the capability store', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    latestOnMove = null;
    await db.delete();
    await db.open();
  });

  it('origin drill, outcome held, unprompted — the heat map can now go green from a drill', async () => {
    const puzzle = buildMistakePuzzle({
      fen: AFTER_1E4_E5,
      playerMove: 'f2f4', playerMoveSan: 'f4',        // the slip drilled
      bestMove: 'g1f3', bestMoveSan: 'Nf3',
      moves: 'g1f3',                                    // one student move solves it
      playerColor: 'white',
      cpLoss: 120,
      narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    });
    render(<MistakePuzzleBoard puzzle={puzzle} onComplete={vi.fn()} skipReplayContext />);
    await screen.findByTestId('mock-board');

    await act(async () => {
      latestOnMove!({ from: 'g1', to: 'f3', san: 'Nf3', fen: '', pgn: '', history: [], moveNumber: 2, turn: 'w' });
    });
    // The write is fire-and-forget; give the microtask + Dexie a beat.
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });

    const rows = await db.capabilityEvidence.toArray();
    expect(rows.length, 'no capability row was written by the drill').toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.origin).toBe('drill');
      expect(r.outcome).toBe('held');
      expect(r.prompted).toBe(false);
      expect(r.fen).toBe(AFTER_1E4_E5);
    }
  });
});
