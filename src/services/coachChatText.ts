/**
 * THE TRANSCRIPT'S TRANSLATION DOOR — the text-side sibling of the voice
 * chokepoint.
 *
 * 🔒 WHY THIS EXISTS (prod, 2026-09-19). A Thai student asked for the Italian,
 * got the lesson, HEARD it in Thai — and READ "Sure — let's walk through the
 * Italian Game." in English. Not a design choice; an accident of shape. Every
 * spoken line funnels through `voiceService.speakInternal`, and that one door
 * localises, so voice was free. Chat messages are built at 85 different
 * `setMessages` call sites and pushed straight into the transcript, so there
 * was no door and nothing ever had the chance to translate them. Fix the six
 * acks and the seventh someone writes next month is English again.
 *
 * A census of `CoachTeachPage` found 22 English sources feeding the transcript
 * (6 inline literals + 16 feeder variables), not 6 — which is the argument for
 * a door rather than point fixes.
 *
 * THE DOOR IS AT THE RENDER, NOT THE PUSH. Wrapping 85 push sites is a large
 * refactor of a 12k-line component for no extra coverage; the transcript
 * renders from ONE map, so localising there covers every message that exists
 * today and every one added later, for a single call site. `useLocalizedBeats`
 * (narrationI18n) is the same pattern already in this codebase.
 *
 * THE TABLE IS TRIED BEFORE THE MODEL, and that is the determinism law, not an
 * optimisation. These are FIXED app strings with one variable — chrome, not
 * computed chess facts — so there is nothing for a model to decide, and a
 * table answers synchronously: no round-trip, no English-then-swap flicker in
 * the exact moment we just fixed. The model is the fallback for the long tail
 * so a new string is never stuck in English, and English is the floor.
 */
import { useEffect, useState } from 'react';
import { detectLanguage, type LangCode } from '../utils/detectLanguage';

/** One fixed app string: how to recognise it, and how each language says it.
 *  `$1` in a translation is the captured variable (an opening name, a player). */
export interface CoachPhrase {
  key: string;
  match: RegExp;
  /** Per-language template. A language absent here falls through to the model. */
  say: Partial<Record<LangCode, string>>;
}

/**
 * The strings the coach writes itself. Kept SMALL and exact on purpose: every
 * entry is a literal this app ships, so a match is certain rather than fuzzy.
 * Anything not here is handled by the model fallback — the table never has to
 * be complete to be correct.
 *
 * Seeded for the scripts real users actually write in (the App Store report
 * that started this was Thai). Adding a language is one key per entry.
 */
