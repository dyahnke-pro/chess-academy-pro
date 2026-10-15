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
/** The check / mate mark left after a SAN is expanded ("h7+"). */
export const SAN_SUFFIX_RE = /((?:castle (?:king|queen)side)|[a-h][1-8])([+#])/g;

/** Words in `text` as the voice says it. */
export function spokenWordCount(text: string): number {
  const said = text
    .replace(CASTLE_QUEEN_RE, 'castle queenside')
    .replace(CASTLE_KING_RE, 'castle kingside')
    .replace(PAWN_CAPTURE_RE, (_m, file: string, dest: string) => `${file}-pawn takes ${dest}`)
    .replace(SAN_MOVE_RE, (_m, _p: string, dis: string, x: string, dest: string) =>
      `${/^[1-8]$/.test(dis) ? 'piece from the nth rank' : 'piece'} ${x === 'x' ? 'takes' : 'to'} ${dest}`)
    .replace(SAN_SUFFIX_RE, (_m, move: string, mark: string) => `${move}${mark === '#' ? ', checkmate' : ', check'}`);
  return said.split(/\s+/).filter(Boolean).length;
}
