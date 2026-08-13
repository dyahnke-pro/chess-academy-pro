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
  // Offered in Settings since the language work shipped, and unspeakable until
  // now: with no entry here the detector returned null and an American voice
  // read the translated Dutch, Polish or Turkish aloud. If Chirp3 is not
  // published for one of these locales the request 400s and the synthesiser
  // retries the Wavenet fallback automatically, so the worst case is a slightly
  // older voice in the right language rather than the wrong language entirely.
  'nl-NL': { voiceName: 'nl-NL-Chirp3-HD-Aoede',  languageCode: 'nl-NL', fallbackVoiceName: 'nl-NL-Wavenet-A', supportsSsml: false },
  'pl-PL': { voiceName: 'pl-PL-Chirp3-HD-Aoede',  languageCode: 'pl-PL', fallbackVoiceName: 'pl-PL-Wavenet-A', supportsSsml: false },
  'tr-TR': { voiceName: 'tr-TR-Chirp3-HD-Aoede',  languageCode: 'tr-TR', fallbackVoiceName: 'tr-TR-Wavenet-A', supportsSsml: false },
};

/** Default when a caller sends an unmapped voice key — the coach's own voice. */
export const DEFAULT_GOOGLE_VOICE = GOOGLE_VOICES.ruth;

/**
 * Personality → audioConfig, for the voices that take NO SSML (Chirp3).
 *
 * This restores a control that was DEAD under Polly. Polly's generative engine
 * discarded prosody tags, so `soft` / `edgy` / `drill-sergeant` all produced an
 * identical Ruth — the personality picker moved a dial connected to nothing.
 * Chirp3 refuses SSML too, BUT it honors `speakingRate` and `volumeGainDb` on
 * audioConfig, so the same intent can be expressed there instead (David
 * 2026-08-03: "Give personality?").
 *
 * The non-default styles mirror the SHAPE of `NEURAL_PROSODY_BY_STYLE` in
 * `ssml.ts` so a personality sounds like ITSELF whether the student is on a
 * Chirp3 voice or a Neural2 one — one design, two transports:
 *   soft            0.92 / quieter      → warm, unhurried
 *   default         1.00                → see below
 *   edgy            1.05 / a bit louder → clipped, sharper
 *   drill-sergeant  1.08 / loudest      → crisp, no slowdown
 *
 * 🔒 `default` is 1.00, NOT the neural map's 0.95 (David 2026-08-03). He
 * A/B-ed the shipping voice against slowed variants and picked the unmodified
 * one. Since voiceService normalises the DEFAULT personality to no `style`
 * param, every default request lands here — so a 0.95 default would have
 * silently slowed the exact voice he chose. The neural map keeps its own 95%
 * because that IS its long-standing register; this is the Chirp3 baseline and
 * it is pinned to what he approved. Do not "harmonise" the two without asking.
 *
 * Pitch is NOT here on purpose: Chirp3 rejects it outright ("This voice does
 * not support pitch parameters at this time"), verified against the live API
 * 2026-08-03. Sending it would 400 the whole request, so the neural map's pitch
 * lift simply has no Chirp3 equivalent.
 */
export interface Chirp3Prosody {
  speakingRate: number;
  volumeGainDb: number;
}

const CHIRP3_PROSODY_BY_STYLE: Record<string, Chirp3Prosody> = {
  default: { speakingRate: 1.0, volumeGainDb: 0 },
  soft: { speakingRate: 0.92, volumeGainDb: -2 },
  edgy: { speakingRate: 1.05, volumeGainDb: 1 },
  'drill-sergeant': { speakingRate: 1.08, volumeGainDb: 3 },
};

/** Hard bounds Google enforces — clamp rather than let a bad style 400 us. */
const RATE_MIN = 0.25;
const RATE_MAX = 2.0;

/**
 * Resolve the audioConfig prosody for a plain-text (Chirp3) request.
 *
 * `prosodyMode === 'spike'` is the #25 decisive-beat lift — composed OVER the
 * personality base exactly as the SSML path does (+8 rate points), never a new
 * register. The SSML path also lifts pitch; Chirp3 can't, so the spike is
 * rate-only there.
 */
export function chirp3ProsodyFor(style?: string, prosodyMode?: string): Chirp3Prosody {
  const base = CHIRP3_PROSODY_BY_STYLE[style ?? 'default'] ?? CHIRP3_PROSODY_BY_STYLE.default;
  const rate = prosodyMode === 'spike' ? base.speakingRate + 0.08 : base.speakingRate;
  return {
    speakingRate: Math.min(RATE_MAX, Math.max(RATE_MIN, Number(rate.toFixed(3)))),
    volumeGainDb: base.volumeGainDb,
  };
}

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
