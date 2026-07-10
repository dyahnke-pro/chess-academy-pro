/**
 * detectLanguage — lightweight, deterministic language detection for the coach's
 * phrasing layer (David 2026-07-10: "make sure all languages work"). The coach
 * grounds every chess FACT in code (G0); the ONLY thing that varies by language
 * is how those facts are PHRASED — so detecting the student's language and
 * telling `voiceFacts` to phrase in it is grounding-safe (no chess content is
 * decided here, only the language of expression).
 *
 * Heuristic, not ML: non-Latin scripts by Unicode range, then Latin-script
 * languages by accented characters + high-frequency function words. Returns an
 * ISO-639-1 code, defaulting to 'en'. Good enough to route phrasing; the phrased
 * output's actual language is set by the model instruction, and any chess token
 * is preserved verbatim by the voiceFacts fidelity net regardless of language.
 */
export interface DetectedLanguage {
  code: string;
  /** Human name for the model instruction ("Spanish"). */
  name: string;
  /** False only for English (lets callers keep the cheap raw path for en). */
  nonEnglish: boolean;
}

const EN: DetectedLanguage = { code: 'en', name: 'English', nonEnglish: false };

const LANG_NAME: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian',
  ru: 'Russian', ar: 'Arabic', hi: 'Hindi', ko: 'Korean', ja: 'Japanese',
  zh: 'Chinese', nl: 'Dutch', pl: 'Polish', tr: 'Turkish', en: 'English',
};

/** High-frequency function words unique-ish per language (spaces padded so a
 *  substring match is a whole word). Scored by hit count; the top scorer wins
 *  when it clears English. */
const MARKERS: Record<string, string[]> = {
  es: [' el ', ' la ', ' los ', ' las ', ' que ', ' es ', ' de ', ' cuál ', ' cómo ', ' por qué ', ' mejor ', ' jugada ', ' está ', ' mi ', ' para ', ' pon ', ' activa ', ' desactiva '],
  fr: [' le ', ' la ', ' les ', ' est ', ' que ', ' quel ', ' quelle ', ' comment ', ' pourquoi ', ' meilleur ', ' coup ', ' pour ', ' mon ', ' ma ', ' mets ', ' désactive '],
  de: [' der ', ' die ', ' das ', ' ist ', ' was ', ' wie ', ' warum ', ' beste ', ' zug ', ' für ', ' mein ', ' meine ', ' schalte ', ' stelle ', ' wechsle '],
  pt: [' o ', ' a ', ' os ', ' as ', ' que ', ' é ', ' de ', ' qual ', ' como ', ' por que ', ' melhor ', ' lance ', ' está ', ' minha ', ' para ', ' ative ', ' desative '],
  it: [' il ', ' la ', ' che ', ' è ', ' di ', ' quale ', ' come ', ' perché ', ' migliore ', ' mossa ', ' per ', ' mia ', ' metti ', ' disattiva ', ' attiva '],
};

/** Accented-letter fingerprints that strongly imply a Latin-script non-English
 *  language even in a short string with no clear function word. */
const ACCENT_HINTS: Array<[RegExp, string]> = [
  [/[ñ¿¡]/i, 'es'],
  [/[àâçèêëîïôûùü]/i, 'fr'],
  [/[äöüß]/i, 'de'],
  [/[ãõ]/i, 'pt'],
];

export function detectLanguage(text: string | undefined | null): DetectedLanguage {
  if (!text) return EN;
  const raw = text;
  // Non-Latin scripts — decisive.
  if (/[Ѐ-ӿ]/.test(raw)) return { code: 'ru', name: LANG_NAME.ru, nonEnglish: true };
  if (/[؀-ۿݐ-ݿ]/.test(raw)) return { code: 'ar', name: LANG_NAME.ar, nonEnglish: true };
  if (/[ऀ-ॿ]/.test(raw)) return { code: 'hi', name: LANG_NAME.hi, nonEnglish: true };
  if (/[가-힣]/.test(raw)) return { code: 'ko', name: LANG_NAME.ko, nonEnglish: true };
  if (/[぀-ヿ]/.test(raw)) return { code: 'ja', name: LANG_NAME.ja, nonEnglish: true };
  if (/[一-鿿]/.test(raw)) return { code: 'zh', name: LANG_NAME.zh, nonEnglish: true };

  const pad = ` ${raw.toLowerCase().replace(/[.,!?¿¡;:()"'`]/g, ' ').replace(/\s+/g, ' ')} `;
  let best = 'en', bestScore = 0;
  for (const [code, words] of Object.entries(MARKERS)) {
    let score = 0;
    for (const w of words) if (pad.includes(w)) score++;
    if (score > bestScore) { bestScore = score; best = code; }
  }
  // Need ≥2 marker hits to override English (one common word like "e" or "a"
  // is too weak). Accented fingerprints can confirm with a single hit.
  if (bestScore >= 2) return { code: best, name: LANG_NAME[best] ?? best, nonEnglish: best !== 'en' };
  for (const [re, code] of ACCENT_HINTS) {
    if (re.test(raw)) return { code, name: LANG_NAME[code] ?? code, nonEnglish: true };
  }
  return EN;
}
