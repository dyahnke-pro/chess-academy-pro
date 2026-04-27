/**
 * set_board_position tool tests (WO-CEREBRUM-GRACEFUL-NOOP).
 *
 * Verifies the tool:
 *   - Rejects empty / invalid FEN before reaching the callback.
 *   - Returns ok=true with stub=true when no `onSetBoardPosition`
 *     callback is wired (constitution: surface absence is not a failure).
 *   - Invokes the callback with a valid FEN when wired and surfaces
 *     success.
 *   - Accepts boolean and `{ ok, reason }` callback returns.
 *   - Surfaces a thrown callback as a tool error.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { setBoardPositionTool } from '../tools/cerebrum/setBoardPosition';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('set_board_position tool', () => {
  it('errors on empty FEN', async () => {
    const result = await setBoardPositionTool.execute({ fen: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/fen is required/);
  });

  it('errors on invalid FEN before reaching the callback', async () => {
    const callback = vi.fn(() => true);
    const result = await setBoardPositionTool.execute(
      { fen: 'not a real fen' },
      { onSetBoardPosition: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid FEN/);
    expect(callback).not.toHaveBeenCalled();
  });

  it('graceful no-op when no onSetBoardPosition callback is wired (stub=true)', async () => {
    const result = await setBoardPositionTool.execute({ fen: STARTING_FEN });
    expect(result.ok).toBe(true);
    const payload = result.result as {
      stub?: boolean;
      requested?: { fen?: string };
      reason?: string;
    };
    expect(payload.stub).toBe(true);
    expect(payload.requested?.fen).toBe(STARTING_FEN);
    expect(payload.reason).toMatch(/no onSetBoardPosition callback/);
  });

  it('invokes the callback with the validated FEN when wired', async () => {
    const callback = vi.fn(() => ({ ok: true }));
    const result = await setBoardPositionTool.execute(
      { fen: STARTING_FEN },
      { onSetBoardPosition: callback },
    );
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledWith(STARTING_FEN);
    expect(result.result).toMatchObject({ fen: STARTING_FEN });
  });

  it('accepts a boolean return from the callback', async () => {
    const callback = vi.fn(() => true);
    const result = await setBoardPositionTool.execute(
      { fen: STARTING_FEN },
      { onSetBoardPosition: callback },
    );
    expect(result.ok).toBe(true);
  });

  it('surfaces a callback rejection with reason', async () => {
    const callback = vi.fn(() => ({ ok: false, reason: 'mid-game lock' }));
    const result = await setBoardPositionTool.execute(
      { fen: STARTING_FEN },
      { onSetBoardPosition: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/mid-game lock/);
  });

  it('surfaces a thrown callback error as tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('chess instance frozen');
    });
    const result = await setBoardPositionTool.execute(
      { fen: STARTING_FEN },
      { onSetBoardPosition: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onSetBoardPosition threw.*chess instance frozen/);
  });
});
