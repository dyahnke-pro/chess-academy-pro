import type { LessonScript } from '../../types';
import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';
import { resolveOpeningIdFromName } from '../../services/chessConceptService';

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
};

const VARIATION_LESSONS: Record<string, LessonScript> = {
  ...RUY_VARIATION_LESSONS,
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

