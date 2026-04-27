/**
 * clear_arrows tool tests (WO-COACH-ARROWS).
 *
 * Verifies the graceful no-op pattern + callback dispatch path.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { clearArrowsTool } from '../tools/cerebrum/clearArrows';

describe('clear_arrows tool', () => {
  it('graceful no-op when no onClearArrows callback is wired (stub=true)', async () => {
    const result = await clearArrowsTool.execute({});
    expect(result.ok).toBe(true);
    const payload = result.result as { stub?: boolean; reason?: string };
    expect(payload.stub).toBe(true);
    expect(payload.reason).toMatch(/no onClearArrows callback/);
  });

  it('invokes the callback when wired', async () => {
    const callback = vi.fn();
    const result = await clearArrowsTool.execute({}, { onClearArrows: callback });
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.result).toMatchObject({ cleared: true });
  });

  it('surfaces a thrown callback error as a tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('board unmounted');
    });
    const result = await clearArrowsTool.execute({}, { onClearArrows: callback });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onClearArrows threw.*board unmounted/);
  });
});
