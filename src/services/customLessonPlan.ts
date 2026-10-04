// customLessonPlan — the PURE plan behind the Learn-with-Coach "build me a
// lesson from my weaknesses" surface (P5 of the unified-coach build, David
// 2026-09-08: "have it put together a custom lesson" + "learn with coach should
// offer a picker and state in the opening phrase").
//
// The coach OPENS Learn with Coach by STATING a picker of the student's
// aggregated top holes; picking one builds an adaptive (~3-part) lesson where
// each part TEACHES the concept behind the hole (grounded in the book corpus)
// and DRILLS the student's OWN flubbed positions for it.
//
// This leaf is 100% pure/deterministic (no Dexie, no engine, no clock): it turns
// the persisted curriculum arc + the unified weakness profile into an ordered
// list of lesson parts plus the code-authored picker line, chips, and the spoken
// beats. G0/G3: it INVENTS nothing — the holes come from the weakness spine, the
// teachable concept from conceptForCluster (which grounds on the public-domain
// corpus), and every spoken string here is code-authored, never LLM prose.
import type { MisconceptionBucket } from '../data/misconceptionTags';
import type { CoachCurriculumRecord } from '../db/schema';
import type { UnifiedWeakness } from './weaknessSpine';
import { conceptForCluster, type WeaknessConcept } from './weaknessConceptMap';

/** One part of a custom lesson: a hole to teach + drill. */
export interface CustomLessonPart {
  /** The weakness cluster tag (identity, from the spine). */
  tag: string;
  /** Human label ("Forks", "Rook endgames"). */
  label: string;
  bucket: MisconceptionBucket;
  /** The teachable concept behind the hole (null when we have no honest map —
   *  the part still drills, it just skips the concept preamble). */
  concept: WeaknessConcept | null;
  /** puzzles.json theme ids for a fresh cement rep when the student has no
   *  stored positions for this pattern (may be empty). */
  patternThemes: readonly string[];
}

export interface CustomLessonPlan {
  parts: CustomLessonPart[];
  /** The opening phrase the coach SPEAKS — states the picker (David: "state in
   *  the opening phrase"). '' when there are no holes (caller shows the generic
   *  opener instead). */
  pickerLine: string;
  /** Tap-chips: one per hole ("Lesson on Forks") + a "Build my full lesson"
   *  chip when more than one hole. Capped at 4 (the chip row's width). */
  pickerChips: string[];
}

/** The default lesson size — the arc sequences at most this many holes. */
export const DEFAULT_LESSON_PARTS = 3;

/** The exact chip text that builds a lesson across ALL offered holes. */
export const FULL_LESSON_CHIP = 'Build my full lesson';

/** Per-hole chip text (also the string the matcher recognizes). */
export function lessonChipFor(label: string): string {
  return `Lesson on ${label}`;
}

function liveArcTags(curriculum: CoachCurriculumRecord | null): string[] {
  if (!curriculum) return [];
  return curriculum.items
    .filter((it) => it.status === 'active' || it.status === 'queued')
    .map((it) => it.tag);
}

/**
 * Build the custom-lesson plan from the persisted curriculum arc (the sequenced
 * top holes) joined to the unified weakness profile (for the bucket, label and
 * pattern themes). Falls back to the top OPEN profile weaknesses (by severity)
 * when there is no arc yet. Returns an empty plan (no parts, '' line) when the
 * student has no open holes — the caller then says nothing custom.
 * PURE: same inputs → same output.
 */
export function buildCustomLessonPlan(
  curriculum: CoachCurriculumRecord | null,
  profile: readonly UnifiedWeakness[],
  max: number = DEFAULT_LESSON_PARTS,
): CustomLessonPlan {
  const byTag = new Map(profile.map((w) => [w.tag, w] as const));
  const open = (w: UnifiedWeakness | undefined): boolean => !!w && w.openCount > 0;

  // Order: the arc's live steps first (the persistent plan); else the top open
  // holes by severity. Only keep holes that are still OPEN in the profile.
  const arcTags = liveArcTags(curriculum).filter((t) => open(byTag.get(t)));
  const orderedTags = arcTags.length > 0
    ? arcTags
    : profile
        .filter((w) => w.openCount > 0)
        .slice()
        .sort((a, b) => b.severity - a.severity)
        .map((w) => w.tag);

  const seen = new Set<string>();
  const parts: CustomLessonPart[] = [];
  for (const tag of orderedTags) {
    if (seen.has(tag)) continue;
    const w = byTag.get(tag);
    if (!w) continue;
    // ONE HOLE, ONE OFFER (walk 6, W4: "the two patterns hurting you most are
    // took a poisoned pawn and taking a poisoned pawn"). The spine carries a
    // fundamental's own row beside the coach's tag row for the same hole; both
    // name that tag as `capabilityTag`, which is the join, never the label.
    const hole = w.capabilityTag ?? tag;
    if (seen.has(hole)) continue;
    seen.add(tag);
    seen.add(hole);
    parts.push({
      tag,
      label: w.label,
      bucket: w.bucket,
      concept: conceptForCluster(tag, w.bucket),
      patternThemes: [...w.puzzleThemes],
    });
    if (parts.length >= max) break;
  }

  return { parts, pickerLine: buildPickerLine(parts), pickerChips: buildPickerChips(parts) };
}

