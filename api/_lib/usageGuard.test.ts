import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// usageGuard reads KV_REST_API_URL / KV_REST_API_TOKEN + the ceiling at module
// load, so each scenario sets env, resets the module registry, and dynamically
// imports a fresh copy.
function makeReq(ip = '1.2.3.4'): Request {
  return new Request('https://x/api/llm-proxy', { headers: { 'x-forwarded-for': ip } });
}

const ORIG = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIG };
});
afterEach(() => {
  process.env = { ...ORIG };
  vi.unstubAllGlobals();
});

describe('usageGuard', () => {
  it('no-ops (allows) when KV is not provisioned', async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('llm', makeReq(), 0.005);
    expect(r.allowed).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled(); // never touches the wire unconfigured
  });

  it('fails OPEN when the KV call errors', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('kv down')));
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('llm', makeReq(), 0.005);
    expect(r.allowed).toBe(true);
  });

  it('blocks on the global daily $ ceiling', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    process.env.LLM_DAILY_USD_CEILING = '25';
    // pipeline result: [INCR rl→1, EXPIRE→1, INCRBYFLOAT spend→25.5, EXPIRE→1]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([{ result: 1 }, { result: 1 }, { result: '25.5' }, { result: 1 }]),
      { status: 200 },
    )));
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('llm', makeReq(), 0.005);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('daily-ceiling');
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it('blocks on the per-IP rate limit when under the daily ceiling', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    process.env.LLM_DAILY_USD_CEILING = '25';
    process.env.LLM_IP_LIMIT = '60';
    // 61 calls this window (over 60), spend well under ceiling.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([{ result: 61 }, { result: 1 }, { result: '0.30' }, { result: 1 }]),
      { status: 200 },
    )));
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('llm', makeReq(), 0.005);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('rate-limit');
  });

  it('blocks on the per-IP daily $ cap before the global ceiling is reached', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    process.env.LLM_DAILY_USD_CEILING = '25';
    process.env.PER_IP_DAILY_USD_CAP = '1.00';
    // pipeline: [INCR rl→5, EXPIRE, spend(day)→0.40, EXPIRE, spend(ip)→1.20, EXPIRE]
    // global 0.40 < 25 (under), but this IP's day spend 1.20 > 1.00 cap.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([
        { result: 5 }, { result: 1 }, { result: '0.40' }, { result: 1 }, { result: '1.20' }, { result: 1 },
      ]),
      { status: 200 },
    )));
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('llm', makeReq(), 0.001);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('ip-daily-cap');
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it('allows a normal call under both limits', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([{ result: 3 }, { result: 1 }, { result: '0.05' }, { result: 1 }]),
      { status: 200 },
    )));
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('tts', makeReq(), 0.002);
    expect(r.allowed).toBe(true);
  });
});
