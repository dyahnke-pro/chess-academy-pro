/**
 * play_move tool tests (WO-BRAIN-04).
 *
 * Verifies the tool, post-stub:
 *   - Rejects empty SAN.
 *   - Errors when no `onPlayMove` callback is wired (the tool can't
 *     silently no-op or surfaces would think their move played).
 *   - Validates SAN against `liveFen` via chess.js before invoking
 *     the surface callback (illegal SANs never reach the callback).
 *   - Invokes `onPlayMove` with the SAN and surfaces its result.
 *   - Accepts both boolean and `{ ok, reason }` callback returns.
 *   - Surfaces a callback's thrown error as a tool error.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { playMoveTool } from '../tools/cerebrum/playMove';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('play_move tool (real)', () => {
  it('errors on empty SAN', async () => {
    const result = await playMoveTool.execute({ san: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/san is required/);
  });

  it('errors when no onPlayMove callback is wired', async () => {
    const result = await playMoveTool.execute({ san: 'e4' }, { liveFen: STARTING_FEN });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no onPlayMove callback/);
  });

  it('rejects illegal SAN against the live FEN before calling the callback', async () => {
    const callback = vi.fn(() => true);
    const result = await playMoveTool.execute(
      { san: 'Nf6' }, // illegal as White's first move
      { liveFen: STARTING_FEN, onPlayMove: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/illegal|invalid|rejected/i);
    expect(callback).not.toHaveBeenCalled();
  });

  it('invokes onPlayMove with the SAN when legal', async () => {
    const callback = vi.fn(() => ({ ok: true }));
    const result = await playMoveTool.execute(
      { san: 'e4' },
      { liveFen: STARTING_FEN, onPlayMove: callback },
    );
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledWith('e4');
    expect(result.result).toMatchObject({ san: 'e4', played: true });
  });

  it('accepts a boolean return from onPlayMove', async () => {
    const callback = vi.fn(() => true);
    const result = await playMoveTool.execute(
      { san: 'd4' },
      { liveFen: STARTING_FEN, onPlayMove: callback },
    );
    expect(result.ok).toBe(true);
  });

  it('surfaces a callback rejection with reason', async () => {
    const callback = vi.fn(() => ({ ok: false, reason: 'cancelled' }));
    const result = await playMoveTool.execute(
      { san: 'e4' },
      { liveFen: STARTING_FEN, onPlayMove: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/cancelled/);
  });

  it('surfaces a thrown callback error as tool error', async () => {
    const callback = vi.fn(() => {
      throw new Error('boom');
    });
    const result = await playMoveTool.execute(
      { san: 'e4' },
      { liveFen: STARTING_FEN, onPlayMove: callback },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/onPlayMove threw.*boom/);
  });

  it('skips FEN validation when no liveFen is provided (callback owns it)', async () => {
    const callback = vi.fn(() => ({ ok: true }));
    const result = await playMoveTool.execute(
      { san: 'Nf3' },
      { onPlayMove: callback },
    );
    expect(result.ok).toBe(true);
    expect(callback).toHaveBeenCalledWith('Nf3');
  });
});
