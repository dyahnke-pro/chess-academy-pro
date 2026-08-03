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
import { languageNameFor } from '../utils/detectLanguage';

/** Translations already paid for, keyed by language + source text. Lines
 *  repeat constantly — a beat re-spoken on resume, a cue replayed on
 *  step-back, the same aside on a second visit — and none of that should cost
 *  a second call. */
const cache = new Map<string, string>();

/** Bound the cache so a long session can't grow it without limit. */
const MAX_CACHED = 500;

/** The language the coach should SPEAK in, as a human name ("Spanish"), or
 *  null for English / unset / unknown. */
export function spokenLanguageName(): string | null {
  try {
    return languageNameFor(useAppStore.getState().activeProfile?.preferences.narrationLanguage);
  } catch {
    return null;
  }
}

/** `text` in the student's chosen narration language, or `text` unchanged when
 *  that language is English or the translation cannot be produced. */
export async function localizeSpokenText(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return text;
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
