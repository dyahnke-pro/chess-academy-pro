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
    // pipeline result (2026-09-11 order): [INCR rl→1, spend(day)→25.5, spend(ip)→0.10]
    // The EXPIREs now trail the value commands and only on first write, so the
    // three values the guard reads are always indices 0/1/2.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([{ result: 1 }, { result: '25.5' }, { result: '0.10' }]),
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
    // 61 calls this window (over 60), spend well under ceiling and under the IP cap.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([{ result: 61 }, { result: '0.30' }, { result: '0.30' }]),
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
    // pipeline: [INCR rl→5, spend(day)→0.40, spend(ip)→1.20]
    // global 0.40 < 25 (under), but this IP's day spend 1.20 > 1.00 cap.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify([{ result: 5 }, { result: '0.40' }, { result: '1.20' }]),
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
      JSON.stringify([{ result: 3 }, { result: '0.05' }, { result: '0.05' }]),
      { status: 200 },
    )));
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('tts', makeReq(), 0.002);
    expect(r.allowed).toBe(true);
  });

  // 🔒 COST GATE (2026-09-11). Upstash bills per COMMAND, so the guard's
  // pipeline width IS its price — 6 commands on every llm + tts call helped
  // exhaust the shared 500k/month budget twice. The steady-state path must send
  // exactly the three value commands; the EXPIREs ride only the first write.
  it('sends 6 commands on first write and only 3 thereafter (TTL memo)', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    const fetchSpy = vi.fn().mockResolvedValue(new Response(
      JSON.stringify([{ result: 1 }, { result: '0.01' }, { result: '0.01' }]),
      { status: 200 },
    ));
    vi.stubGlobal('fetch', fetchSpy);
    const { checkUsageGuard } = await import('./usageGuard');

    await checkUsageGuard('llm', makeReq(), 0.001);
    const first = JSON.parse(fetchSpy.mock.calls[0][1].body as string) as unknown[];
    expect(first).toHaveLength(6); // 3 values + 3 EXPIREs

    await checkUsageGuard('llm', makeReq(), 0.001);
    const second = JSON.parse(fetchSpy.mock.calls[1][1].body as string) as unknown[];
    expect(second).toHaveLength(3); // TTLs already set — values only
    expect((second as string[][]).map((c) => c[0])).toEqual(['INCR', 'INCRBYFLOAT', 'INCRBYFLOAT']);
  });

  // Fail-open is deliberate (refusing everything while Upstash is capped would
  // take the coach down for paying users), but it must still be BOUNDED — a
  // runaway loop during an outage used to be completely free.
  it('bounds a runaway caller with the local backstop when KV is down', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    process.env.PER_IP_DAILY_USD_CAP = '0.05';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('max requests limit exceeded')));
    const { checkUsageGuard } = await import('./usageGuard');

    // A normal caller is unaffected — fail-open still holds.
    expect((await checkUsageGuard('llm', makeReq(), 0.01)).allowed).toBe(true);

    // The same IP looping eventually trips its own daily cap in-process.
    let blocked = false;
    for (let i = 0; i < 20 && !blocked; i++) {
      const r = await checkUsageGuard('llm', makeReq(), 0.01);
      if (!r.allowed) { blocked = true; expect(r.reason).toBe('ip-daily-cap'); }
    }
    expect(blocked).toBe(true);

    // A different IP is untouched by the noisy one's tally.
    expect((await checkUsageGuard('llm', makeReq('9.9.9.9'), 0.01)).allowed).toBe(true);
  });
});
