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
 * Turn a CommonMistake into a playable Pitfall line for the WLPP surface
 * (PlayableLinePlayer). GROUNDED — never invents moves. MODE-AWARE so the
 * student is never asked to drill the wrong move:
 *  - WATCH: if a hand-authored `punishmentLine` exists (wrong move played out
 *    + its refutation), use it verbatim — that's the richest "see why it
 *    fails". Otherwise the antidote line (below).
 *  - LEARN / PRACTICE: ALWAYS the antidote — a one-move line where the student
 *    plays the real `correctMove` from the real `fen`. Never the punishment
 *    line (its move[0] is the wrong move; drilling it is banned).
 * The antidote carries two hand-authored narration registers: `explanation`
 * (Watch / Learn-FULL) and `shortNarration` (Learn-LIMITED cue). The board
 * leads the eye with a red arrow on the tempting wrong move + a green arrow on
 * the move played. Returns null when `correctMove` doesn't parse (graceful
 * skip — a malformed entry self-hides rather than crashing the tab).
 */
export function commonMistakeToPlayableLine(
  mistake: CommonMistake,
  mode: 'watch' | 'learn' | 'practice' = 'watch',
): PlayableMiddlegameLine | null {
  if (mode === 'watch' && mistake.punishmentLine) return mistake.punishmentLine;

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
    // Watch / Learn-FULL register = the hand-authored explanation.
    annotations: [mistake.explanation],
    // Learn-LIMITED register = the hand-authored ≤8-word cue (never generated).
    // Absent → PlayableLinePlayer dictates the move (non-curated fallback tier).
    learnCues: mistake.shortNarration ? [mistake.shortNarration] : undefined,
    arrows: [moveArrows],
    highlights: [highlights],
    title: `${mistake.wrongMove}? — play ${mistake.correctMove} instead`,
  };
}
