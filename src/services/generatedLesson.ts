// generatedLesson — A LESSON FOR ANY LINE, BUILT ON THE FLY (WO-ALL-OPENINGS-01
// O4, David 2026-10-28: "every subline and tabia listed out with the ability to
// generate a full WLPP lesson on the fly using database and calculated
// narrations"). The moves come from the line (the games, G3); every beat is
// computed by the pipeline Learn with Coach uses (`generateOpening` →
// `computedPlyBeat`), walked along the line's own moves (`walkthroughLesson`).
// One build per line per session, shared by Watch, Learn and Practice.
import { generateOpening } from './openingGenerator';
import { walkthroughLesson } from './walkthroughLesson';
import type { LessonScript } from '../types';
import type { SublineNarration } from './sublineLesson';

export interface GeneratedLessonArgs {
  /** The name the lesson is taught under (the reply's own, else the opening's). */
  name: string;
  eco: string;
  moves: readonly string[];
  openingId: string;
  color: 'white' | 'black';
}

const built = new Map<string, Promise<LessonScript | null>>();

/** The lesson for one line. Never rejects; null when it cannot be built (a
 *  failure is not kept, so the next open tries again). */
export function generatedLessonFor(args: GeneratedLessonArgs): Promise<LessonScript | null> {
  const key = `${args.openingId}|${args.color}|${args.name}|${args.moves.join(' ')}`;
  const hit = built.get(key);
  if (hit) return hit;
  const moves = [...args.moves];
  const job = generateOpening(args.name, { entryOverride: { canonicalName: args.name, eco: args.eco, moves } })
    .then((r) => (r.ok && r.tree ? walkthroughLesson(r.tree, args.openingId, args.name, args.color, moves) : null))
    .catch(() => null)
    .then((script) => {
      if (!script) built.delete(key);
      return script;
    });
  built.set(key, job);
  return job;
}

/** A lesson's beats laid on a line's own moves: the beat for move i speaks on
 *  move i, and only while the lesson walked the same moves. Pure. */
export function lessonBeatsOnLine(script: LessonScript, moves: readonly string[]): NonNullable<SublineNarration['beats']> {
  const beats: NonNullable<SublineNarration['beats']> = [];
  for (const b of script.beats) {
    const at = b.moves.length - 1;
    if (at < 0 || at >= moves.length || !b.say.trim()) continue;
    if (!b.moves.every((m, k) => m === moves[k])) continue;
    beats.push({
      atMove: at,
      say: b.say,
      ...(b.sayShort ? { sayShort: b.sayShort } : {}),
      ...(b.arrows?.length ? { arrows: b.arrows } : {}),
      ...(b.highlights?.length ? { highlights: b.highlights } : {}),
    });
  }
  return beats;
}

/** Test seam. */
export function __resetGeneratedLessons(): void {
  built.clear();
}
