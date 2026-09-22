/**
 * THE SIXTH HAND REACHES ITS HOST (WO-STANDARD-01 H2).
 *
 * `start-walkthrough` is hybrid: in place when a surface registered a host,
 * else QUEUED and the student routed to Learn, which drains the queue on mount.
 * The old no-host fallback navigated to `/coach/teach?opening=`, which Learn
 * answers with a greeting — a trip, not the lesson. Both halves are proven on
 * output: the handler's argument, or the queue row plus the route.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  actuate, registerCoachHands, clearCoachHands, registerCoachNavigate, clearCoachNavigate,
} from './coachActuator';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';

beforeEach(() => {
  clearCoachHands();
  clearCoachNavigate();
  useCoachMemoryStore.setState({ pendingWalkthrough: null });
});

describe('start-walkthrough', () => {
  it('with a host mounted, runs IN PLACE and queues nothing', async () => {
    const host = vi.fn().mockReturnValue({ ok: true });
    const nav = vi.fn();
    registerCoachNavigate(nav);
    registerCoachHands({ startWalkthrough: host });
    const r = await actuate({ hand: 'start-walkthrough', opening: 'Italian Game', variation: 'Two Knights' });
    expect(r.ok).toBe(true);
    expect(host).toHaveBeenCalledWith(expect.objectContaining({ opening: 'Italian Game', variation: 'Two Knights' }));
    expect(nav).not.toHaveBeenCalled();
    expect(useCoachMemoryStore.getState().pendingWalkthrough).toBeNull();
  });

  it('with NO host, queues the ask and routes to Learn — honestly ok:false, and the sentence forbids a second navigate', async () => {
    const nav = vi.fn();
    registerCoachNavigate(nav);
    const r = await actuate({ hand: 'start-walkthrough', opening: 'Italian Game', orientation: 'black' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/QUEUED/);
    expect(r.reason).toMatch(/do NOT call navigate_to_route again/);
    expect(r.reason).toMatch(/do NOT tell them the board is already set up/);
    expect(nav).toHaveBeenCalledWith('/coach/teach');
    const queued = useCoachMemoryStore.getState().pendingWalkthrough;
    expect(queued?.opening).toBe('Italian Game');
    expect(queued?.orientation).toBe('black');
  });

  it('with no host AND no navigator, refuses without queueing — nothing would ever drain it', async () => {
    const r = await actuate({ hand: 'start-walkthrough', opening: 'Italian Game' });
    expect(r.ok).toBe(false);
    expect(useCoachMemoryStore.getState().pendingWalkthrough).toBeNull();
  });
});
