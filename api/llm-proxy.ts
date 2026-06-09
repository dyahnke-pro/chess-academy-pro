/**
 * /api/llm-proxy — first-party reverse proxy for the coach's LLM providers
 * (DeepSeek + Anthropic). Incident 2026-06-09: the provider API keys were
 * inlined into the client bundle (vite `define` + hardcoded obfuscated
 * fallbacks in coachApi.ts) and someone scraped the DeepSeek key and burned
 * it on deepseek-v4-pro. This proxy holds the keys SERVER-SIDE — the client
 * SDKs point their `baseURL` here and never see a key.
 *
 * Routing mirrors the proven `phproxy` flat-function + query-rewrite pattern
 * (a nested catch-all `api/llm/deepseek/[...path].ts` 404s in this Vite
 * project — Vercel doesn't register catch-all subdir functions here). See
 * vercel.json:
 *   /api/llm/deepseek/:path*  -> /api/llm-proxy?provider=deepseek&path=:path*
 *   /api/llm/anthropic/:path* -> /api/llm-proxy?provider=anthropic&path=:path*
 *
 * Edge runtime so the streamed provider response (DeepSeek `stream:true`,
 * Anthropic SSE) passes straight through (`upstream.body`) — no buffering,
 * preserving the streaming-latency win (CLAUDE.md G4) and tool-use.
 *
 * Origin allowlist + CORS mirror api/tts.ts (Capacitor app, prod vercel.app,
 * localhost dev, preview subdomains). The key is no longer extractable from
 * the bundle; the Origin gate matches the posture of the other first-party
 * proxies. KV-backed rate limiting is a flagged hardening follow-up.
 */
export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'capacitor://app.chessacademy.pro',
  'https://chess-academy-pro.vercel.app',
];
const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];
const PREVIEW_ORIGIN_RE = /^https:\/\/chess-academy-pro[a-z0-9-]*\.vercel\.app$/;

function isAllowedOrigin(origin: string): boolean {
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    LOCAL_DEV_ORIGINS.includes(origin) ||
    PREVIEW_ORIGIN_RE.test(origin)
  );
}

/** Missing Origin (server-to-server / same-origin GET) is allowed; a
 *  present Origin must be on the allowlist. */
function originAllowed(origin: string | null): boolean {
  return !origin || isAllowedOrigin(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, anthropic-version, anthropic-beta',
  };
  if (origin && isAllowedOrigin(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Vary'] = 'Origin';
  }
  return h;
}

interface ProviderSpec {
  base: string;
  env: 'DEEPSEEK_KEY' | 'ANTHROPIC_KEY';
  auth: (key: string) => Record<string, string>;
}

const PROVIDERS: Record<string, ProviderSpec> = {
  deepseek: {
    base: 'https://api.deepseek.com',
    env: 'DEEPSEEK_KEY',
    auth: (key) => ({ authorization: `Bearer ${key}` }),
  },
  anthropic: {
    base: 'https://api.anthropic.com',
    env: 'ANTHROPIC_KEY',
    auth: (key) => ({ 'x-api-key': key }),
  },
};

// Forward only the request headers the upstream needs — never the client's
// (placeholder) auth header. We inject the real auth below.
const PASS_REQ_HEADERS = ['content-type', 'accept', 'anthropic-version', 'anthropic-beta'];
// Strip hop-by-hop / encoding headers — `fetch` already decoded the body, so
// a stale `content-encoding` would make the SDK try to re-decode and corrupt.
const DROP_RES_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!originAllowed(origin)) return new Response('forbidden origin', { status: 403, headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

  const url = new URL(req.url);
  const provider = PROVIDERS[url.searchParams.get('provider') ?? ''];
  if (!provider) return new Response('unknown provider', { status: 400, headers: cors });

  const key = process.env[provider.env];
  if (!key) {
    return new Response(`${provider.env} not configured on the server`, { status: 503, headers: cors });
  }

  const subPath = (url.searchParams.get('path') ?? '').replace(/^\/+/, '');
  const target = `${provider.base}/${subPath}`;

  const fwd = new Headers();
  for (const name of PASS_REQ_HEADERS) {
    const v = req.headers.get(name);
    if (v) fwd.set(name, v);
  }
  if (!fwd.has('content-type')) fwd.set('content-type', 'application/json');
  for (const [k, v] of Object.entries(provider.auth(key))) fwd.set(k, v);

  const body = await req.text();
  let upstream: Response;
  try {
    upstream = await fetch(target, { method: 'POST', headers: fwd, body });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream fetch failed', detail: String(e) }), {
      status: 502,
      headers: { ...cors, 'content-type': 'application/json' },
    });
  }

  const out = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!DROP_RES_HEADERS.has(k.toLowerCase())) out.set(k, v);
  });
  for (const [k, v] of Object.entries(cors)) out.set(k, v);

  // Stream the upstream body straight through (SSE / chunked) — no buffering.
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
