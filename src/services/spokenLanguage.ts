/**
 * THE COACH SPEAKS THE STUDENT'S LANGUAGE — everywhere (David 2026-08-02:
 * "make sure the coach can speak different languages while teaching… make sure
 * it's everywhere").
 *
 * The `narrationLanguage` preference shipped honoured in exactly ONE place:
 * `LessonPlayer`, the openings tab, via pre-generated per-opening translation
 * packs. Everything else the coach says — the Learn walkthrough, the
 * middlegame play-out, chat replies, WLPP, model games, the drill and practice
 * modes — spoke English whatever the student picked. Packs could never have
 * covered those either: most of that prose is computed at runtime from the
 * board, so there is nothing to pre-translate.
 *
 * So the translation happens at the VOICE chokepoint instead. Every spoken
 * line in the app already funnels through `voiceService.speakInternal` — that
 * is where the verbosity gate and the brief-cap live, and the codebase's
 * standing rule is to route new speech through it rather than around it. One
 * hook there reaches all ~70 call sites at once, and any surface added later
 * inherits it for free.
 *
 * It re-uses the coach's existing translation path (`voiceFacts` with a target
 * language), which exists precisely because language is phrasing rather than
 * chess content: the fidelity net holds every SAN and number verbatim, so a
 * translated line still names the same squares and the same moves. The text
 * arriving here is already board-verified by whichever surface produced it, so
 * the model re-expresses computed content and decides nothing (G0).
 *
 * Best-effort in every direction — English preference, unknown code, no
 * provider configured, or a failed call all speak the original text. The coach
 * teaching in English beats the coach going silent.
 */
import { useAppStore } from '../stores/appStore';
import { detectLanguage, languageNameFor } from '../utils/detectLanguage';

/** Translations already paid for, keyed by language + source text. Lines
 *  repeat constantly — a beat re-spoken on resume, a cue replayed on
 *  step-back, the same aside on a second visit — and none of that should cost
 *  a second call. */
const cache = new Map<string, string>();

/** Bound the cache so a long session can't grow it without limit. */
const MAX_CACHED = 500;

/** The language the student has actually been TYPING in this session.
 *
 * 🔒 THE SETTING IS NOT THE ONLY EVIDENCE (prod, week of 2026-09-11). A Thai
 * speaker chatted in Thai for two days, got Thai chat replies — and heard
 * every COMPUTED narration in English:
 *   "Out of the opening now — this is a middlegame where you're a shade
 *    better…"
 * Excellent coaching, in a language they had not used once. The two halves read
 * different sources: chat localises off the DETECTED input (`coachService`),
 * while narration localises off `spokenLanguageName()`, which read ONLY
 * `preferences.narrationLanguage` — a setting this user never found.
 *
 * So a confidently-detected non-English message becomes a sticky session fact
 * and the two halves finally agree. Session-scoped on purpose: it is an
 * observation, not a preference, so it never persists over what the student
 * explicitly chose and it is gone on the next launch. */
let detectedSessionLanguage: string | null = null;

/** Record the language the student just wrote in. Called from the chat spine
 *  where the detection already happens — the detector is not re-run here. */
export function noteDetectedLanguage(languageName: string | null): void {
  if (languageName && languageName !== 'English') detectedSessionLanguage = languageName;
}

/** Test seam + a way to forget the observation (a fresh profile / sign-out). */
export function resetDetectedLanguage(): void {
  detectedSessionLanguage = null;
}

/** The language the coach should SPEAK in, as a human name ("Spanish"), or
 *  null for English / unset / unknown.
 *
 *  PRECEDENCE: an explicit SETTING beats an observation — a student who chose
 *  a narration language means it, even if they type in another. Only when no
 *  setting exists does the detected session language apply. */
export function spokenLanguageName(): string | null {
  try {
    const chosen = languageNameFor(useAppStore.getState().activeProfile?.preferences.narrationLanguage);
    if (chosen) return chosen;
  } catch {
    // fall through to the observation — a store read failing is not a reason
    // to speak the wrong language.
  }
  return detectedSessionLanguage;
}

/** `text` in the student's chosen narration language, or `text` unchanged when
 *  that language is English or the translation cannot be produced. */
export async function localizeSpokenText(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return text;
  // DETECTED INPUT WINS (David 2026-09-11). The text may ALREADY be in the
  // student's language — a coach chat reply is written in the detected input
  // language (coachService), and the i18n lesson packs are pre-localized.
  // Re-translating it to the narration SETTING would speak a DIFFERENT language
  // than the student used (type Spanish, hear the French setting). If the text
  // is already a confident non-English language, speak it as-is. The setting
  // only localizes an ENGLISH source (computed narration / English-authored
  // lessons).
  if (detectLanguage(source).nonEnglish) return text;
  const languageName = spokenLanguageName();
  if (!languageName) return text;

  const key = `${languageName}::${source}`;
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    // Lazy: `coachApi` pulls the provider SDKs, and every surface that speaks
    // must not pay for that import just to say an English line.
    const { voiceFacts } = await import('./coachApi');
    const out = await voiceFacts(source, {
      targetLanguage: languageName,
      intent: 'spoken-narration',
    });
    const spoken = out?.trim() ? out.trim() : source;
    if (cache.size >= MAX_CACHED) cache.clear();
    cache.set(key, spoken);
    return spoken;
  } catch {
    return text;
  }
}

/** Test seam. */
export function __clearSpokenLanguageCache(): void {
  cache.clear();
}
