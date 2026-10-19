/**
 * The move notation the voice expands, and how long a line is ONCE SPOKEN.
 *
 * A turn budget measured on the written line undercounts: "gxf6" is one
 * word on the page and "g-pawn takes f6" is three in the ear, so a turn
 * that fit 80 written words ran 86 spoken (Learn audit 2026-10-15). The
 * voice (`sanitizeForTTS`) and the budgets (the Learn door, the review
 * turn) read the SAME patterns from here, so the count cannot drift from
 * what is said.
 */

/** Piece SAN: piece + optional disambiguation + capture + destination. */
export const SAN_MOVE_RE = /\b([NBRQK])([a-h]?[1-8]?)(x?)([a-h][1-8])\b/g;
/** Pawn-capture SAN ("exd5"). */
export const PAWN_CAPTURE_RE = /\b([a-h])x([a-h][1-8])\b/g;
export const CASTLE_KING_RE = /\bO-O\b(?!-)/g;
export const CASTLE_QUEEN_RE = /\bO-O-O\b/g;
/** The check / mate mark left after a SAN is expanded ("h7+"), with the rest
 *  of its clause (to the next punctuation) — how the mark is said depends on
 *  what follows it. */
export const SAN_SUFFIX_RE = /((?:castle (?:king|queen)side)|[a-h][1-8])([+#])(?=([^.,;:!?—–\n]*))/g;

/** Words that may follow a move said with its mark as a closing beat
 *  ("Ng5+ and Nxe6"). */
const AFTER_BEAT = /^(?:and|or|but|then|followed|next)$/;
/** "Qxf7# is mate": the voice folds that to "queen takes f7 is checkmate". */
const MATE_FOLD = /^(?:is|was|would)$/;
/** The clause already says it ("Nd6+ with check", "…Qh4+ checks"). */
const SAYS_CHECK = /\b(?:check|checks|checking|checkmate|mate|mates|mated)\b/i;
/** The next word starts another MOVE, as the voice has already expanded it
 *  ("king to e7", "b-pawn takes c3", "castle kingside") or a bare square. */
const MOVE_WORD = /^(?:knight|bishop|rook|queen|king|pawn|castle|[a-h]-pawn|[a-h]-(?:knight|bishop|rook|queen)|[a-h][1-8])$/i;

/** THE ONE WAY A CHECK OR MATE MARK IS SAID.
 *  - At the end of a clause it is its own beat ("knight to g5, check.").
 *  - Before the next move of a line it is a beat too ("bishop takes f7,
 *    check, king to e7") — a move list keeps its pauses.
 *  - INSIDE a clause — the move is the subject or object of a verb that
 *    follows ("Your Ng5+ eyes e6") — a comma there splits the sentence: "your
 *    knight to g5, check eyes e6" (Smith-Morra replay 2026-10-19). There it is
 *    "with check".
 *  - A clause that already says check is not told twice ("Nd6+ with check"
 *    was "with check with check"). */
export function spokenMark(move: string, mark: string, rest: string | undefined): string {
  const word = mark === '#' ? 'checkmate' : 'check';
  const clause = (rest ?? '').trim();
  const first = clause.split(/\s+/)[0] ?? '';
  if (!first || AFTER_BEAT.test(first) || (mark === '#' && MATE_FOLD.test(first))) return `${move}, ${word}`;
  if (SAYS_CHECK.test(clause)) return move;
  if (MOVE_WORD.test(first.replace(/^…/, ''))) return `${move}, ${word},`;
  return /^[a-z]/.test(first) ? `${move} with ${word}` : `${move}, ${word}`;
}

/** Words in `text` as the voice says it. */
export function spokenWordCount(text: string): number {
  const said = text
    .replace(CASTLE_QUEEN_RE, 'castle queenside')
    .replace(CASTLE_KING_RE, 'castle kingside')
    .replace(PAWN_CAPTURE_RE, (_m, file: string, dest: string) => `${file}-pawn takes ${dest}`)
    .replace(SAN_MOVE_RE, (_m, _p: string, dis: string, x: string, dest: string) =>
      `${/^[1-8]$/.test(dis) ? 'piece from the nth rank' : 'piece'} ${x === 'x' ? 'takes' : 'to'} ${dest}`)
    .replace(SAN_SUFFIX_RE, (_m, move: string, mark: string, rest: string | undefined) => spokenMark(move, mark, rest));
  return said.split(/\s+/).filter(Boolean).length;
}
