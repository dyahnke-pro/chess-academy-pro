/**
 * App voice key → Google Cloud TTS voice.
 *
 * The mapping is deliberately a BEHAVIORAL MIRROR of the Polly setup, not an
 * upgrade — the coach should sound the same the day we switch providers, so a
 * voice regression can never hide inside the migration.
 *
 *   Polly `generative` (ruth / matthew / danielle / gregory)
 *     → Chirp 3: HD. Google's top register, and — like Polly's generative
 *       engine — it takes NO prosody tags. That matches today exactly: the
 *       generative branch of `buildSsmlForEngine` is already a documented
 *       no-op for prosody, so nothing is lost by dropping SSML here.
 *       (Chirp 3 SSML support is listed as Preview; we don't depend on it.)
 *
 *   Polly `neural` (joanna / stephen / ivy / …)
 *     → Neural2. Supports SSML, so the per-personality
 *       `NEURAL_PROSODY_BY_STYLE` rate / pitch / volume tuning survives
 *       untouched.
 *
 * Every entry carries a `fallbackVoiceName` on WaveNet — the tier with the
 * broadest locale coverage. If Google ever rejects the primary voice for a
 * locale (400 INVALID_ARGUMENT), the provider retries with the fallback rather
 * than letting narration go silent. Same "never go silent" spirit as the Polly
 * path's SSML→plain-text→English retry chain.
 */
import type { VoiceEngine } from './types.js';

export interface GoogleVoice {
  /** Google voice resource name, e.g. 'en-US-Chirp3-HD-Aoede'. */
  voiceName: string;
  /** BCP-47 locale the voice belongs to. */
  languageCode: string;
  /** Broad-coverage WaveNet voice used when the primary is rejected. */
  fallbackVoiceName: string;
  /** True when the voice accepts SSML (Neural2 / WaveNet yes, Chirp3 no). */
  supportsSsml: boolean;
}

/**
 * English voice keys — the app's `ALLOWED_VOICES` roster. Gender is matched
 * to the Polly voice it replaces so personalities keep their character.
 */
export const GOOGLE_VOICES: Record<string, GoogleVoice> = {
  // ── Generative-equivalent → Chirp 3: HD (no SSML, no prosody) ──────────
  // Ruth is the default coach voice; Aoede is Chirp3's warm female register.
  ruth:     { voiceName: 'en-US-Chirp3-HD-Aoede',  languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-F', supportsSsml: false },
  matthew:  { voiceName: 'en-US-Chirp3-HD-Charon', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-D', supportsSsml: false },
  danielle: { voiceName: 'en-US-Chirp3-HD-Leda',   languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-C', supportsSsml: false },
  gregory:  { voiceName: 'en-US-Chirp3-HD-Orus',   languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-B', supportsSsml: false },

  // ── Neural-equivalent → Neural2 (SSML + personality prosody preserved) ──
  joanna:   { voiceName: 'en-US-Neural2-F', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-F', supportsSsml: true },
  kendra:   { voiceName: 'en-US-Neural2-C', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-C', supportsSsml: true },
  kimberly: { voiceName: 'en-US-Neural2-E', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-E', supportsSsml: true },
  salli:    { voiceName: 'en-US-Neural2-G', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-G', supportsSsml: true },
  ivy:      { voiceName: 'en-US-Neural2-H', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-H', supportsSsml: true },
  stephen:  { voiceName: 'en-US-Neural2-J', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-J', supportsSsml: true },
  joey:     { voiceName: 'en-US-Neural2-D', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-D', supportsSsml: true },
  justin:   { voiceName: 'en-US-Neural2-A', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-A', supportsSsml: true },
  kevin:    { voiceName: 'en-US-Neural2-I', languageCode: 'en-US', fallbackVoiceName: 'en-US-Wavenet-I', supportsSsml: true },
};

/**
 * Locale → Google voice, for the language-detected path (`ttsLang.ts`).
 * Gender follows the Polly voice each one replaces (all female except ja,
 * which replaces the male Takumi).
 */
export const GOOGLE_LANG_VOICES: Record<string, GoogleVoice> = {
  'es-ES': { voiceName: 'es-ES-Chirp3-HD-Aoede',  languageCode: 'es-ES', fallbackVoiceName: 'es-ES-Wavenet-C', supportsSsml: false },
  'fr-FR': { voiceName: 'fr-FR-Chirp3-HD-Aoede',  languageCode: 'fr-FR', fallbackVoiceName: 'fr-FR-Wavenet-C', supportsSsml: false },
  'de-DE': { voiceName: 'de-DE-Chirp3-HD-Aoede',  languageCode: 'de-DE', fallbackVoiceName: 'de-DE-Wavenet-C', supportsSsml: false },
  'pt-BR': { voiceName: 'pt-BR-Chirp3-HD-Aoede',  languageCode: 'pt-BR', fallbackVoiceName: 'pt-BR-Wavenet-A', supportsSsml: false },
  'it-IT': { voiceName: 'it-IT-Chirp3-HD-Aoede',  languageCode: 'it-IT', fallbackVoiceName: 'it-IT-Wavenet-A', supportsSsml: false },
  'ru-RU': { voiceName: 'ru-RU-Chirp3-HD-Aoede',  languageCode: 'ru-RU', fallbackVoiceName: 'ru-RU-Wavenet-C', supportsSsml: false },
  'ja-JP': { voiceName: 'ja-JP-Chirp3-HD-Charon', languageCode: 'ja-JP', fallbackVoiceName: 'ja-JP-Wavenet-C', supportsSsml: false },
  'cmn-CN': { voiceName: 'cmn-CN-Chirp3-HD-Aoede', languageCode: 'cmn-CN', fallbackVoiceName: 'cmn-CN-Wavenet-A', supportsSsml: false },
  'arb':   { voiceName: 'ar-XA-Chirp3-HD-Aoede',  languageCode: 'ar-XA', fallbackVoiceName: 'ar-XA-Wavenet-A', supportsSsml: false },
  'hi-IN': { voiceName: 'hi-IN-Chirp3-HD-Aoede',  languageCode: 'hi-IN', fallbackVoiceName: 'hi-IN-Wavenet-A', supportsSsml: false },
  'ko-KR': { voiceName: 'ko-KR-Chirp3-HD-Aoede',  languageCode: 'ko-KR', fallbackVoiceName: 'ko-KR-Wavenet-A', supportsSsml: false },
};

/** Default when a caller sends an unmapped voice key — the coach's own voice. */
export const DEFAULT_GOOGLE_VOICE = GOOGLE_VOICES.ruth;

/**
 * Resolve the Google voice for a request. `languageCode` (set by the
 * language-detection path) wins over the app voice key, exactly as the Polly
 * path lets a detected language voice override the requested English one.
 */
export function resolveGoogleVoice(voiceKey: string, languageCode?: string): GoogleVoice {
  if (languageCode) {
    const langVoice = GOOGLE_LANG_VOICES[languageCode];
    if (langVoice) return langVoice;
  }
  return GOOGLE_VOICES[voiceKey.toLowerCase()] ?? DEFAULT_GOOGLE_VOICE;
}

/**
 * Engine class for a Google voice, in the vocabulary `buildSsmlForEngine`
 * speaks. Chirp3 behaves like Polly's generative engine (structural SSML only /
 * no prosody), so it reports 'generative' and the endpoint sends plain text.
 */
export function engineForGoogleVoice(voice: GoogleVoice): VoiceEngine {
  return voice.supportsSsml ? 'neural' : 'generative';
}
