// 🔒 AN AUDIT CAN NEVER FILL REDIS (David 2026-09-19: "i no longer want audits
// to fill redis"). The client half of the gate, tested through the real
// logAppAudit → streamAuditEntry → fetch path:
//   · an audit-marked page (the TTS mute every audit injects, or a stamped run
//     id) never POSTs to a remote stream URL;
//   · it still POSTs to the loopback sidecar and to its own origin — and those
//     POSTs carry `x-audit-marked`, which the server refuses to store;
//   · an UNMARKED page (a real user who opted in) streams to the remote exactly
//     as before, with no marker header. Negative control, so the gate cannot
//     silence real devices.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  logAppAudit,
  getAppAuditLog,
  setAuditStreamConfig,
  clearAuditStreamConfig,
  flushStreamBatch,
  isAuditMarkedPage,
  AUDIT_MARKED_HEADER,
} from './appAuditor';

type Call = { url: string; headers: Record<string, string> };

function spyFetch(): { calls: Call[]; restore: () => void } {
  const calls: Call[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), headers: { ...(init?.headers as Record<string, string> | undefined) } });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = originalFetch; } };
}

const REMOTE = 'https://chess-academy-pro.vercel.app/api/audit-stream';
const SIDECAR = 'http://127.0.0.1:49697/audit-stream';

// The test environment strips `localStorage` (the app is banned from using it
// for anything but these two audit-harness markers). The product code reads
// `globalThis.localStorage` defensively, so give it the real browser shape.
const store = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

describe('appAuditor — an audit-marked page cannot stream to a remote', () => {
  let hadLocalStorage: PropertyDescriptor | undefined;
  beforeAll(() => {
    hadLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { value: fakeLocalStorage, configurable: true, writable: true });
  });
  afterAll(() => {
    if (hadLocalStorage) Object.defineProperty(globalThis, 'localStorage', hadLocalStorage);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });
  beforeEach(async () => {
    localStorage.removeItem('auditMuteTts');
    localStorage.removeItem('auditRunId');
    delete (globalThis as { __auditMuteTts?: unknown }).__auditMuteTts;
    await clearAuditStreamConfig();
    await flushStreamBatch();
  });
  afterEach(async () => {
    localStorage.removeItem('auditMuteTts');
    localStorage.removeItem('auditRunId');
    delete (globalThis as { __auditMuteTts?: unknown }).__auditMuteTts;
    await clearAuditStreamConfig();
  });

  it('the marker is exactly what the audit harness sets', () => {
    expect(isAuditMarkedPage()).toBe(false);
    localStorage.setItem('auditMuteTts', '1');
    expect(isAuditMarkedPage()).toBe(true);
    localStorage.removeItem('auditMuteTts');
    localStorage.setItem('auditRunId', 'concept-gameplay-abc123');
    expect(isAuditMarkedPage()).toBe(true);
    localStorage.removeItem('auditRunId');
    (globalThis as { __auditMuteTts?: unknown }).__auditMuteTts = true;
    expect(isAuditMarkedPage()).toBe(true);
  });

  it('marked page + REMOTE url → zero POSTs, and the refusal is in the local log', async () => {
    localStorage.setItem('auditMuteTts', '1');
    const spy = spyFetch();
    try {
      await setAuditStreamConfig(REMOTE, 'secret');
      await logAppAudit({ kind: 'bad-fen', category: 'subsystem', source: 'gate-test', summary: 'must not leave' });
      await flushStreamBatch();
      expect(spy.calls.filter((c) => c.url.startsWith('https://'))).toEqual([]);
      const log = await getAppAuditLog();
      expect(log.some((e) => e.kind === 'audit-stream-remote-refused')).toBe(true);
    } finally {
      spy.restore();
    }
  });

  it('marked page + SIDECAR url → still POSTs, carrying the marker header', async () => {
    localStorage.setItem('auditMuteTts', '1');
    const spy = spyFetch();
    try {
      await setAuditStreamConfig(SIDECAR, 'local');
      await logAppAudit({ kind: 'bad-fen', category: 'subsystem', source: 'gate-test', summary: 'sidecar ok' });
      await flushStreamBatch();
      const toSidecar = spy.calls.filter((c) => c.url === SIDECAR);
      expect(toSidecar.length).toBeGreaterThan(0);
      expect(toSidecar[0].headers[AUDIT_MARKED_HEADER]).toBe('1');
    } finally {
      spy.restore();
    }
  });

  it('negative control: an UNMARKED page streams to the remote with no marker', async () => {
    const spy = spyFetch();
    try {
      await setAuditStreamConfig(REMOTE, 'secret');
      await logAppAudit({ kind: 'bad-fen', category: 'subsystem', source: 'gate-test', summary: 'real user' });
      await flushStreamBatch();
      const remote = spy.calls.filter((c) => c.url === REMOTE);
      expect(remote.length).toBe(1);
      expect(remote[0].headers[AUDIT_MARKED_HEADER]).toBeUndefined();
    } finally {
      spy.restore();
    }
  });
});
