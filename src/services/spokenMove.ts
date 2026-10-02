// spokenMove — ONE place a SAN becomes prose (WO-STANDARD-01 D-10, 2026-09-22).
//
// Two renderings, because a move sits in two grammatical slots and the
// difference is a real bug: a CLAUSE has a finite verb ("the queen takes d5")
// and reads correctly only after "but …"; a NOUN PHRASE is a gerund ("the
// queen taking on d5") and can be the subject of a sentence. Dropped into the
// wrong slot the clause produced, on a real prod run, "It's genuinely close —
// the queen takes d5 is about as good."
//
// These used to be private to `tacticalRead`. The live look-ahead line spoke
// bare SAN beside the TTS sanitizer's expansion of the same token ("Bg5, then
// Bg4" next to "the bishop to g5"), so the helpers moved to a zero-import leaf
// that every spoken surface can share. Never re-implement them at a call site.

const PIECE_THE: Record<string, string> = { N: 'the knight', B: 'the bishop', R: 'the rook', Q: 'the queen', K: 'the king' };
const PROMO: Record<string, string> = { N: 'a knight', B: 'a bishop', R: 'a rook', Q: 'a queen' };
const SAN = /^([NBRQK])?([a-h]?[1-8]?)?(x)?([a-h][1-8])(=([NBRQ]))?$/;
const RANK = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** The moving piece, keeping SAN's disambiguation: two rooks can reach one
 *  square, and "the rook taking on e3 is a fine alternative to the rook taking
 *  on e3" (R1xe3 vs R8xe3, walk 2026-09-30) said nothing. */
function pieceOf(m: RegExpMatchArray): string {
  const from = m[2] ?? '';
  if (m[1]) {
    const base = PIECE_THE[m[1]];
    if (/^[a-h][1-8]$/.test(from)) return `${base} on ${from}`;
    // "the c-file rook to d8", never "the rook on the c-file to d8" — the
    // prepositional form garbles once a clause follows it (Learn walk
    // 2026-10-01: "The rook on the c-file to d8 can wait").
    if (/^[a-h]$/.test(from)) return base.replace(/^the /, `the ${from}-file `);
    if (/^[1-8]$/.test(from)) return base.replace(/^the /, `the ${RANK[Number(from)]}-rank `);
    return base;
  }
  // A pawn CAPTURE names its file — "the f-pawn taking on g3". Two pawns can
  // take on one square, and "you left the book with the pawn taking on g3; the
  // usual move there was the pawn taking on g3" (fxg3 vs hxg3, walk 2026-09-27)
  // said the same thing twice.
  return m[3] && /^[a-h]$/.test(from) ? `the ${from}-pawn` : 'the pawn';
}

/** The move as a CLAUSE with a finite verb: "Nxd5" → "the knight takes d5". */
export function sayMoveClause(san: string): string {
  const clean = san.replace(/[+#]/g, '');
  if (clean === 'O-O') return 'castle short';
  if (clean === 'O-O-O') return 'castle long';
  const m = clean.match(SAN);
  if (!m) return clean;
  const piece = pieceOf(m);
  const takes = m[3] ? ' takes ' : ' to ';
  const promo = m[6] ? `, promoting to ${PROMO[m[6]]}` : '';
  return `${piece}${takes}${m[4]}${promo}`;
}

/** The move as a NOUN PHRASE: "Nxd5" → "the knight taking on d5", "O-O" →
 *  "castling short". For a subject or an object of a preposition. */
export function sayMoveNoun(san: string): string {
  const clean = san.replace(/[+#]/g, '');
  if (clean === 'O-O') return 'castling short';
  if (clean === 'O-O-O') return 'castling long';
  const m = clean.match(SAN);
  if (!m) return clean;
  const piece = pieceOf(m);
  const promo = m[6] ? `, promoting to ${PROMO[m[6]]}` : '';
  // "taking on d5" rather than "taking d5": the pawn/piece is taken ON a square.
  return m[3] ? `${piece} taking on ${m[4]}${promo}` : `${piece} to ${m[4]}${promo}`;
}
