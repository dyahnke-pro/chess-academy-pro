// generatedLesson — A LESSON FOR ANY LINE, BUILT ON THE FLY (WO-ALL-OPENINGS-01
// O4, David 2026-10-28: "every subline and tabia listed out with the ability to
// generate a full WLPP lesson on the fly using database and calculated
// narrations"). The moves come from the line (the games, G3); every beat is
// computed by the pipeline Learn with Coach uses (`generateOpening` →
// `computedPlyBeat`), walked along the line's own moves (`walkthroughLesson`).
// One build per line per session, shared by Watch, Learn and Practice.
import { generateOpening } from './openingGenerator';
import { walkthroughLesson } from './walkthroughLesson';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { AnnotationArrow, AnnotationHighlight, LessonScript, PlayableMiddlegameLine } from '../types';
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

/** A line that starts `offset` moves into the game (a plan line from the
 *  tabia) with the generated beats laid on its moves: each beat's words on its
 *  move, its cue under the board in Learn, its arrows beside the move's own
 *  (never twice on one square pair — react-chessboard keys arrows by it), and
 *  an arrow from a pawn shown as a highlight on its target, the lead-the-eye
 *  standard. Pure. */
export function overlayBeats(
  line: PlayableMiddlegameLine,
  beats: NonNullable<SublineNarration['beats']>,
  offset: number,
): PlayableMiddlegameLine {
  const at = new Map(beats.filter((b) => b.atMove >= offset).map((b) => [b.atMove - offset, b]));
  if (at.size === 0) return line;
  const annotations = [...line.annotations];
  const learnCues = line.moves.map((_, i) => line.learnCues?.[i] ?? '');
  const arrows: AnnotationArrow[][] = line.moves.map((_, i) => [...(line.arrows[i] ?? [])]);
  const highlights: AnnotationHighlight[][] = line.moves.map((_, i) => [...(line.highlights?.[i] ?? [])]);
  const c = new Chess(line.fen);
  for (let i = 0; i < line.moves.length; i += 1) {
    try { c.move(line.moves[i]); } catch { break; }
    const b = at.get(i);
    if (!b) continue;
    annotations[i] = b.say;
    if (b.sayShort) learnCues[i] = b.sayShort;
    const pairs = new Set(arrows[i].map((a) => `${a.from}-${a.to}`));
    const squares = new Set(highlights[i].map((h) => h.square));
    for (const a of b.arrows ?? []) {
      if (c.get(a.from as Square)?.type === 'p') {
        if (!squares.has(a.to)) { squares.add(a.to); highlights[i].push({ square: a.to, color: 'rgba(255,214,0,0.88)' }); }
        continue;
      }
      const id = `${a.from}-${a.to}`;
      if (pairs.has(id)) continue;
      pairs.add(id);
      arrows[i].push(a);
    }
    for (const h of b.highlights ?? []) {
      if (squares.has(h.square)) continue;
      squares.add(h.square);
      highlights[i].push(h);
    }
  }
  return { ...line, annotations, arrows, highlights, ...(learnCues.some(Boolean) ? { learnCues } : {}) };
}

/** Test seam. */
export function __resetGeneratedLessons(): void {
  built.clear();
}
