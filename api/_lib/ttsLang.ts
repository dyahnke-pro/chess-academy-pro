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
  // 🔒 THE SETTINGS PICKER OFFERED THESE AND NOTHING COULD SPEAK THEM. Dutch,
  // Polish and Turkish were selectable, the model duly translated every spoken
  // line into them, and then the detector returned null and an AMERICAN voice
  // read the result aloud. Correct words, wrong mouth — worse than English,
  // because it sounds broken rather than unsupported. `narrationLanguages` in
  // the gate below now holds the picker's list against this map so a language
  // can never again be offered without a voice behind it.
  nl: { voiceId: 'Lotte', engine: 'standard', languageCode: 'nl-NL' },
  pl: { voiceId: 'Ewa', engine: 'standard', languageCode: 'pl-PL' },
  tr: { voiceId: 'Filiz', engine: 'standard', languageCode: 'tr-TR' },
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
  const score: Record<string, number> = { es: 0, fr: 0, de: 0, pt: 0, it: 0, nl: 0, pl: 0, tr: 0 };
  // Track FUNCTION-WORD (stopword) evidence separately from diacritics. A lone
  // diacritic in an English chess narration is almost always a foreign proper
  // NAME (Grünfeld, König, Réti, a player's surname) — NOT a foreign-language
  // passage — and must never flip the voice (David 2026-08-28: a single German
  // umlaut was switching the whole coach to a German voice = "European accent").
  // So the diacritic-scored languages (es/fr/de/pt/it) also require ≥1 stopword.
  const stop: Record<string, number> = { es: 0, fr: 0, de: 0, pt: 0, it: 0, nl: 0, pl: 0, tr: 0 };
  // DISTINCT stopwords, not occurrences. One English homograph repeated is not
  // evidence of a foreign language; several DIFFERENT function words is.
  const distinct: Record<string, Set<string>> = {
    es: new Set(), fr: new Set(), de: new Set(), pt: new Set(),
    it: new Set(), nl: new Set(), pl: new Set(), tr: new Set(),
  };
  const bumpDia = (lang: keyof typeof score, re: RegExp, weight = 1): void => {
    const m = lower.match(re);
    if (m) score[lang] += m.length * weight;
  };
  const bumpStop = (lang: keyof typeof score, re: RegExp): void => {
    const m = lower.match(re);
    if (m) {
      score[lang] += m.length;
      stop[lang] += m.length;
      for (const w of m) distinct[lang].add(w.trim());
    }
  };

  // Distinctive diacritics / punctuation (strong signals, but foreign NAMES
  // carry them too — gated on stopword corroboration below for es/fr/de/pt/it).
  bumpDia('es', /ñ|¿|¡/g, 3);
  bumpDia('pt', /ã|õ/g, 3);
  bumpDia('de', /ß|ä|ö|ü/g, 2);
  bumpDia('fr', /ç|œ|â|ê|î|ô|û/g, 2);
  bumpDia('it', /à|ò|ù/g, 1);
  // Polish and Turkish letters. These were once treated as DEFINITIVE — as
  // good as a non-Latin script — and that was wrong twice over. `ć` is Croatian
  // and Serbian too ("Named after Vladimir Vuković, the Croatian master…" was
  // being read in a Polish voice), `ş` is also Romanian, `ı` also Azerbaijani.
  // And more basically: a diacritic in an English sentence is nearly always a
  // foreign NAME, which is the exact failure this file was already fixed for
  // once. They score, they no longer exempt.
  bumpDia('pl', /ł|ą|ę|ż|ź|ś|ć/g, 3);
  bumpDia('tr', /ğ|ı|ş/g, 3);

  // Distinctive stopwords (spaced so they can't match inside a longer word).
  // Chosen to avoid English homographs (no "die", no "a", no "is").
  bumpStop('es', / (el|la|los|las|que|por|para|como|una|está|porque|qué|del|tablero|ajedrez|piezas) /g);
  bumpStop('fr', / (le|les|des|une|est|pour|vous|que|qui|dans|avec|pourquoi|échecs|pièces|contrôler|au) /g);
  bumpStop('de', / (der|das|und|ist|nicht|eine|wie|warum|über|mehr|kann|figuren|zentrum|schach|des) /g);
  bumpStop('pt', / (você|não|porque|uma|está|peças|tabuleiro|xadrez|mais) /g);
  bumpStop('it', / (perché|gli|che|non|una|più|scacchi|pezzi|della) /g);
  // Dutch has no letter of its own, so it rests entirely on function words —
  // chosen to have no English homograph at all ("het", "een", "niet", "naar"),
  // plus the chess nouns that appear in almost every spoken line.
  bumpStop('nl', / (het|een|niet|zijn|maar|ook|naar|wordt|deze|jouw|zwart|koning|loper|paard|toren) /g);
  bumpStop('pl', / (się|nie|jest|że|dla|przez|szachy|goniec|skoczek|wieża|hetman|król) /g);
  bumpStop('tr', / (bir|için|değil|nasıl|neden|satranç|piyon|vezir|şah) /g);

  // 🔒 TWO DISTINCT FUNCTION WORDS, OR THE LANGUAGE'S OWN LETTERS.
  //
  // The 2026-08-28 pass required ≥1 stopword so a lone accented NAME could not
  // flip the voice. It was not enough, because the stopword lists still held
  // plain English words — Turkish `at` (horse), Portuguese `no`, Italian
  // `come`, Polish `ten`. Ordinary chess narration says "aimed AT g7 … the
  // queen AT f7" or "NO weak piece and NO weak squares", and two hits cleared
  // the bar: 75 shipped English passages, most of the openings tab among them,
  // were spoken in a Turkish voice. (David 2026-09-03, second report of the
  // same symptom: "still hearing a european accent … under the opening tab".)
  //
  // The homographs are gone from the lists, but removing words is whack-a-mole
  // — the structural rule is what holds. A real foreign sentence uses SEVERAL
  // DIFFERENT function words; an English passage repeating one homograph does
  // not. So count DISTINCT stopwords, never occurrences.
  //
  // NO LANGUAGE WINS ON LETTERS ALONE — not even Polish or Turkish, which used
  // to be exempt on the theory that their letters are unique to them. They are
  // not, and a lone accented letter in English prose is a NAME far more often
  // than it is a foreign passage. Diacritics raise confidence; only function
  // words establish that the passage is actually in the language.
  const MIN_DISTINCT_STOPWORDS = 2;
  let best: string | null = null;
  let bestScore = 1; // require > 1 so a stray word never flips English
  for (const [lang, s] of Object.entries(score)) {
    if (s <= bestScore) continue;
    if (distinct[lang].size < MIN_DISTINCT_STOPWORDS) continue;
    bestScore = s;
    best = lang;
  }
  return best ? LANG_VOICES[best] : null;
}
