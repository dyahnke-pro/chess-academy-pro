/**
 * navigate_to_route tool tests (WO-BRAIN-04).
 *
 * Verifies the tool, post-stub:
 *   - Rejects empty path.
 *   - Rejects paths not in the manifest (manifest is the gate).
 *   - Accepts param-pattern matches (`/openings/:id` matches
 *     `/openings/caro-kann`).
 *   - Invokes `onNavigate` callback when wired and returns ok.
 *   - Falls back to stub mode (audit-only success) when no callback
 *     is wired — keeps unmigrated surfaces from failing outright.
 *   - Surfaces a thrown navigate callback as a tool error.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { navigateToRouteTool } from '../tools/cerebrum/navigateToRoute';

describe('navigate_to_route tool (real)', () => {
  it('errors on empty path', async () => {
    const result = await navigateToRouteTool.execute({ path: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/path is required/);
  });

  it('rejects paths not in the manifest', async () => {
    const result = await navigateToRouteTool.execute({
      path: '/this-route-does-not-exist',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found in app manifest/);
  });

  it('accepts an exact-match path from the manifest', async () => {
    const result = await navigateToRouteTool.execute({ path: '/openings' });
    expect(result.ok).toBe(true);
  });

  it('accepts a param-pattern match (e.g. /openings/:id)', async () => {
    const result = await navigateToRouteTool.execute({
      path: '/openings/caro-kann',
    });
    expect(result.ok).toBe(true);
  });

  it('invokes onNavigate callback when wired', async () => {
    const callback = vi.fn();
    const result = await navigateToRouteTool.execute(
      { path: '/openings' },
      { onNavigate: callback },
    );
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledWith('/openings');
    // Stub flag is OFF when a real callback fired.
    expect((result.result as { stub?: boolean }).stub).toBeUndefined();
  });

  it('falls back to stub mode when no onNavigate callback is wired', async () => {
    const result = await navigateToRouteTool.execute({ path: '/openings' });
    expect(result.ok).toBe(true);
    expect((result.result as { stub?: boolean }).stub).toBe(true);
  });

  it('surfaces a thrown onNavigate as a tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('router unmounted');
    });
    const result = await navigateToRouteTool.execute(
      { path: '/openings' },
      { onNavigate: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onNavigate threw.*router unmounted/);
  });
});
