// groundedMoveWhy — the ONE why-chain shared by every surface that must say
// "why this move / why this position" (David 2026-09-10: "Always the why!! This
// is what sets my app apart" + "make sure the why chain is tied into the why
// button in the play surfaces"). One implementation so the fork lesson, the
// play-surface Why? button, and any future surface never diverge.
//
// The chain is board-truth only (G0/G3), corpus-note-first (the note is 90% of
// the coach's voice), and NEVER empty for a move — a "why?" tap always gets a
// grounded answer, never a dead control:
//   1. corpus note at the EXACT resulting position (teachingSourceForBoard,
//      restricted to origin 'position' — the farmed teaching, position-keyed,
//      board-verified)
//   2. describeMoveGeometry (chess.js geometry — fork/pin/check/capture/etc.)
//   3. a concrete move-type floor that always names a piece/square/concept
// Deliberately understated so a quiet developing move is never dressed up as
// more than it is (David 2026-07-19: "don't overstate the why").
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { describeMoveGeometry } from './groundedAnswer';
import { teachingSourceForBoard } from './danyaTeachingService';
import { sanToSpeech } from '../utils/sanToSpeech';

/** The concrete floor: name the piece/square/concept from chess.js flags.
 *  Never generic filler ("keeping to the main line"). */
function moveTypeFloor(mv: Move): string {
  if (mv.isKingsideCastle()) return 'castling kingside — the king steps into safety and the rook joins the game';
  if (mv.isQueensideCastle()) return 'castling queenside — the king tucks away and the rook comes toward the centre';
  if (mv.san.includes('#')) return 'delivering checkmate';
  if (mv.san.includes('+')) return `a check on ${mv.to}, forcing the king to react`;
  if (mv.isCapture() || mv.isEnPassant()) return `capturing on ${mv.to}`;
  if (mv.piece === 'n' || mv.piece === 'b') return `developing the ${mv.piece === 'n' ? 'knight' : 'bishop'} toward the centre`;
  if (mv.piece === 'p') {
    const central = 'cdef'.includes(mv.to[0]) && (mv.to[1] === '4' || mv.to[1] === '5');
    return central ? `claiming space in the centre with the pawn to ${mv.to}` : `advancing the pawn to ${mv.to}`;
  }
  if (mv.piece === 'r') return `bringing the rook to ${mv.to}`;
  if (mv.piece === 'q') return `bringing the queen to ${mv.to}`;
  if (mv.piece === 'k') return `stepping the king to ${mv.to}`;
  return `playing ${sanToSpeech(mv.san)}`;
}

/**
 * The grounded why for a move played FROM `fenBefore`. Never empty (David:
 * "always the why"). Corpus note at the resulting position → geometry → floor.
 * `historyBefore` is the SAN list up to (not including) this move — used for the
 * note's prefix/transposition selection.
 */
export function groundedMoveWhy(
  historyBefore: string[],
  fenBefore: string,
  san: string,
  moverColor: 'white' | 'black',
  openingName?: string | null,
): string {
  const chess = new Chess(fenBefore);
  let mv: Move | null = null;
  try { mv = chess.move(san); } catch { mv = null; }
  const fenAfter = chess.fen();
  if (mv) {
    // EXACT POSITION ONLY. This read `teachingNoteForBoard`, whose contract is
    // "exact position → prefix → opening family → structure → concept" — so the
    // comment above promised the exact resulting position while the selector
    // could hand back a note borrowed from another opening, and this function
    // returned it as the why of THIS move. Restricting the tier keeps the
    // promise; the geometry and floor below still guarantee a non-empty answer,
    // so the Why? button never becomes a dead control.
    const src = teachingSourceForBoard(
      [...historyBefore, mv.san],
      fenAfter,
      openingName,
      (_note, origin) => origin === 'position',
    );
    const noteWhy = src?.note.teaches?.trim() || src?.note.explains?.trim() || '';
    if (noteWhy) return noteWhy;
  }
  const geo = describeMoveGeometry(fenBefore, san, moverColor)?.trim();
  if (geo) return geo;
  return mv ? moveTypeFloor(mv) : `playing ${sanToSpeech(san)}`;
}

/**
 * The corpus teaching about the position in front of the student RIGHT NOW —
 * the exact-position farmed note (the 90%-of-the-voice layer). Returns null when
 * no board-verified note covers this position (silence beats a borrowed note).
 * Used to LEAD the play-surface "Why?" answer, consistent with "the note leads
 * the beat".
 */
export function positionTeachingWhy(fen: string, openingName?: string | null): string | null {
  // The doc above promises an EXACT-position note and "silence beats a borrowed
  // note". `teachingNoteForBoard` does not promise that — it falls through to
  // the opening-family, structure and concept tiers — so this function was
  // labelling borrowed teaching as the read of the board in front of the
  // student. That is the 2026-08-04 defect (teaching authored at one position
  // spoken as if it described another), and it is invisible at runtime: the
  // prose is fluent and the board never contradicts a hypothetical.
  const src = teachingSourceForBoard([], fen, openingName, (_note, origin) => origin === 'position');
  const text = src?.note.teaches?.trim() || src?.note.explains?.trim() || '';
  return text || null;
}
