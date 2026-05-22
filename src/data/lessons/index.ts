import type { LessonScript } from '../../types';
import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';
import { PIRC_DEFENCE_LESSON } from './pircDefence';
import { PIRC_VARIATION_LESSONS } from './pircVariations';
import { VIENNA_GAME_LESSON } from './vienna';
import { VIENNA_VARIATION_LESSONS } from './viennaVariations';
import { CARO_KANN_LESSON } from './caroKann';
import { CARO_VARIATION_LESSONS } from './caroKannVariations';
import { resolveOpeningIdFromName } from '../../services/chessConceptService';
import repertoire from '../repertoire.json';

/**
 * Registry of story-first master-class lessons.
 *
 * - LESSONS: keyed by openingId — the main-line master class, launched
 *   from an opening's "Watch" entry.
 * - VARIATION_LESSONS: keyed by `${openingId}::${variationName}` — a
 *   subline's own master class. NOTE: the Ruy subline scripts below are
 *   authored but not yet wired into a launch path (and pending a line-by
 *   -line chess verification pass), so they are inert until then.
 *
 * When a script exists, the openings surface plays the LessonPlayer
 * instead of the move-by-move WalkthroughMode.
 */
const LESSONS: Record<string, LessonScript> = {
  [RUY_LOPEZ_LESSON.openingId]: RUY_LOPEZ_LESSON,
  [PIRC_DEFENCE_LESSON.openingId]: PIRC_DEFENCE_LESSON,
  [VIENNA_GAME_LESSON.openingId]: VIENNA_GAME_LESSON,
  [CARO_KANN_LESSON.openingId]: CARO_KANN_LESSON,
};

const VARIATION_LESSONS: Record<string, LessonScript> = {
  ...RUY_VARIATION_LESSONS,
  ...PIRC_VARIATION_LESSONS,
  ...VIENNA_VARIATION_LESSONS,
  ...CARO_VARIATION_LESSONS,
};

export function getLessonScript(openingId: string | undefined | null): LessonScript | null {
  if (!openingId) return null;
  return LESSONS[openingId] ?? null;
}

export function hasLessonScript(openingId: string | undefined | null): boolean {
  return getLessonScript(openingId) !== null;
}

export function getVariationLessonScript(
  openingId: string | undefined | null,
  variationName: string | undefined | null,
): LessonScript | null {
  if (!openingId || !variationName) return null;
  return VARIATION_LESSONS[`${openingId}::${variationName}`] ?? null;
}

// Distinctive keywords that signal a student is asking about a specific
// subline (used to pull that subline's master-class ideas into the coach's
// reference context).
const VARIATION_KEYWORDS: Record<string, string[]> = {
  'ruy-lopez::Berlin Defense': ['berlin'],
  'ruy-lopez::Open Ruy Lopez': ['open ruy', 'open spanish', 'open lopez', 'open variation', 'open defen'],
  'ruy-lopez::Marshall Attack': ['marshall attack', 'the marshall', 'marshall gambit'],
  'ruy-lopez::Exchange Variation': ['exchange variation', 'exchange ruy', 'exchange spanish'],
  'ruy-lopez::Closed Ruy Lopez (Breyer)': ['breyer'],
  'ruy-lopez::Closed Ruy Lopez (Chigorin)': ['chigorin'],
  'ruy-lopez::Closed Ruy Lopez (Zaitsev)': ['zaitsev'],
  'ruy-lopez::Anti-Marshall (8.a4)': ['anti-marshall', 'anti marshall', 'antimarshall'],
  'ruy-lopez::Arkhangelsk Variation': ['arkhangelsk', 'archangelsk', 'arkhangel'],
  'pirc-defence::Austrian Attack': ['austrian attack', 'austrian'],
  'pirc-defence::Classical System': ['classical pirc', 'pirc classical'],
  'pirc-defence::150 Attack': ['150 attack', '150-attack'],
  'vienna-game::Vienna Gambit': ['vienna gambit', 'gambit vienna', 'vienna f4', '3.f4 vienna'],
  'vienna-game::Vienna vs 2...Nc6': ['vienna nc6', 'vs nc6 vienna', 'hamppe-allgaier', 'hamppe muzio', 'pierce gambit', 'steinitz gambit'],
  'vienna-game::Frankenstein-Dracula': ['frankenstein-dracula', 'frankenstein dracula', 'nxa8 raid', 'qh5 vienna'],
  'vienna-game::Paulsen Attack': ['paulsen vienna', 'vienna g3', '3.g3 vienna', 'vienna fianchetto'],
};

