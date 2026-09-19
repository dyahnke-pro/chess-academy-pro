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
import { detectLanguage, languageNameFor, type DetectedLanguage } from '../utils/detectLanguage';

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

/**
 * DETECT THE STUDENT'S OWN WORDS — and record what was found, in one call.
 *
 * 🔒 THE OBSERVATION WAS RECORDED ON ONLY ONE OF THE TWO PATHS THROUGH THE ONE
 * DOOR (measured 2026-09-19). `dispatchCoachTurn` routes a turn either through
 * the deterministic ACTION router or through the brain, and only the brain
 * called `noteDetectedLanguage`. So the better the routing got, the worse the
 * voice got: once a Thai "teach me the Italian" finally reached the
 * walkthrough deterministically, it did so WITHOUT the LLM ever seeing the
 * turn — and the entire live lesson that followed was then narrated in
 * English, to a student who had just typed Thai. The measurement was
 * `expected null to be 'Thai'` on a turn that had routed perfectly.
 *
 * Recording is therefore a property of DETECTING STUDENT INPUT, not of one
 * caller remembering to do it. Every site that asks "what language did the
 * student write in" calls this instead of `detectLanguage`, so a new surface
 * cannot add a path that understands them and then talks past them.
 *
 * NOT for text the app itself produced — `localizeSpokenText` asks about its
 * OWN narration, and recording that would be the coach learning its language
 * from itself.
 */
export function detectStudentLanguage(text: string | undefined | null): DetectedLanguage {
  const detected = detectLanguage(text);
  if (detected.nonEnglish) noteDetectedLanguage(detected.name);
  return detected;
}

/**
 * The device's own language, as a name — the COLD-START PRIOR for a student
 * who has not typed and has not chosen.
 *
 * A student can reach a live lesson without writing a word: tap an opening,
 * tap Watch, play moves. There is then nothing to detect from, and the old
 * answer was English — which is a guess, and on a Thai phone a bad one. The
 * locale is not a guess: it is a fact the person set about themselves.
 *
 * It ranks BELOW both the setting and the observation, so it only ever fills a
 * vacuum. Unknown or English locales return null and the coach speaks English,
 * exactly as before.
 */
function deviceLanguageName(): string | null {
  try {
    const nav = (globalThis as { navigator?: { language?: string; languages?: readonly string[] } }).navigator;
    if (!nav) return null;
    for (const tag of [...(nav.languages ?? []), nav.language]) {
      const name = languageNameFor(tag);
      if (name) return name;
    }
  } catch {
    // A missing/hostile navigator is not a reason to fail a narration.
  }
  return null;
}

/** Test seam + a way to forget the observation (a fresh profile / sign-out). */
export function resetDetectedLanguage(): void {
  detectedSessionLanguage = null;
}

/** The language the coach should SPEAK in, as a human name ("Spanish"), or
 *  null for English / unset / unknown.
 *
 *  PRECEDENCE, strongest evidence first:
 *    1. the explicit SETTING — a student who chose a narration language means
 *       it, even if they type in another;
 *    2. what they have actually been TYPING this session;
 *    3. the DEVICE LOCALE — the cold-start prior, for the student who reached
 *       a lesson without typing anything at all;
 *    4. English.
 *
 *  Each step is weaker evidence than the one above it and only fills the gap
 *  the one above left. */
export function spokenLanguageName(): string | null {
  return chosenOrTypedLanguageName() ?? deviceLanguageName();
}

/**
 * The setting or the session observation — EXPLICIT EVIDENCE ONLY, no locale.
 *
 * The locale is the right prior for the VOICE, where a student can arrive with
 * nothing typed at all. It is the wrong one for a CHAT REPLY, because there the
 * student has just written something: answering an English question in Thai
 * because the phone is Thai would be reading past the evidence in hand. So the
 * two consumers ask different questions, and the difference is exactly "is
 * there something they just typed".
 */
export function chosenOrTypedLanguageName(): string | null {
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
