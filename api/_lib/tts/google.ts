/**
 * Google Cloud Text-to-Speech provider.
 *
 * Replaces AWS Polly, whose free tier is a one-time 12-month cliff. Google's is
 * perpetual and monthly (~1M chars on Chirp3-HD / Neural2, 4M on WaveNet), so
 * voice cost stops being a launch risk. See
 * docs/plans/2026-08-03-polly-to-google-tts.md.
 *
 * ─── G4: streaming stays canonical ──────────────────────────────────────────
 * Google's REST endpoint answers with JSON — `{"audioContent": "<base64 mp3>"}`
 * — not raw audio bytes. The naive port (`await res.json()` then decode) would
 * reintroduce exactly the buffered path G4 bans: nothing reaches the client
 * until the entire clip has been received and parsed.
 *
 * So the provider never materialises the clip. It pipes the JSON body through a
 * streaming reader that finds the `audioContent` string, then base64-decodes in
 * 4-char groups AS THEY ARRIVE, emitting MP3 bytes downstream. The first audio
 * bytes leave this function while Google is still sending the rest of the
 * response, which is the property G4 exists to protect.
 *
 * Auth is an API key on the `X-Goog-Api-Key` header — the only Google auth flow
 * that works on the Edge runtime without a JWT-signing step.
 */
import type { SynthesisRequest, TtsProvider } from './types.js';
import { TtsProviderError } from './types.js';
import { resolveGoogleVoice, type GoogleVoice } from './googleVoices.js';
import { buildSsmlForEngine } from './ssml.js';

const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/** Matches the Polly path's server timeout: never abort a request the client
 *  (10s in voiceService) is still willing to wait for. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Base64 alphabet; anything else inside the audioContent string is a framing
 *  artifact (quotes, escapes, whitespace) rather than payload. */
const BASE64_CHARS = /[A-Za-z0-9+/=]/;

/**
 * Env var names accepted for the Google key, in priority order.
 *
 * `GOOGLE_TTS_API_KEY` is canonical, but process.env lookups are CASE-SENSITIVE
 * and the key actually provisioned on the Vercel project is `google_api_key`
 * (David 2026-08-03). A single-name read would have found nothing and silently
 * left prod on the Polly fallback — a config typo that presents as "the
 * migration just didn't happen", which is exactly the kind of silent no-op that
 * is worth spending five lines to make impossible.
 */
const API_KEY_ENV_NAMES = ['GOOGLE_TTS_API_KEY', 'GOOGLE_API_KEY', 'google_api_key'] as const;

function apiKey(): string {
  // Read lazily, per request: Edge runtime env vars are not reliably bound at
  // module-evaluation time (same hazard documented in _lib/usageGuard.ts).
  for (const name of API_KEY_ENV_NAMES) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
}

/** Decode a base64 string to bytes. `atob` is available on the Edge runtime. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Wrap a JSON response body in a stream that yields the decoded bytes of its
 * `audioContent` field, incrementally.
 *
 * Exported for tests — the incremental decode is the one piece of this
 * migration with no equivalent in the Polly path, so it is unit-tested against
 * chunk boundaries that split the key, the base64, and the closing quote.
 */
export function streamAudioContent(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  // 'seeking'  — scanning for the opening quote of the audioContent value
  // 'reading'  — inside the base64 string, emitting bytes
  // 'done'     — closing quote seen; drain and ignore the rest of the JSON
  let phase: 'seeking' | 'reading' | 'done' = 'seeking';
  let seekBuffer = '';
  let pending = '';
  let sawAudioContent = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Loop until we emit something or the body ends — a chunk can legitimately
      // carry only JSON framing and produce no audio bytes at all.
      for (;;) {
        const { done, value } = await reader.read();

        if (done) {
          if (phase === 'reading' || phase === 'done') {
            // Flush any trailing group. Google pads with '=', so a complete
            // payload always lands on a 4-char boundary; a remainder means the
            // stream was cut mid-clip.
            if (pending.length >= 4) {
              const usable = pending.slice(0, pending.length - (pending.length % 4));
              if (usable) controller.enqueue(base64ToBytes(usable));
            }
          }
          if (!sawAudioContent) {
            controller.error(
              new TtsProviderError('GoogleNoAudio', 'Google TTS response carried no audioContent', 502),
            );
            return;
          }
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });

        if (phase === 'seeking') {
          seekBuffer += text;
          const keyIndex = seekBuffer.indexOf('"audioContent"');
          if (keyIndex === -1) {
            // Keep only enough tail to catch a key split across chunks.
            if (seekBuffer.length > 512) seekBuffer = seekBuffer.slice(-64);
            continue;
          }
          const colonIndex = seekBuffer.indexOf(':', keyIndex);
          if (colonIndex === -1) continue;
          const quoteIndex = seekBuffer.indexOf('"', colonIndex);
          if (quoteIndex === -1) continue;
          sawAudioContent = true;
          phase = 'reading';
          const remainder = seekBuffer.slice(quoteIndex + 1);
          seekBuffer = '';
          const emitted = consume(remainder, controller);
          if (emitted) return;
          continue;
        }

        if (phase === 'reading') {
          const emitted = consume(text, controller);
          if (emitted) return;
          continue;
        }

        // phase === 'done' — drain the trailing JSON without emitting.
      }
    },
    cancel(reason) {
      void reader.cancel(reason);
    },
  });

  /** Feed raw text from inside the audioContent string; emit whole 4-char
   *  base64 groups. Returns true when bytes were enqueued. */
  function consume(chunk: string, controller: ReadableStreamDefaultController<Uint8Array>): boolean {
    let payload = '';
    for (const ch of chunk) {
      if (ch === '"') {
        phase = 'done';
        break;
      }
      // JSON encoders may escape '/' as '\/'; the backslash is framing.
      if (ch === '\\') continue;
      if (BASE64_CHARS.test(ch)) payload += ch;
    }
    pending += payload;

    const groupLen = pending.length - (pending.length % 4);
    if (groupLen === 0) return false;
    const usable = pending.slice(0, groupLen);
    pending = pending.slice(groupLen);
    controller.enqueue(base64ToBytes(usable));
    return true;
  }
}

