/**
 * detectLanguage — lightweight, deterministic language detection for the coach's
 * phrasing layer (David 2026-07-10: "make sure all languages work"). The coach
 * grounds every chess FACT in code (G0); the ONLY thing that varies by language
 * is how those facts are PHRASED — so detecting the student's language and
 * telling `voiceFacts` to phrase in it is grounding-safe (no chess content is
 * decided here, only the language of expression).
 *
 * Heuristic, not ML: non-Latin scripts by Unicode block, then Latin-script
 * languages by accented characters + high-frequency function words. Returns an
 * ISO-639-1 code, defaulting to 'en'. Good enough to route phrasing; the phrased
 * output's actual language is set by the model instruction, and any chess token
 * is preserved verbatim by the voiceFacts fidelity net regardless of language.
 *
 * 🔒 THIS FILE IS THE SINGLE QUESTION FOUR SURFACES ASK, SO A MISSING SCRIPT IS
 * FOUR BUGS (found reading a real App Store report, 2026-09-19). A Thai speaker
 * asked for a lesson seven times and never got one. Nothing downstream was
 * broken — `routeChatIntent` already translates a non-English command before
 * matching it (coachSessionRouter.ts:116), `coachService` already translates the
 * ask for the brain and phrases the reply back in the student's language
 * (coachService.ts:558-578), and the Teach surface already honours
 * `/coach/teach?opening=`. All three ask THIS function first, and it had no Thai
 * range — so it answered `{code:'en', nonEnglish:false}` and every one of them
 * correctly did nothing. One missing row, four symptoms:
 *   · the command never routed (the lesson never started),
 *   · the ask reached the brain untranslated,
 *   · the reply came back in English,
 *   · narration localisation never fired.
 * Nine writing systems were invisible the same way, and Vietnamese was worse
 * than invisible — its diacritics tripped the French fingerprint, so a
 * Vietnamese ask was actively translated as French.
 *
 * The fix is a TABLE, not another `if`: `SCRIPT_RANGES` below is `LangCode`-typed
 * against `LANG_NAME` and `LANG_NATIVE_LABEL`, both `Record<LangCode, string>`,
 * so adding a script is one row and FORGETTING its name or its picker label
 * fails to compile. The Settings picker reads `LANG_NATIVE_LABEL` rather than
 * keeping its own list, because a language the app can detect but the student
 * cannot choose (and vice versa) is the same drift in the other direction.
 */

/** Every language this file can name. A new member fails to compile until it is
 *  answered for in BOTH records below — the drift-proof shape (CLAUDE.md
 *  "prefer a Record<Union, …> so a new enum member fails to compile"). */
export type LangCode =
  | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'nl' | 'pl' | 'tr' | 'vi'
  | 'ru' | 'ar' | 'hi' | 'ko' | 'ja' | 'zh'
  | 'th' | 'lo' | 'he' | 'el' | 'bn' | 'pa' | 'gu' | 'or' | 'ta' | 'te'
  | 'kn' | 'ml' | 'si' | 'my' | 'ka' | 'hy' | 'am' | 'km' | 'dv' | 'bo';

export interface DetectedLanguage {
  code: string;
  /** Human name for the model instruction ("Spanish"). */
  name: string;
  /** False only for English (lets callers keep the cheap raw path for en). */
  nonEnglish: boolean;
}

const EN: DetectedLanguage = { code: 'en', name: 'English', nonEnglish: false };

/** The ENGLISH name of each language — this is what the model instruction says
 *  ("reply in Thai"), so it is deliberately not the native label. */
export const LANG_NAME: Record<LangCode, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese',
  it: 'Italian', nl: 'Dutch', pl: 'Polish', tr: 'Turkish', vi: 'Vietnamese',
  ru: 'Russian', ar: 'Arabic', hi: 'Hindi', ko: 'Korean', ja: 'Japanese',
  zh: 'Chinese',
  th: 'Thai', lo: 'Lao', he: 'Hebrew', el: 'Greek', bn: 'Bengali',
  pa: 'Punjabi', gu: 'Gujarati', or: 'Odia', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', si: 'Sinhala', my: 'Burmese',
  ka: 'Georgian', hy: 'Armenian', am: 'Amharic', km: 'Khmer',
  dv: 'Dhivehi', bo: 'Tibetan',
};

/** The label a speaker of that language recognises, for the Settings picker.
 *  Insertion order IS the menu order, so English leads and the rest follow the
 *  order they were added. One list, so "detectable" and "choosable" cannot
 *  drift apart. */
