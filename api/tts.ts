export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'capacitor://app.chessacademy.pro',
  'https://chess-academy-pro.vercel.app',
];

/** Vercel preview deployments use auto-generated subdomains under
 *  the project's vercel.app namespace. Allowlist them so the voice
 *  service can reach Polly during PR-preview testing — without this
 *  every preview build silently rapid-fires through narrations
 *  because the browser blocks the /api/tts response by CORS, voice
 *  packs aren't cached in Incognito, and Web Speech fallback is
 *  disabled. The rest of the project keeps the wildcard-rejection
 *  behaviour intact for real production. */
const PREVIEW_ORIGIN_RE = /^https:\/\/chess-academy-pro(?:-git-[a-z0-9-]+)?-dyahnke-pros-projects\.vercel\.app$/;

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (PREVIEW_ORIGIN_RE.test(origin)) return true;
  return false;
}

/**
 * Build CORS headers — reject unrecognised origins instead of
 * falling back to `*`. The prior wildcard fallback let any site
 * trigger TTS on a user's behalf (cost-amplification risk), and the
 * security audit flagged it as a launch blocker. When the origin
 * isn't on the allowlist we omit the ACAO header entirely and the
 * caller returns 403 so the request never runs Polly.
 */
function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') ?? '';
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (isAllowedOrigin(origin)) {
    base['Access-Control-Allow-Origin'] = origin;
    base['Vary'] = 'Origin';
  }
  return base;
}

/** True when the request's Origin is on the allowlist (or missing —
 *  server-to-server calls without an Origin header are allowed so
 *  health checks / `curl -s` sanity probes still work). */
function isOriginAllowed(req?: Request): boolean {
  const origin = req?.headers.get('Origin');
  if (!origin) return true;
  return isAllowedOrigin(origin);
}

interface VoiceConfig {
  voiceId: string;
  engine: string;
}

const ALLOWED_VOICES: Record<string, VoiceConfig> = {
  ruth:     { voiceId: 'Ruth',     engine: 'generative' },
  matthew:  { voiceId: 'Matthew',  engine: 'generative' },
  joanna:   { voiceId: 'Joanna',   engine: 'neural' },
  stephen:  { voiceId: 'Stephen',  engine: 'neural' },
  ivy:      { voiceId: 'Ivy',      engine: 'neural' },
  kendra:   { voiceId: 'Kendra',   engine: 'neural' },
  kimberly: { voiceId: 'Kimberly', engine: 'neural' },
  salli:    { voiceId: 'Salli',    engine: 'neural' },
  joey:     { voiceId: 'Joey',     engine: 'neural' },
  justin:   { voiceId: 'Justin',   engine: 'neural' },
  kevin:    { voiceId: 'Kevin',    engine: 'neural' },
  danielle: { voiceId: 'Danielle', engine: 'generative' },
  gregory:  { voiceId: 'Gregory',  engine: 'generative' },
};

const MAX_TEXT_LENGTH = 3000;

/**
 * Per-IP rate limit. A legit voice-coach session sends roughly one
 * TTS request per coach narration — call it 1/sec at peak, a few
 * hundred per 15-min session. 600/hour leaves comfortable headroom
 * and still throttles cost-amplification attacks (the CORS fix
 * already blocks cross-site abuse; this catches automated abuse
 * from allowed origins).
 *
 * Caveat: Vercel edge workers are stateless across cold starts, so
 * this is per-worker best-effort. A determined attacker can spread
 * across warmup cycles. For hard guarantees we'd need Vercel KV or
 * Upstash — defer until we actually see abuse.
 */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_LIMIT_MAX_REQUESTS = 600;