/** Map a Google API failure onto the client's error contract (status +
 *  `X-TTS-Error-Name` + `Retry-After`), matching how the Polly path classified
 *  throttles / auth / service errors so voiceService's cooldown still tunes
 *  itself correctly. */
function classifyError(status: number, detail: string): TtsProviderError {
  if (status === 429) {
    return new TtsProviderError('GoogleQuotaExceeded', detail, 429, 5);
  }
  if (status === 401 || status === 403) {
    return new TtsProviderError('GoogleAuthError', detail, 503, 60);
  }
  if (status >= 500) {
    return new TtsProviderError('GoogleServiceUnavailable', detail, 503, 10);
  }
  if (status === 400) {
    return new TtsProviderError('GoogleInvalidArgument', detail, 500);
  }
  return new TtsProviderError('GoogleError', detail, 500);
}

/** Pull a useful message out of Google's error envelope without buffering audio
 *  (this only ever runs on a non-2xx response, which carries no audio). */
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.text();
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string; status?: string } };
      const msg = parsed.error?.message;
      if (msg) return msg;
    } catch {
      // Not JSON — fall through to the raw text.
    }
    return body.slice(0, 300) || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function postSynthesize(
  payload: string,
  voice: GoogleVoice,
  useSsml: boolean,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(GOOGLE_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Goog-Api-Key': apiKey(),
      },
      body: JSON.stringify({
        input: useSsml ? { ssml: payload } : { text: payload },
        voice: {
          languageCode: voice.languageCode,
          name: voice.voiceName,
        },
        audioConfig: {
          // MP3 keeps the wire format identical to Polly's, so every client
          // decode path (MediaSource, ManagedMediaSource, buffered <audio> on
          // iOS) is unchanged.
          audioEncoding: 'MP3',
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const googleProvider: TtsProvider = {
  id: 'google',

  isConfigured(): boolean {
    return Boolean(apiKey());
  },

  async synthesize(req: SynthesisRequest): Promise<ReadableStream<Uint8Array>> {
    if (!apiKey()) {
      throw new TtsProviderError('GoogleNotConfigured', 'GOOGLE_TTS_API_KEY not set', 503, 60);
    }

    const voice = resolveGoogleVoice(req.voiceKey, req.languageCode);
    // Chirp3 takes no SSML, so a `<speak>` document would be read out as
    // literal markup. Build the document only for a voice that accepts one;
    // otherwise send the raw text, which is exactly today's behavior for the
    // generative voices the Chirp3 tier replaces.
    const useSsml = req.ssml && voice.supportsSsml;
    const payload = useSsml
      ? buildSsmlForEngine(req.text, 'neural', req.style, req.prosodyMode)
      : req.text;

    let res = await postSynthesize(payload, voice, useSsml);

    // A rejected voice/locale pair must never mean silence. Retry once on the
    // broad-coverage WaveNet fallback — the same "never go silent" chain the
    // Polly path used (SSML → plain text → English voice).
    if (res.status === 400 && voice.fallbackVoiceName !== voice.voiceName) {
      const detail = await readErrorDetail(res);
      console.warn(`[TTS] google voice ${voice.voiceName} rejected (${detail}) — retrying ${voice.fallbackVoiceName}`);
      const fallback: GoogleVoice = { ...voice, voiceName: voice.fallbackVoiceName };
      // Resend the SAME payload in the SAME mode. WaveNet would accept SSML,
      // but re-wrapping the text mid-flight would change what gets spoken on a
      // retry — the retry exists to preserve the narration, not to alter it.
      res = await postSynthesize(payload, fallback, useSsml);
    }

    if (!res.ok) {
      throw classifyError(res.status, await readErrorDetail(res));
    }
    if (!res.body) {
      throw new TtsProviderError('GoogleNoAudio', 'Google TTS returned an empty body', 502);
    }

    return streamAudioContent(res.body);
  },
};
