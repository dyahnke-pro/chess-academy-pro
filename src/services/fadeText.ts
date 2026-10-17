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
import { capabilityProven, type CapabilityProfile, type CapabilityProfileEntry } from './capabilityEvidence';

export type FadeLevel = 'lighter' | 'short';
/** Per skill; a plain set reads as `short` for every member (proven tags). */
export type FadeLevels = ReadonlySet<string> | ReadonlyMap<string, FadeLevel>;

export function fadeLevelFor(entry: CapabilityProfileEntry | undefined): FadeLevel | null {
  if (!entry) return null;
  if (capabilityProven(entry)) return 'short';
  return entry.heldStreak >= 1 ? 'lighter' : null;
}

export function fadeLevelsFrom(caps: CapabilityProfile | null | undefined): Map<string, FadeLevel> {
  const out = new Map<string, FadeLevel>();
  if (!caps) return out;
  for (const [tag, e] of caps) { const l = fadeLevelFor(e); if (l) out.set(tag, l); }
  return out;
}

export function fadeLevelOf(levels: FadeLevels | null | undefined, tag: string | null | undefined): FadeLevel | null {
  if (!levels || !tag || levels.size === 0) return null;
  if (levels instanceof Map) return (levels as ReadonlyMap<string, FadeLevel>).get(tag) ?? null;
  return (levels as ReadonlySet<string>).has(tag) ? 'short' : null;
}

/** The line at a level: short keeps the first sentence, lighter the first two. */
export function fadeText(text: string, level: FadeLevel | null): string {
  if (!level) return text;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"“…])/);
  const keep = level === 'short' ? 1 : 2;
  return sentences.length > keep ? sentences.slice(0, keep).join(' ') : text;
}
