// THE FADE — one rule for every surface, read from the student's record per
// skill. A LEAF: the record's heat tile decides the level, the level decides
// how much of a teaching line is said. Learn's door, the shared decider
// (Review, the live composer) and the loader all read this one module, so a
// skill sounds the same everywhere. The heat map's own three states:
//   red / grey (< 75%, or < 8 posed) → the whole lesson;
//   short (75–89% of the last 20)    → one short line, the point alone;
//   green (≥ 90%)                    → SILENT (David 2026-11-16: "Yes. Green
//                                      silent").
// A green skill's MISS is still explained: the decider says a silent fact's
// point on a moment that is the board's (a blunder, an only move, a live
// hang — `SPEAKS_ON_IMPORTANCE`), and Learn never fades a line about a slip
// just made (`fadeWhenGreen`). The miss counts against the green.
import type { HeatTile } from './heatMap';
import { splitThink, stripThink, THINK_MARK } from '../utils/thinkPause';
import { openSentence } from '../utils/openSentence';

export type FadeLevel = 'short' | 'silent';
/** Per skill; a plain set reads as `silent` for every member (proven tags). */
export type FadeLevels = ReadonlySet<string> | ReadonlyMap<string, FadeLevel>;

export function fadeLevelFor(tile: HeatTile | undefined): FadeLevel | null {
  if (!tile) return null;
  if (tile.state === 'green') return 'silent';
  return tile.state === 'short' ? 'short' : null;
}

/** Per skill, from the record's heat tiles (`StudentRecord.heat`, the
 *  student-need context's `heat`). Absent = full teaching. */
export function fadeLevelsFrom(heat: ReadonlyMap<string, HeatTile> | null | undefined): Map<string, FadeLevel> {
  const out = new Map<string, FadeLevel>();
  if (!heat) return out;
  for (const [tag, t] of heat) { const l = fadeLevelFor(t); if (l) out.set(tag, l); }
  return out;
}

export function fadeLevelOf(levels: FadeLevels | null | undefined, tag: string | null | undefined): FadeLevel | null {
  if (!levels || !tag || levels.size === 0) return null;
  if (levels instanceof Map) return (levels as ReadonlyMap<string, FadeLevel>).get(tag) ?? null;
  return (levels as ReadonlySet<string>).has(tag) ? 'silent' : null;
}

const SENTENCE = /(?<=[.!?])\s+(?=[A-Z"“…])/;

/** The line at a level: silent says nothing; short keeps the point — the
 *  first sentence. A QUESTION ("question ‖ answer") is never cut into a
 *  question with no answer: at short it is not asked at all, the point is
 *  said instead. The point is the
 *  CONCLUSION the line draws after its answer when it draws one ("…‖ So the
 *  plan: …", every step of it, up to its "Why …?"), else the answer's first
 *  sentence. */
export function fadeText(text: string, level: FadeLevel | null): string {
  if (!level) return text;
  if (level === 'silent') return '';
  const qa = splitThink(text);
  if (qa) {
    const marks = text.split(THINK_MARK);
    const conclusion = marks.length % 2 === 1 ? stripThink(marks[marks.length - 1]) : '';
    if (conclusion) {
      // The conclusion IS the point — every step of the plan, one a sentence
      // since the human-voice rewrite (2026-11-08) — so it is kept whole up to
      // its own "Why …?", which is the thinking a proven skill skips.
      const parts = cap(conclusion.replace(/^So\s+/, '')).split(SENTENCE);
      const why = parts.findIndex((p) => p.trim().endsWith('?'));
      return parts.slice(0, why > 0 ? why : parts.length).join(' ');
    }
    return fadeText(stripThink(qa[1]), 'short');
  }
  const sentences = text.split(SENTENCE);
  return sentences.length > 1 ? sentences[0] : text;
}

function cap(s: string): string {
  return openSentence(s);
}
