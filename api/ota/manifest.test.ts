/**
 * The OTA update-check contract.
 *
 * Every case here is a real defect the 2026-09-03 telemetry read surfaced, not
 * a hypothetical. Read each `it` as "this went wrong in production".
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Module-level in the handler, so it must be set before the import below.
process.env.OTA_POINTER_URL = 'https://blob.test/ota/latest.json';

const { default: handler } = await import('./manifest');

interface Captured {
  status: number;
  body: Record<string, unknown>;
}

function drive(
  body: Record<string, unknown>,
): { req: VercelRequest; res: VercelResponse; out: Captured } {
  const out: Captured = { status: 0, body: {} };
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      out.body = payload;
      return this;
    },
  } as unknown as VercelResponse;
  const req = { body, query: {} } as unknown as VercelRequest;
  return { req, res, out };
}

const MANIFEST = [
  { file_name: 'index.html', file_hash: 'a'.repeat(64), download_url: 'https://blob.test/ota/files/aaa' },
];

/** A pointer as publish-ota-bundle.mjs now writes it. */
function pointer(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 'ff5ed1a2',
    url: 'https://blob.test/ota/bundles/ff5ed1a2.zip',
    ordinal: 2000,
    manifestUrl: 'https://blob.test/ota/manifests/ff5ed1a2.json',
    history: { ff5ed1a2: 2000, d2d10d06: 1000, f929e5b3: 500 },
    pin: null,
    ...over,
  };
}

function stubFetch(ptr: Record<string, unknown> | null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/ota/manifests/')) {
        return { ok: true, json: async () => MANIFEST } as unknown as Response;
      }
      if (ptr === null) return { ok: false } as unknown as Response;
      return { ok: true, text: async () => JSON.stringify(ptr) } as unknown as Response;
    }),
  );
}

async function check(
  body: Record<string, unknown>,
  ptr: Record<string, unknown> | null = pointer(),
): Promise<Captured> {
  stubFetch(ptr);
  const { req, res, out } = drive(body);
  await handler(req, res);
  return out;
}

