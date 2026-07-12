export const config = { runtime: 'edge' };

import { checkUsageGuard, POLLY_USD_PER_CHAR } from './_lib/usageGuard.js';
import { detectVoiceForText } from './_lib/ttsLang.js';
import { isAllowedOrigin } from './_lib/allowedOrigin.js';

// Origin allowlist: shared module (api/_lib/allowedOrigin.ts) — the single
// source of truth for every api/* gate (kills the copy-drift that left the
// two endpoints with DIFFERENT preview regexes, neither matching deployment
// URLs — the 2026-07-09 403s).

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
  // Vary on Origin ALWAYS so the CDN keys the cache per-origin. Without it a
  // no-origin / disallowed request (a bot, a health probe) populated a cacheable
  // /api/tts response with NO Access-Control-Allow-Origin that then got served to
  // EVERY origin — which CORS-blocked the Android WebView's cached warmup probe
  // (https://app.chessacademy.pro) and silently downgraded Polly voice to the
  // robotic Web Speech fallback on Android. (Caught by the emulator smoke,
  // 2026-06-28.)
  base['Vary'] = 'Origin';
  if (isAllowedOrigin(origin)) {
    base['Access-Control-Allow-Origin'] = origin;
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

function escapeForSsml(text: string): string {
  // Strip codepoints illegal in XML 1.0 BEFORE escaping. A single control
  // char or lone surrogate anywhere in the passage makes Polly reject the
  // whole request with InvalidSsmlException (=> 500 => client falls over to
  // iOS Web Speech, silent in a standalone PWA). The five-char escape alone
  // is NOT enough; client-side sanitizers / pasted content can introduce
  // these silent killers. Filter by codepoint, then escape the XML-five.
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    // Allow tab/newline/CR; drop the rest below U+0020.
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue;
    // Drop the non-characters U+FFFE / U+FFFF.
    if (c === 0xfffe || c === 0xffff) continue;
    // Lone surrogates (U+D800-U+DFFF) never reach here: the for..of iterator
    // yields whole code points, so unpaired surrogates surface as U+FFFD
    // (replacement char), which is valid XML. Belt-and-suspenders: drop them.
    if (c >= 0xd800 && c <= 0xdfff) continue;
    out += ch;
  }
  return out
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wrap plain coaching text in engine-appropriate SSML for natural
 * inflection. Polly tag support differs by engine:
 *   - GENERATIVE voices (Ruth / Matthew / Danielle / Gregory) only
 *     support structural tags (<speak>, <p>, <s>, <lang>, <mark>,
 *     <sub>, <w>). They interpret punctuation, pacing and emotion
 *     from context on their own, so we only add paragraph structure
 *     to help the engine parse it cleanly.
 *   - NEURAL voices support prosody / break / emphasis / amazon:domain.
 *     We tune `<prosody rate>` and `<prosody pitch>` per personality
 *     so the same Joanna voice can sound gentler for soft,
 *     clipped for drill-sergeant, etc.
 *
 * Plain text is always safe to fall back to — SSML is opt-in.
 *
 * @param style — optional personality string for prosody tuning. When
 *   absent, falls back to the previous default 'rate=95%'.
 */
// All-ages contract (David 2026-06-28): no 'flirtatious' style.
type PersonalityStyle = 'default' | 'soft' | 'edgy' | 'drill-sergeant';

const NEURAL_PROSODY_BY_STYLE: Record<PersonalityStyle, { rate: string; pitch?: string; volume?: string }> = {
  // Default: mild slowdown for warmth — matches the previous behavior.
  default: { rate: '95%' },
  // Soft: gentler, slightly slower.
  soft: { rate: '92%', volume: 'soft' },
  // Edgy: faster, sharper. Slight pitch lift for cutting tone.
  edgy: { rate: '105%', pitch: '+2%' },
  // Drill sergeant: crisp, loud, no slowdown.
  'drill-sergeant': { rate: '108%', volume: 'x-loud' },
};

export function buildSsmlForEngine(text: string, engine: string, style?: string, prosodyMode?: string): string {
  const escaped = escapeForSsml(text);
  if (engine === 'generative') {
    // Generative engines don't honor prosody — paragraph wrap is the
    // only safe enrichment. Engine handles emotion / pacing on its own.
    // (The #25 spike is therefore a documented no-op here.)
    return `<speak><p>${escaped}</p></speak>`;
  }
  const personality = (style ?? 'default') as PersonalityStyle;
  const prosody = NEURAL_PROSODY_BY_STYLE[personality] ?? NEURAL_PROSODY_BY_STYLE.default;
  // Decisive-beat SPIKE (#25, David 2026-07-11 approval): a slight lift on
  // the payoff lines ("You called it", the brilliancy stems). Composed OVER
  // the personality base — rate +8 points, pitch +6% — never a new register.
  let rate = prosody.rate;
  let pitch = prosody.pitch;
  if (prosodyMode === 'spike') {
    const baseRate = Number.parseInt(prosody.rate, 10);
    rate = `${Number.isFinite(baseRate) ? Math.min(baseRate + 8, 130) : 103}%`;
    pitch = '+6%';
  }
  const attrs = [
    `rate="${rate}"`,
    pitch ? `pitch="${pitch}"` : '',
    prosody.volume ? `volume="${prosody.volume}"` : '',
  ].filter(Boolean).join(' ');
  return `<speak><prosody ${attrs}><p>${escaped}</p></prosody></speak>`;
}

async function synthesize(text: string, voice: string, req: Request, useSsml: boolean, style?: string, prosodyMode?: string): Promise<Response> {
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

  // Language-aware voice (the coach answers in the user's language, but the
  // voice map is all US-English — an English voice mangles Spanish/French and
  // can't read Japanese/Arabic/Cyrillic at all). If the passage is non-English,
  // speak it with a native Polly voice. When detection isn't confident it
  // returns null → we keep the requested English voice, so English is unchanged.
  // The catch below falls back to English on any synth failure, so a detected
  // voice can never make narration go silent.
  const englishVoice = { voiceId: voiceConfig.voiceId, engine: voiceConfig.engine, languageCode: undefined as string | undefined };
  const langVoice = detectVoiceForText(text);
  const effectiveVoice = langVoice ?? englishVoice;

  // Cross-fleet cost guard: KV-backed per-IP rate limit + the shared global
  // daily $ kill-switch (Polly is the bigger cost driver, ~$16/1M chars). This
  // is the durable layer on top of the per-isolate in-memory limit above;
  // no-op until KV is provisioned (api/_lib/usageGuard.ts).
  const guard = await checkUsageGuard('tts', req, text.length * POLLY_USD_PER_CHAR);
  if (!guard.allowed) {
    return new Response('Usage limit reached. Voice is resting briefly.', {
      status: 429,
      headers: { ...cors, 'Retry-After': String(guard.retryAfterSec ?? 3600) },
    });
  }

  try {
    // Lazy import to avoid crashing at module load time
    const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');

    const polly = new PollyClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Build the command for a given mode. `asSsml=false` is the safe
    // fallback path — plain text can never raise InvalidSsmlException.
    const buildCommand = (asSsml: boolean, vc: { voiceId: string; engine: string; languageCode?: string }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import loses type info
      new SynthesizeSpeechCommand({
        Text: asSsml ? buildSsmlForEngine(text, vc.engine, style, prosodyMode) : text,
        TextType: asSsml ? 'ssml' : 'text',
        OutputFormat: 'mp3',
        VoiceId: vc.voiceId,
        Engine: vc.engine,
        // Pin the locale for the language voices (harmless for English, where
        // it's undefined and omitted). Helps Polly pick the right pronunciation
        // for bilingual voices.
        ...(vc.languageCode ? { LanguageCode: vc.languageCode } : {}),
      } as any);

    // Keep server timeout ≥ client timeout (voiceService uses 10s) so
    // the server never aborts a request the client is still willing
    // to wait for.
    const send = async (command: InstanceType<typeof SynthesizeSpeechCommand>) => {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 10000);
      try {
        return await polly.send(command, { abortSignal: abortController.signal });
      } finally {
        clearTimeout(timeout);
      }
    };

    let result;
    try {
      result = await send(buildCommand(useSsml, effectiveVoice));
    } catch (err: unknown) {
      // SSML safety net (the silent-narration bug, David 2026-06-12): a
      // friend on an iOS standalone PWA heard NO narration because the
      // read-aloud passage's SSML tripped InvalidSsmlException → 500 →
      // the client fell over to iOS Web Speech (silent in standalone).
      // Plain text never raises this, so on an SSML parse error retry once
      // as plain text. Polly is the canonical voice (G4); an SSML quirk must
      // never demote a user to silent Web Speech. Audit captures the recovery.
      const errName = err instanceof Error ? err.name : '';
      if (useSsml && errName === 'InvalidSsmlException') {
        console.warn('[TTS] InvalidSsmlException — retrying as plain text');
        try {
          result = await send(buildCommand(false, effectiveVoice));
        } catch (err2) {
          // Plain text still failed on a detected language voice → fall back
          // to the English voice so narration never goes silent.
          if (langVoice) {
            console.warn(`[TTS] language voice ${effectiveVoice.voiceId} failed — falling back to English ${englishVoice.voiceId}`);
            result = await send(buildCommand(false, englishVoice));
          } else {
            throw err2;
          }
        }
      } else if (langVoice) {
        // A non-SSML failure while using a detected language voice (e.g. an
        // unexpected voice/engine mismatch Polly rejects) must never go silent
        // — fall back to the requested English voice, i.e. today's behavior.
        console.warn(`[TTS] language voice ${effectiveVoice.voiceId} failed (${errName}) — falling back to English ${englishVoice.voiceId}`);
        result = await send(buildCommand(useSsml, englishVoice));
      } else {
        throw err;
      }
    }

    if (!result.AudioStream) {
      return new Response('No audio returned', { status: 500, headers: cors });
    }

    // Stream the Polly MP3 bytes through to the client instead of
    // buffering the full response in memory. Polly synthesizes a
    // sentence-length clip in ~600-1500ms; with the prior
    // `transformToByteArray()` we waited the FULL synthesis time
    // before sending a single byte. Piping the SDK's web
    // ReadableStream directly into the Response means the first
    // chunk hits the client as soon as Polly produces it, cutting
    // perceived latency by half on typical 1-2 sentence narrations.
    //
    // Production audit (2026-05-18, David's report): voice lag was
    // showing as multi-second waits between brain answer and Polly
    // playback — the inventory traced it to this buffer. Streaming
    // the response is part 1 of the fix; the client-side progressive
    // decoder lands in a follow-up so audio plays AS chunks arrive,
    // not after the full body downloads.
    //
    // No Content-Length header — body is now chunked transfer.
    // Cache-Control still 24h so repeat narrations on the same text
    // (cached by the client's LRU) skip Polly entirely.
    const audioStream = result.AudioStream as unknown as ReadableStream<Uint8Array>;
    return new Response(audioStream, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : '';
    console.error('[TTS] Polly error:', name, msg);

    // Classify AWS Polly errors so the client can pick the right backoff.
    // Audit log (2026-05-27/28) showed 10 generic "API error 500" cooldowns
    // with no signal whether Polly was throttling, the credentials were
    // wrong, or the service was down — every failure looked the same and
    // got the same 15s cooldown. Map throttle → 429 (short backoff,
    // retry-after), service / internal failure → 503, auth → 503 long,
    // anything else → 500. Surface the AWS error name in a response header
    // so the client audit captures the actual cause without parsing the body.
    const isThrottle = name === 'ThrottlingException' || name === 'TooManyRequestsException';
    const isServiceUnavail = name === 'ServiceUnavailableException' || name === 'InternalServiceException';
    const isAuth = name === 'AccessDeniedException' || name === 'InvalidSignatureException' || name === 'UnrecognizedClientException';

    const errHeaders: Record<string, string> = { ...cors, 'X-TTS-Error-Name': name || 'Unknown' };
    let status = 500;
    if (isThrottle) {
      status = 429;
      errHeaders['Retry-After'] = '5';
    } else if (isServiceUnavail) {
      status = 503;
      errHeaders['Retry-After'] = '10';
    } else if (isAuth) {
      status = 503;
      errHeaders['Retry-After'] = '60';
    }
    return new Response(`TTS error [${name}]: ${msg}`, { status, headers: errHeaders });
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
      // Personality style → SSML prosody tuning (Neural voices only).
      // Generative voices ignore prosody; we still pass it through
      // for consistency.
      const style = url.searchParams.get('style') ?? undefined;
      // Decisive-beat prosody spike (#25) — additive; Neural voices only.
      const prosodyMode = url.searchParams.get('prosody') ?? undefined;

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

      return synthesize(text, voice, req, useSsml, style, prosodyMode);
    }

    if (req.method === 'POST') {
      let body: { text?: string; voice?: string; ssml?: boolean; style?: string; prosody?: string };
      try {
        body = await req.json() as { text?: string; voice?: string; ssml?: boolean; style?: string; prosody?: string };
      } catch {
        return new Response('Invalid JSON', { status: 400, headers: cors });
      }
      const text = body.text?.trim() ?? '';
      const voice = body.voice ?? 'ruth';
      const useSsml = body.ssml === true;
      return synthesize(text, voice, req, useSsml, body.style, body.prosody);
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
