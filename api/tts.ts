export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'capacitor://app.chessacademy.pro',
  'https://chess-academy-pro.vercel.app',
];

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
  if (ALLOWED_ORIGINS.includes(origin)) {
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
  return ALLOWED_ORIGINS.includes(origin);
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