export const LANG_NATIVE_LABEL: Record<LangCode, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
  pt: 'Português', it: 'Italiano', nl: 'Nederlands', pl: 'Polski',
  tr: 'Türkçe', vi: 'Tiếng Việt',
  ru: 'Русский', ar: 'العربية',
  hi: 'हिन्दी', ja: '日本語',
  ko: '한국어', zh: '中文',
  th: 'ไทย', lo: 'ລາວ', he: 'עברית',
  el: 'Ελληνικά',
  bn: 'বাংলা', pa: 'ਪੰਜਾਬੀ',
  gu: 'ગુજરાતી', or: 'ଓଡ଼ିଆ',
  ta: 'தமிழ்', te: 'తెలుగు',
  kn: 'ಕನ್ನಡ', ml: 'മലയാളം',
  si: 'සිංහල', my: 'မြန်မာ',
  ka: 'ქართული', hy: 'Հայերեն',
  am: 'አማርኛ', km: 'ខ្មែរ',
  dv: 'ދިވެހި', bo: 'བོད་ཡིག',
};

/** Non-Latin scripts — DECISIVE. One character in the block settles it, because
 *  no Latin-script language borrows these. Kana is checked before Han so a
 *  Japanese sentence is not read as Chinese (kanji-only text still reads zh —
 *  a known, accepted limit of a range check). */
export const SCRIPT_RANGES: ReadonlyArray<readonly [RegExp, LangCode]> = [
  [/[\u0400-\u04FF\u0500-\u052F]/, 'ru'],         // Cyrillic (+ supplement)
  [/[\u0590-\u05FF]/, 'he'],                      // Hebrew
  [/[\u0600-\u06FF\u0750-\u077F]/, 'ar'],         // Arabic (+ supplement)
  [/[\u0780-\u07BF]/, 'dv'],                      // Thaana
  [/[\u0900-\u097F]/, 'hi'],                      // Devanagari
  [/[\u0980-\u09FF]/, 'bn'],                      // Bengali
  [/[\u0A00-\u0A7F]/, 'pa'],                      // Gurmukhi
  [/[\u0A80-\u0AFF]/, 'gu'],                      // Gujarati
  [/[\u0B00-\u0B7F]/, 'or'],                      // Odia
  [/[\u0B80-\u0BFF]/, 'ta'],                      // Tamil
  [/[\u0C00-\u0C7F]/, 'te'],                      // Telugu
  [/[\u0C80-\u0CFF]/, 'kn'],                      // Kannada
  [/[\u0D00-\u0D7F]/, 'ml'],                      // Malayalam
  [/[\u0D80-\u0DFF]/, 'si'],                      // Sinhala
  [/[\u0E00-\u0E7F]/, 'th'],                      // Thai
  [/[\u0E80-\u0EFF]/, 'lo'],                      // Lao
  [/[\u0F00-\u0FFF]/, 'bo'],                      // Tibetan
  [/[\u1000-\u109F]/, 'my'],                      // Myanmar
  [/[\u10A0-\u10FF\u1C90-\u1CBF]/, 'ka'],         // Georgian (+ Mtavruli)
  [/[\u0530-\u058F]/, 'hy'],                      // Armenian
  [/[\u1200-\u137F]/, 'am'],                      // Ethiopic
  [/[\u1780-\u17FF]/, 'km'],                      // Khmer
  [/[\u0370-\u03FF\u1F00-\u1FFF]/, 'el'],         // Greek (+ Greek Extended)
  [/[\uAC00-\uD7AF\u1100-\u11FF]/, 'ko'],         // Hangul (+ Jamo)
  [/[\u3040-\u30FF]/, 'ja'],                      // Kana — BEFORE Han
  [/[\u4E00-\u9FFF]/, 'zh'],                      // Han
];

/** Latin script, but decisive: the horn letters (Ơơ Ưư) and the Latin Extended
 *  Additional tone marks are near-exclusive to Vietnamese. Checked before the
 *  accent hints because `chào`/`bạn` otherwise trip the French fingerprint —
 *  which is how a Vietnamese ask used to be answered as French. */
