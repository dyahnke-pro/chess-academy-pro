import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 🔒 AUDIT TRAFFIC NEVER TOUCHES REDIS (David 2026-09-30). See
// api/_lib/auditTraffic.ts for the measurement that made this a gate.

let commands = 0;
vi.mock('@upstash/redis', () => ({
  Redis: class {
    private hit<T>(v: T) { commands += 1; return Promise.resolve(v); }
    get() { return this.hit(null); } set() { return this.hit('OK'); } incr() { return this.hit(1); }
    lrange() { return this.hit([]); } rpush() { return this.hit(1); } ltrim() { return this.hit('OK'); }
    zadd() { return this.hit(1); } zrange() { return this.hit([]); } expire() { return this.hit(1); }
  },
}));

function mkRes(): VercelResponse & { _status: number; _json: unknown } {
  const res = {
    _status: 0, _json: undefined as unknown,
    setHeader() { return res; },
    status(code: number) { res._status = code; return res; },
    json(payload: unknown) { res._json = payload; return res; },
    end() { return res; },
  };
  return res as unknown as VercelResponse & { _status: number; _json: unknown };
}

const ROUTES = { messages: () => import('./messages'), referrals: () => import('./referrals') };

const DEVICE = 'a67bc748-5023-4476-9556-a05104d66fe2';
const HEADLESS = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/141.0.0.0 Safari/537.36' };
const MARKED = { 'user-agent': 'Mozilla/5.0 (Macintosh) Safari/605.1.15', 'x-audit-marked': '1' };
const HUMAN = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' };

const req = (method: string, headers: Record<string, string>, extra: Partial<VercelRequest> = {}): VercelRequest =>
  ({ method, headers, query: { device: DEVICE }, body: { action: 'feedback', device: DEVICE, message: 'hi' }, ...extra } as unknown as VercelRequest);

describe('audit traffic spends zero Upstash commands', () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = 'https://kv.test';
    process.env.KV_REST_API_TOKEN = 'tok';
    commands = 0;
    vi.resetModules();
  });
  afterEach(() => { delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; });

  for (const route of ['messages', 'referrals'] as const) {
    for (const [label, headers] of [['headless UA', HEADLESS], ['x-audit-marked', MARKED]] as const) {
      for (const method of ['GET', 'POST']) {
        it(`/api/${route} ${method} from ${label} → 200, no Redis`, async () => {
          const { default: handler } = await ROUTES[route]();
          const res = mkRes();
          await handler(req(method, headers, route === 'referrals' && method === 'POST' ? { body: { action: 'reviewReward', device: DEVICE } } : {}), res);
          expect(res._status).toBe(200);
          expect(res._json).toMatchObject({ refused: 'audit' });
          expect(commands).toBe(0);
        });
      }
    }

    // Negative control: without it, "zero commands" could pass on a route that
    // never reached Redis at all.
    it(`/api/${route} GET from a real device still reaches Redis`, async () => {
      const { default: handler } = await ROUTES[route]();
      const res = mkRes();
      await handler(req('GET', HUMAN), res);
      expect(res._status).toBe(200);
      expect(commands).toBeGreaterThan(0);
    });
  }

  it('usageGuard: audit traffic is rate-limited in memory, never via the KV pipeline', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify([{ result: 1 }, { result: 1 }])));
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const { checkUsageGuard } = await import('./_lib/usageGuard');
      const audit = await checkUsageGuard('llm', new Request('https://x.test/api/llm', { headers: HEADLESS }));
      expect(audit.allowed).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
      await checkUsageGuard('llm', new Request('https://x.test/api/llm', { headers: HUMAN }));
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/**
 * STRUCTURAL: every api route that can reach Upstash either checks
 * `isAuditTraffic` or is named here with the reason no browser boot reaches it.
 * A new Redis-backed route fails this until someone answers for it.
 */
const EXEMPT: Record<string, string> = {
  'api/monitor.ts': 'Vercel cron, hourly, Redis-locked by a lastrun key — no client calls it',
  'api/voice-failure-watch.ts': 'cron-shaped watcher behind a lastrun lock — no client calls it',
  'api/ota/manifest.ts': 'one GET per NATIVE update check; the web app (where audits run) never calls it',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

describe('every Redis door checks for audit traffic', () => {
  const root = join(__dirname, '..');
  const files = walk(join(root, 'api')).map((p) => relative(root, p).split('\\').join('/'));
  const redisFiles = files.filter((f) => {
    const src = readFileSync(join(root, f), 'utf8');
    return /@upstash\/redis|kvPipeline\(/.test(src) && f !== 'api/_lib/auditTraffic.ts';
  });

  it('finds the Redis routes (non-vacuous)', () => {
    expect(redisFiles).toEqual(expect.arrayContaining(['api/messages.ts', 'api/referrals.ts', 'api/audit-stream.ts', 'api/_lib/usageGuard.ts']));
  });

  it('each one calls isAuditTraffic or is exempt with a reason', () => {
    const offenders = redisFiles.filter((f) => !EXEMPT[f] && !/isAuditTraffic\(/.test(readFileSync(join(root, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
