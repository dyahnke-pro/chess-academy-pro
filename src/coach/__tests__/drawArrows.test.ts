/**
 * draw_arrows tool tests (WO-COACH-ARROWS).
 *
 * Mirrors the existing cerebrum tool test structure (navigateToRoute,
 * playMove, etc.). Verifies:
 *   - graceful no-op when callback missing (stub=true)
 *   - callback wired with valid args succeeds
 *   - invalid square format rejected with precise error
 *   - empty arrows array rejected
 *   - more than 4 arrows rejected
 *   - color must be 'green' or 'red'
 *   - thrown callback surfaces as tool error
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { drawArrowsTool } from '../tools/cerebrum/drawArrows';
import type { ArrowSpec } from '../types';

describe('draw_arrows tool', () => {
  it('graceful no-op when no onDrawArrows callback is wired (stub=true)', async () => {
    const result = await drawArrowsTool.execute({
      arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
    });
    expect(result.ok).toBe(true);
    const payload = result.result as {
      stub?: boolean;
      requested?: { arrowCount?: number };
      reason?: string;
    };
    expect(payload.stub).toBe(true);
    expect(payload.requested?.arrowCount).toBe(1);
    expect(payload.reason).toMatch(/no onDrawArrows callback/);
  });

  it('invokes the callback with validated arrows', async () => {
    const callback = vi.fn();
    const arrows: ArrowSpec[] = [
      { from: 'e2', to: 'e4', color: 'green' },
      { from: 'd2', to: 'd4', color: 'red' },
    ];
    const result = await drawArrowsTool.execute({ arrows }, { onDrawArrows: callback });
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(arrows);
    const payload = result.result as { drawn?: number };
    expect(payload.drawn).toBe(2);
  });

  it('rejects empty arrows array', async () => {
    const callback = vi.fn();
    const result = await drawArrowsTool.execute(
      { arrows: [] },
      { onDrawArrows: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/empty/);
    expect(callback).not.toHaveBeenCalled();
  });

  it('rejects more than 4 arrows', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      from: 'e2',
      to: `e${i + 3}`.slice(0, 2),
      color: 'green' as const,
    }));
    // The naive split above produces invalid squares for i>=5, but the
    // count check fires before per-entry validation. Build a clean five.
    const cleanFive: ArrowSpec[] = [
      { from: 'e2', to: 'e4', color: 'green' },
      { from: 'd2', to: 'd4', color: 'green' },
      { from: 'g1', to: 'f3', color: 'green' },
      { from: 'b1', to: 'c3', color: 'green' },
      { from: 'f1', to: 'c4', color: 'green' },
    ];
    const callback = vi.fn();
    const result = await drawArrowsTool.execute(
      { arrows: cleanFive },
      { onDrawArrows: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/too many arrows/);
    expect(callback).not.toHaveBeenCalled();
    void five; // documentation aid; unused
  });

  it('rejects when arrows is not an array', async () => {
    const result = await drawArrowsTool.execute(
      { arrows: 'not-an-array' as unknown as ArrowSpec[] },
      { onDrawArrows: vi.fn() },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/must be an array/);
  });

  it('rejects invalid square format on from', async () => {
    const result = await drawArrowsTool.execute(
      { arrows: [{ from: 'i9', to: 'e4', color: 'green' }] },
      { onDrawArrows: vi.fn() },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/from "i9"/);
  });

  it('rejects invalid square format on to', async () => {
    const result = await drawArrowsTool.execute(
      { arrows: [{ from: 'e2', to: 'z9', color: 'green' }] },
      { onDrawArrows: vi.fn() },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/to "z9"/);
  });

  it('rejects invalid color', async () => {
    const result = await drawArrowsTool.execute(
      { arrows: [{ from: 'e2', to: 'e4', color: 'blue' as unknown as 'green' }] },
      { onDrawArrows: vi.fn() },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/color "blue"/);
  });

  it('surfaces a thrown callback error as a tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('board unmounted');
    });
    const result = await drawArrowsTool.execute(
      { arrows: [{ from: 'e2', to: 'e4', color: 'green' }] },
      { onDrawArrows: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onDrawArrows threw.*board unmounted/);
  });

  it('accepts the maximum 4 arrows', async () => {
    const four: ArrowSpec[] = [
      { from: 'e2', to: 'e4', color: 'green' },
      { from: 'd2', to: 'd4', color: 'green' },
      { from: 'g1', to: 'f3', color: 'red' },
      { from: 'b1', to: 'c3', color: 'red' },
    ];
    const callback = vi.fn();
    const result = await drawArrowsTool.execute(
      { arrows: four },
      { onDrawArrows: callback },
    );
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledWith(four);
  });
});
