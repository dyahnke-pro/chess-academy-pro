import { Chess } from 'chess.js';
import type { PlayableMiddlegameLine } from '../types';
import type { MiddlegameBookLesson } from './middlegameBookLessons';

/**
 * Adapt a digitized book lesson into the existing WLPP `PlayableMiddlegameLine`
 * shape so it plays through the canonical `PlayableLinePlayer` (Watch / Learn /
 * Practice) — no new lesson runtime. The book's 4 beats map on:
 *   principle → `intro` (static-position prelude),
 *   technique → `moves` + `annotations` + `learnCues`,
 *   rule      → surfaced by the page chrome (not part of the line).
 *
 * `arrows[i][0]` must be the move played (origin→destination), per the
 * PlayableMiddlegameLine contract — we derive it from chess.js so it always
 * matches the real board move; the authored vision arrows follow.
 */
export function bookLessonToPlayableLine(lesson: MiddlegameBookLesson): PlayableMiddlegameLine {
  const game = new Chess(lesson.fen);
  const moves: string[] = [];
  const annotations: string[] = [];
  const learnCues: string[] = [];
  const arrows: PlayableMiddlegameLine['arrows'] = [];
  const highlights: NonNullable<PlayableMiddlegameLine['highlights']> = [];

  for (const beat of lesson.technique) {
    const applied = game.move(beat.san);
    if (!applied) {
      // Should never happen — the gate test validates every line. Fail loud in
      // dev so a bad lesson can't silently render a broken board.
      throw new Error(`bookLessonToPlayableLine: illegal move ${beat.san} in ${lesson.id}`);
    }
    moves.push(applied.san);
    annotations.push(beat.say);
    learnCues.push(beat.sayShort);
    const moveArrow = { from: applied.from, to: applied.to, color: 'green' };
    const visionArrows = (beat.arrows ?? [])
      .filter((a) => !(a.from === applied.from && a.to === applied.to))
      .map((a) => ({ from: a.from, to: a.to, color: a.color }));
    arrows.push([moveArrow, ...visionArrows]);
    highlights.push((beat.highlights ?? []).map((h) => ({ square: h.square, color: h.color })));
  }

  return {
    fen: lesson.fen,
    moves,
    annotations,
    learnCues,
    arrows,
    highlights,
    intro: {
      say: lesson.principle.say,
      sayShort: lesson.principle.sayShort,
    },
    sources: [...lesson.sources],
    title: lesson.title,
  };
}