/**
 * Build a compact REFERENCE block of the master-class teaching ideas for
 * any opening (and named subline) the student is asking about. Injected
 * into the coach's system prompt so its answers stay consistent with the
 * verified, book-grounded master classes — WITHOUT forcing the coach to
 * lecture. Returns '' when nothing relevant is mentioned.
 */
export function buildLessonReferenceBlock(text: string | undefined | null): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  const picked: LessonScript[] = [];
  const seen = new Set<string>();
  const add = (l: LessonScript | null | undefined): void => {
    if (l && !seen.has(l.title)) { seen.add(l.title); picked.push(l); }
  };

  // Named sublines first (more specific), then the main opening.
  for (const [key, kws] of Object.entries(VARIATION_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) add(VARIATION_LESSONS[key]);
  }
  const id = resolveOpeningIdFromName(text);
  if (id) add(LESSONS[id]);

  if (picked.length === 0) return '';

  const sections = picked.slice(0, 3).map((l) => {
    const ideas = l.beats
      .map((bt) => bt.sayShort ?? bt.say)
      .filter(Boolean)
      .map((s) => `• ${s}`)
      .join('\n');
    return `${l.title}\n${ideas}`;
  });

  return [
    '[MASTER-CLASS REFERENCE — verified teaching material]',
    "Key ideas from this app's Stockfish-verified, book-grounded opening master classes (the student may have just watched one). Use them to keep your answer accurate and consistent when the student asks about these openings. This is REFERENCE to draw on — do NOT recite it verbatim or lecture unprompted; answer naturally and go deep only when asked.",
    '',
    sections.join('\n\n'),
  ].join('\n');
}


// ─── Course-scoped coach (David 2026-05-22) ─────────────────────────────
//
// On a masterclass surface the coach must KNOW which course/variation the
// student is inside, so it stays on target instead of wandering into a
// random opening. `buildCourseScope` turns an openingId (+ optional
// variation tab) into a system-prompt addition + an opening greeting. The
// caller passes `systemAddition` as the 2nd arg of getCoachChatResponse
// (the same slot MiddlegamePractice uses for its plan context) — so this
// needs NO change to the coach API. Scoping is explicit (by tab), not
// text-matched, so "what's the plan here?" under the Caro tab still anchors
// the coach to the Caro.

interface RepertoireLite { id: string; name: string; color: 'white' | 'black'; keyIdeas?: string[]; variations?: { name: string }[] }
const REPERTOIRE = repertoire as RepertoireLite[];

export interface CourseScope {
  /** Pass as getCoachChatResponse's `systemAddition` arg. */
  systemAddition: string;
  /** Opening greeting that names the course, e.g. shown when chat opens. */
  greeting: string;
  /** Human label for the course (opening + variation). */
  label: string;
}

/** Build the coach's course-scope for a masterclass tab. Returns null when
 *  the opening isn't a known masterclass repertoire entry. */
export function buildCourseScope(
  openingId: string | undefined | null,
  variationName?: string | null,
): CourseScope | null {
  if (!openingId) return null;
  const op = REPERTOIRE.find((o) => o.id === openingId);
  if (!op) return null;

  const label = variationName ? `${op.name} — ${variationName}` : `${op.name} Main Line`;

  // Prefer the variation lesson's ideas, fall back to the main lesson, then
  // the curated repertoire keyIdeas. sayShort is the concise spoken idea.
  const lesson = (variationName && getVariationLessonScript(openingId, variationName)) || getLessonScript(openingId);
  const ideasFromLesson = lesson
    ? lesson.beats.map((b) => b.sayShort).filter((s): s is string => !!s)
    : [];
  const ideas = (ideasFromLesson.length ? ideasFromLesson : op.keyIdeas ?? []).slice(0, 6);

  const ideaBlock = ideas.length ? `\nVerified ideas for this line (draw on these, don't recite):\n${ideas.map((i) => `• ${i}`).join('\n')}` : '';

  const systemAddition = [
    '[MASTERCLASS COURSE SCOPE]',
    `The student is inside an interactive masterclass for the ${label} (they play ${op.color}). Keep every answer focused on THIS opening and variation — its plans, move-order, structures, and the ideas below. If they ask about a different opening, answer briefly then steer back to the ${label}. Answer naturally; do not lecture unprompted.`,
    ideaBlock,
  ].join('\n');

  return { systemAddition, greeting: `What would you like to know about the ${label}?`, label };
}
