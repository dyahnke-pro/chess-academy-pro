// WHERE THE GAME LEAVES THE LINE THE STUDENT ASKED FOR — one computer, read by
// Play's plan tracker and Learn's opening lane (David 2026-11-21: say once
// when the game leaves the asked variation, and where). It was a private loop
// inside `CoachGamePage`; Learn had no copy, so a student who asked to play
// the Najdorf and drifted into another line heard nothing.
//
// Pure: the asked line's SANs against the moves played. chess.js is not
// needed — both lists are SAN from the same start position.

import { stripSanAnnotations } from '../data/openingWalkthroughs/validate';

export interface AskedLineDeparture {
  /** The ply index (0-based) where the game first left the line. */
  ply: number;
  /** The move played there. */
  played: string;
  /** The line's move there. */
  book: string;
  /** Full-move number of the departure. */
  moveNumber: number;
  /** Who left the line. */
  seat: 'student' | 'opponent';
}

const bare = (san: string): string => stripSanAnnotations(san).replace(/[+#]+$/, '');

/**
 * The first move that left the asked line, when it was played at or after
 * `sinceIndex` (so a caller hears it on the wave it happened, once). Null
 * while the game is still on the line, once it has run past the line's end,
 * or when the departure happened before `sinceIndex`.
 */
export function askedLineDeparture(
  played: readonly string[],
  line: readonly string[],
  studentColor: 'w' | 'b',
  sinceIndex: number,
): AskedLineDeparture | null {
  for (let i = 0; i < played.length && i < line.length; i += 1) {
    if (bare(played[i]) === bare(line[i])) continue;
    if (i < sinceIndex) return null;
    const mover: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b';
    return { ply: i, played: played[i], book: line[i], moveNumber: Math.floor(i / 2) + 1, seat: mover === studentColor ? 'student' : 'opponent' };
  }
  return null;
}
