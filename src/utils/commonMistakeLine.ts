import { Chess } from 'chess.js';
import type { CommonMistake, PlayableMiddlegameLine, AnnotationArrow, AnnotationHighlight } from '../types';

const WRONG_ARROW = 'rgba(239, 68, 68, 0.85)'; // red — the tempting error
const CORRECT_ARROW = 'rgba(34, 197, 94, 0.85)'; // green — the move to play
const WRONG_SQUARE = 'rgba(239, 68, 68, 0.32)';

function squares(fen: string, san: string): { from: string; to: string } | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return { from: m.from, to: m.to };
  } catch {
    return null;
  }
}

/**
 * Turn a CommonMistake into a single playable Pitfall line for the WLPP
 * surface (PlayableLinePlayer). GROUNDED — never invents moves:
 *  - If the mistake carries a hand-authored `punishmentLine`, use it verbatim.
 *  - Otherwise synthesize a one-move antidote line from the existing data: the
 *    student PLAYS the real `correctMove` from the real `fen`, while the
 *    narration (the already-authored `explanation`) says why `wrongMove` is the
 *    error. The board leads the eye with a red arrow on the tempting wrong move
 *    and a green arrow on the move actually played.
 * Returns null when `correctMove` doesn't parse against `fen` (graceful skip —
 * a malformed entry self-hides rather than crashing the tab).
 */
export function commonMistakeToPlayableLine(
  mistake: CommonMistake,
): PlayableMiddlegameLine | null {
  if (mistake.punishmentLine) return mistake.punishmentLine;

  const correct = squares(mistake.fen, mistake.correctMove);
  if (!correct) return null;
  const wrong = squares(mistake.fen, mistake.wrongMove);

  const moveArrows: AnnotationArrow[] = [
    { from: correct.from, to: correct.to, color: CORRECT_ARROW },
  ];
  if (wrong) moveArrows.push({ from: wrong.from, to: wrong.to, color: WRONG_ARROW });

  const highlights: AnnotationHighlight[] = wrong
    ? [{ square: wrong.to, color: WRONG_SQUARE }]
    : [];

  return {
    fen: mistake.fen,
    moves: [mistake.correctMove],
    annotations: [mistake.explanation],
    arrows: [moveArrows],
    highlights: [highlights],
    title: `${mistake.wrongMove}? — play ${mistake.correctMove} instead`,
  };
}
