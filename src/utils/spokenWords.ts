/**
 * The move notation the voice expands, and how a check or mate mark is said.
 * `sanitizeForTTS` (voiceService) reads these patterns from here.
 *
 * A word counter used to live here for a turn budget; nothing ever called it
 * and turn length is an AVERAGE the audits measure, never a limit in code
 * (G4.5, the WHY STANDARD), so it was deleted (G8.5).
 */

/** Piece SAN: piece + optional disambiguation + capture + destination. */
export const SAN_MOVE_RE = /\b([NBRQK])([a-h]?[1-8]?)(x?)([a-h][1-8])\b/g;
/** Pawn-capture SAN ("exd5"). */
export const PAWN_CAPTURE_RE = /\b([a-h])x([a-h][1-8])\b/g;
/** A promotion's piece after its square ("h8=N", after "gxh8" was said as
 *  "g-pawn takes h8"). */
export const PROMOTION_RE = /\b([a-h][18])=([QRBN])/g;
export const CASTLE_KING_RE = /\bO-O\b(?!-)/g;
export const CASTLE_QUEEN_RE = /\bO-O-O\b/g;
/** The check / mate mark left after a SAN is expanded ("h7+"), with the rest
 *  of its clause (to the next punctuation) — how the mark is said depends on
 *  what follows it. */
export const SAN_SUFFIX_RE = /((?:castle (?:king|queen)side)|[a-h][1-8](?:, making a (?:queen|rook|bishop|knight))?)([+#])(?=([^.,;:!?—–\n]*))/g;

/** Words that may follow a move said with its mark as a closing beat
 *  ("Ng5+ and Nxe6"). */
const AFTER_BEAT = /^(?:and|or|but|then|followed|next)$/;
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
  if (!first || AFTER_BEAT.test(first)) return `${move}, ${word}`;
  if (SAYS_CHECK.test(clause)) return move;
  if (MOVE_WORD.test(first.replace(/^…/, ''))) return `${move}, ${word},`;
  return /^[a-z]/.test(first) ? `${move} with ${word}` : `${move}, ${word}`;
}
