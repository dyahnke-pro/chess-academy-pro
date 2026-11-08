/**
 * THE MARKS A SPOKEN LINE'S WORDS CALL FOR (David 2026-11-08: "Key squares get
 * highlights, moves get arrowed"). Every square the words name that is not a
 * move — lit; every move they name — arrowed, through the arrow door on the
 * board shown (the board before it for a move that was there). One reader for
 * a surface whose words come with no marks of their own: a lesson's single
 * idea, an answer in the puzzle question box. No cap: whatever the words name
 * is marked (G4.5). The words are computed (G0); this decides only what the
 * board shows for them, never a chess fact.
 */
import type { BoardArrow } from '../types';
import { admitArrows } from './arrowDoor';
import { squaresNamedNotMoves } from './arrowEngine';
import { namedMoveArrows } from './learnBoardTeaching';

export function marksOfWords(
  text: string,
  fen: string,
  studentColor: 'white' | 'black',
  prevFen?: string | null,
): { highlights: string[]; arrows: BoardArrow[] } {
  if (!text.trim()) return { highlights: [], arrows: [] };
  const boards = prevFen ? [fen, prevFen] : [fen];
  const viewer: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  return {
    highlights: squaresNamedNotMoves(text, boards),
    arrows: admitArrows(namedMoveArrows(text, fen, viewer, prevFen ?? null), { fen, studentColor }).arrows,
  };
}