function buildPickerLine(parts: readonly CustomLessonPart[]): string {
  const names = parts.map((p) => p.label.toLowerCase());
  if (names.length === 0) return '';
  if (names.length === 1) {
    return `I've got your game mapped, and the pattern costing you the most right now is ${names[0]}. Want me to build you a lesson on it — teach the idea, then drill your own positions? Or just tell me what you'd like to work on.`;
  }
  if (names.length === 2) {
    return `I've mapped your games. The two patterns hurting you most are ${names[0]} and ${names[1]}. Want a lesson on one of them — or the full set? Or tell me what you'd rather work on.`;
  }
  const [a, b, c] = names;
  return `I've mapped your games. Want to work on ${a}, ${b}, or ${c}? Pick one and I'll build you a lesson from your own games — teach the idea, then drill your real positions. Or just tell me what you'd like.`;
}

function buildPickerChips(parts: readonly CustomLessonPart[]): string[] {
  const perHole = parts.map((p) => lessonChipFor(p.label));
  if (parts.length <= 1) return perHole.slice(0, 4);
  // Full-lesson chip first, then as many per-hole chips as fit (cap 4).
  return [FULL_LESSON_CHIP, ...perHole].slice(0, 4);
}

/** What a matched request resolves to. */
export interface CustomLessonMatch {
  /** The hole tags the lesson should cover (all of them for the full/general
   *  ask, one for a specific hole). */
  tags: string[];
  /** Whether it came from a tapped chip or free-typed text (telemetry). */
  entry: 'chip' | 'typed';
}

const GENERAL_LESSON_RE =
  /\b(?:build|make|create|put together|give me|design|plan)\b[^.?!]*\b(?:lesson|study session|study plan|curriculum)\b/i;
const NAMED_SUBJECT_RE = /\blesson (?:on|about|for|in)\s+(?!my\b|me\b|what\b)/i;
const WEAKNESS_LESSON_RE =
  /\b(?:custom lesson|lesson (?:on|for|about) my (?:weakness|weaknesses|holes|game|mistakes)|teach me my weaknesses)\b/i;

/**
 * Recognize a request to start a custom lesson — a tapped picker chip OR free-
 * typed text. Returns the hole tags to cover, or null when the text isn't a
 * custom-lesson request. PURE (the plan is passed in). Chip matches take
 * priority (exact), then a specific "lesson on <hole>" by label, then the
 * general "build me a lesson" intent (→ all offered holes).
 */
export function matchCustomLessonRequest(
  text: string,
  plan: CustomLessonPlan | null,
): CustomLessonMatch | null {
  const raw = (text ?? '').trim();
  if (raw.length < 3) return null;
  const lc = raw.toLowerCase();
  const allTags = plan ? plan.parts.map((p) => p.tag) : [];

  if (plan && plan.parts.length > 0) {
    // Exact chip: the full-lesson chip.
    if (lc === FULL_LESSON_CHIP.toLowerCase()) return { tags: allTags, entry: 'chip' };
    // Exact chip / typed "lesson on <label>": match by the hole label.
    for (const p of plan.parts) {
      if (lc === lessonChipFor(p.label).toLowerCase()) return { tags: [p.tag], entry: 'chip' };
    }
    // Free-typed "a lesson on forks" — match a hole label as a substring of a
    // lesson-shaped ask (so a bare "forks" doesn't hijack opening resolution).
    if (/\blesson\b/i.test(lc)) {
      for (const p of plan.parts) {
        if (lc.includes(p.label.toLowerCase())) return { tags: [p.tag], entry: 'typed' };
      }
    }
  }

  // General "build me a lesson" / "custom lesson on my weaknesses" → all holes.
  // A lesson ON A NAMED SUBJECT ("give me a lesson on the Caro-Kann") is not a
  // weakness lesson — it belongs to the opening / topic routers below (walk
  // 2026-10-04: GENERAL_LESSON_RE swallowed it).
  if (WEAKNESS_LESSON_RE.test(lc) || (GENERAL_LESSON_RE.test(lc) && !NAMED_SUBJECT_RE.test(lc))) {
    return { tags: allTags, entry: 'typed' };
  }
  return null;
}

