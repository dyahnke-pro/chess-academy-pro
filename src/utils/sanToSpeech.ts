// SAN → spoken move, for Learn mode's voice (David 2026-05-23: "the tts
// narrations only stating moves"). Learn dictates WHAT to play ("Bishop to
// f5"); the lesson prose stays on-screen as the WHY. Disambiguation letters
// are dropped for speech (they don't help the ear). Pure + unit-tested.

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
    return `${piece} ${takes ? 'takes ' : 'to '}${spellSquare(dest)}${promo}${suffix}`;
  }
  // Pawn move (no piece letter). Capture form: "exd5" → "e takes d 5".
  if (takes) {
    return `${s[0]} takes ${spellSquare(dest)}${promo}${suffix}`;
  }
  return `Pawn to ${spellSquare(dest)}${promo}${suffix}`;
}
