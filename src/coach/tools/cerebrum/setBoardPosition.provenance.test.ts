/**
 * THE G0 INVERSION ON `set_board_position`, DRIVEN END TO END (2026-09-21).
 *
 * The old guard was a prompt ("do NOT hand-write a FEN from memory") plus a
 * fullmove-number check. These tests are written against what each of those
 * FAILED to do, so a regression that reinstates either shape goes red:
 *
 *  - a hallucinated DEEP position used to pass (fullmove > 12 was unguarded);
 *  - a REAL position early in a game used to be refused (fullmove ≤ 12);
 *  - and nothing ever checked origin at all.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { setBoardPositionTool } from './setBoardPosition';
import {
  rememberComputedPosition, clearRememberedPositions, positionKey,
} from '../../../services/positionProvenance';
import type { ToolExecutionContext } from '../../types';

function ctx(): ToolExecutionContext & { last: string | null } {
  const o = {
    last: null as string | null,
    onSetBoardPosition: vi.fn((fen: string) => { o.last = fen; return { ok: true }; }),
  };
  return o as unknown as ToolExecutionContext & { last: string | null };
}

/** A real, legal board the app never produced — i.e. exactly what a recalled
 *  FEN looks like. Deliberately DEEP (fullmove 47) because that is the case
 *  the deleted fullmove validator let straight through. */
const RECALLED_DEEP = '8/5pk1/6p1/8/5PK1/8/8/8 w - - 0 47';

describe('set_board_position — a FEN must come from this app', () => {
  beforeEach(() => { clearRememberedPositions(); });

  it('REFUSES a deep FEN the app never produced (the case the old check missed)', async () => {
    expect(new Chess(RECALLED_DEEP).fen()).toBeTruthy();  // it IS a legal board
    const c = ctx();
    const r = await setBoardPositionTool.execute({ fen: RECALLED_DEEP }, c);
    expect(r.ok).toBe(false);
    expect(c.last, 'the board must not have moved').toBeNull();
  });

  it('ACCEPTS a FEN the app produced', async () => {
    rememberComputedPosition(RECALLED_DEEP, 'game-timeline');
    const c = ctx();
    const r = await setBoardPositionTool.execute({ fen: RECALLED_DEEP }, c);
    expect(r.ok).toBe(true);
    expect(c.last).toBe(RECALLED_DEEP);
  });

  it('ACCEPTS a REAL early position — the old fullmove check refused these', async () => {
    const g = new Chess();
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6']) g.move(san);
    rememberComputedPosition(g.fen(), 'live-board');
    const c = ctx();
    const r = await setBoardPositionTool.execute({ fen: g.fen() }, c);
    expect(r.ok, 'fullmove 3 is fine when the app produced it').toBe(true);
  });

  it('matches on the POSITION, not the clock string', async () => {
    // Two honest routes to one board disagree on halfmove/fullmove. Comparing
    // whole strings would refuse a real position, which is the worse error.
    const g = new Chess();
    for (const san of ['d4', 'd5']) g.move(san);
    rememberComputedPosition(g.fen(), 'replayed-line');
    const sameBoardOtherClock = `${positionKey(g.fen())} 9 30`;
    const c = ctx();
    expect((await setBoardPositionTool.execute({ fen: sameBoardOtherClock }, c)).ok).toBe(true);
  });

  it('the refusal distinguishes an EMPTY record from a missing entry', async () => {
    const empty = await setBoardPositionTool.execute({ fen: RECALLED_DEEP }, ctx());
    expect(String(empty.error)).toMatch(/has not produced any position yet/i);

    rememberComputedPosition(new Chess().fen(), 'live-board');
    const missing = await setBoardPositionTool.execute({ fen: RECALLED_DEEP }, ctx());
    expect(String(missing.error)).toMatch(/did not come from this app/i);
  });

  it('a refusal always names the grounded routes, never just "no"', async () => {
    const r = await setBoardPositionTool.execute({ fen: RECALLED_DEEP }, ctx());
    expect(String(r.error)).toMatch(/moves/);
    expect(String(r.error)).toMatch(/named/);
  });
});

describe('set_board_position — the two grounded routes still work', () => {
  beforeEach(() => { clearRememberedPositions(); });

  it('`moves` replays a real line and REMEMBERS the result', async () => {
    const c = ctx();
    const r = await setBoardPositionTool.execute({ moves: 'd4 Nf6 c4 e6 g3 d5' }, c);
    expect(r.ok).toBe(true);
    // Having been replayed by code, the same board is now settable by fen —
    // which is what makes "put that back up" work a few turns later.
    const again = await setBoardPositionTool.execute({ fen: c.last! }, ctx());
    expect(again.ok).toBe(true);
  });

  it('`moves` still collapses an invented line', async () => {
    const c = ctx();
    const r = await setBoardPositionTool.execute({ moves: 'e4 e5 Qh9' }, c);
    expect(r.ok).toBe(false);
    expect(c.last).toBeNull();
  });

  it('`named` resolves through the APP corpus, not the model', async () => {
    const c = ctx();
    const r = await setBoardPositionTool.execute({ named: 'back-rank mate' }, c);
    expect(r.ok).toBe(true);
    expect(c.last, 'the app supplied a real board').toBeTruthy();
    expect(() => new Chess(c.last!)).not.toThrow();
  });

  it('an unknown `named` REFUSES and lists what exists', async () => {
    const c = ctx();
    const r = await setBoardPositionTool.execute({ named: 'the Zurich 1953 rook ending' }, c);
    expect(r.ok).toBe(false);
    expect(c.last).toBeNull();
    expect(String(r.error)).toMatch(/do not substitute one from memory/i);
  });
});