export const COACH_PHRASES: readonly CoachPhrase[] = [
  {
    key: 'lesson.start',
    match: /^(?:Sure|Ready) — let's walk through the (.+)\.$/,
    say: {
      th: 'มาเรียน $1 กันเลยครับ',
      el: 'Πάμε να δούμε μαζί το $1.',
      he: 'בוא נעבור יחד על $1.',
      vi: 'Cùng đi qua $1 nhé.',
      hi: 'चलिए $1 को साथ में देखते हैं।',
      ko: '$1 을(를) 함께 살펴볼까요.',
      es: 'Vamos a repasar $1.',
      fr: "Voyons ensemble $1.",
      de: 'Schauen wir uns $1 gemeinsam an.',
      pt: 'Vamos ver $1 juntos.',
      it: 'Vediamo insieme $1.',
      ru: 'Давайте разберём $1.',
      ar: 'لنستعرض معًا $1.',
      ja: '$1 を一緒に見ていきましょう。',
      zh: '我们一起来看 $1。',
      tr: 'Hadi $1 açılışını birlikte inceleyelim.',
      uk: 'Розгляньмо разом $1.',
    },
  },
  {
    key: 'lesson.building',
    match: /^Putting together (.+) — this takes about a minute\. The first time only; after this it'll be instant\.$/,
    say: {
      th: 'กำลังเตรียม $1 อยู่ครับ ใช้เวลาประมาณหนึ่งนาที เฉพาะครั้งแรกเท่านั้น หลังจากนี้จะขึ้นทันที',
      el: 'Ετοιμάζω το $1 — θέλει περίπου ένα λεπτό, μόνο την πρώτη φορά.',
      he: 'מכין את $1 — זה לוקח כדקה, רק בפעם הראשונה.',
      vi: 'Đang chuẩn bị $1 — mất khoảng một phút, chỉ lần đầu thôi.',
      hi: '$1 तैयार कर रहा हूँ — लगभग एक मिनट लगेगा, सिर्फ़ पहली बार।',
      ko: '$1 을(를) 준비 중입니다 — 1분쯤 걸리고, 처음 한 번만 그렇습니다.',
      es: 'Preparando $1: tarda alrededor de un minuto, solo la primera vez.',
      fr: 'Je prépare $1 — environ une minute, seulement la première fois.',
      de: 'Ich stelle $1 zusammen — etwa eine Minute, nur beim ersten Mal.',
      pt: 'Preparando $1 — leva cerca de um minuto, só na primeira vez.',
      it: 'Sto preparando $1 — circa un minuto, solo la prima volta.',
      ru: 'Готовлю $1 — примерно минута, только в первый раз.',
      ar: 'أُجهّز $1 — يستغرق دقيقة تقريبًا، في المرة الأولى فقط.',
      ja: '$1 を準備しています。1分ほどかかりますが、初回だけです。',
      zh: '正在准备 $1，大约需要一分钟，仅首次如此。',
      tr: '$1 hazırlanıyor — yaklaşık bir dakika, yalnızca ilk seferde.',
      uk: 'Готую $1 — близько хвилини, лише вперше.',
    },
  },
  {
    key: 'lesson.failed',
    match: /^I couldn't build the (.+) walkthrough this time\. Try again or pick a different opening\.$/,
    say: {
      th: 'ครั้งนี้ผมสร้างบทเรียน $1 ไม่สำเร็จครับ ลองอีกครั้งหรือเลือกการเปิดเกมอื่นดูนะครับ',
      el: 'Δεν μπόρεσα να φτιάξω το $1 αυτή τη φορά. Δοκίμασε ξανά ή διάλεξε άλλο άνοιγμα.',
      he: 'לא הצלחתי לבנות את $1 הפעם. נסה שוב או בחר פתיחה אחרת.',
      vi: 'Lần này tôi chưa dựng được $1. Thử lại hoặc chọn khai cuộc khác nhé.',
      hi: 'इस बार मैं $1 नहीं बना सका। दोबारा कोशिश करें या कोई और ओपनिंग चुनें।',
      ko: '이번에는 $1 을(를) 만들지 못했습니다. 다시 시도하거나 다른 오프닝을 골라 주세요.',
      es: 'No he podido crear $1 esta vez. Inténtalo otra vez o elige otra apertura.',
      fr: "Je n'ai pas pu construire $1 cette fois. Réessaie ou choisis une autre ouverture.",
      de: 'Ich konnte $1 diesmal nicht erstellen. Versuch es noch einmal oder wähle eine andere Eröffnung.',
      pt: 'Não consegui montar $1 desta vez. Tente de novo ou escolha outra abertura.',
      it: 'Non sono riuscito a creare $1 stavolta. Riprova o scegli un’altra apertura.',
      ru: 'В этот раз не удалось собрать $1. Попробуйте ещё раз или выберите другой дебют.',
      ar: 'لم أتمكّن من إعداد $1 هذه المرة. حاول مجددًا أو اختر افتتاحية أخرى.',
      ja: '今回は $1 を作れませんでした。もう一度試すか、別のオープニングを選んでください。',
      zh: '这次没能生成 $1。请再试一次，或换一个开局。',
      tr: 'Bu sefer $1 oluşturamadım. Tekrar dene ya da başka bir açılış seç.',
      uk: 'Цього разу не вдалося зібрати $1. Спробуйте ще раз або оберіть інший дебют.',
    },
  },
  {
    key: 'walkthrough.paused',
    match: /^Walkthrough is paused\. Tap Resume to continue, or ask another question\.$/,
    say: {
      th: 'หยุดบทเรียนไว้ชั่วคราวครับ แตะ Resume เพื่อไปต่อ หรือจะถามคำถามอื่นก็ได้',
      el: 'Το μάθημα είναι σε παύση. Πάτα Resume για να συνεχίσεις ή ρώτα κάτι άλλο.',
      he: 'השיעור מושהה. הקש Resume כדי להמשיך, או שאל שאלה אחרת.',
      vi: 'Bài học đang tạm dừng. Nhấn Resume để tiếp tục, hoặc hỏi câu khác.',
      hi: 'पाठ रुका हुआ है। जारी रखने के लिए Resume दबाएँ, या कुछ और पूछें।',
      ko: '레슨이 일시정지되었습니다. Resume 를 눌러 계속하거나 다른 질문을 해 주세요.',
      es: 'La lección está en pausa. Pulsa Resume para seguir, o hazme otra pregunta.',
      fr: 'La leçon est en pause. Appuie sur Resume pour continuer, ou pose une autre question.',
      de: 'Die Lektion pausiert. Tippe auf Resume, um fortzufahren, oder stell eine andere Frage.',
      pt: 'A lição está pausada. Toque em Resume para continuar, ou faça outra pergunta.',
      it: 'La lezione è in pausa. Tocca Resume per continuare, o fammi un’altra domanda.',
      ru: 'Урок на паузе. Нажмите Resume, чтобы продолжить, или задайте другой вопрос.',
      ar: 'الدرس متوقّف مؤقتًا. اضغط Resume للمتابعة أو اسأل سؤالًا آخر.',
      ja: 'レッスンは一時停止中です。Resume を押すと続きます。別の質問でも大丈夫です。',
      zh: '课程已暂停。点按 Resume 继续，或者问我别的问题。',
      tr: 'Ders duraklatıldı. Devam etmek için Resume’a dokun ya da başka bir şey sor.',
      uk: 'Урок на паузі. Натисніть Resume, щоб продовжити, або поставте інше запитання.',
    },
  },
  {
    key: 'snag',
    match: /^Hit a snag — say it again\?$/,
    say: {
      th: 'มีปัญหานิดหน่อยครับ ลองพูดอีกครั้งได้ไหม',
      el: 'Κάτι πήγε στραβά — το ξαναλές;',
      he: 'משהו השתבש — אפשר לחזור על זה?',
      vi: 'Có trục trặc — bạn nói lại nhé?',
      hi: 'कुछ गड़बड़ हो गई — फिर से कहेंगे?',
      ko: '문제가 생겼어요 — 다시 말씀해 주시겠어요?',
      es: 'Ha habido un problema. ¿Lo repites?',
      fr: 'Un souci — tu peux répéter ?',
      de: 'Da ging etwas schief — sag es noch einmal?',
      pt: 'Deu um problema — pode repetir?',
      it: 'C’è stato un intoppo — me lo ripeti?',
      ru: 'Что-то пошло не так — повторите?',
      ar: 'حدثت مشكلة — هل تعيد ذلك؟',
      ja: '問題が起きました。もう一度お願いできますか。',
      zh: '出了点问题，能再说一次吗？',
      tr: 'Bir aksilik oldu — tekrar söyler misin?',
      uk: 'Щось пішло не так — повторіть?',
    },
  },
];

