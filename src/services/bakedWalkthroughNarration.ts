// bakedWalkthroughNarration — Tier 2 of the walkthrough narration
// architecture (David 2026-07-30, locked): "If no masterclass we hand the
// llm whatever narration has been transcribed from video pulls."
//
// `scripts/danya-corpus/narrate-from-video.mjs` hands the teacher's OWN
// video transcript to the model OFFLINE, rewords it into the coach's voice,
// gates every line (7-gram overlap, attribution leak, move-number prefix,
// board-claim truth), and bakes the result into
// `src/data/walkthrough-narrations.json`. At runtime this module is a pure
// lookup: a hit replaces the generator's LLM spine narration with the baked
// script — deterministic, the same words every session, zero runtime
// generation for the covered line (G0: nothing is decided at runtime).
import bakedFile from '../data/walkthrough-narrations.json';

interface BakedIdea {
  text: string;
  shortText?: string;
}

export interface BakedNarration {
  openingName: string;
  spine: string[];
  sourceVideos: string[];
  /** The side the PRIMARY registers address as "we". Absent on old bakes
   *  (treated as matching the runtime's side). */
  studentSide?: 'white' | 'black';
  intro: string;
  shortIntro?: string;
  outro: string;
  ideas: BakedIdea[];
  /** OPPOSITE-perspective registers (same plies, other color addressed as
   *  the student) — the runtime speaks these when the board is flipped
   *  (David 2026-07-31). Baked + gated offline like the primary set. */
  introFlipped?: string;
  shortIntroFlipped?: string;
  outroFlipped?: string;
  ideasFlipped?: BakedIdea[];
}

interface BakedFileShape {
  generatedAt: string;
  narrations: Record<string, BakedNarration>;
}

const DATA = bakedFile as unknown as BakedFileShape;

// The runtime resolves an opening to ONE canonical name, and a bake is filed
// under whatever name it was baked with. Those drift apart constantly: the
// resolver hands back a deeper sub-variation ("…Taimanov Variation, Bastrikov
// Variation") than the bake key, or the app's British spelling meets the DB's
// American one. An exact-key lookup silently misses every one of those and the
// coach falls through to Tier 3 with a perfectly good bake sitting on disk.
const SPELLING_VARIANTS: Array<[RegExp, string]> = [
  [/\bdefence\b/g, 'defense'],
  [/\bcentre\b/g, 'center'],
];

const norm = (s: string): string => {
  let out = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of SPELLING_VARIANTS) out = out.replace(re, to);
  return out;
};

// Words that name no opening on their own. Agreement on "opening" alone would
// match the Polish to the Rubinstein.
const GENERIC_TOKENS = new Set([
  'opening', 'defense', 'game', 'attack', 'variation', 'system', 'gambit',
  'line', 'declined', 'accepted', 'main', 'modern', 'classical',
]);

/** How well two opening names agree, 0 when they share nothing identifying. */
function nameScore(query: string, key: string): number {
  const qTokens = new Set(norm(query).split(' ').filter((t) => t.length > 2));
  const kTokens = norm(key).split(' ').filter((t) => t.length > 2);
  if (qTokens.size === 0 || kTokens.length === 0) return 0;
  const shared = kTokens.filter((t) => qTokens.has(t));
  if (!shared.some((t) => !GENERIC_TOKENS.has(t))) return 0;
  return shared.length / Math.min(kTokens.length, qTokens.size);
}

/** Does this bake's spine cover the runtime spine ply-for-ply? */
function spineCovers(entry: BakedNarration, spineMoves: string[]): boolean {
  if (entry.spine.length < spineMoves.length) return false;
  if (entry.ideas.length !== entry.spine.length) return false;
  for (let i = 0; i < spineMoves.length; i += 1) {
    if (entry.spine[i] !== spineMoves[i]) return false;
  }
  return true;
}

/** Find the baked video narration covering `spineMoves` for the named
 *  opening. The NAME match is fuzzy; the SPINE match never is. That split is
 *  what makes fuzziness safe here — a loose name can only ever surface a
 *  candidate, and a candidate whose moves aren't the moves on the board is
 *  rejected, so this can never narrate a line the student isn't playing (the
 *  noteLineGuard bug class). Returns null on any mismatch. */
export function bakedNarrationFor(
  openingName: string,
  spineMoves: string[],
): BakedNarration | null {
  if (!openingName || spineMoves.length === 0) return null;

  const exact = DATA.narrations[norm(openingName)];
  if (exact && spineCovers(exact, spineMoves)) return exact;

  let best: BakedNarration | null = null;
  let bestScore = 0;
  for (const [key, entry] of Object.entries(DATA.narrations)) {
    const score = nameScore(openingName, key);
    if (score < 0.6 || score < bestScore) continue;
    if (!spineCovers(entry, spineMoves)) continue;
    // Same score: prefer the deeper bake, which teaches further.
    if (score === bestScore && best && entry.spine.length <= best.spine.length) continue;
    best = entry;
    bestScore = score;
  }
  return best;
}
