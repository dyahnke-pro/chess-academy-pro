// THE FADE — one rule for every surface (David 2026-10-17: "Agreed" — shorten
// per skill, never silence a whole proven layer). A LEAF: the record's
// capability entry decides the level, the level decides how much of a teaching
// line is said. Learn's door, the shared decider (Review, the live composer)
// and the loader all read this one module, so a skill sounds the same
// everywhere.
//   full    — grey or red: the whole lesson;
//   lighter — answered right since the last miss, not yet proven: the point
//             and its reason;
//   short   — proven: the point alone.
// A slip resets the streak, so the record itself returns a skill to full.
//
// READ FROM THE HOLD RATE (David 2026-10-19, "Agreed"): the heat tile's state
// is the hold rate over the last 20 times the board posed the skill, both
// halves of the record counted once. The fade maps it 1:1 —
//   green (≥ 90%)  → short;  short (75–89%) → lighter;  red / grey → full.
// So an open pile of misses (David's 1,428 hung-material slips) keeps a skill
// in full through its rate, not through a second rule beside it.
import type { HeatTile } from './heatMap';
import { splitThink, stripThink, THINK_MARK } from '../utils/thinkPause';

export type FadeLevel = 'lighter' | 'short';
/** Per skill; a plain set reads as `short` for every member (proven tags). */
export type FadeLevels = ReadonlySet<string> | ReadonlyMap<string, FadeLevel>;

export function fadeLevelFor(tile: HeatTile | undefined): FadeLevel | null {
  if (!tile) return null;
  if (tile.state === 'green') return 'short';
  return tile.state === 'short' ? 'lighter' : null;
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
  return (levels as ReadonlySet<string>).has(tag) ? 'short' : null;
}

/** The line at a level: short keeps the first sentence, lighter the first two.
 *  A QUESTION ("question ‖ answer") is never cut into a question with no
 *  answer: a skill they have PROVEN is not asked at all — the point is said
 *  instead — and a lighter one keeps the question whole. The point is the
 *  CONCLUSION the line draws after its answer when it draws one ("…‖ So the
 *  plan: …"), else the answer's first sentence. */
export function fadeText(text: string, level: FadeLevel | null): string {
  if (!level) return text;
  const qa = splitThink(text);
  if (qa) {
    if (level !== 'short') return text;
    const marks = text.split(THINK_MARK);
    const conclusion = marks.length % 2 === 1 ? stripThink(marks[marks.length - 1]) : '';
    if (conclusion) return fadeText(cap(conclusion.replace(/^So\s+/, '')), 'short');
    return fadeText(stripThink(qa[1]), 'short');
  }
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"“…])/);
  const keep = level === 'short' ? 1 : 2;
  return sentences.length > keep ? sentences.slice(0, keep).join(' ') : text;
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
