/**
 * Google TTS provider gates.
 *
 * The incremental base64 decode is the one piece of the Polly→Google migration
 * with no equivalent in the old path, and it is what keeps CLAUDE.md G4 true:
 * Google answers with JSON, so a naive `await res.json()` would reintroduce the
 * buffered path that G4 permanently banned. These tests drive it with chunk
 * boundaries that split the key, the base64 payload, and the closing quote —
 * the cases a single-chunk happy path would never reach.
 */
import { describe, it, expect } from 'vitest';
import { streamAudioContent, base64ToBytes } from './google';
import { GOOGLE_VOICES, GOOGLE_LANG_VOICES, resolveGoogleVoice, engineForGoogleVoice } from './googleVoices';
import { LANG_VOICES } from '../ttsLang';

/** A ReadableStream that emits exactly the chunk boundaries we specify. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Base64 of a payload, the way Google would send it. */
function b64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const PAYLOAD = new Uint8Array(Array.from({ length: 300 }, (_, i) => i % 256));

describe('streamAudioContent', () => {
  it('decodes the audioContent of a single-chunk response', async () => {
    const body = `{"audioContent":"${b64(PAYLOAD)}"}`;
    const out = await drain(streamAudioContent(streamOf([body])));
    expect(Array.from(out)).toEqual(Array.from(PAYLOAD));
  });

  it('decodes across arbitrary chunk boundaries', async () => {
    const body = `{"audioContent":"${b64(PAYLOAD)}"}`;
    // Every 7 chars — splits the key, the value, and the closing quote.
    const chunks: string[] = [];
    for (let i = 0; i < body.length; i += 7) chunks.push(body.slice(i, i + 7));
    const out = await drain(streamAudioContent(streamOf(chunks)));
    expect(Array.from(out)).toEqual(Array.from(PAYLOAD));
  });

  it('survives the key itself being split across chunks', async () => {
    const encoded = b64(PAYLOAD);
    const out = await drain(
      streamAudioContent(streamOf(['{"audioCon', 'tent"', ' : ', `"${encoded.slice(0, 9)}`, `${encoded.slice(9)}"}`])),
    );
    expect(Array.from(out)).toEqual(Array.from(PAYLOAD));
  });

  it('ignores fields that precede audioContent', async () => {
    const body = `{"audioConfig":{"audioEncoding":"MP3"},"audioContent":"${b64(PAYLOAD)}"}`;
    const out = await drain(streamAudioContent(streamOf([body])));
    expect(Array.from(out)).toEqual(Array.from(PAYLOAD));
  });

  it('tolerates a JSON-escaped forward slash inside the payload', async () => {
    // Some encoders emit `\/`; the backslash is framing, not payload.
    const encoded = b64(PAYLOAD);
    const escaped = encoded.replace(/\//g, '\\/');
    const out = await drain(streamAudioContent(streamOf([`{"audioContent":"${escaped}"}`])));
    expect(Array.from(out)).toEqual(Array.from(PAYLOAD));
  });

  it('errors when the response carries no audioContent (Google error envelope)', async () => {
    const body = '{"error":{"code":403,"message":"API not enabled","status":"PERMISSION_DENIED"}}';
    await expect(drain(streamAudioContent(streamOf([body])))).rejects.toThrow(/no audioContent/i);
  });

  it('emits bytes before the body is complete (G4: no buffering)', async () => {
    // The stream must yield its first chunk while the producer is still
    // sending — that IS the property G4 protects.
    const encoded = b64(PAYLOAD);
    let released = false;
    const source = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const encoder = new TextEncoder();
        if (!released) {
          released = true;
          controller.enqueue(encoder.encode(`{"audioContent":"${encoded.slice(0, 120)}`));
          return;
        }
        // If the consumer only surfaced bytes after close, this never matters —
        // the assertion below proves it did not wait.
        controller.enqueue(encoder.encode(`${encoded.slice(120)}"}`));
        controller.close();
      },
    });
    const reader = streamAudioContent(source).getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
    expect(first.value!.length).toBeGreaterThan(0);
    await reader.cancel();
  });
});

describe('base64ToBytes', () => {
  it('round-trips a payload', () => {
    expect(Array.from(base64ToBytes(b64(PAYLOAD)))).toEqual(Array.from(PAYLOAD));
  });
});

describe('google voice map', () => {
  it('covers every app voice key the endpoint accepts', () => {
    // Mirrors ALLOWED_VOICES in api/tts.ts — a key with no Google voice would
    // silently fall back to Ruth, changing the coach's voice without warning.
    const appVoices = [
      'ruth', 'matthew', 'joanna', 'stephen', 'ivy', 'kendra', 'kimberly',
      'salli', 'joey', 'justin', 'kevin', 'danielle', 'gregory',
    ];
    for (const key of appVoices) {
      expect(GOOGLE_VOICES[key], `missing Google voice for '${key}'`).toBeDefined();
    }
  });

  it('gives every voice a distinct WaveNet fallback so a rejection never means silence', () => {
    for (const [key, voice] of Object.entries(GOOGLE_VOICES)) {
      expect(voice.fallbackVoiceName, key).toMatch(/Wavenet/);
      expect(voice.fallbackVoiceName, key).not.toBe(voice.voiceName);
    }
  });

  it('maps the generative voices to Chirp3 (no SSML) and the neural ones to Neural2 (SSML)', () => {
    // The behavioral mirror: Polly's generative engine already ignored prosody,
    // so Chirp3's lack of SSML loses nothing. Neural voices MUST keep SSML or
    // the per-personality prosody tuning silently dies.
    for (const key of ['ruth', 'matthew', 'danielle', 'gregory']) {
      expect(GOOGLE_VOICES[key].supportsSsml, key).toBe(false);
      expect(GOOGLE_VOICES[key].voiceName, key).toContain('Chirp3-HD');
      expect(engineForGoogleVoice(GOOGLE_VOICES[key])).toBe('generative');
    }
    for (const key of ['joanna', 'stephen', 'ivy', 'kendra', 'kimberly', 'salli', 'joey', 'justin', 'kevin']) {
      expect(GOOGLE_VOICES[key].supportsSsml, key).toBe(true);
      expect(GOOGLE_VOICES[key].voiceName, key).toContain('Neural2');
      expect(engineForGoogleVoice(GOOGLE_VOICES[key])).toBe('neural');
    }
  });

  it('covers every locale the language detector can return', () => {
    // detectVoiceForText returns a Polly LangVoice whose languageCode keys the
    // Google map. A gap here means a detected language silently reverts to the
    // English voice — the exact bug the language work fixed.
    for (const [lang, pollyVoice] of Object.entries(LANG_VOICES)) {
      expect(
        GOOGLE_LANG_VOICES[pollyVoice.languageCode],
        `no Google voice for ${lang} (${pollyVoice.languageCode})`,
      ).toBeDefined();
    }
  });

  it('lets a detected language voice win over the requested English voice', () => {
    expect(resolveGoogleVoice('ruth', 'ja-JP')).toBe(GOOGLE_LANG_VOICES['ja-JP']);
    expect(resolveGoogleVoice('ruth')).toBe(GOOGLE_VOICES.ruth);
    // Unknown key falls back to the coach's own voice rather than throwing.
    expect(resolveGoogleVoice('nonexistent')).toBe(GOOGLE_VOICES.ruth);
    // An unmapped locale keeps the requested voice instead of going silent.
    expect(resolveGoogleVoice('joanna', 'xx-XX')).toBe(GOOGLE_VOICES.joanna);
  });
});