/** The opener chip that starts "Learn how to think". */
export const THINKING_LESSON_CHIP = 'Learn how to think';

// A bare, non-specific "teach me" (David 2026-10-04: "any non specific teach
// command") — the WHOLE message, so "teach me the Najdorf", "teach me tactics",
// "teach me my weaknesses" and "teach me something else" (walkthrough control)
// never match.
const THINKING_LESSON_RE =
  /^(?:(?:hey |ok |okay )?coach[,]?\s+)?(?:(?:can|could|would|will) you\s+|please\s+)?(?:teach me|show me how to think|help me (?:learn|think))(?:\s+(?:something|anything|chess|how to think(?: in chess)?|to think|how to see the board|how to read the board|to read the board))?(?:\s+please)?[\s.!?]*$/i;

/** Whether `text` asks for the coach's thinking lesson plan. PURE. */
export function matchThinkingLessonRequest(text: string): boolean {
  const t = (text ?? '').trim();
  if (t.toLowerCase() === THINKING_LESSON_CHIP.toLowerCase()) return true;
  if (/^learn how to think[.!?]*$/i.test(t)) return true;
  return THINKING_LESSON_RE.test(t);
}

/** The chip offered when a thinking lesson ends: a game where the coach
 *  quietly hands the student moments to use what they just practised. */
export const LESSON_GAME_CHIP = 'Play a game on this';

/** Whether `text` asks for the lesson game. PURE. */
export function matchLessonGameRequest(text: string): boolean {
  const t = (text ?? '').trim().replace(/[.!?]+$/, '').toLowerCase();
  return t === LESSON_GAME_CHIP.toLowerCase() || /^(?:let'?s )?play a game on (?:this|that|it)$/.test(t);
}

/** The spoken intro when a custom lesson starts. Code-authored (G0). */
export function customLessonIntro(parts: readonly CustomLessonPart[]): string {
  const n = parts.length;
  if (n === 0) return '';
  if (n === 1) {
    return `Right — a focused lesson on ${parts[0].label.toLowerCase()}, built from your own games. First the idea, then you'll drill your real positions.`;
  }
  return `Alright — a lesson in ${n} parts, all from your own games. One at a time: I teach the idea, then you drill your real positions. First up: ${parts[0].label.toLowerCase()}.`;
}

/** The spoken beat announcing a part before its teaching. Code-authored (G0). */
export function partTransition(part: CustomLessonPart, index: number, total: number): string {
  if (total <= 1) return '';
  return `Part ${index + 1} of ${total}: ${part.label.toLowerCase()}.`;
}

/** The spoken beat closing a finished custom lesson. Code-authored (G0). */
export function customLessonOutro(parts: number): string {
  const p = `${parts} pattern${parts === 1 ? '' : 's'}`;
  return `That's your custom lesson done — ${p} worked, all from your own games. I'll bring the reps back over the next few days so they test out for good.`;
}

/** Sentences per spoken line when a long passage is split. */
const SENTENCES_PER_LINE = 2;

/**
 * The teach beat as SPEAKABLE LINES (walk 2026-10-04): each piece starts with a
 * capital (defect 6: "missed hanging pieces. you leave pieces…"), ends with a
 * full stop, and a long passage is split into two-sentence lines instead of one
 * ~100-word block (defect 4). Nothing is dropped (G4.5) — only re-cut. PURE.
 */
export function lessonTeachLines(pieces: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of pieces) {
    const t = (raw ?? '').trim();
    if (!t) continue;
    const sentences = t
      .split(/(?<=[.!?])\s+(?=[A-Za-z0-9"'(])/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .map((s) => (/[.!?…]$/.test(s) ? s : `${s}.`));
    for (let i = 0; i < sentences.length; i += SENTENCES_PER_LINE) {
      out.push(sentences.slice(i, i + SENTENCES_PER_LINE).join(' '));
    }
  }
  return out;
}
