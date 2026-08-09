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
import { Chess } from 'chess.js';
import bakedFile from '../data/walkthrough-narrations.json';

interface BakedIdea {
  text: string;
  shortText?: string;
}

/** A baked COMPARATIVE BRIDGE (David 2026-07-31: "narration that explains
 *  similarities and differences between what was already learned vs what is
 *  new") — spoken at the fork when a returning student picks this sideline,
 *  replacing the computed v1 template with richer per-opening prose baked
 *  from the video corpus and gated offline. Keyed by the sideline's first
 *  SAN; `mainSan` sanity-locks it to the fork shape it was baked against. */
export interface BakedBridge {
  /** children[0]'s SAN at bake time — a runtime fork whose main choice
   *  differs (DB reshuffle) falls back to the computed bridge. */
  mainSan: string;
  text: string;
  shortText?: string;
  textFlipped?: string;
  shortTextFlipped?: string;
}

/** Baked narration for ONE fork branch (teaser + one idea per extension
 *  ply) — Tier 2 covering the whole tree, not just the spine (David
 *  2026-07-31: "Tier 2 openings fully in effect?" — the Alapin proved a
 *  3-ply spine bake leaves the student hearing LLM/template prose for
 *  the branch lines, which is most of the lesson). */
export interface BakedBranchNarration {
  label?: string;
  teaser: string;
  shortTeaser?: string;
  ideas: BakedIdea[];
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
  /** Comparative bridges for the spine-terminus fork, keyed by sideline SAN. */
  bridges?: Record<string, BakedBridge>;
  /** Baked narration per fork branch, keyed by the branch's first SAN. */
  branchNarrations?: Record<string, BakedBranchNarration>;
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

/** Is this bake built for EXACTLY the line the runtime is about to walk?
 *
 *  Length equality is the load-bearing part. Every bake is generated against
 *  `print-spine` output, so a bake for THIS opening always matches the runtime
 *  spine exactly — while a merely PREFIX-matching bake belongs to a different
 *  opening that happens to share the opening moves. The 2026-07-31 sweep
 *  caught "Closed Sicilian" (e4 c5 Nc3, heading for g3) being served the GRAND
 *  PRIX bake (e4 c5 Nc3 f4 …): the first three moves are identical, the fuzzy
 *  name score cleared 0.6 on "sicilian", and the student would have been
 *  taught the f4 storm on a line that never plays f4. Prefix ≠ same opening. */
function spineCovers(entry: BakedNarration, spineMoves: string[]): boolean {
  if (entry.spine.length !== spineMoves.length) return false;
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

/** The baked idea for the move just played, when the game is following a
 *  baked line. */
export interface BakedPlyTeaching {
  openingName: string;
  /** Authored prose for THIS ply. */
  text: string;
  /** The ≤8-word cue, when the bake carries one. */
  shortText?: string;
  /** 1-based ply this teaches — the move the student just saw. */
  ply: number;
  /** Plies of baked teaching still ahead on this line. */
  remaining: number;
}

/**
 * Teaching for the ply just played, from the bake, while a LIVE GAME is still
 * on a baked line.
 *
 * `bakedNarrationFor` answers "is this whole line baked" — the right question
 * for a lesson, which walks the spine start to finish, and the wrong one for a
 * game, which is three moves in and going. So 220 plies of authored, reviewed,
 * gated opening teaching across 23 openings were reachable only by asking to be
 * taught, and a student PLAYING one of those openings heard whatever the farmed
 * corpus happened to have — measured at roughly two plies in eight, most of it
 * general rather than about the move on the board (David 2026-08-09: "the
 * entire opening needs teaching").
 *
 * SAFE BY THE SAME RULE AS ITS SIBLING. The name match is fuzzy; the MOVES are
 * not. The history must be an exact prefix of the bake's spine, so the text
 * returned was authored for the position the student is looking at — which is
 * why this needs no board grading downstream and cannot narrate a line that is
 * not being played.
 *
 * THE MOVES PICK THE TEACHING; THE NAME ONLY BREAKS TIES. Requiring the name
 * made the whole thing unreachable in a game, and the audit caught it: four
 * plies of the Latvian went by with nothing taught, because at `e4 e5 Nf3` the
 * position has no name yet and by the time it earns one the line has usually
 * moved on. A name that arrives two moves late cannot be the key to teaching
 * that had to be spoken two moves ago. So candidates come from the board, and
 * the name is consulted only when several baked openings share this prefix —
 * where refusing to guess is the honest answer, since the game genuinely is
 * not yet one opening rather than another.
 */
export function bakedTeachingForPly(
  openingName: string | null | undefined,
  historySans: string[],
): BakedPlyTeaching | null {
  if (historySans.length === 0) return null;

  /** Is `history` an exact prefix of this bake's spine, with an idea here? */
  const prefixIdea = (entry: BakedNarration): BakedPlyTeaching | null => {
    if (entry.ideas.length !== entry.spine.length) return null;
    if (historySans.length > entry.spine.length) return null;
    for (let i = 0; i < historySans.length; i += 1) {
      if (entry.spine[i] !== historySans[i]) return null;
    }
    const idea = entry.ideas[historySans.length - 1];
    if (!idea?.text?.trim()) return null;
    return {
      openingName: entry.openingName,
      text: idea.text.trim(),
      ...(idea.shortText?.trim() ? { shortText: idea.shortText.trim() } : {}),
      ply: historySans.length,
      remaining: entry.spine.length - historySans.length,
    };
  };

  // Every bake these moves could be on. The board asks the question.
  const candidates: Array<{ key: string; hit: BakedPlyTeaching }> = [];
  for (const [key, entry] of Object.entries(DATA.narrations)) {
    const hit = prefixIdea(entry);
    if (hit) candidates.push({ key, hit });
  }
  if (candidates.length === 0) return null;

  if (openingName) {
    const exact = candidates.find((c) => c.key === norm(openingName));
    if (exact) return exact.hit;
    let best: BakedPlyTeaching | null = null;
    let bestScore = 0;
    for (const { key, hit } of candidates) {
      const score = nameScore(openingName, key);
      if (score < 0.6 || score < bestScore) continue;
      // Same name score: prefer the bake that keeps teaching furthest.
      if (score === bestScore && best && hit.remaining <= best.remaining) continue;
      best = hit;
      bestScore = score;
    }
    if (best) return best;
  }

  // No name, or a name that agrees with none of them. One candidate means the
  // moves have already decided; several means the game has not yet committed
  // to an opening, and saying which one it is would be the invention.
  return candidates.length === 1 ? candidates[0].hit : null;
}

/** Placement + side to move — the part of a FEN that says what the position
 *  IS. Clocks and move numbers differ between two routes to the same board,
 *  and a transposition is still the same position to teach. */
const positionKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/**
 * The baked line's next move from this position, when the student asked for an
 * opening we have authored teaching for and the game is still on it.
 *
 * The coach already had a book continuation, and the book and the bake are two
 * different continuations of the same opening: asked for the Latvian, the book
 * answered Nxe5 where the authored spine runs Bc4. The game left the taught
 * line at move three, so 10 of its 14 plies of reviewed prose could not be
 * reached in the very game the student asked to be shown (David 2026-08-09:
 * "the entire opening needs teaching").
 *
 * Position-keyed rather than history-keyed, so a transposition into the line
 * still picks it up. Returns null the moment the board is somewhere the bake
 * never goes, which is what keeps this from steering a game off its own course.
 */
export function bakedSpineNextMove(
  openingName: string | null | undefined,
  fen: string,
): string | null {
  if (!openingName) return null;
  const want = positionKey(fen);

  const walk = (entry: BakedNarration): string | null => {
    try {
      const board = new Chess();
      for (const san of entry.spine) {
        if (positionKey(board.fen()) === want) return san;
        if (!board.move(san)) return null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const exact = DATA.narrations[norm(openingName)];
  if (exact) return walk(exact);

  let best: string | null = null;
  let bestScore = 0;
  for (const [key, entry] of Object.entries(DATA.narrations)) {
    const score = nameScore(openingName, key);
    if (score < 0.6 || score < bestScore) continue;
    const san = walk(entry);
    if (!san) continue;
    best = san;
    bestScore = score;
  }
  return best;
}