/** The table's answer for `text` in `lang`, or null when nothing matches.
 *  Pure and synchronous — this is the whole reason the table exists. */
export function phraseFor(text: string, lang: LangCode): string | null {
  const source = text.trim();
  for (const phrase of COACH_PHRASES) {
    const m = phrase.match.exec(source);
    if (!m) continue;
    const template = phrase.say[lang];
    if (!template) return null;   // known string, unknown language → model
    return template.replace(/\$(\d)/g, (_, d: string) => m[Number(d)] ?? '');
  }
  return null;
}

/** True when this message is the app's own English and wants translating.
 *  A reply already in the student's language (the brain's) is left alone —
 *  re-translating it is how you end up speaking a third language. */
export function needsLocalizing(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return !detectLanguage(t).nonEnglish;
}

/** Translations already paid for, so a message re-rendering (every keystroke in
 *  the composer re-renders the transcript) never costs a second call. */
const modelCache = new Map<string, string>();
const MAX_CACHED = 300;

/** The model fallback, for a string the table does not carry. Bounded, cached,
 *  and best-effort: a failure speaks English, which is the floor, never a
 *  blank bubble. */
async function modelPhrase(text: string, languageName: string): Promise<string | null> {
  const key = `${languageName}::${text}`;
  const hit = modelCache.get(key);
  if (hit !== undefined) return hit;
  try {
    // Lazy: the transcript must not pull the provider SDKs to render English.
    const { voiceFacts } = await import('./coachApi');
    const out = await voiceFacts(text, { targetLanguage: languageName, intent: 'spoken-narration' });
    const said = out?.trim();
    if (!said) return null;
    if (modelCache.size >= MAX_CACHED) modelCache.clear();
    modelCache.set(key, said);
    return said;
  } catch {
    return null;
  }
}

export interface LocalizableMessage { id: string; role: string; content: string }

/**
 * The transcript, in the student's language.
 *
 * Table hits are applied SYNCHRONOUSLY on the first render, so the strings
 * that matter never flash English first. Only a table miss waits on the model,
 * and that lands as an in-place update rather than holding the bubble back —
 * a late translation is better than a late message.
 *
 * Student messages are never touched: those are their own words.
 */
export function useLocalizedMessages<T extends LocalizableMessage>(
  messages: readonly T[],
  languageName: string | null,
  langCode: LangCode | null,
): readonly T[] {
  const [extra, setExtra] = useState<Record<string, string>>({});

  const applyTable = (m: T): T => {
    if (m.role !== 'assistant' || !langCode || !needsLocalizing(m.content)) return m;
    const swapped = extra[m.id] ?? phraseFor(m.content, langCode);
    return swapped ? ({ ...m, content: swapped } as T) : m;
  };
  const shown = languageName && langCode ? messages.map(applyTable) : messages;

  useEffect(() => {
    if (!languageName || !langCode) return;
    let cancelled = false;
    const owed = messages.filter(
      (m) => m.role === 'assistant'
        && needsLocalizing(m.content)
        && !phraseFor(m.content, langCode)
        && extra[m.id] === undefined,
    );
    if (owed.length === 0) return;
    void Promise.all(owed.map(async (m) => {
      const said = await modelPhrase(m.content, languageName);
      return said ? [m.id, said] as const : null;
    })).then((pairs) => {
      if (cancelled) return;
      const add = Object.fromEntries(pairs.filter((p): p is readonly [string, string] => p !== null));
      if (Object.keys(add).length > 0) setExtra((prev) => ({ ...prev, ...add }));
    });
    return () => { cancelled = true; };
  }, [messages, languageName, langCode, extra]);

  return shown;
}
