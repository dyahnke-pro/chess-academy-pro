/**
 * reset_board tool tests (WO-CEREBRUM-GRACEFUL-NOOP).
 *
 * Verifies the tool:
 *   - Returns ok=true with stub=true when no `onResetBoard` callback
 *     is wired (constitution: surface absence is not a failure).
 *   - Invokes the callback when wired and surfaces success.
 *   - Accepts boolean and `{ ok }` callback returns.
 *   - Surfaces a thrown callback as a tool error.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { resetBoardTool } from '../tools/cerebrum/resetBoard';

describe('reset_board tool', () => {
  it('graceful no-op when no onResetBoard callback is wired (stub=true)', async () => {
    const result = await resetBoardTool.execute({});
    expect(result.ok).toBe(true);
    const payload = result.result as { stub?: boolean; reason?: string };
    expect(payload.stub).toBe(true);
    expect(payload.reason).toMatch(/no onResetBoard callback/);
  });

  it('invokes the callback when wired', async () => {
    const callback = vi.fn(() => ({ ok: true }));
    const result = await resetBoardTool.execute(
      {},
      { onResetBoard: callback },
    );
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalled();
    expect(result.result).toMatchObject({ reset: true });
  });

  it('accepts a boolean return from the callback', async () => {
    const callback = vi.fn(() => true);
    const result = await resetBoardTool.execute(
      {},
      { onResetBoard: callback },
    );
    expect(result.ok).toBe(true);
  });

  it('surfaces a callback rejection as tool error', async () => {
    const callback = vi.fn(() => false);
    const result = await resetBoardTool.execute(
      {},
      { onResetBoard: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/rejected/);
  });

  it('surfaces a thrown callback error as tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('reset failed');
    });
    const result = await resetBoardTool.execute(
      {},
      { onResetBoard: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onResetBoard threw.*reset failed/);
  });
});
