// The shared wedge detector (scripts/audit-lib/wedge-watch.mjs). Pure logic, so
// it is testable without a browser — which matters, because the bug it exists
// to prevent is a detector that could not fire.
import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs audit helper, no types by design
import { raced, wedgeWatch, until } from '../../scripts/audit-lib/wedge-watch.mjs';

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

describe('until — the deadline must survive a predicate that never settles', () => {
  it('returns false at the deadline when the predicate hangs forever', async () => {
    // The hand-rolled `while (Date.now() - t0 < ms)` poll every audit carries
    // checks its deadline only BETWEEN iterations, so this case hangs the run
    // for as long as the page is wedged. 18 such call sites in one audit.
    const t0 = Date.now();
    const out = await until(() => new Promise(() => { /* never settles */ }), 300, 50);
    const took = Date.now() - t0;
    expect(out).toBe(false);
    expect(took).toBeGreaterThanOrEqual(250);
    expect(took).toBeLessThan(3000);
  });
  it('still returns true as soon as the predicate is satisfied', async () => {
    let n = 0;
    expect(await until(() => ++n >= 3, 5000, 10)).toBe(true);
    expect(n).toBe(3);
  });
  it('gives a legitimately slow predicate the time it is owed', async () => {
    // Raced against the REMAINING budget, not a fixed slice — a cold analysis
    // that takes longer than one step must not be cut off.
    const slow = () => new Promise((r) => setTimeout(() => r(true), 200));
    expect(await until(slow, 2000, 20)).toBe(true);
  });
  it('returns false without calling the predicate when no budget remains', async () => {
    let called = 0;
    expect(await until(() => { called += 1; return true; }, 0, 10)).toBe(false);
    expect(called).toBe(0);
  });
});
