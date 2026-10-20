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
// READ FROM THE WHOLE RECORD — the heat tiles (OS-1 §C1, 2026-10-19). This read
// only the capability profile, so the student's RECORDED MISSES never reached
// it: David's record held 1,428 open hung-material slips and the fade still
// said "short" for it, and 19 of 20 skills. A skill whose tile still carries
// an open miss (weight ≥ 1, the heat map's own red bar) is taught in full,
// whatever its held streak says.
import type { HeatTile } from './heatMap';
import { splitThink, stripThink } from '../utils/thinkPause';

export type FadeLevel = 'lighter' | 'short';
/** Per skill; a plain set reads as `short` for every member (proven tags). */
export type FadeLevels = ReadonlySet<string> | ReadonlyMap<string, FadeLevel>;

/** A recorded miss still open — the record says teach it, in full. */
export const OPEN_MISS_WEIGHT = 1;

export function fadeLevelFor(tile: HeatTile | undefined): FadeLevel | null {
  if (!tile) return null;
  if (tile.openWeight >= OPEN_MISS_WEIGHT) return null;
  if (tile.state === 'green') return 'short';
  return tile.state !== 'red' && tile.heldStreak >= 1 ? 'lighter' : null;
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
 *  answer: a skill they have PROVEN is not asked at all — the answer's point
 *  is said instead — and a lighter one keeps the question whole. */
export function fadeText(text: string, level: FadeLevel | null): string {
  if (!level) return text;
  const qa = splitThink(text);
  if (qa) return level === 'short' ? fadeText(stripThink(qa[1]), 'short') : text;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"“…])/);
  const keep = level === 'short' ? 1 : 2;
  return sentences.length > keep ? sentences.slice(0, keep).join(' ') : text;
}
