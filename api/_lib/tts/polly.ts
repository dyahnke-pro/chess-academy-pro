/**
 * AWS Polly provider — the OUTGOING leg.
 *
 * 🚨 This file exists only until the Google key is live and the branch audit is
 * green. It is the fallback that keeps narration working if `GOOGLE_TTS_API_KEY`
 * is absent or Google errors, so the provider swap can't take the coach's voice
 * down. Once Google is verified on prod, delete this file and drop `pollyProvider`
 * from `api/tts.ts` — that is the whole removal.
 *
 * The synthesis logic below is the previous `api/tts.ts` behavior, moved
 * verbatim: the SSML → plain-text retry (InvalidSsmlException made narration
 * silent on iOS standalone, David 2026-06-12), the language-voice → English
 * fallback, and the AWS error classification. Nothing here is new.
 *
 * G4 holds: `result.AudioStream` is handed on as a stream. The buffered
 * `transformToByteArray()` path stays dead.
 */
import type { SynthesisRequest, TtsProvider } from './types.js';
import { TtsProviderError } from './types.js';
import { buildSsmlForEngine } from './ssml.js';

interface PollyVoiceConfig {
  voiceId: string;
  engine: string;
  languageCode?: string;
}

/** App voice key → Polly voice + engine. */
const POLLY_VOICES: Record<string, { voiceId: string; engine: string }> = {
  ruth: { voiceId: 'Ruth', engine: 'generative' },
  matthew: { voiceId: 'Matthew', engine: 'generative' },
  joanna: { voiceId: 'Joanna', engine: 'neural' },
  stephen: { voiceId: 'Stephen', engine: 'neural' },
  ivy: { voiceId: 'Ivy', engine: 'neural' },
  kendra: { voiceId: 'Kendra', engine: 'neural' },
  kimberly: { voiceId: 'Kimberly', engine: 'neural' },
  salli: { voiceId: 'Salli', engine: 'neural' },
  joey: { voiceId: 'Joey', engine: 'neural' },
  justin: { voiceId: 'Justin', engine: 'neural' },
  kevin: { voiceId: 'Kevin', engine: 'neural' },
  danielle: { voiceId: 'Danielle', engine: 'generative' },
  gregory: { voiceId: 'Gregory', engine: 'generative' },
};

/** Polly's native voice per detected locale (the `ttsLang.ts` map's targets). */
const POLLY_LANG_VOICES: Record<string, { voiceId: string; engine: string }> = {
  'es-ES': { voiceId: 'Lucia', engine: 'neural' },
  'fr-FR': { voiceId: 'Lea', engine: 'neural' },
  'de-DE': { voiceId: 'Vicki', engine: 'neural' },
  'pt-BR': { voiceId: 'Camila', engine: 'neural' },
  'it-IT': { voiceId: 'Bianca', engine: 'neural' },
  'ru-RU': { voiceId: 'Tatyana', engine: 'standard' },
  'ja-JP': { voiceId: 'Takumi', engine: 'neural' },
  'cmn-CN': { voiceId: 'Zhiyu', engine: 'neural' },
  arb: { voiceId: 'Zeina', engine: 'standard' },
  'hi-IN': { voiceId: 'Kajal', engine: 'neural' },
  'ko-KR': { voiceId: 'Seoyeon', engine: 'neural' },
};

function credentials(): { accessKeyId: string; secretAccessKey: string; region: string } {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_POLLY || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_POLLY || '',
    region: process.env.AWS_REGION_POLLY || 'us-east-1',
  };
}

/** AWS error name → the client's status + retry contract. Unchanged mapping. */
function classifyAwsError(name: string, message: string): TtsProviderError {
  const isThrottle = name === 'ThrottlingException' || name === 'TooManyRequestsException';
  const isServiceUnavail = name === 'ServiceUnavailableException' || name === 'InternalServiceException';
  const isAuth =
    name === 'AccessDeniedException' ||
    name === 'InvalidSignatureException' ||
    name === 'UnrecognizedClientException';

  if (isThrottle) return new TtsProviderError(name, message, 429, 5);
  if (isServiceUnavail) return new TtsProviderError(name, message, 503, 10);
  if (isAuth) return new TtsProviderError(name, message, 503, 60);
  return new TtsProviderError(name || 'Unknown', message, 500);
}

export const pollyProvider: TtsProvider = {
  id: 'polly',

  isConfigured(): boolean {
    const { accessKeyId, secretAccessKey } = credentials();
    return Boolean(accessKeyId && secretAccessKey);
  },

  async synthesize(req: SynthesisRequest): Promise<ReadableStream<Uint8Array>> {
    const { accessKeyId, secretAccessKey, region } = credentials();
    if (!accessKeyId || !secretAccessKey) {
      throw new TtsProviderError('PollyNotConfigured', 'AWS Polly credentials not set', 503, 60);
    }

    const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');
    const polly = new PollyClient({ region, credentials: { accessKeyId, secretAccessKey } });

    const englishVoice: PollyVoiceConfig = POLLY_VOICES[req.voiceKey.toLowerCase()] ?? POLLY_VOICES.ruth;
    const langVoice = req.languageCode
      ? POLLY_LANG_VOICES[req.languageCode]
        ? { ...POLLY_LANG_VOICES[req.languageCode], languageCode: req.languageCode }
        : undefined
      : undefined;
    const effectiveVoice: PollyVoiceConfig = langVoice ?? englishVoice;

    const buildCommand = (asSsml: boolean, vc: PollyVoiceConfig) =>
      new SynthesizeSpeechCommand({
        // Build the SSML document per voice: the engine class decides whether
        // prosody tags are honored. `asSsml=false` is the safe retry path —
        // plain text can never raise InvalidSsmlException.
        Text: asSsml ? buildSsmlForEngine(req.text, vc.engine, req.style, req.prosodyMode) : req.text,
        TextType: asSsml ? 'ssml' : 'text',
        OutputFormat: 'mp3',
        VoiceId: vc.voiceId,
        Engine: vc.engine,
        ...(vc.languageCode ? { LanguageCode: vc.languageCode } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import loses the literal-union types
      } as any);

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
      result = await send(buildCommand(req.ssml, effectiveVoice));
    } catch (err: unknown) {
      const errName = err instanceof Error ? err.name : '';
      if (req.ssml && errName === 'InvalidSsmlException') {
        // Plain text can never raise InvalidSsmlException; an SSML quirk must
        // not demote the user to silent Web Speech.
        console.warn('[TTS] InvalidSsmlException — retrying as plain text');
        try {
          result = await send(buildCommand(false, effectiveVoice));
        } catch (err2) {
          if (langVoice) {
            console.warn(`[TTS] language voice ${effectiveVoice.voiceId} failed — falling back to English`);
            result = await send(buildCommand(false, englishVoice));
          } else {
            const name = err2 instanceof Error ? err2.name : '';
            const msg = err2 instanceof Error ? err2.message : String(err2);
            throw classifyAwsError(name, msg);
          }
        }
      } else if (langVoice) {
        console.warn(`[TTS] language voice ${effectiveVoice.voiceId} failed (${errName}) — falling back to English`);
        result = await send(buildCommand(req.ssml, englishVoice));
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        throw classifyAwsError(errName, msg);
      }
    }

    if (!result.AudioStream) {
      throw new TtsProviderError('PollyNoAudio', 'No audio returned', 500);
    }
    return result.AudioStream as unknown as ReadableStream<Uint8Array>;
  },
};
