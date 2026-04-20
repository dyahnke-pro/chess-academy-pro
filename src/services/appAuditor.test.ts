import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db/schema';
import {
  logAppAudit,
  getAppAuditLog,
  clearAppAuditLog,
  installGlobalErrorHooks,
} from './appAuditor';

describe('appAuditor', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('starts with an empty log', async () => {
    expect(await getAppAuditLog()).toEqual([]);
  });

  it('persists a single entry with timestamp + route auto-filled', async () => {
    await logAppAudit({
      kind: 'bad-fen',
      category: 'subsystem',
      source: 'test',
      summary: 'Invalid FEN',
      fen: 'garbage',
    });
    const log = await getAppAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      kind: 'bad-fen',
      category: 'subsystem',
      source: 'test',
      summary: 'Invalid FEN',
      fen: 'garbage',
    });
    expect(typeof log[0].timestamp).toBe('number');
  });

  it('appends multiple entries preserving insertion order', async () => {
    await logAppAudit({ kind: 'bad-fen', category: 'subsystem', source: 'a', summary: 'one' });
    await logAppAudit({ kind: 'polly-fallback', category: 'subsystem', source: 'b', summary: 'two' });
    await logAppAudit({ kind: 'uncaught-error', category: 'runtime', source: 'c', summary: 'three' });
    const log = await getAppAuditLog();
    expect(log.map((e) => e.summary)).toEqual(['one', 'two', 'three']);
  });

  it('clearAppAuditLog resets the log to empty', async () => {
    await logAppAudit({ kind: 'bad-fen', category: 'subsystem', source: 's', summary: 'x' });
    await clearAppAuditLog();
    expect(await getAppAuditLog()).toEqual([]);
  });

  it('caps at 300 entries (rolling window)', async () => {
    for (let i = 0; i < 310; i++) {
      await logAppAudit({
        kind: 'bad-fen',
        category: 'subsystem',
        source: 'bulk',
        summary: `entry ${i}`,
      });
    }
    const log = await getAppAuditLog();
    expect(log.length).toBe(300);
    // Oldest 10 should have been evicted
    expect(log[0].summary).toBe('entry 10');
    expect(log[log.length - 1].summary).toBe('entry 309');
  });

  it('survives JSON parse failures by returning an empty log', async () => {
    // Directly corrupt the stored value to simulate schema drift
    await db.meta.put({ key: 'app-audit-log.v1', value: 'not valid json' });
    expect(await getAppAuditLog()).toEqual([]);
  });

  describe('installGlobalErrorHooks', () => {
    // The hooks attach directly to `window.addEventListener('error', ...)`
    // — which fires even when dispatchEvent synthesises an error. We
    // install an intercepting handler ABOVE the hook that calls
    // `preventDefault()` so the simulated event doesn't bubble out to
    // vitest's own unhandled-error sink and fail the run.
    let swallow: (e: Event) => void;
    beforeEach(() => {
      swallow = (e: Event): void => {
        e.preventDefault();
      };
      window.addEventListener('error', swallow, true);
      window.addEventListener('unhandledrejection', swallow, true);
    });
    afterEach(() => {
      window.removeEventListener('error', swallow, true);
      window.removeEventListener('unhandledrejection', swallow, true);
    });

    it('captures uncaught window errors', async () => {
      const uninstall = installGlobalErrorHooks();
      try {
        const event = new ErrorEvent('error', {
          message: 'simulated failure',
          filename: 'foo.tsx',
          lineno: 42,
          colno: 7,
          error: new Error('simulated failure'),
        });
        window.dispatchEvent(event);
        await new Promise((r) => setTimeout(r, 10));
        const log = await getAppAuditLog();
        expect(log.some((e) => e.kind === 'uncaught-error' && e.summary === 'simulated failure')).toBe(true);
      } finally {
        uninstall();
      }
    });

    it('captures unhandled promise rejections', async () => {
      const uninstall = installGlobalErrorHooks();
      try {
        const event = new Event('unhandledrejection') as PromiseRejectionEvent;
        Object.defineProperty(event, 'reason', { value: new Error('rejected') });
        window.dispatchEvent(event);
        await new Promise((r) => setTimeout(r, 10));
        const log = await getAppAuditLog();
        expect(log.some((e) => e.kind === 'unhandled-rejection' && e.summary === 'rejected')).toBe(true);
      } finally {
        uninstall();
      }
    });

    it('cleanup detaches listeners', async () => {
      const uninstall = installGlobalErrorHooks();
      uninstall();
      const event = new ErrorEvent('error', {
        message: 'after uninstall',
        error: new Error('after uninstall'),
      });
      window.dispatchEvent(event);
      await new Promise((r) => setTimeout(r, 10));
      const log = await getAppAuditLog();
      expect(log.some((e) => e.summary === 'after uninstall')).toBe(false);
    });
  });
});
