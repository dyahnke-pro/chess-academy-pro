import { db } from '../db/schema';
import type { ReviewMoveInput, ReviewNarration } from './coachFeatureService';

/**
 * Persisted review narration — re-opening a game is instant.
 *
 * `generateReviewNarration` is the review's single most expensive step after
 * the engine: every open re-ran the facet computers on every ply AND re-paid
 * the house-voice pass over every segment, for a game whose annotations had
 * not changed. Nothing about the walk is per-session; it is a pure function
 * of (annotations, settings, narration revision), so it is cached ON THE GAME
 * under exactly that key (David 2026-09-05: "I clicked on that game again and
 * it restarted the analysis all over").
 *
 * The key changes — and the cache misses — whenever an input that could
 * change a spoken word changes: a deepened annotation (eval / grade / best
 * move), the verbosity dial, the diagnostic uncapped mode, or a bump of
 * REVIEW_NARRATION_REV after a narration-engine change. A stale entry is
 * simply replaced.
 */

/** Bump whenever the narration ENGINE changes what it would say for the same
 *  inputs (a new facet, a reordered cascade, a template change). */
export const REVIEW_NARRATION_REV = 21; // 21: 2026-10-29 prod walk — an affirm names its move ("That is the move" pointed at the sentence before), the engine's answer is never said as played ("They answer Qxg4" after Rab1), a guarded piece won in the trades is never "free to take", a sound sacrifice is never a loose-piece habit and one loose-piece habit a game, a trade the grader calls an inaccuracy is never "good", the open-file story claims nothing about the result. 20: 2026-10-29 — the v5/v6 re-run's fixes (36 of David's games on the app's own path): no pin break off an illegal flipped board (one `withMover`), whose piece falls in a pin proof, a promotion is not a sacrifice, no plan speech while in check, a pawn plan keyed by its file, two plans read on one move one sentence, the opening contrast names the alternative, free captures / rescues / king squares / pressure lines rotate their words, a bare check escape says nothing. 19: 2026-10-28 — one coach: every surface reads the one reason and the naming rule with its real second read (stored on records); a costly move that wins nothing either way says the position it gave up (`positionalReason`, the reading the record files); their move credited against their own plan; "sets up" reaches five moves when proven and the strike wins; a pin says what it holds. 18: 2026-10-28 — one cost reason for both seats off a deeper read (`costReason`, `lineTrust`): a line past two moves said only when a second read agrees, past five only forcing and agreed; the deep fact looks two moves ahead. 17: 2026-10-28 — the record is never recited ("keeps recurring", "this time you held it" removed) and the count speaks only after a move that lost it. 16: narration batch 3 2026-10-21 — a description that only restates one teaching point is quiet (19…f4: the kick on e3 said once), a deep line that only plays out a spoken claim is held, "and they missed it" only when their reply let the win go (27.Rb3 …Qg6+ was winning too), and the preventive line names the punishment the verdict named. 15: narration batch 2 2026-10-21 — the opening's identity said once a game (keyed by claim, not by name), a road reason that only compares two pieces coming out held, and a pressure target named with its owner ("your pawn on g7"). 14: narration batch 2026-10-21 — a rule-out needs a loss the best move avoids, said once a game; castling prepared said once (engine reason over the job line); the opening this board is said once a game, whatever its name; the held callback one sentence, verdict first; the article by sound ("an overloaded defender"). 13: teaching P2 (David's 13.Bc3, 2026-10-20) — a mistake says the guard its piece left (the fork square), the better move's job when it prepares a kick on a pinner, and a pressure line from the student's seat. 12: batch 4 final — the board teacher's new jobs (#5), every say-once ledger riding the swap seed (#7), and a loose-piece line kept beside the move's attack. 11a: the board teacher names a guard, a rook's target on its file, a file opened toward the king and a recapture handed to a pawn (golden speedrun 2026-10-20). 11b: learn-rootcauses-2-3 — every say-once ledger and flag rides the swap seed (book standing, spoken opening, shown flags), a flagged beat says what the move left once, the seed carries the loose count / motif / refrain keys. 10: batch 4 + learn-dedupe + review-noise 2026-10-20 (one turning-point ranking, one owner per claim, the loose piece keyed by its spell; the student's own move says its job past the opening, a bare check is held). 8a: the loose-piece count, motif transfer and refrains ride the ledger seed (rf:/l:/m: keys). 8b: Najdorf Zagreb review 2026-10-20 — their attack says what it asks, bare departures and bare standings held, a sac that only holds says nothing. 7: review noise walk 2026-10-20 — formulas said once, threat voice reads the record, plain trades and placements cut, ledgerKeys on every segment (a rev-6 entry has none, so a walk could not be seeded from it). 6: review walk 2026-10-01

interface ReviewNarrationCacheEntry {
  rev: number;
  key: string;
  narration: ReviewNarration;
  savedAt: number;
}

/** djb2 — small, stable, dependency-free. Collisions are harmless here (a
 *  regenerated walk), so 32 bits is plenty. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

interface ReviewNarrationKeyInput {
  moves: readonly ReviewMoveInput[];
  playerColor: 'white' | 'black';
  openingName: string | null;
  result: string;
  playerRating: number;
  coachNarration: 'silent' | 'brief' | 'full' | undefined;
  uncapped: boolean;
}

/** The narration is a function of exactly these inputs. */
export function reviewNarrationCacheKey(input: ReviewNarrationKeyInput): string {
  const plies = input.moves.map((m) =>
    [m.san, m.classification ?? '', m.evaluation ?? '', m.preMoveEval ?? '', m.bestMove ?? '', m.pv ? m.pv.afterPlayed.join('') + '/' + m.pv.afterBest.join('') : '', m.costCp ?? ''].join(':'),
  ).join('|');
  const meta = [
    REVIEW_NARRATION_REV, input.playerColor, input.openingName ?? '', input.result,
    input.playerRating, input.coachNarration ?? 'full', input.uncapped ? 'u' : 'c',
  ].join('~');
  return `${REVIEW_NARRATION_REV}:${hash(meta)}:${hash(plies)}`;
}

function isReviewNarration(v: unknown): v is ReviewNarration {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.segments) && 'intro' in o && 'closing' in o;
}

/** Cached narration for this game under this key, or null. Fail-open. */
export async function getCachedReviewNarration(gameId: string, key: string): Promise<ReviewNarration | null> {
  try {
    const rec = await db.games.get(gameId);
    const entry = rec?.reviewNarration;
    if (!entry || entry.rev !== REVIEW_NARRATION_REV || entry.key !== key) return null;
    if (!isReviewNarration(entry.narration)) return null;
    return entry.narration;
  } catch {
    return null;
  }
}

/** Persist the narration on the game. Fail-open — a storage hiccup costs a
 *  cache miss next open, never the walk. */
export async function storeReviewNarration(gameId: string, key: string, narration: ReviewNarration): Promise<void> {
  try {
    const entry: ReviewNarrationCacheEntry = { rev: REVIEW_NARRATION_REV, key, narration, savedAt: Date.now() };
    await db.games.update(gameId, { reviewNarration: entry });
  } catch {
    // fail-open
  }
}
