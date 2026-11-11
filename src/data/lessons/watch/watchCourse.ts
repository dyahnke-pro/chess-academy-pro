// A WATCH COURSE — one beat a move (WO-OPENINGS-REWRITE-01, David 2026-11-11:
// "I want 1 beat per move explaining the why, the move order, this is our
// chance to teach like Naroditski"). An opening's lines (the main line and each
// tab) and ONE beat for every move on them, written by hand from the line's
// fact sheet (docs/OPENING-WATCH-BEATS.md). A beat is keyed by the moves that
// lead to it, so a move two tabs share is written once and said the same way
// on both. The builder turns the course into the `LessonScript`s every surface
// already reads (Watch's `LessonPlayer`, Learn's `lessonToPlayableLine`, the
// lesson gates) — one beat per move, the moves growing by one each beat.
import type { AnnotationHighlight, LessonBeat, LessonScript } from '../../../types';

export interface WatchBeat {
  /** Watch: the move's job, why now (the move order), what it wants next. */
  say: string;
  /** Learn: the move and its idea, at most eight words. */
  sayShort: string;
}

export interface WatchLine {
  /** null for the main line; the tab's variation name otherwise. */
  tab: string | null;
  moves: readonly string[];
}

export interface WatchCourse {
  openingId: string;
  title: string;
  orientation: 'white' | 'black';
  /** Independent-verification refs (`concept:` / `book:` / reputable URL). */
  sources: readonly string[];
  lines: readonly WatchLine[];
  /** Keyed by the line's moves up to and including the move, space-joined
   *  ("d4 Nf6 Bg5"). */
  beats: Readonly<Record<string, WatchBeat>>;
}

/** The key a beat is filed under: the moves that lead to it, the move last. */
export function beatKey(moves: readonly string[]): string {
  return moves.join(' ');
}

/** Every square a beat's words name, lit — revealed by the player as the
 *  sentence naming it is said (`LessonPlayer`, `squaresInText`). The marks
 *  are read off the words, never painted by hand, so the board always shows
 *  what is said (David 2026-11-08: "Key squares get highlights … AS THEY ARE
 *  STATED"); moves the words name are arrowed by the player itself
 *  (`mentionedMoveArrows`). */
function namedSquares(say: string): AnnotationHighlight[] {
  return [...new Set(say.match(/\b[a-h][1-8]\b/g) ?? [])].map((square) => ({ square }));
}

/** About 25 seconds a beat, said in minutes. */
const minutesFor = (beats: number): number => Math.max(1, Math.round((beats * 25) / 60));

/** One line as a lesson: a beat for every move. Throws on a move with no
 *  beat — a course ships whole or not at all (its gate fails first). */
export function watchLesson(course: WatchCourse, line: WatchLine): LessonScript {
  const beats: LessonBeat[] = line.moves.map((_, k) => {
    const moves = line.moves.slice(0, k + 1);
    const beat = course.beats[beatKey(moves)];
    if (!beat) throw new Error(`${course.openingId}${line.tab ? ` :: ${line.tab}` : ''}: no beat for ${beatKey(moves)}`);
    const highlights = namedSquares(beat.say);
    return { id: `${course.openingId}${line.tab ? `::${line.tab}` : ''}-${k + 1}`, moves: [...moves], say: beat.say, sayShort: beat.sayShort, ...(highlights.length ? { highlights } : {}) };
  });
  return {
    openingId: course.openingId,
    title: line.tab ?? course.title,
    minutes: minutesFor(beats.length),
    orientation: course.orientation,
    beats,
    kind: 'variation',
    sources: [...course.sources],
  };
}

/** The course's lessons, keyed the way the lesson maps key them: the main
 *  line by the opening id, a tab by `<openingId>::<tab>`. */
export function watchLessons(course: WatchCourse): { main: LessonScript | null; variations: Record<string, LessonScript> } {
  const main = course.lines.find((l) => l.tab === null);
  const variations: Record<string, LessonScript> = {};
  for (const l of course.lines) if (l.tab !== null) variations[`${course.openingId}::${l.tab}`] = watchLesson(course, l);
  return { main: main ? watchLesson(course, main) : null, variations };
}
