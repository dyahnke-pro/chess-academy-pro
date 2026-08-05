// trapPlayPosition — turn a watched trap into a game you play.
//
// Named to stay clear of `punishPlayout.ts`, which is a DIFFERENT job (it walks
// the refutation on until the advantage is visible on the board). One letter's
// case apart would collide on a case-insensitive filesystem — David's Mac.
//
// David 2026-08-05, on asking Learn for the Bishop's Opening traps: "i was
// expecting a walk through of the trap lines, like how we teach the openings,
// then maybe a chance to play them out against the coach." The walkthrough half
// existed; the play half did not — the punish leaf's only exits were "Back to
// lessons" and "End for now", so you could watch a trap and never play it.
//
// The position to hand the student is the one right AFTER the opponent's
// mistake: they find and play the punishment themselves, then keep playing
// against the engine. Starting them before the mistake would make them play the
// opponent's blunder, and starting them after the punishment would hand over the
// very move the lesson is about.
//
// Every move is replayed through chess.js from the lesson's own data (G3) — no
// FEN is constructed by hand, and a lesson that will not replay returns null
// rather than a guessed position.
import { Chess } from 'chess.js';
import { stripSanAnnotations } from '../data/openingWalkthroughs/validate';
import type { PunishLesson } from '../types/walkthroughTree';

export interface TrapPlayPosition {
  /** Position with the STUDENT to move, the opponent's mistake already on the
   *  board. The punishment is the move they are looking for. */
  fen: string;
  /** Which side the student plays from here — derived from the FEN, never
   *  assumed from the opening's colour, because a puzzle-derived lesson can sit
   *  on either side of the board. */
  studentColor: 'white' | 'black';
}

/**
 * The position a trap lesson should be played out from, or null when the
 * lesson's own moves do not replay.
 *
 * Mirrors `buildPunishWalkthroughTree`'s two setups: a `setupFen` (puzzle-
 * derived — the SANs are legal only from there) or a `setupMoves` SAN path from
 * the standard start.
 */
export function trapPlayPosition(
  lesson: PunishLesson | null | undefined,
): TrapPlayPosition | null {
  if (!lesson?.inaccuracy) return null;
  try {
    const chess = lesson.setupFen ? new Chess(lesson.setupFen) : new Chess();
    if (!lesson.setupFen) {
      for (const san of lesson.setupMoves ?? []) {
        if (!chess.move(stripSanAnnotations(san))) return null;
      }
    }
    // The opponent's mistake — after this it is the student's move.
    if (!chess.move(stripSanAnnotations(lesson.inaccuracy))) return null;
    const fen = chess.fen();
    return {
      fen,
      studentColor: fen.split(' ')[1] === 'b' ? 'black' : 'white',
    };
  } catch {
    return null;
  }
}
