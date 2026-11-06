import { withArticle } from './andList';
// SAN → spoken move, for Learn mode's voice (David 2026-05-23: "the tts
// narrations only stating moves"). Learn dictates WHAT to play ("Bishop to
// f5"); the lesson prose stays on-screen as the WHY. Disambiguation letters
// are SPOKEN (David 2026-05-25: "ALL narrations say rook a to d8") so the
// ear knows which piece moves. Pure + unit-tested.

const PIECE: Record<string, string> = {
  N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King',
};

/** Speak a square so TTS reads it clearly: "f5" → "f 5". */
function spellSquare(sq: string): string {
  return /^[a-h][1-8]$/.test(sq) ? `${sq[0]} ${sq[1]}` : sq;
}

export function sanToSpeech(sanRaw: string | undefined | null): string {
  if (!sanRaw) return '';
  let s = sanRaw.trim().replace(/[!?]+$/, '');
  let suffix = '';
  if (s.endsWith('#')) { suffix = ', checkmate'; s = s.slice(0, -1); }
  else if (s.endsWith('+')) { suffix = ', check'; s = s.slice(0, -1); }

  if (s === 'O-O' || s === '0-0') return `Castle kingside${suffix}`;
  if (s === 'O-O-O' || s === '0-0-0') return `Castle queenside${suffix}`;

  let promo = '';
  const pm = s.match(/=([QRBN])$/);
  if (pm) { promo = `, promote to ${PIECE[pm[1]]}`; s = s.replace(/=([QRBN])$/, ''); }

  const takes = s.includes('x');
  const dest = s.slice(-2);
  const piece = PIECE[s[0]];
  if (piece) {
    // Disambiguation = the file/rank between the piece letter and dest
    // (minus any capture 'x'). Spoken so "Rad8" → "Rook a to d 8".
    const mid = s.slice(1, -2).replace('x', '');
    const disamb = mid ? `${mid.split('').join(' ')} ` : '';
    return `${piece} ${disamb}${takes ? 'takes ' : 'to '}${spellSquare(dest)}${promo}${suffix}`;
  }
  // Pawn move (no piece letter). Capture form: "exd5" → "e takes d 5".
  if (takes) {
    return `${s[0]} takes ${spellSquare(dest)}${promo}${suffix}`;
  }
  return `Pawn to ${spellSquare(dest)}${promo}${suffix}`;
}

const PIECE_WORD: Record<string, string> = {
  N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king',
};

/** SAN → words for READING (the beginner register, 2026-10-02: real users
 *  asked what "G" and "bxe7" mean). Lower-case, squares unspaced — this is
 *  on-screen text, not the voice. "Rxd4" → "rook takes d4", "exd5" →
 *  "e-pawn takes d5", "O-O" → "castles kingside". */
export function sanToWords(sanRaw: string): string {
  let s = sanRaw.trim().replace(/[!?]+$/, '');
  let suffix = '';
  if (s.endsWith('#')) { suffix = ', checkmate'; s = s.slice(0, -1); }
  else if (s.endsWith('+')) { suffix = ' with check'; s = s.slice(0, -1); }
  if (s === 'O-O' || s === '0-0') return `castles kingside${suffix}`;
  if (s === 'O-O-O' || s === '0-0-0') return `castles queenside${suffix}`;
  let promo = '';
  const pm = s.match(/=([QRBN])$/);
  if (pm) { promo = ` and becomes ${withArticle(PIECE_WORD[pm[1]])}`; s = s.replace(/=([QRBN])$/, ''); }
  const takes = s.includes('x');
  const dest = s.slice(-2);
  const piece = PIECE_WORD[s[0]];
  if (piece) {
    const file = s.slice(1, -2).replace('x', '').match(/[a-h]/)?.[0];
    return `${file ? `${file}-` : ''}${piece} ${takes ? 'takes on' : 'to'} ${dest}${promo}${suffix}`;
  }
  if (takes) return `${s[0]}-pawn takes on ${dest}${promo}${suffix}`;
  return `pawn to ${dest}${promo}${suffix}`;
}

/** A piece move, a capture or castling, as written in coach text. A bare
 *  square ("d5") is left alone — "the pawn on d5" is a square, not a move. */
