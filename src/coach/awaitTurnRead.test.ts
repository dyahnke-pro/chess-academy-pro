import { describe, it, expect, vi, afterEach } from 'vitest';
import { awaitTurnRead, READ_BUDGET_MS } from './dispatchCoachTurn';
import { fastPathLane } from './chatTurn';

afterEach(() => { vi.useRealTimers(); });
const never = (): Promise<null> => new Promise(() => { /* the model never answers */ });

describe('the reading never holds a question the code understands (Learn trace 2026-10-19)', () => {
  it('a fast-path question goes on after the budget without the reading', async () => {
    expect(fastPathLane('why is that move best?')).not.toBe('none');
    vi.useFakeTimers();
    let done = false;
    const p = awaitTurnRead(never(), 'why is that move best?', undefined).then((r) => { done = true; return r; });
    await vi.advanceTimersByTimeAsync(READ_BUDGET_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await p).toBeNull();
  });
  it('a turn the code cannot place waits for the reading', async () => {
    const ask = 'mmm, the knight thing from before?';
    expect(fastPathLane(ask)).toBe('none');
    vi.useFakeTimers();
    let done = false;
    void awaitTurnRead(never(), ask, undefined).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(READ_BUDGET_MS * 4);
    expect(done).toBe(false);
  });
});
