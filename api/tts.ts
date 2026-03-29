export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'capacitor://app.chessacademy.pro',
  'https://chess-academy-pro.vercel.app',
];

function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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

async function synthesize(text: string, voice: string, req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID_POLLY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY_POLLY;
  const region = process.env.AWS_REGION_POLLY || 'us-east-2';

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import loses type info
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: voiceConfig.voiceId,
      Engine: voiceConfig.engine,
    } as any);

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000);

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

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const text = url.searchParams.get('text')?.trim() ?? '';
      const voice = url.searchParams.get('voice') ?? 'ruth';

      // Diagnostic mode: /api/tts?diag=1 returns env var status without calling Polly
      if (url.searchParams.get('diag') === '1') {
        const hasKey = Boolean(process.env.AWS_ACCESS_KEY_ID_POLLY);
        const hasSecret = Boolean(process.env.AWS_SECRET_ACCESS_KEY_POLLY);
        const r = process.env.AWS_REGION_POLLY || '(not set, default us-east-2)';
        return new Response(
          `ENV CHECK:\nAWS_ACCESS_KEY_ID_POLLY: ${hasKey ? 'SET' : 'MISSING'}\nAWS_SECRET_ACCESS_KEY_POLLY: ${hasSecret ? 'SET' : 'MISSING'}\nAWS_REGION_POLLY: ${r}\n`,
          { status: 200, headers: { ...cors, 'Content-Type': 'text/plain' } },
        );
      }

      return synthesize(text, voice, req);
    }

    if (req.method === 'POST') {
      let body: { text?: string; voice?: string };
      try {
        body = await req.json() as { text?: string; voice?: string };
      } catch {
        return new Response('Invalid JSON', { status: 400, headers: cors });
      }
      const text = body.text?.trim() ?? '';
      const voice = body.voice ?? 'ruth';
      return synthesize(text, voice, req);
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
