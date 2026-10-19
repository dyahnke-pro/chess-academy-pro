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
/** The check / mate mark left after a SAN is expanded ("h7+"), with the word
 *  that follows it when there is one. */
export const SAN_SUFFIX_RE = /((?:castle (?:king|queen)side)|[a-h][1-8])([+#])(?=(\s+[A-Za-z]+)?)/g;

/** Words that may follow a move said with its mark as a closing beat
 *  ("Ng5+ and Nxe6", "Qxf7# is mate" — the voice folds the second itself). */
const AFTER_BEAT = /^\s+(?:and|or|but|then|followed|next)$/;
/** "Qxf7# is mate": the voice folds that to "queen takes f7 is checkmate". */
const MATE_FOLD = /^\s+(?:is|was|would)$/;

/** THE ONE WAY A CHECK OR MATE MARK IS SAID. At the end of a clause it is its
 *  own beat ("knight to g5, check."). INSIDE a clause — the move is the
 *  subject or object of a verb that follows ("Your Ng5+ eyes e6") — a comma
 *  there splits the sentence: "your knight to g5, check eyes e6" (Smith-Morra
 *  replay 2026-10-19). There the mark is said "with check". */
export function spokenMark(move: string, mark: string, next: string | undefined): string {
  const word = mark === '#' ? 'checkmate' : 'check';
  const midClause = !!next && /^\s+[a-z]/.test(next) && !AFTER_BEAT.test(next) && !(mark === '#' && MATE_FOLD.test(next));
  return midClause ? `${move} with ${word}` : `${move}, ${word}`;
}

/** Words in `text` as the voice says it. */
export function spokenWordCount(text: string): number {
  const said = text
    .replace(CASTLE_QUEEN_RE, 'castle queenside')
    .replace(CASTLE_KING_RE, 'castle kingside')
    .replace(PAWN_CAPTURE_RE, (_m, file: string, dest: string) => `${file}-pawn takes ${dest}`)
    .replace(SAN_MOVE_RE, (_m, _p: string, dis: string, x: string, dest: string) =>
      `${/^[1-8]$/.test(dis) ? 'piece from the nth rank' : 'piece'} ${x === 'x' ? 'takes' : 'to'} ${dest}`)
    .replace(SAN_SUFFIX_RE, (_m, move: string, mark: string, next: string | undefined) => spokenMark(move, mark, next));
  return said.split(/\s+/).filter(Boolean).length;
}
