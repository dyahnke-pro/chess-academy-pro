/**
 * take_back_move tool tests (WO-CEREBRUM-GRACEFUL-NOOP).
 *
 * Verifies the tool:
 *   - Returns ok=true with stub=true when no `onTakeBackMove` callback
 *     is wired (constitution: surface absence is not a failure).
 *   - Invokes the callback with the requested count when wired and
 *     surfaces success.
 *   - Accepts boolean and `{ ok, reason }` callback returns.
 *   - Surfaces a thrown callback as a tool error.
 *   - Defaults count to 1 when args.count is omitted.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { takeBackMoveTool } from '../tools/cerebrum/takeBackMove';

describe('take_back_move tool', () => {
  it('graceful no-op when no onTakeBackMove callback is wired (stub=true)', async () => {
    const result = await takeBackMoveTool.execute({ count: 2 });
    expect(result.ok).toBe(true);
    const payload = result.result as {
      stub?: boolean;
      requested?: { count?: number };
      reason?: string;
    };
    expect(payload.stub).toBe(true);
    expect(payload.requested?.count).toBe(2);
    expect(payload.reason).toMatch(/no onTakeBackMove callback/);
  });

  it('defaults count to 1 in the stub when args.count is missing', async () => {
    const result = await takeBackMoveTool.execute({});
    expect(result.ok).toBe(true);
    const payload = result.result as { requested?: { count?: number } };
    expect(payload.requested?.count).toBe(1);
  });

  it('invokes the callback with the requested count when wired', async () => {
    const callback = vi.fn(() => ({ ok: true }));
    const result = await takeBackMoveTool.execute(
      { count: 2 },
      { onTakeBackMove: callback },
    );
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledWith(2);
    expect(result.result).toMatchObject({ count: 2, reverted: true });
  });

  it('accepts a boolean return from the callback', async () => {
    const callback = vi.fn(() => true);
    const result = await takeBackMoveTool.execute(
      { count: 1 },
      { onTakeBackMove: callback },
    );
    expect(result.ok).toBe(true);
  });

  it('surfaces a callback rejection with reason', async () => {
    const callback = vi.fn(() => ({ ok: false, reason: 'nothing to undo' }));
    const result = await takeBackMoveTool.execute(
      { count: 1 },
      { onTakeBackMove: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nothing to undo/);
  });

  it('surfaces a thrown callback error as tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('history corrupted');
    });
    const result = await takeBackMoveTool.execute(
      { count: 1 },
      { onTakeBackMove: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onTakeBackMove threw.*history corrupted/);
  });
});
