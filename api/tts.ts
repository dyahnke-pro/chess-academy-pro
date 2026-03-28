import { PollyClient, SynthesizeSpeechCommand, type VoiceId, type Engine } from '@aws-sdk/client-polly';

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

// Neural voices available in us-east-2 (Ohio)
const ALLOWED_VOICES: Record<string, { voiceId: VoiceId; engine: Engine }> = {
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
    return new Response('TTS not configured', { status: 503, headers: cors });
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
    const polly = new PollyClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: voiceConfig.voiceId,
      Engine: voiceConfig.engine,
    });

    const result = await polly.send(command);

    if (!result.AudioStream) {
      return new Response('No audio returned', { status: 500, headers: cors });
    }

    const chunks: Uint8Array[] = [];
    const reader = result.AudioStream.transformToWebStream().getReader();
    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (value) chunks.push(value);
      done = streamDone;
    }
    const audioBytes = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      audioBytes.set(chunk, offset);
      offset += chunk.length;
    }

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
    console.error('[TTS] Polly error:', msg);
    return new Response(`TTS error: ${msg}`, { status: 500, headers: cors });
  }
}

export default async function handler(req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Support GET with query params (for direct <audio src="..."> on iOS)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const text = url.searchParams.get('text')?.trim() ?? '';
    const voice = url.searchParams.get('voice') ?? 'ruth';
    return synthesize(text, voice, req);
  }

  // Support POST with JSON body
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
}
