import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// usageGuard reads KV_REST_API_URL / KV_REST_API_TOKEN at module load, so each
// scenario sets env, resets the module registry, and dynamically imports a
// fresh copy.
function makeReq(ip = '1.2.3.4'): Request {
  return new Request('https://x/api/llm-proxy', { headers: { 'x-forwarded-for': ip } });
}
function pipelineReply(...results: unknown[]): Response {
  return new Response(JSON.stringify(results.map((result) => ({ result }))), { status: 200 });
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
    expect((await checkUsageGuard('llm', makeReq())).allowed).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled(); // never touches the wire unconfigured
  });

  it('blocks on the per-IP rate limit', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    process.env.LLM_IP_LIMIT = '60';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pipelineReply(61))); // 61st call this window
    const { checkUsageGuard } = await import('./usageGuard');
    const r = await checkUsageGuard('llm', makeReq());
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('rate-limit');
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it('allows a normal call under the limit', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pipelineReply(3)));
    const { checkUsageGuard } = await import('./usageGuard');
    expect((await checkUsageGuard('tts', makeReq())).allowed).toBe(true);
  });

  // 🔒 COST GATE (David 2026-09-11: "what cannot happen is maxing this out
  // again"). Upstash bills per COMMAND, so the guard's pipeline width IS its
  // price — and it is paid on EVERY llm and tts call, with tts firing per
  // sentence. It was 6; the $ bookkeeping is gone and the TTL rides only the
  // first write, so the steady state is a single INCR.
  it('sends 2 commands on first write and only 1 thereafter', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    const fetchSpy = vi.fn().mockResolvedValue(pipelineReply(1));
    vi.stubGlobal('fetch', fetchSpy);
    const { checkUsageGuard } = await import('./usageGuard');

    await checkUsageGuard('llm', makeReq());
    const first = JSON.parse(fetchSpy.mock.calls[0][1].body as string) as string[][];
    expect(first.map((c) => c[0])).toEqual(['INCR', 'EXPIRE']);

    await checkUsageGuard('llm', makeReq());
    const second = JSON.parse(fetchSpy.mock.calls[1][1].body as string) as string[][];
    expect(second.map((c) => c[0])).toEqual(['INCR']); // TTL already set

    // And it never writes a spend counter — that bookkeeping cost more than the
    // spend it was guarding (~$0.03/day on DeepSeek).
    const allCmds = fetchSpy.mock.calls.flatMap(
      (c) => JSON.parse(c[1].body as string) as string[][],
    );
    expect(allCmds.some((c) => String(c[1] ?? '').startsWith('spend:'))).toBe(false);
  });

  // Fail-open is deliberate — refusing every request while Upstash is capped
  // would take the coach and voice down for paying customers. But /api/tts and
  // /api/llm-proxy are UNAUTHENTICATED endpoints on a permanently-open free web
  // app, so "fail open" must not mean "unthrottled".
  it('still throttles a runaway caller when KV is down', async () => {
    process.env.KV_REST_API_URL = 'https://kv.example';
    process.env.KV_REST_API_TOKEN = 'tok';
    process.env.LLM_IP_LIMIT = '5';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('max requests limit exceeded')));
    const { checkUsageGuard } = await import('./usageGuard');

    // A normal caller is unaffected — fail-open still holds.
    expect((await checkUsageGuard('llm', makeReq())).allowed).toBe(true);

    let blocked = false;
    for (let i = 0; i < 20 && !blocked; i++) {
      const r = await checkUsageGuard('llm', makeReq());
      if (!r.allowed) { blocked = true; expect(r.reason).toBe('rate-limit'); }
    }
    expect(blocked).toBe(true);

    // A different IP is untouched by the noisy one's window.
    expect((await checkUsageGuard('llm', makeReq('9.9.9.9'))).allowed).toBe(true);
  });
});
