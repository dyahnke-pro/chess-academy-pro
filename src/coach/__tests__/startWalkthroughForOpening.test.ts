import { describe, it, expect, vi } from 'vitest';
import { startWalkthroughForOpeningTool } from '../tools/cerebrum/startWalkthroughForOpening';

interface ToolResult {
  ok: boolean;
  result?: { stub?: boolean; opening?: string; variation?: string };
  error?: string;
}

describe('start_walkthrough_for_opening tool', () => {
  it('rejects when opening is missing', async () => {
    const r = (await startWalkthroughForOpeningTool.execute({})) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/opening is required/);
  });

  it('refuses honestly (ok:false) when no callback wired — never fake success (David 2026-09-08)', async () => {
    const r = (await startWalkthroughForOpeningTool.execute({
      opening: 'Italian Game',
    })) as ToolResult;
    expect(r.ok).toBe(false);
    // 🔴 WAS /can't host one|navigate to learn/i — the pre-2026-09-19 wording.
    // `2bfb4961c` ("twelve defects read off real user sessions") rewrote the
    // refusal to say the lesson is QUEUED and to route via navigate_to_route,
    // so the test asserted a sentence the coach had stopped saying eleven days
    // earlier. Corrected to the shipped text, not annotated.
    //
    // The INTENT is unchanged and is what these two lines pin: the refusal is
    // honest about not having started (with ok:false above), and it POINTS the
    // student somewhere instead of dead-ending.
    expect(r.error, 'must admit it did not start').toMatch(/cannot host a walkthrough/i);
    expect(r.error, 'must route the student somewhere').toMatch(/navigate_to_route|\/coach\/teach/i);
  });

  it('passes opening + variation + orientation to the surface', async () => {
    const cb = vi.fn().mockResolvedValue({ ok: true });
    const r = (await startWalkthroughForOpeningTool.execute(
      {
        opening: 'Italian Game',
        variation: 'Two Knights Defense',
        orientation: 'white',
      },
      { onStartWalkthroughForOpening: cb },
    )) as ToolResult;
    expect(cb).toHaveBeenCalledWith({
      opening: 'Italian Game',
      variation: 'Two Knights Defense',
      orientation: 'white',
      pgn: undefined,
    });
    expect(r.ok).toBe(true);
    expect(r.result?.opening).toBe('Italian Game');
  });

  it('forwards a PGN seed when provided', async () => {
    const cb = vi.fn().mockResolvedValue({ ok: true });
    await startWalkthroughForOpeningTool.execute(
      {
        opening: 'Caro-Kann Defense',
        pgn: '1. e4 c6 2. d4 d5',
      },
      { onStartWalkthroughForOpening: cb },
    );
    expect(cb).toHaveBeenCalledWith({
      opening: 'Caro-Kann Defense',
      variation: undefined,
      orientation: undefined,
      pgn: '1. e4 c6 2. d4 d5',
    });
  });

  it('passes through surface rejection', async () => {
    const cb = vi.fn().mockResolvedValue({ ok: false, reason: 'no walkthrough route registered' });
    const r = (await startWalkthroughForOpeningTool.execute(
      { opening: 'Italian Game' },
      { onStartWalkthroughForOpening: cb },
    )) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no walkthrough route registered/);
  });

  it('ignores invalid orientation', async () => {
    const cb = vi.fn().mockResolvedValue({ ok: true });
    await startWalkthroughForOpeningTool.execute(
      { opening: 'Italian Game', orientation: 'sideways' },
      { onStartWalkthroughForOpening: cb },
    );
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ orientation: undefined }),
    );
  });
});