const SAN_BODY = '(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])(?:=[QRBN])?[+#]?|O-O-O[+#]?|O-O[+#]?';
const MOVE_TOKEN = new RegExp(`(?<![A-Za-z0-9-])(…)?(${SAN_BODY})(?![A-Za-z0-9-])`, 'g');
/** One word of a name that is a move — with its move number, or a pawn push
 *  ("(2.Bc4)", "4…Bc5", "(2...d5)", "Nd2"). */
const ONE_MOVE = new RegExp(`^(?:\\d+(?:\\.{1,3}|…))?(?:\\.\\.|…)?(?:${SAN_BODY}|[a-h][1-8])[!?]*$`);

/** The words that make a run of capitalised words an opening's NAME. */
const NAME_WORD = /^(?:Defen[cs]e|Opening|Game|Gambit|Countergambit|Attack|System|Variation|Line|Trap)s?$/;
/** Small words a name is built with ("London System, with Bd3"). */
const NAME_JOINER = new Set(['with', 'vs', 'vs.', 'and', 'the', 'of', '&', '/', '—', '-', '..', '...', '…']);

/**
 * THE OPENING NAMES IN A LINE OF COACH TEXT, as [start, end) spans (chat-
 * surfaces audit 2026-11-06: "Sure — let's walk through the Caro-Kann
 * Defense: Tartakower (knight to f6 (Nf6)) Variation"). Names carry moves as
 * part of the name — "Tartakower (Nf6) Variation", "London System, with
 * Bd3", "Benko Gambit: Nd2 Variation", "Scotch Gambit (4.Bc4)" — and a name
 * is not a move being said. A name is a run of capitalised words, moves and
 * the small words and punctuation names are built from, holding at least one
 * name word. Read off the text itself because a name reaches a bubble from
 * every opening source the app has (the database, the voiced corpus, the
 * repertoire, the course files), and a run read as a name that was prose only
 * leaves a move in notation, the register every other student reads.
 */
function nameSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let start = -1;
  let end = -1;
  let named = false;
  const close = (): void => {
    if (start >= 0 && named) spans.push([start, end]);
    start = -1; named = false;
  };
  for (const m of text.matchAll(/\S+/g)) {
    const chunk = m[0];
    const core = chunk.replace(/^[("“]+/, '').replace(/[)"”,:;.!?]+$/, '');
    const isMove = ONE_MOVE.test(core);
    const isCap = /^[A-ZÀ-Þ][\p{L}'’.-]*$/u.test(core);
    const joins = NAME_JOINER.has(core.toLowerCase()) || core === '';
    if (!isMove && !isCap && !joins) { close(); continue; }
    const at = m.index ?? 0;
    if (start < 0) start = at;
    end = at + chunk.length;
    if (isCap && NAME_WORD.test(core)) named = true;
    // A sentence ends the run with it ("…Tartakower (Nf6) Variation.").
    if (!joins && /[.!?]["”)]*$/.test(chunk) && !/^(?:St|vs)$/.test(core)) close();
  }
  close();
  return spans;
}

/** Every move written in `text`, said in words with its notation after it —
 *  "rook takes on d4 (Rxd4)" — so a beginner reads the move AND learns the
 *  notation. Display only: the facts are unchanged.
 *
 *  The words are ENGLISH: run it on the app's English source, before any
 *  translation, never on text already in another language — the chat's
 *  translation door does exactly that (`useLocalizedContent`'s
 *  `renderEnglish`). 🔒 A NAME IS NOT A MOVE: a move inside an opening's name
 *  stays as written (`nameSpans`). */
export function movesInWords(text: string): string {
  const names = nameSpans(text);
  // A move that opens a sentence opens it with a capital ("Castles kingside
  // (O-O) is fine", hand walk 2026-10-09 — the words replaced a capital O).
  return text.replace(MOVE_TOKEN, (whole: string, dots: string | undefined, san: string, offset: number) => {
    if (names.some(([a, b]) => offset >= a && offset < b)) return whole;
    const words = sanToWords(san);
    const opens = /(?:^|[.!?]\s+)["“(]?$/.test(text.slice(0, offset));
    return `${opens ? words.charAt(0).toUpperCase() + words.slice(1) : words} (${dots ?? ''}${san})`;
  });
}
