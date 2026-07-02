/**
 * Language-aware Polly voice selection for /api/tts.
 *
 * The coach's LLM answers in whatever language the user writes in (verified
 * live across 12 languages), but the TTS voice map is all US-English voices —
 * so a Spanish or Japanese reply was being spoken by an English voice
 * (mangled for Latin scripts, broken for non-Latin). This maps the DETECTED
 * language of the passage to a native Polly voice + LanguageCode.
 *
 * Detection is deliberately cheap and dependency-free (edge runtime):
 *   - Non-Latin scripts are detected by Unicode range — 100% reliable, and
 *     these are exactly the ones that were fully broken before.
 *   - Latin-script languages (es/fr/de/pt/it) use a diacritic + stopword
 *     heuristic. When it isn't confident it returns null → the caller keeps
 *     the requested English voice (today's behavior), so a miss never
 *     regresses English and at worst reads a Romance language with an
 *     English voice, exactly as before.
 *
 * Voice + engine pairs are Polly's native voice for each language, with an
 * engine that voice actually supports (Russian + Modern-Standard-Arabic have
 * no neural voice in Polly, so they use `standard`).
 */
export interface LangVoice {
  voiceId: string;
  engine: 'neural' | 'standard' | 'generative';
  languageCode: string;
}

export const LANG_VOICES: Record<string, LangVoice> = {
  es: { voiceId: 'Lucia', engine: 'neural', languageCode: 'es-ES' },
  fr: { voiceId: 'Lea', engine: 'neural', languageCode: 'fr-FR' },
  de: { voiceId: 'Vicki', engine: 'neural', languageCode: 'de-DE' },
  pt: { voiceId: 'Camila', engine: 'neural', languageCode: 'pt-BR' },
  it: { voiceId: 'Bianca', engine: 'neural', languageCode: 'it-IT' },
  ru: { voiceId: 'Tatyana', engine: 'standard', languageCode: 'ru-RU' },
  ja: { voiceId: 'Takumi', engine: 'neural', languageCode: 'ja-JP' },
  zh: { voiceId: 'Zhiyu', engine: 'neural', languageCode: 'cmn-CN' },
  ar: { voiceId: 'Zeina', engine: 'standard', languageCode: 'arb' },
  hi: { voiceId: 'Kajal', engine: 'neural', languageCode: 'hi-IN' },
  ko: { voiceId: 'Seoyeon', engine: 'neural', languageCode: 'ko-KR' },
};

/**
 * Detect the language of `text` and return the native Polly voice for it, or
 * null to keep the caller's default (English) voice. Non-Latin scripts win
 * immediately (definitive); Latin scores by distinctive stopwords + diacritics
 * and must clear a small threshold so an English passage never trips it.
 */
export function detectVoiceForText(text: string): LangVoice | null {
  if (!text) return null;

  // ── Non-Latin scripts: Unicode-range, definitive ─────────────────────────
  if (/[Ѐ-ӿ]/.test(text)) return LANG_VOICES.ru; // Cyrillic
  if (/[؀-ۿݐ-ݿࢠ-ࣿ]/.test(text)) return LANG_VOICES.ar; // Arabic
  if (/[ऀ-ॿ]/.test(text)) return LANG_VOICES.hi; // Devanagari
  if (/[가-힣ᄀ-ᇿ]/.test(text)) return LANG_VOICES.ko; // Hangul
  if (/[぀-ヿ]/.test(text)) return LANG_VOICES.ja; // Hiragana/Katakana ⇒ Japanese
  if (/[一-鿿]/.test(text)) return LANG_VOICES.zh; // Han (kana already ruled out) ⇒ Chinese

  // ── Latin-script heuristic (es/fr/de/pt/it), English = safe fallback ─────
  const lower = ' ' + text.toLowerCase() + ' ';
  const score: Record<string, number> = { es: 0, fr: 0, de: 0, pt: 0, it: 0 };
  const bump = (lang: keyof typeof score, re: RegExp, weight = 1): void => {
    const m = lower.match(re);
    if (m) score[lang] += m.length * weight;
  };

  // Distinctive diacritics / punctuation (strong signals)
  bump('es', /ñ|¿|¡/g, 3);
  bump('pt', /ã|õ/g, 3);
  bump('de', /ß|ä|ö|ü/g, 2);
  bump('fr', /ç|œ|â|ê|î|ô|û/g, 2);
  bump('it', /à|ò|ù/g, 1);

  // Distinctive stopwords (spaced so they can't match inside a longer word).
  // Chosen to avoid English homographs (no "die", no "a", no "is").
  bump('es', / (el|la|los|las|que|por|para|como|una|está|porque|qué|del|tablero|ajedrez|piezas) /g);
  bump('fr', / (le|les|des|une|est|pour|vous|que|qui|dans|avec|pourquoi|échecs|pièces|contrôler|au) /g);
  bump('de', / (der|das|und|ist|nicht|eine|wie|warum|über|mehr|kann|figuren|zentrum|schach|des) /g);
  bump('pt', / (você|não|para|porque|como|uma|está|peças|tabuleiro|xadrez|mais|é|no) /g);
  bump('it', / (perché|gli|che|non|una|per|con|come|più|scacchi|pezzi|centro|della|è) /g);

  let best: string | null = null;
  let bestScore = 1; // require > 1 so a stray word never flips English
  for (const [lang, s] of Object.entries(score)) {
    if (s > bestScore) {
      bestScore = s;
      best = lang;
    }
  }
  return best ? LANG_VOICES[best] : null;
}
