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
  if (pm) { promo = ` and becomes a ${PIECE_WORD[pm[1]]}`; s = s.replace(/=([QRBN])$/, ''); }
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
const MOVE_TOKEN = /(?<![A-Za-z0-9-])(…)?((?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])(?:=[QRBN])?[+#]?|O-O-O[+#]?|O-O[+#]?)(?![A-Za-z0-9-])/g;

/** Every move written in `text`, said in words with its notation after it —
 *  "rook takes on d4 (Rxd4)" — so a beginner reads the move AND learns the
 *  notation. Display only: the facts are unchanged. */
export function movesInWords(text: string): string {
  // A move that opens a sentence opens it with a capital ("Castles kingside
  // (O-O) is fine", hand walk 2026-10-09 — the words replaced a capital O).
  return text.replace(MOVE_TOKEN, (_m, dots: string | undefined, san: string, offset: number) => {
    const words = sanToWords(san);
    const opens = /(?:^|[.!?]\s+)["“(]?$/.test(text.slice(0, offset));
    return `${opens ? words.charAt(0).toUpperCase() + words.slice(1) : words} (${dots ?? ''}${san})`;
  });
}
