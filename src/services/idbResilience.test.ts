// 🔒 A READ OR WRITE iOS CUT OFF IS RETRIED ONCE THE PAGE IS BACK (2026-11-26).
// The exact messages App Store users' devices threw (PostHog, 30 days). Fails
// on the old code: every one of these escaped as an error — the weakness
// refresh, the openings and puzzles seeds — instead of running again.
import { describe, it, expect, vi } from 'vitest';
import Dexie from 'dexie';
import { isSuspensionError, retryAfterSuspension } from './idbResilience';

const REAL = [
  'UnknownError: Attempt to iterate a cursor that doesn\'t exist',
  'UnknownError: Attempt to open a cursor in database without an in-progress transaction',
  'UnknownError: Attempt to get a record from database without an in-progress transaction',
  'Transaction aborted',
];

describe('isSuspensionError', () => {
  it('knows the family iOS throws, and a bulk write whose every op failed with it', () => {
    for (const m of REAL) expect(isSuspensionError(new Error(m)), m).toBe(true);
    const bulk = Object.assign(new Error('puzzles.bulkAdd(): 2000 of 2000 operations failed.'), {
      name: 'BulkError', failures: [new Error('Attempt to see if key exists in objectstore without an in-progress transaction')],
    });
    expect(isSuspensionError(bulk)).toBe(true);
  });
  it('leaves real errors alone', () => {
    expect(isSuspensionError(new Error('Key already exists in the object store.'))).toBe(false);
    expect(isSuspensionError(new Dexie.ConstraintError('dup'))).toBe(false);
    expect(isSuspensionError(new TypeError('x is undefined'))).toBe(false);
  });
});

describe('retryAfterSuspension', () => {
  it('runs a cut-off operation again and returns its answer', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error(REAL[0]))
      .mockResolvedValueOnce('rows');
    await expect(retryAfterSuspension(op)).resolves.toBe('rows');
    expect(op).toHaveBeenCalledTimes(2);
  });
  it('throws a real error at once, and gives up after its attempts', async () => {
    const real = vi.fn().mockRejectedValue(new TypeError('boom'));
    await expect(retryAfterSuspension(real)).rejects.toThrow('boom');
    expect(real).toHaveBeenCalledTimes(1);
    const always = vi.fn().mockRejectedValue(new Error(REAL[3]));
    await expect(retryAfterSuspension(always, 3)).rejects.toThrow('Transaction aborted');
    expect(always).toHaveBeenCalledTimes(3);
  });
});
