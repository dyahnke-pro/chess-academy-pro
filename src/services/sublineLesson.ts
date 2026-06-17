import { Chess } from 'chess.js';
import type {
  AnnotationArrow,
  AnnotationHighlight,
  OpeningVariation,
  PlayableMiddlegameLine,
} from '../types';
import type { CourseSubline } from './openingCourse';
import { sublineWhyFact } from './courseWhyFacts';

// Converters that make a frequency-derived CourseSubline PLAYABLE — the Level-3
// "Watch + Play" design (David 2026-06-17). A subline is the opponent's
// deviation within a variation, walked to a middlegame; it ships as a move list
// only (G3 — every move from the masters DB, nothing invented). These helpers
// wrap it so the existing players can drive it:
//   • sublineToPlayableLine → PlayableLinePlayer mode="watch" (see the reply)
//   • sublineToCustomLine    → OpeningPlayMode customLine    (play it out, locked)
// No chess content is invented here: arrows are the literal from→to of each
// DB move (chess.js-derived), and the only prose is the grounded FREQUENCY
// why-fact (courseWhyFacts) — never an eval/line claim. Deep per-move "why"
// narration is layered on top in Step 3 by hand; this is the honest baseline so
// every subline is immediately watchable and playable.

const MOVE_ARROW = 'rgba(40,185,95,0.92)'; // green — the move played
const TRIGGER = 'rgba(255,214,0,0.88)'; // yellow — the deviation square

/** The square a SAN move lands on, for highlighting the deviation. */
function destSquare(beforeFen: string, san: string): string | null {
  try {
    const c = new Chess(beforeFen);
    const m = c.move(san);
    return m ? m.to : null;
  } catch {
    return null;
  }
}

/**
 * Build a Watch-able line from a subline: the full move sequence with a
 * per-move move-arrow and an intro that frames the deviation (its name + the
 * grounded frequency fact). Per-move annotations stay SILENT by default
 * (voice rule §4 — silence beats filler); Step 3 hand-authors the keystone
 * "why this is met like so" lines on top. Returns null if any move is illegal
 * (defensive — the generator already validates).
 */
export function sublineToPlayableLine(
  subline: CourseSubline,
  sources?: string[],
): PlayableMiddlegameLine | null {
  const chess = new Chess();
  const arrows: AnnotationArrow[][] = [];
  const highlights: AnnotationHighlight[][] = [];
  const annotations: string[] = [];
  for (let i = 0; i < subline.moves.length; i++) {
    const san = subline.moves[i];
    let mv;
    try {
      mv = chess.move(san);
    } catch {
      return null;
    }
    if (!mv) return null;
    arrows.push([{ from: mv.from, to: mv.to, color: MOVE_ARROW }]);
    // Highlight only the deviation square (the trigger ply); everything else
    // is led by its move-arrow alone so the eye isn't cluttered.
    highlights.push(i === subline.atPly ? [{ square: mv.to, color: TRIGGER }] : []);
    annotations.push('');
  }

  const why = sublineWhyFact(subline);
  const trigger = subline.triggerMove;
  const introSquare = destSquare(startBefore(subline), trigger);
  const introArrows: AnnotationArrow[] = [];
  const introHi: AnnotationHighlight[] = [];
  if (introSquare) {
    introHi.push({ square: introSquare, color: TRIGGER });
  }
  const frame = why.text
    ? `${trigger} — ${shortName(subline.name)}. ${why.text}`
    : `${trigger} — ${shortName(subline.name)}. Here's how you meet it.`;

  return {
    fen: new Chess().fen(),
    moves: subline.moves,
    annotations,
    arrows,
    highlights,
    intro: {
      say: frame,
      sayShort: `${trigger} — your reply`,
      arrows: introArrows,
      highlights: introHi,
    },
    sources: sources && sources.length ? sources : ['concept:pos-development'],
    title: shortName(subline.name),
  };
}

/** The position right BEFORE the trigger move is played (for the intro hint). */
function startBefore(subline: CourseSubline): string {
  const c = new Chess();
  for (let i = 0; i < subline.atPly && i < subline.moves.length; i++) {
    try {
      c.move(subline.moves[i]);
    } catch {
      break;
    }
  }
  return c.fen();
}

/** The specific tail of an ECO name, or the whole name if there's no colon. */
function shortName(name: string): string {
  return name.includes(':') ? name.split(':').slice(1).join(':').trim() || name : name;
}

/**
 * Wrap a subline as an OpeningPlayMode customLine so the student can PLAY it
 * out — the coach follows the subline's exact moves through the opening phase,
 * then adaptive Stockfish in the middlegame (the same lock used for variations,
 * gems, and traps). pgn is the bare SAN list (OpeningPlayMode parses it move by
 * move).
 */
export function sublineToCustomLine(subline: CourseSubline): OpeningVariation {
  return {
    name: shortName(subline.name),
    pgn: subline.moves.join(' '),
    explanation: `${subline.triggerMove} — ${shortName(subline.name)}.`,
  };
}
