// seatPieces — give each bare "<piece> on <square>" in a detector sentence its
// owner, read from the board (hand walk 2026-09-24: the coach said "Bishop on h5
// pins knight on e2 against queen on d1." — nobody's pieces). A leaf: chess.js
// only, so every lane that speaks a detector description can use it.
import { Chess, type Color, type Square } from 'chess.js';

/** ONE SEATER (2026-09-25). `seatBare` and `groundedAnswer.seatPieceReferences`
 *  were two copies that drifted — chat kept speaking "Bishop on g4 pins knight
 *  on f3" after Learn's copy learned to seat it. `seatBare` is now this. */
export function seatBare(text: string, fen: string, student: Color): string {
  const out = seatPieceReferences(text, fen, student);
  return out.charAt(0).toUpperCase() + out.slice(1);
}


const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function seatPieceReferences(
  text: string,
  fen: string,
  studentColorWB: 'w' | 'b',
): string {
  try {
    // A COLOUR AS THE SUBJECT ("White has mate in one…", chat, 2026-09-25) —
    // the student is "you", the opponent "they".
    const me = studentColorWB === 'w' ? 'White' : 'Black';
    text = text.replace(/(^|[.!?—:]\s*)(white|black) (has|is)\b/gi, (_m, pre: string, side: string, verb: string) => {
      const mine = side.toLowerCase() === me.toLowerCase();
      const subj = mine ? 'you' : 'they';
      const v = verb.toLowerCase() === 'has' ? 'have' : 'are';
      // Keep the case the sentence had: a capital stays a capital, a
      // mid-sentence lowercase ("Watch out — white has…") stays lowercase.
      const word = side[0] === side[0].toUpperCase() ? subj[0].toUpperCase() + subj.slice(1) : subj;
      return `${pre}${word} ${v}`;
    });
    const board = new Chess(fen);
    const WANT: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };
    // Structural adjectives the composed facets place BETWEEN a possessive and
    // the piece noun ("your PASSED pawn", "their WEAK pawn"). Captured as part of
    // the lead so a possessive already present isn't re-stamped into a
    // double-possessive — "your passed YOUR pawn on c2" (preview line-read,
    // 2026-07-22).
    const ADJ = 'passed|weak|isolated|doubled|backward|extra|lone|bad|connected|protected|central|advanced|remaining|outside';
    return text.replace(
      new RegExp(
        `(\\b(?:[Ww]hite|[Bb]lack)'s\\s+|\\b[Yy]our opponent's\\s+|\\b[Yy]our\\s+|\\b[Tt]heir\\s+|\\b[Tt]he\\s+|\\b[Tt]h(?:at|is|ose|ese)\\s+|\\b[Aa]n?\\s+)?((?:${ADJ})\\s+)?\\b(Knight|Bishop|Rook|Queen|Pawn|King|knight|bishop|rook|queen|pawn|king)\\s+on\\s+([a-h][1-8])\\b`,
        'g',
      ),
      (whole, lead: string | undefined, adj: string | undefined, piece: string, sq: string, offset: number, all: string) => {
        const leadLower = (lead ?? '').toLowerCase().trim();
        // Already seated — leave the author's possessive (and any adjective it
        // introduced) alone.
        if (leadLower.startsWith('your') || leadLower.startsWith('their')) return whole;
        // An INDEFINITE article ("creates a passed pawn on c2") is already
        // grammatical — stamping a possessive after it produced "a your passed
        // pawn on c2" (prod line-read, 2026-07-23). Leave indefinite phrases be.
        if (leadLower === 'a' || leadLower === 'an') return whole;
        // A DEMONSTRATIVE is a determiner, so a possessive cannot follow it —
        // it REPLACES it. Until 2026-09-16 `that|this` was missing from the lead
        // alternation entirely, so the regex matched the bare noun, captured no
        // lead, and stamped the possessive in front of the noun instead of the
        // determiner: "make that your knight on d4 the boss" (prod line-read of
        // David's Alapin, plies 34 and 44). Replacing keeps BOTH the grammar and
        // the seat, which dropping the possessive would have lost.
        // A COLOUR possessive is a determiner too — "White's king on h1" came
        // out as "White's their king on h1" on a 2026-09-24 prod review. The
        // seat REPLACES it, the same way it replaces a demonstrative.
        if (/^(white|black)'s$/.test(leadLower)) {
          const cellC = board.get(sq as Square);
          if (!cellC || cellC.type !== WANT[piece.toLowerCase()]) return whole;
          const ownerC = cellC.color === studentColorWB ? 'your' : 'their';
          const sentenceStart = /(^|[.!?]\s+)$/.test(all.slice(0, offset));
          const word = sentenceStart ? ownerC[0].toUpperCase() + ownerC.slice(1) : ownerC;
          return `${word} ${adj ?? ''}${piece} on ${sq}`;
        }
        if (/^th(at|is|ose|ese)$/.test(leadLower)) {
          const cellD = board.get(sq as Square);
          if (!cellD || cellD.type !== WANT[piece.toLowerCase()]) return whole;
          const ownerD = cellD.color === studentColorWB ? 'your' : 'their';
          return `${ownerD} ${adj ?? ''}${piece} on ${sq}`;
        }
        const cell = board.get(sq as Square);
        if (!cell || cell.type !== WANT[piece.toLowerCase()]) return whole;
        const owner = cell.color === studentColorWB ? 'your' : 'their';
        const firstChar = (lead && lead.length > 0 ? lead : (adj && adj.length > 0 ? adj : piece)).charAt(0);
        const sentenceStart = firstChar === firstChar.toUpperCase();
        const ownerWord = sentenceStart ? cap(owner) : owner;
        // Preserve a bare adjective (rare "the passed pawn" form) after the owner.
        return `${ownerWord} ${adj ? adj.toLowerCase() : ''}${piece.toLowerCase()} on ${sq}`;
      },
    );
  } catch {
    return text;
  }
}
