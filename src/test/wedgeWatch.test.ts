// The shared wedge detector (scripts/audit-lib/wedge-watch.mjs). Pure logic, so
// it is testable without a browser — which matters, because the bug it exists
// to prevent is a detector that could not fire.
import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — plain .mjs audit helper, no types by design
import { raced, wedgeWatch } from '../../scripts/audit-lib/wedge-watch.mjs';

describe('raced — a read can never hang the detector', () => {
  it('returns the fallback when the read never settles', async () => {
    const t0 = Date.now();
    const v = await raced(new Promise(() => { /* never settles, like a wedged page */ }), 'FALLBACK', 120);
    expect(v).toBe('FALLBACK');
    expect(Date.now() - t0).toBeLessThan(2000);
  });
  it('passes a healthy value straight through, and swallows a throw', async () => {
    expect(await raced(Promise.resolve(7), 0, 100)).toBe(7);
    expect(await raced(Promise.reject(new Error('boom')), 'SAFE', 100)).toBe('SAFE');
  });
});

describe('wedgeWatch — a run of dead reads is a wedge, a single one is not', () => {
  it('stays silent while reads succeed, and through a short blip', () => {
    const w = wedgeWatch({ unreadableLimit: 5 });
    for (let i = 0; i < 20; i++) w.observe(true, `ply ${i}`);
    for (let i = 0; i < 5; i++) w.observe(false);
    expect(w.reason).toBeNull();
    w.observe(true, 'ply 21');
    expect(w.consecutive).toBe(0);
  });
  it('trips past the limit and names where it was last alive', () => {
    const w = wedgeWatch({ unreadableLimit: 3, label: 'walk' });
    w.observe(true, 'ply 68/69');
    for (let i = 0; i < 4; i++) w.observe(false);
    expect(w.reason).toContain('stopped answering');
    expect(w.reason).toContain('ply 68/69');
    expect(w.reason).toContain('not a product result');
  });
  it('keeps the FIRST reason — a later poll must not rewrite the diagnosis', () => {
    const w = wedgeWatch({ unreadableLimit: 1 });
    w.observe(true, 'ply 10');
    w.observe(false); w.observe(false);
    const first = w.reason;
    for (let i = 0; i < 50; i++) w.observe(false);
    expect(w.reason).toBe(first);
  });
  it('the wall-clock deadline trips even when every read succeeds', () => {
    const w = wedgeWatch({ deadlineMs: -1, label: 'walk' });
    w.observe(true, 'ply 1');
    expect(w.overdue()).toContain('deadline');
  });
});
