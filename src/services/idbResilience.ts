/**
 * 🔒 A READ OR WRITE iOS CUT OFF IS RETRIED, ONCE THE PAGE IS BACK (2026-11-26).
 *
 * WebKit tears down the IndexedDB transactions of a page iOS suspends (and,
 * when it reclaims the storage process, the connection under them). Every
 * request still in flight then fails with one family of messages — "Attempt to
 * iterate a cursor that doesn't exist", "Attempt to open a cursor / get a
 * record / delete range … without an in-progress transaction", "Transaction
 * aborted" — and a bulk write reports all of its operations failed (PostHog,
 * 30 days of App Store users: the weakness refresh, the boot seeds of the
 * openings and the puzzles). The work itself was sound; the page was put to
 * sleep under it. Fixed here, in one place, instead of one caller at a time:
 * the operation waits for the student to come back, reopens the connection if
 * it was lost, and runs again from the top (each caller's operation is
 * idempotent — a read, or an upsert/add-missing chunk).
 */
import { db } from '../db/schema';
import { whenVisible } from '../utils/whenVisible';

const SUSPENSION = /without an in-progress transaction|cursor that doesn't exist|Transaction aborted|transaction was aborted|Connection to Indexed Database server lost|database connection is closing|DatabaseClosedError/i;

/** True when `err` is the family a suspended (or reclaimed) IndexedDB throws.
 *  Reads the error, its name, and a bulk error's inner failures. */
export function isSuspensionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return typeof err === 'string' && SUSPENSION.test(err);
  const e = err as { name?: unknown; message?: unknown; inner?: unknown; failures?: unknown };
  const text = `${typeof e.name === 'string' ? e.name : ''} ${typeof e.message === 'string' ? e.message : ''}`;
  if (SUSPENSION.test(text)) return true;
  if (e.name === 'AbortError' || e.name === 'TransactionInactiveError') return true;
  if (e.inner && e.inner !== err && isSuspensionError(e.inner)) return true;
  if (Array.isArray(e.failures) && e.failures.length > 0) return e.failures.every((f) => isSuspensionError(f));
  return false;
}

/** Runs `op`; on a suspension error, waits until the page is visible, reopens
 *  the database if its connection was lost, and runs it again (at most
 *  `attempts` runs). Any other error, or the last attempt's, is thrown. */
export async function retryAfterSuspension<T>(op: () => Promise<T>, attempts = 3): Promise<T> {
  for (let n = 1; ; n++) {
    try {
      return await op();
    } catch (err) {
      if (n >= attempts || !isSuspensionError(err)) throw err;
      await whenVisible();
      // A lost connection keeps reporting itself open: close it first.
      const msg = err instanceof Error ? err.message : '';
      if (/server lost|connection is closing/i.test(msg)) db.close();
      if (!db.isOpen()) {
        try { await db.open(); } catch { /* the next attempt reports it */ }
      }
    }
  }
}
