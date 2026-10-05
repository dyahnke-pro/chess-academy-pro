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
// Bg4" next to "the bishop to g5"), so the helpers moved to a leaf (chess.js
// only) that every spoken surface can share. Never re-implement them at a call
// site.
//
// THE BOARD IS A REQUIRED ARGUMENT (walk 2026-10-04, defect 8: "The c-file
// knight to e7" for Nce7 — a coach says "the knight from c6"). SAN carries only
// the letter that tells two pieces apart; the square they come FROM is on the
// board. So every caller passes the position the move is played from, or an
// honest `null` when it has none (then the file / rank form stands). Required,
// so a new caller has to decide rather than silently inherit the letter form.
import { Chess } from 'chess.js';

const PIECE_THE: Record<string, string> = { N: 'the knight', B: 'the bishop', R: 'the rook', Q: 'the queen', K: 'the king' };
const PROMO: Record<string, string> = { N: 'a knight', B: 'a bishop', R: 'a rook', Q: 'a queen' };
const SAN = /^([NBRQK])?([a-h]?[1-8]?)?(x)?([a-h][1-8])(=([NBRQ]))?$/;
const RANK = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** The square the move is played FROM, read off the board — only when the
 *  move is legal there AND it is the same piece and destination the SAN names
 *  (a stale board can never put a wrong square in the student's ear). */
function fromSquare(fen: string | null, san: string, m: RegExpMatchArray): string | null {
  if (!fen) return null;
  try {
    const mv = new Chess(fen).move(san);
    if (!mv || mv.to !== m[4] || mv.piece !== (m[1] ?? 'P').toLowerCase()) return null;
    return mv.from;
  } catch { return null; }
}

/** The moving piece, keeping SAN's disambiguation: two rooks can reach one
 *  square, and "the rook taking on e3 is a fine alternative to the rook taking
 *  on e3" (R1xe3 vs R8xe3, walk 2026-09-30) said nothing. Only when SAN
 *  disambiguates — one knight that can go is just "the knight". With the board
 *  in hand it names the square it leaves: "the knight from c6". */
function pieceOf(m: RegExpMatchArray, fromSq: string | null): string {
  const hint = m[2] ?? '';
  if (m[1]) {
    const base = PIECE_THE[m[1]];
    if (hint && fromSq) return `${base} from ${fromSq}`;
    if (/^[a-h][1-8]$/.test(hint)) return `${base} from ${hint}`;
    // No board: "the c-file rook to d8", never "the rook on the c-file to d8" —
    // the prepositional form garbles once a clause follows it (Learn walk
    // 2026-10-01: "The rook on the c-file to d8 can wait").
    if (/^[a-h]$/.test(hint)) return base.replace(/^the /, `the ${hint}-file `);
    if (/^[1-8]$/.test(hint)) return base.replace(/^the /, `the ${RANK[Number(hint)]}-rank `);
    return base;
  }
  // A pawn CAPTURE names its file — "the f-pawn taking on g3". Two pawns can
  // take on one square, and "you left the book with the pawn taking on g3; the
  // usual move there was the pawn taking on g3" (fxg3 vs hxg3, walk 2026-09-27)
  // said the same thing twice.
  return m[3] && /^[a-h]$/.test(hint) ? `the ${hint}-pawn` : 'the pawn';
}

/** The move as a CLAUSE with a finite verb: "Nxd5" → "the knight takes d5".
 *  `fen` = the position it is played from (null when the caller has none). */
export function sayMoveClause(san: string, fen: string | null): string {
  const clean = san.replace(/[+#]/g, '');
  if (clean === 'O-O') return 'castle short';
  if (clean === 'O-O-O') return 'castle long';
  const m = clean.match(SAN);
  if (!m) return clean;
  const piece = pieceOf(m, m[1] && m[2] ? fromSquare(fen, san, m) : null);
  const takes = m[3] ? ' takes ' : ' to ';
  const promo = m[6] ? `, promoting to ${PROMO[m[6]]}` : '';
  return `${piece}${takes}${m[4]}${promo}`;
}

/** The move as a NOUN PHRASE: "Nxd5" → "the knight taking on d5", "O-O" →
 *  "castling short". For a subject or an object of a preposition. */
export function sayMoveNoun(san: string, fen: string | null): string {
  const clean = san.replace(/[+#]/g, '');
  if (clean === 'O-O') return 'castling short';
  if (clean === 'O-O-O') return 'castling long';
  const m = clean.match(SAN);
  if (!m) return clean;
  const piece = pieceOf(m, m[1] && m[2] ? fromSquare(fen, san, m) : null);
  const promo = m[6] ? `, promoting to ${PROMO[m[6]]}` : '';
  // "taking on d5" rather than "taking d5": the pawn/piece is taken ON a square.
  return m[3] ? `${piece} taking on ${m[4]}${promo}` : `${piece} to ${m[4]}${promo}`;
}

/** A LINE of moves from `startFen`, each said with the board it is played
 *  from (the position walks forward move by move). A move that does not apply
 *  ends the walk: the rest are said without a board (file / rank form). */
export function sayLine(startFen: string | null, sans: readonly string[], form: 'clause' | 'noun'): string[] {
  const say = form === 'clause' ? sayMoveClause : sayMoveNoun;
  let c: Chess | null = null;
  if (startFen) { try { c = new Chess(startFen); } catch { c = null; } }
  return sans.map((san) => {
    const fen = c ? c.fen() : null;
    const out = say(san, fen);
    if (c) { try { c.move(san); } catch { c = null; } }
    return out;
  });
}
