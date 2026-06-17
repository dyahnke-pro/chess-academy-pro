import { Chess } from 'chess.js';
import type {
  AnnotationArrow,
  AnnotationHighlight,
  OpeningVariation,
  PlayableMiddlegameLine,
} from '../types';
import type { CourseSubline } from './openingCourse';
import { sublineWhyFact } from './courseWhyFacts';

/**
 * HAND-AUTHORED narration for a subline (David 2026-06-17: "these are hand
 * authored"). Never generated, never templated at runtime — written by hand,
 * grounded in the real line + facts, exactly like the variation lessons. When
 * present it drives the Watch; when absent the converter falls back to the
 * honest baseline (a factual frequency frame + a silent, arrow-led walk).
 */
export interface SublineNarration {
  /** Spoken on the static position before the walk. */
  intro: { say: string; sayShort?: string };
  /** Sparse per-move beats: atMove = index into subline.moves. */
  beats?: Array<{ atMove: number; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[] }>;
  sources?: string[];
}

// Converters that make a frequency-derived CourseSubline PLAYABLE — the Level-3
// "Watch + Play" design (David 2026-06-17). A subline is the opponent's
// deviation within a variation, walked to a middlegame; it ships as a move list
// only (G3 — every move from the masters DB, nothing invented). These helpers
// wrap it so the existing players can drive it:
//   • sublineToPlayableLine → PlayableLinePlayer mode="watch" (see the reply)
//   • sublineToCustomLine    → OpeningPlayMode customLine    (play it out, locked)
// No chess content is invented here (G0/G3): arrows are the literal from→to of
// each DB move (chess.js-derived); the spoken prose is built ONLY from facts
// computed in code — the FREQUENCY why-fact (courseWhyFacts) and the terminus
// STRUCTURAL read (sublineStructure: IQP / bishop pair / open files / passed
// pawns, all chess.js-derived). The intro frames the deviation + what the
// student is playing FOR; the walk stays silent (voice rule §3 — don't restate
// moves) until a grounded structural payoff on the final move. The LLM writes
// none of it.

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
  narration?: SublineNarration | null,
  sources?: string[],
): PlayableMiddlegameLine | null {
  const chess = new Chess();
  const arrows: AnnotationArrow[][] = [];
  const highlights: AnnotationHighlight[][] = [];
  const annotations: string[] = [];
  // Sparse hand-authored beats, keyed by move index.
  const authored = new Map((narration?.beats ?? []).map((bt) => [bt.atMove, bt]));
  for (let i = 0; i < subline.moves.length; i++) {
    const san = subline.moves[i];
    let mv;
    try {
      mv = chess.move(san);
    } catch {
      return null;
    }
    if (!mv) return null;
    const beat = authored.get(i);
    const moveArrow: AnnotationArrow = { from: mv.from, to: mv.to, color: MOVE_ARROW };
    // Authored beats lead the eye with their own arrows/highlights (the move
    // arrow first); un-authored moves get the move arrow only and stay silent.
    arrows.push(beat?.arrows?.length ? [moveArrow, ...beat.arrows] : [moveArrow]);
    highlights.push(
      beat?.highlights?.length
        ? beat.highlights
        : i === subline.atPly
          ? [{ square: mv.to, color: TRIGGER }]
          : [],
    );
    annotations.push(beat?.say ?? '');
  }

  const trigger = subline.triggerMove;
  const introHi: AnnotationHighlight[] = [];
  const introSquare = destSquare(startBefore(subline), trigger);
  if (introSquare) introHi.push({ square: introSquare, color: TRIGGER });

  // Intro: hand-authored when present; otherwise the honest factual frame
  // (deviation + frequency fact — a data caption, never invented teaching prose).
  let introSay: string;
  let introShort: string;
  if (narration?.intro) {
    introSay = narration.intro.say;
    introShort = narration.intro.sayShort ?? `${trigger} — your reply`;
  } else {
    const why = sublineWhyFact(subline);
    introSay = why.text
      ? `${trigger} — ${shortName(subline.name)}. ${why.text}`
      : `${trigger} — ${shortName(subline.name)}.`;
    introShort = `${trigger} — your reply`;
  }

  return {
    fen: new Chess().fen(),
    moves: subline.moves,
    annotations,
    arrows,
    highlights,
    intro: { say: introSay, sayShort: introShort, arrows: [], highlights: introHi },
    sources: narration?.sources?.length ? narration.sources : sources && sources.length ? sources : ['concept:pos-development'],
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