const rateLimitState = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: Request): string {
  // Vercel forwards the real client IP via x-forwarded-for. First
  // entry is the client; subsequent are proxies.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Returns true when the request should be rejected for rate
 *  limiting, false when it's under the cap. Stateful: increments
 *  the counter on every call. */
function isRateLimited(req: Request): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimitState.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitState.set(ip, { count: 1, windowStart: now });
    // Opportunistic cleanup — drop stale buckets so the Map doesn't
    // grow without bound across the worker's lifetime.
    if (rateLimitState.size > 1000) {
      for (const [key, val] of rateLimitState) {
        if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) {
          rateLimitState.delete(key);
        }
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

/** Escape the five XML-significant characters so plain text is safe
 *  inside an SSML document. */
function escapeForSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap plain coaching text in engine-appropriate SSML for natural
 * inflection. Polly tag support differs by engine:
 *   - GENERATIVE voices (Ruth / Matthew / Danielle / Gregory) only
 *     support structural tags (<speak>, <p>, <s>, <lang>, <mark>,
 *     <sub>, <w>). They interpret punctuation, pacing and emotion
 *     from context on their own, so we only add paragraph structure
 *     to help the engine parse it cleanly.
 *   - NEURAL voices support prosody / break / emphasis. A mild
 *     `<prosody rate="95%">` slowdown makes delivery feel warmer and
 *     more coach-like.
 *
 * Plain text is always safe to fall back to — SSML is opt-in.
 */
function buildSsmlForEngine(text: string, engine: string): string {
  const escaped = escapeForSsml(text);
  if (engine === 'generative') {
    return `<speak><p>${escaped}</p></speak>`;
  }
  return `<speak><prosody rate="95%"><p>${escaped}</p></prosody></speak>`;
}

async function synthesize(text: string, voice: string, req: Request, useSsml: boolean): Promise<Response> {
  const cors = getCorsHeaders(req);
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID_POLLY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY_POLLY;
  const region = process.env.AWS_REGION_POLLY || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    const missing = [
      !accessKeyId && 'AWS_ACCESS_KEY_ID_POLLY',
      !secretAccessKey && 'AWS_SECRET_ACCESS_KEY_POLLY',
    ].filter(Boolean).join(', ');
    return new Response(`TTS not configured — missing env: ${missing}`, { status: 503, headers: cors });
  }

  if (!text || text.length > MAX_TEXT_LENGTH) {
    return new Response(`Invalid text (max ${MAX_TEXT_LENGTH} chars)`, {
      status: 400,
      headers: cors,
    });
  }

  const voiceKey = (voice || 'ruth').toLowerCase();
  const voiceConfig = ALLOWED_VOICES[voiceKey];
  if (!voiceConfig) {
    return new Response(`Unknown voice: ${voice}`, { status: 400, headers: cors });
  }

  try {
    // Lazy import to avoid crashing at module load time
    const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');

    const polly = new PollyClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const synthText = useSsml ? buildSsmlForEngine(text, voiceConfig.engine) : text;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import loses type info
    const command = new SynthesizeSpeechCommand({
      Text: synthText,
      TextType: useSsml ? 'ssml' : 'text',
      OutputFormat: 'mp3',
      VoiceId: voiceConfig.voiceId,
      Engine: voiceConfig.engine,
    } as any);

    // Keep server timeout ≥ client timeout (voiceService uses 10s) so
    // the server never aborts a request the client is still willing
    // to wait for.
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10000);

    let result;
    try {
      result = await polly.send(command, { abortSignal: abortController.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!result.AudioStream) {
      return new Response('No audio returned', { status: 500, headers: cors });
    }

    const audioBytes = await result.AudioStream.transformToByteArray();

    return new Response(audioBytes, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBytes.length),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : '';
    console.error('[TTS] Polly error:', name, msg);
    return new Response(`TTS error [${name}]: ${msg}`, { status: 500, headers: cors });
  }
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const cors = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Hard origin check — bail before calling Polly if the request
    // isn't coming from one of our known origins. Protects the AWS
    // budget from cost-amplification attacks via random sites.
    if (!isOriginAllowed(req)) {
      return new Response('Origin not allowed', { status: 403, headers: cors });
    }

    // Per-IP rate limit — catches automated abuse from allowed
    // origins (CORS-bypassed attacker with a valid origin header).
    // 600 req/hour is ~3-4x a heavy session.
    if (isRateLimited(req)) {
      return new Response('Rate limit exceeded. Slow down.', {
        status: 429,
        headers: {
          ...cors,
          'Retry-After': '3600',
        },
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const text = url.searchParams.get('text')?.trim() ?? '';
      const voice = url.searchParams.get('voice') ?? 'ruth';
      // `ssml=1` opts in to SSML wrapping. Default off so callers
      // that don't set the flag behave exactly like before.
      const useSsml = url.searchParams.get('ssml') === '1';

      // Diagnostic mode: /api/tts?diag=1 returns env var status without calling Polly
      if (url.searchParams.get('diag') === '1') {
        const hasKey = Boolean(process.env.AWS_ACCESS_KEY_ID_POLLY);
        const hasSecret = Boolean(process.env.AWS_SECRET_ACCESS_KEY_POLLY);
        const r = process.env.AWS_REGION_POLLY || '(not set, default us-east-1)';
        return new Response(
          `ENV CHECK:\nAWS_ACCESS_KEY_ID_POLLY: ${hasKey ? 'SET' : 'MISSING'}\nAWS_SECRET_ACCESS_KEY_POLLY: ${hasSecret ? 'SET' : 'MISSING'}\nAWS_REGION_POLLY: ${r}\n`,
          { status: 200, headers: { ...cors, 'Content-Type': 'text/plain' } },
        );
      }

      return synthesize(text, voice, req, useSsml);
    }

    if (req.method === 'POST') {
      let body: { text?: string; voice?: string; ssml?: boolean };
      try {
        body = await req.json() as { text?: string; voice?: string; ssml?: boolean };
      } catch {
        return new Response('Invalid JSON', { status: 400, headers: cors });
      }
      const text = body.text?.trim() ?? '';
      const voice = body.voice ?? 'ruth';
      const useSsml = body.ssml === true;
      return synthesize(text, voice, req, useSsml);
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[TTS] Handler crash:', msg);
    return new Response(`Handler error: ${msg}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