const VIETNAMESE = /[\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/;

/** High-frequency function words unique-ish per language (spaces padded so a
 *  substring match is a whole word). Scored by hit count; the top scorer wins
 *  when it clears English. */
const MARKERS: Record<string, string[]> = {
  es: [' el ', ' la ', ' los ', ' las ', ' que ', ' es ', ' de ', ' cuál ', ' cómo ', ' por qué ', ' mejor ', ' jugada ', ' está ', ' mi ', ' para ', ' pon ', ' activa ', ' desactiva '],
  fr: [' le ', ' la ', ' les ', ' est ', ' que ', ' quel ', ' quelle ', ' comment ', ' pourquoi ', ' meilleur ', ' coup ', ' pour ', ' mon ', ' ma ', ' mets ', ' désactive '],
  de: [' der ', ' die ', ' das ', ' ist ', ' was ', ' wie ', ' warum ', ' beste ', ' zug ', ' für ', ' mein ', ' meine ', ' schalte ', ' stelle ', ' wechsle '],
  pt: [' o ', ' a ', ' os ', ' as ', ' que ', ' é ', ' de ', ' qual ', ' como ', ' por que ', ' melhor ', ' lance ', ' está ', ' minha ', ' para ', ' ative ', ' desative '],
  it: [' il ', ' la ', ' che ', ' è ', ' di ', ' quale ', ' come ', ' perché ', ' migliore ', ' mossa ', ' per ', ' mia ', ' metti ', ' disattiva ', ' attiva '],
  // Dutch has no accent fingerprint, so words are the only way to reach it —
  // and it was offered in the picker while being undetectable.
  nl: [' de ', ' het ', ' een ', ' wat ', ' hoe ', ' waarom ', ' zet ', ' mijn ', ' beste ', ' voor ', ' zwart ', ' wit ', ' aan ', ' uit '],
};

/** English competes: a foreign language must OUTSCORE English, not merely hit
 *  two markers. Without this, an English chess ask like "should I castle O-O
 *  or take, as Black?" scored Portuguese (' o ' from the lowercased O-O +
 *  ' as ') and forced a pointless phrasing/translation call — the 2026-07-11
 *  fidelity-trip cluster on intent=alternatives. */
const EN_MARKERS: string[] = [
  ' the ', ' is ', ' what ', ' why ', ' how ', ' my ', ' this ', ' that ',
  ' to ', ' of ', ' and ', ' should ', ' would ', ' move ', ' best ', ' better ',
  ' i ', ' you ', ' it ', ' not ', ' about ', ' instead ', ' take ', ' play ',
];

/** Accented-letter fingerprints that strongly imply a Latin-script non-English
 *  language even in a short string with no clear function word. ORDER MATTERS:
 *  Turkish and Polish carry letters the French/German patterns below would
 *  otherwise claim (Turkish shares ü/ö/ç with them), so their near-exclusive
 *  marks — ğ/ı, ł/ż/ę/ą — are tested first. */
const ACCENT_HINTS: Array<[RegExp, LangCode]> = [
  [/[ğı]/i, 'tr'],
  [/[łżźęąśćń]/i, 'pl'],
  [/[ñ¿¡]/i, 'es'],
  [/[àâçèêëîïôûùü]/i, 'fr'],
  [/[äöüß]/i, 'de'],
  [/[ãõ]/i, 'pt'],
];

export function detectLanguage(text: string | undefined | null): DetectedLanguage {
  if (!text) return EN;
  const raw = text;

  // Non-Latin scripts — decisive.
  for (const [re, code] of SCRIPT_RANGES) {
    if (re.test(raw)) return { code, name: LANG_NAME[code], nonEnglish: true };
  }
  if (VIETNAMESE.test(raw)) return { code: 'vi', name: LANG_NAME.vi, nonEnglish: true };

  // Chess notation is language-neutral — strip castling tokens before word
  // matching so a lowercased "O-O" never reads as the Portuguese article 'o'.
  const deChessed = raw.replace(/\bo-o(-o)?\b/gi, ' ');
  const pad = ` ${deChessed.toLowerCase().replace(/[.,!?¿¡;:()"'`]/g, ' ').replace(/\s+/g, ' ')} `;
  let best = 'en', bestScore = 0;
  for (const [code, words] of Object.entries(MARKERS)) {
    let score = 0;
    for (const w of words) if (pad.includes(w)) score++;
    if (score > bestScore) { bestScore = score; best = code; }
  }
  let enScore = 0;
  for (const w of EN_MARKERS) if (pad.includes(w)) enScore++;
  // Need ≥2 marker hits AND a win over English to override it (one common
  // word like "a" is too weak, and an English sentence that trips two foreign
  // articles must not translate). Accented fingerprints confirm with one hit.
  if (bestScore >= 2 && bestScore > enScore) {
    const code = best as LangCode;
    return { code, name: LANG_NAME[code] ?? best, nonEnglish: best !== 'en' };
  }
  for (const [re, code] of ACCENT_HINTS) {
    if (re.test(raw)) return { code, name: LANG_NAME[code], nonEnglish: true };
  }
  return EN;
}

/** The human name a language code phrases in ("es" → "Spanish"), or null when
 *  the code is unknown or is English. The coach's translation path keys off the
 *  NAME, and the narration-language preference stores the CODE, so this is the
 *  join between the two. */
export function languageNameFor(code: string | undefined | null): string | null {
  if (!code) return null;
  const name = LANG_NAME[code.toLowerCase().split('-')[0] as LangCode];
  return !name || name === 'English' ? null : name;
}