beforeEach(() => {
  delete process.env.OTA_DELTA;
  delete process.env.OTA_DELTA_DEVICES;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.KV_REST_API_URL;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OTA update check', () => {
  // ── The phantom-failure fix ──────────────────────────────────────────────
  // 72 of 127 recorded "download failures" were this. The plugin normalizes a
  // MISSING `kind` to "failed" and fires downloadFailed + a failure stat. A
  // no-op reply without `kind` is therefore a lie we tell about ourselves.
  it('marks a no-op as up_to_date so the plugin cannot record it as a failure', async () => {
    const out = await check({ version_name: 'ff5ed1a2' });
    expect(out.body.kind).toBe('up_to_date');
    expect(out.body.url).toBe('');
    expect(out.body.version).toBe('ff5ed1a2');
  });

  it('marks every no-op path up_to_date, including having no pointer at all', async () => {
    const out = await check({ version_name: 'anything' }, null);
    expect(out.body.kind).toBe('up_to_date');
    expect(out.body.url).toBe('');
  });

  // ── The 7-vs-8-char SHA split ────────────────────────────────────────────
  it('treats a 7-char legacy version as the same bundle as its 8-char publish', async () => {
    const out = await check({ version_name: 'ff5ed1a' });
    expect(out.body.kind).toBe('up_to_date');
    expect(out.body.url).toBe('');
  });

  // ── The rollback that stranded devices on the Aug-5 crash bundle ─────────
  it('refuses to hand a device a bundle older than the one it runs', async () => {
    // Device is on ff5ed1a2 (ordinal 2000); the pointer somehow reads d2d10d06
    // (ordinal 1000) — exactly the Aug-31 shape.
    const stale = pointer({ version: 'd2d10d06', ordinal: 1000 });
    const out = await check({ version_name: 'ff5ed1a2' }, stale);
    expect(out.body.kind).toBe('up_to_date');
    expect(out.body.url).toBe('');
  });

  it('still serves a genuinely newer bundle', async () => {
    const out = await check({ version_name: 'd2d10d06' });
    expect(out.body.version).toBe('ff5ed1a2');
    expect(out.body.url).toContain('ff5ed1a2.zip');
    expect(out.body.kind).toBeUndefined();
  });

  it('serves an update to a device whose version predates the ordinal scheme', async () => {
    // Unrankable (not in history). The publisher's forward-only guard is what
    // makes this safe: the pointer is by construction the newest thing we have.
    const out = await check({ version_name: '1.0' });
    expect(out.body.version).toBe('ff5ed1a2');
    expect(out.body.url).toContain('ff5ed1a2.zip');
  });

  it('honours an explicit pin, bypassing forward-only, for a deliberate rollback', async () => {
    const pinned = pointer({ pin: 'd2d10d06' });
    const out = await check({ version_name: 'ff5ed1a2' }, pinned);
    expect(out.body.version).toBe('d2d10d06');
    // The PINNED bundle's own url — not the pointer's. Serving latest.url under
    // the pinned version's name would ship the very build being rolled back.
    expect(out.body.url).toBe('https://blob.test/ota/bundles/d2d10d06.zip');
    expect(out.body.manifest).toBeUndefined(); // never delta a rollback
  });

  // ── Delta rollout ────────────────────────────────────────────────────────
  it('does not send a delta manifest to a device outside the canary', async () => {
    const out = await check({ version_name: 'd2d10d06', device_id: 'someone-else' });
    expect(out.body.url).toContain('ff5ed1a2.zip');
    expect(out.body.manifest).toBeUndefined();
  });

  it('sends the delta manifest to a canary device', async () => {
    process.env.OTA_DELTA_DEVICES = 'canary-device';
    const out = await check({ version_name: 'd2d10d06', device_id: 'canary-device' });
    expect(out.body.manifest).toEqual(MANIFEST);
  });

  it('sends the delta manifest to everyone once OTA_DELTA=on', async () => {
    process.env.OTA_DELTA = 'on';
    const out = await check({ version_name: 'd2d10d06', device_id: 'someone-else' });
    expect(out.body.manifest).toEqual(MANIFEST);
  });

  it('never sends a delta manifest when OTA_DELTA=off', async () => {
    process.env.OTA_DELTA = 'off';
    process.env.OTA_DELTA_DEVICES = 'canary-device';
    const out = await check({ version_name: 'd2d10d06', device_id: 'canary-device' });
    expect(out.body.manifest).toBeUndefined();
    expect(out.body.url).toContain('ff5ed1a2.zip');
  });

  it('falls back to the whole bundle when the manifest blob is unreadable', async () => {
    process.env.OTA_DELTA = 'on';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/ota/manifests/')) return { ok: false } as unknown as Response;
        return { ok: true, text: async () => JSON.stringify(pointer()) } as unknown as Response;
      }),
    );
    const { req, res, out } = drive({ version_name: 'd2d10d06', device_id: 'd' });
    await handler(req, res);
    expect(out.body.manifest).toBeUndefined();
    expect(out.body.url).toContain('ff5ed1a2.zip');
  });

  // ── Redis / Blob divergence ──────────────────────────────────────────────
  it('prefers whichever store holds the NEWER pointer, not Redis by default', async () => {
    // Redis is reachable but STALE (the publisher's Redis write is allowed to
    // fail). Preferring it unconditionally would pin devices to the old bundle.
    process.env.KV_REST_API_URL = 'https://redis.test';
    process.env.KV_REST_API_TOKEN = 'tok';
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async get() {
          return pointer({ version: 'd2d10d06', ordinal: 1000 });
        }
      },
    }));
    vi.resetModules();
    const { default: fresh } = await import('./manifest');
    stubFetch(pointer({ version: 'ff5ed1a2', ordinal: 2000 }));
    const { req, res, out } = drive({ version_name: 'old00000' });
    await fresh(req, res);
    expect(out.body.version).toBe('ff5ed1a2');
    vi.doUnmock('@upstash/redis');
    vi.resetModules();
  });
});
