export const config = { runtime: 'edge' };

import { checkUsageGuard, POLLY_USD_PER_CHAR } from './_lib/usageGuard.js';
import { detectVoiceForText } from './_lib/ttsLang.js';
import { isAllowedOrigin } from './_lib/allowedOrigin.js';
import { googleProvider } from './_lib/tts/google.js';
import { lookupPrerendered, isPrerenderEnabled } from './_lib/tts/prerendered.js';
import { TtsProviderError, type TtsProvider, type SynthesisRequest } from './_lib/tts/types.js';

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
 * caller returns 403 so the request never reaches a TTS vendor.
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

/**
 * The app's voice roster — the keys `voiceService` may request, and the engine
 * CLASS each one implies (which decides whether prosody SSML is honored).
 *
 * Provider-agnostic on purpose: the display names are historical (they came
 * from Polly) but each provider maps these keys onto its own voices — see
 * `_lib/tts/googleVoices.ts`. An unknown key still 400s here rather than
 * silently substituting a different voice.
 */
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
 * Cache policy for synthesized audio — the cheapest cost control we have.
 *
 * A given (text, voice, style) always produces the SAME audio, so a clip is
 * immutable and can be cached essentially forever. Verified against prod
 * 2026-08-03: `/api/tts` responses are already served by Vercel's CDN
 * (`x-vercel-cache: HIT` on a repeat request), so every hit is a vendor call
 * we never pay for.
 *
 * The old policy was `max-age=86400` — one day. That threw away the cache
 * nightly and re-billed the same lesson lines forever. The TTL is now the
 * effective maximum (David 2026-08-03: "make it 100 years"):
 *   - `max-age`   — the client's own LRU / HTTP cache.
 *   - `s-maxage`  — the CDN copy, which is the one that saves money across
 *                   ALL users rather than per-device.
 *   - `stale-while-revalidate` — serve the cached clip instantly while a
 *                   refresh happens behind it, so an expiry never costs a
 *                   user latency.
 *   - `immutable` — the part that actually means "never re-fetch this". It
 *                   tells caches not to revalidate at all, which is what makes
 *                   the duration academic.
 *
 * 2147483647 is used rather than a literal century because HTTP caps this in
 * practice: RFC 9111 has caches clamp values above ~2^31 seconds (≈68 years),
 * and CDNs apply their own ceiling (Vercel's is a year) regardless of what we
 * send. So this is the largest number that means anything — a bigger one would
 * be silently clamped and just look like it did something.
 *
 * This is why bulk pre-rendering the whole corpus up front is NOT needed
 * (David 2026-08-03: "can't we just capture recordings as they play out?").
 * Lines get cached the first time they're actually played, so we pay only for
 * what someone genuinely hears, and popular content is cached first by
 * construction.
 */
const AUDIO_CACHE_CONTROL = 'public, max-age=2147483647, s-maxage=2147483647, stale-while-revalidate=86400, immutable';

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

// SSML construction moved to `_lib/tts/ssml.ts` when the provider seam landed:
// whether a voice accepts SSML is a VENDOR fact, so the document has to be
// built inside the provider (Google's Chirp3 voices take plain text only and
// would otherwise read the markup aloud). Re-exported here because it is part
// of this module's public surface — `src/services/ttsProsody.test.ts` imports
// it from `api/tts`.
export { buildSsmlForEngine } from './_lib/tts/ssml.js';

/**
 * Pick the synthesis provider.
 *
 * Google is primary (perpetual monthly free tier; Polly's is a one-time
 * 12-month cliff). Polly stays as the fallback leg ONLY until the Google key is
 * live and the branch audit is green — see
 * docs/plans/2026-08-03-polly-to-google-tts.md. Removing it is then a one-line
 * change here plus deleting `_lib/tts/polly.ts`.
 */
export function selectProviders(): TtsProvider[] {
  // POLLY LEG REMOVED (David 2026-08-07, second "I heard the old Polly
  // voice" report — this time on the NEW cache generation, so the clip was
  // freshly served by the fallback leg, not a stale CDN entry). The
  // migration plan's exit criteria are met: the Google key is live on prod
  // (`x-tts-source: google` verified across real games), so per the plan
  // this is the sanctioned one-line removal. One server voice, always. A
  // rare Google failure now returns an error and the client falls to its
  // device-TTS floor — an obviously-different voice for one line beats
  // sometimes-Ruth-sometimes-Polly, which reads as a broken app.
  const chain: TtsProvider[] = [];
  if (googleProvider.isConfigured()) chain.push(googleProvider);
  return chain;
}

async function synthesize(text: string, voice: string, req: Request, useSsml: boolean, style?: string, prosodyMode?: string): Promise<Response> {
  const cors = getCorsHeaders(req);
  const providers = selectProviders();

  if (providers.length === 0) {
    return new Response(
      'TTS not configured — set GOOGLE_TTS_API_KEY (or AWS_ACCESS_KEY_ID_POLLY / AWS_SECRET_ACCESS_KEY_POLLY)',
      { status: 503, headers: cors },
    );
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
  // speak it with a native voice. When detection isn't confident it returns
  // null → we keep the requested English voice, so English is unchanged. Each
  // provider falls back to English on a synth failure, so a detected voice can
  // never make narration go silent.
  const langVoice = detectVoiceForText(text);
  // The engine class drives SSML shape: generative engines take structural
  // tags only, neural honor prosody. Language voices carry their own class.
  const engine = (langVoice?.engine ?? voiceConfig.engine) as SynthesisRequest['engine'];

  // Cross-fleet cost guard: KV-backed per-IP rate limit + the shared global
  // daily $ kill-switch. This is the durable layer on top of the per-isolate
  // in-memory limit above; no-op until KV is provisioned
  // (api/_lib/usageGuard.ts).
  const guard = await checkUsageGuard('tts', req, text.length * POLLY_USD_PER_CHAR);
  if (!guard.allowed) {
    return new Response('Usage limit reached. Voice is resting briefly.', {
      status: 429,
      headers: { ...cors, 'Retry-After': String(guard.retryAfterSec ?? 3600) },
    });
  }

  // Pre-rendered clip? The Watch/Learn corpus is identical for every user, so
  // it is synthesized once offline and served from the CDN instead of being
  // billed per playback. Fails open in every branch — a miss (or any error)
  // just falls through to live synthesis below.
  const prerendered = await lookupPrerendered({ text, voiceKey, style, prosodyMode, ssml: useSsml });
  if (prerendered) {
    return new Response(prerendered, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': AUDIO_CACHE_CONTROL,
        'X-TTS-Source': 'prerendered',
      },
    });
  }

  // Walk the provider chain. Google is primary; the Polly leg (removed once
  // the Google key is verified on prod) is the safety net so a vendor outage
  // or a misconfigured key can never take the coach's voice down.
  const synthRequest: SynthesisRequest = {
    // RAW text. Each provider decides whether its resolved voice accepts SSML
    // and builds the document itself — a pre-built <speak> document handed to
    // a plain-text-only voice gets read out as literal markup.
    text,
    voiceKey,
    engine,
    languageCode: langVoice?.languageCode,
    ssml: useSsml,
    style,
    prosodyMode,
  };

  let lastError: TtsProviderError | null = null;

  for (const provider of providers) {
    try {
      const audioStream = await provider.synthesize(synthRequest);

      // Stream the MP3 bytes through to the client instead of buffering the
      // full clip in memory. Synthesis of a sentence-length clip takes
      // ~600-1500ms; buffering meant waiting the FULL synthesis time before
      // sending a single byte. Piping the provider's ReadableStream straight
      // into the Response means the first chunk hits the client as soon as the
      // vendor produces it, roughly halving perceived latency on a typical
      // 1-2 sentence narration.
      //
      // Production audit (2026-05-18, David's report): voice lag showed as
      // multi-second waits between the brain's answer and playback, and the
      // inventory traced it to exactly that buffer. CLAUDE.md G4 makes
      // streaming canonical and the buffered path permanently dead.
      //
      // No Content-Length header — the body is chunked transfer. Cache-Control
      // stays 24h so repeat narrations of the same text (also held in the
      // client's LRU) skip the vendor entirely.
      // FALLBACK AUDIO IS NEVER CACHED FOREVER (David 2026-08-07, after
      // hearing "the old Polly voice" mid-session). The eternal immutable
      // policy is correct only for the PRIMARY provider's audio: a clip the
      // fallback leg served during a transient primary outage would
      // otherwise be frozen into the CDN in the WRONG VOICE for ~68 years,
      // poisoning that line in that region long after the primary recovered.
      // Fallback clips serve uncached, so the next request re-tries the
      // primary and the mixed-voice session heals itself.
      // Identity check, NOT chain position — if the chain ever again holds a
      // non-Google leg and Google's key resolution hiccups, position-based
      // "primary" would eternal-cache the wrong voice (the 2026-08-07
      // mixed-voice report). Only Google audio is ever cached forever.
      const isPrimary = provider.id === 'google';
      return new Response(audioStream, {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': isPrimary ? AUDIO_CACHE_CONTROL : 'no-store',
          'X-TTS-Source': provider.id,
        },
      });
    } catch (error: unknown) {
      const providerError = error instanceof TtsProviderError
        ? error
        : new TtsProviderError(
            error instanceof Error ? error.name || 'Unknown' : 'Unknown',
            error instanceof Error ? error.message : String(error),
          );
      console.error(`[TTS] ${provider.id} error:`, providerError.errorName, providerError.message);
      lastError = providerError;
      // Try the next leg rather than returning an error the client will turn
      // into a cooldown — a fallover is strictly better than silence.
      //
      // NB: this only covers failures raised BEFORE the first byte (auth,
      // quota, a rejected voice, a non-2xx). Once we've returned the Response
      // the stream is committed, so a mid-stream fault surfaces to the client
      // as a truncated clip — which voiceService already detects and retries.
      // Falling over mid-stream would mean buffering, and G4 forbids that.
    }
  }

  // Every leg failed. Report the LAST failure using the contract the client
  // already understands: the vendor error name in `X-TTS-Error-Name` (so the
  // audit shows the real cause without parsing the body) and a `Retry-After`
  // that tunes voiceService's cooldown — throttles back off briefly, auth
  // failures back off longer. Before this classification existed, every
  // failure looked identical and got the same flat 15s cooldown (audit log
  // 2026-05-27/28).
  const name = lastError?.errorName ?? 'Unknown';
  const msg = lastError?.message ?? 'No TTS provider available';
  const errHeaders: Record<string, string> = { ...cors, 'X-TTS-Error-Name': name };
  if (lastError?.retryAfterSec) errHeaders['Retry-After'] = String(lastError.retryAfterSec);
  return new Response(`TTS error [${name}]: ${msg}`, {
    status: lastError?.status ?? 500,
    headers: errHeaders,
  });
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const cors = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Hard origin check — bail before calling the TTS vendor if the request
    // isn't coming from one of our known origins. Protects the synthesis
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

      // Diagnostic mode: /api/tts?diag=1 reports which provider would serve,
      // without synthesizing anything. Names only — never a secret VALUE.
      if (url.searchParams.get('diag') === '1') {
        const chain = selectProviders();
        // Same accepted-names list as the provider itself — the diag used to
        // read only the canonical name and printed MISSING while google was
        // actually serving (the provisioned key is `google_api_key`), which
        // sent a 2026-08-07 voice investigation down the wrong path.
        const googleKeySet = ['GOOGLE_TTS_API_KEY', 'GOOGLE_API_KEY', 'google_api_key']
          .some((n) => Boolean(process.env[n]));
        const lines = [
          'ENV CHECK:',
          `google key (any accepted name): ${googleKeySet ? 'SET' : 'MISSING'}`,
          `AWS_ACCESS_KEY_ID_POLLY: ${process.env.AWS_ACCESS_KEY_ID_POLLY ? 'SET' : 'MISSING'}`,
          `AWS_SECRET_ACCESS_KEY_POLLY: ${process.env.AWS_SECRET_ACCESS_KEY_POLLY ? 'SET' : 'MISSING'}`,
          `AWS_REGION_POLLY: ${process.env.AWS_REGION_POLLY || '(not set, default us-east-1)'}`,
          `TTS_PRERENDER_BASE_URL: ${isPrerenderEnabled() ? 'SET' : 'MISSING (pre-render serving off)'}`,
          `provider chain: ${chain.length ? chain.map((p) => p.id).join(' → ') : '(none configured)'}`,
        ];
        return new Response(`${lines.join('\n')}\n`, {
          status: 200,
          headers: { ...cors, 'Content-Type': 'text/plain' },
        });
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
