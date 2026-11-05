// reviewNarrationBuild — ONE door for a game's review narration: the cache,
// else a build, stored for the next open.
//
// WHY (measured 2026-09-23 on a real 53-ply amateur game). The review page
// built its narration inline, so it could only be built while the page was
// mounted — and only from whatever annotations the page happened to hold.
// Two costs followed:
//   • the background deepen changed the annotations after the narration was
//     built, so the NEXT open missed the cache and paid the full prep again
//     (reopen went from 5s to 62s the moment the deepen stopped remounting);
//   • a freshly imported game could never be ready before the student tapped it.
// With the build here, the page, the deepen and the import all ask the SAME
// function from the SAME inputs, so their cache keys agree by construction and
// a build already running is joined rather than started twice.
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { resolvePlayerColor } from './playerIdentity';
import { adaptGameRecordExplained } from './reviewGameAdapter';
import { resolveCoachNarration } from '../utils/coachNarration';
import { TRUSTED_LINE_DEPTH, REVIEW_READ_DEPTH } from './engineConstants';
import { generateReviewNarration, type ReviewMoveInput, type ReviewNarration } from './coachFeatureService';
import { storyOf, storyThrough, spliceStory, type StorySeed } from './gameStory';
import { getCachedReviewNarration, storeReviewNarration, reviewNarrationCacheKey } from './reviewNarrationCache';
import { logAppAudit } from './appAuditor';
import type { CoachGameMove } from '../types';

/** UNCAPPED is the review's standing mode (David 2026-09-16); `?uncapped=0`
 *  still forces the old one-beat cascade for a manual comparison. */
export function isReviewUncapped(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    if (new URLSearchParams(window.location.search).get('uncapped') === '0') return false;
    if ((window as unknown as { __REVIEW_UNCAPPED__?: boolean }).__REVIEW_UNCAPPED__ === false) return false;
    return true;
  } catch { return true; }
}

/** The review's per-ply input, from the adapted moves. The one mapping — the
 *  page and every pre-build read it, so the cache key cannot drift. */
export function reviewMoveInputsFrom(moves: readonly CoachGameMove[]): ReviewMoveInput[] {
  return moves.map((m, i) => ({
    ply: i + 1,
    san: m.san,
    isCoachMove: m.isCoachMove,
    classification: m.classification ?? null,
    evaluation: m.evaluation,
    preMoveEval: m.preMoveEval,
    bestMove: m.bestMove,
    fenAfter: m.fen,
    // A line from the quick sweep is not one a claim may rest on: the review
    // narrates before its deep dive lands, and the deepen rebuilds with the
    // deep lines (clean-pass walk 2026-10-04). Older records carry no depth.
    ...(m.pv && (m.pv.depth ?? TRUSTED_LINE_DEPTH) >= TRUSTED_LINE_DEPTH ? { pv: m.pv } : {}),
    ...(typeof m.costCp === 'number' ? { costCp: m.costCp } : {}),
    ...(m.heardVerdict ? { heardVerdict: m.heardVerdict } : {}),
    ...(typeof m.bestMoveEval === 'number' ? { bestMoveEval: m.bestMoveEval } : {}),
    // The candidates' reads ride at the same trust bar as the lines.
    ...(m.weighed && m.weighed.depth >= TRUSTED_LINE_DEPTH ? { weighed: m.weighed } : {}),
  }));
}

export interface ReviewNarrationRequest {
  gameId: string | null;
  moves: ReviewMoveInput[];
  playerColor: 'white' | 'black';
  openingName: string | null;
  result: string;
  playerRating: number;
  coachNarration: 'silent' | 'brief' | 'full';
  uncapped: boolean;
  /** False while `moves` is only the part of the game the review has read so
   *  far (the read-ahead). A partial narration is never stored: the next open
   *  must not hear a part of the game as the whole. */
  complete?: boolean;
  /** What a walk in progress has already said (review noise walk 2026-10-20):
   *  this build replaces only the plies ahead, so its story starts from what
   *  was spoken (`storySeed`). Such a build answers ONE walk — never cached,
   *  never joined with an unseeded one. */
  spokenBefore?: StorySeed | null;
}

interface ReviewNarrationResult {
  narration: ReviewNarration | null;
  cacheHit: boolean;
  key: string;
}

const inflight = new Map<string, Promise<ReviewNarrationResult>>();

/** The cached narration for these inputs, else a fresh build (stored when it
 *  produced segments). Concurrent asks for the same game+key share one build. */
export function getOrBuildReviewNarration(req: ReviewNarrationRequest): Promise<ReviewNarrationResult> {
  const complete = req.complete !== false;
  const seed = req.spokenBefore ?? null;
  const seeded = !!seed;
  const key = `${reviewNarrationCacheKey(req)}${complete ? '' : ':partial'}`;
  const slot = `${req.gameId ?? ''}|${key}${seed ? `|spoken:${seed.throughPly}:${seed.checkpoint.length}` : ''}`;
  const running = inflight.get(slot);
  if (running) return running;
  const build = (async (): Promise<ReviewNarrationResult> => {
    if (req.gameId && complete && !seeded) {
      const hit = await getCachedReviewNarration(req.gameId, key);
      if (hit) return { narration: hit, cacheHit: true, key };
    }
    const narration = await generateReviewNarration({
      moves: req.moves,
      playerColor: req.playerColor,
      openingName: req.openingName,
      result: req.result,
      playerRating: req.playerRating,
      coachNarration: req.coachNarration,
      uncapped: req.uncapped,
      gameId: req.gameId,
      complete,
      spokenBefore: seed,
    });
    if (req.gameId && complete && !seeded && narration.segments.length > 0) {
      await storeReviewNarration(req.gameId, key, narration);
    }
    return { narration, cacheHit: false, key };
  })();
  inflight.set(slot, build);
  void build.finally(() => { inflight.delete(slot); }).catch(() => undefined);
  return build;
}

/** Build and store a game's review narration without the page, from the same
 *  inputs the page will use. Never throws — this is background work. */
export async function prebuildReviewNarration(gameId: string, reason: string): Promise<boolean> {
  try {
    const game = await db.games.get(gameId);
    if (!game || !Array.isArray(game.annotations) || game.annotations.length === 0) return false;
    // Only a game graded from review-depth reads is narrated ahead of time —
    // a build from the sweep's draft grades is a walk nobody may hear.
    if ((game.analysisDepth ?? 0) < REVIEW_READ_DEPTH) return false;
    const profile = useAppStore.getState().activeProfile ?? (await db.profiles.toCollection().first()) ?? null;
    const playerColor = resolvePlayerColor(game, {
      profileName: profile?.name,
      chessComUsername: profile?.preferences.chessComUsername,
      lichessUsername: profile?.preferences.lichessUsername,
    }) ?? 'white';
    const adapted = adaptGameRecordExplained(game, playerColor).adapted;
    if (!adapted) return false;
    const started = Date.now();
    const res = await getOrBuildReviewNarration({
      gameId,
      moves: reviewMoveInputsFrom(adapted.moves),
      playerColor: adapted.playerColor,
      // The page passes no opening key, so its `?? openingNameForKey(...)`
      // fallback resolves to null — the same value here.
      openingName: adapted.openingName,
      result: adapted.result,
      playerRating: adapted.playerRating,
      coachNarration: resolveCoachNarration(profile?.preferences),
      uncapped: isReviewUncapped(),
    });
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'reviewNarrationBuild.prebuild',
      summary: `review narration pre-built (${reason}) for ${gameId}: ${res.cacheHit ? 'already cached' : `built in ${((Date.now() - started) / 1000).toFixed(1)}s`}, ${res.narration?.segments.length ?? 0} segments`,
    });
    return (res.narration?.segments.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/** WHAT A WALK HAS SPOKEN (WO-STORY-MATRIX-01 P1-8d): the narration's story
 *  taken back to the ply walked through — every claim, flag, plan and event
 *  said by then, and nothing after (`storyThrough`, the same cut a takeback
 *  makes). Null when the walk had said nothing yet. */
export function storySeed(narration: ReviewNarration | null, walkedThroughPly: number): StorySeed | null {
  if (!narration || walkedThroughPly <= 0) return null;
  const checkpoint = storyThrough(narration.story, walkedThroughPly);
  return checkpoint ? { throughPly: walkedThroughPly, checkpoint } : null;
}

/** THE SEED OF A LINE EXPLORED OFF THE WALK (P1-8d): the walk's story at the
 *  ply the line LEAVES the game — never at the walk's current ply. The free
 *  board's line shares the game's first moves and then branches; past the
 *  branch the walk spoke about moves this line never played. Cut at the
 *  walk's ply, a line explored off ply 11 with the walk at 25 counted the
 *  ply-25 slip ("That's the second time this game") and held every claim,
 *  plan step and event of plies 12–25 as said (the P1-8c review). So the seed
 *  is the walk's story through the earlier of the two: what the student heard
 *  of the moves the line shares with the game. Null when nothing was said by
 *  then (or the line leaves the game on its first move). */
export function exploreSeed(
  narration: ReviewNarration | null,
  walkedThroughPly: number,
  line: readonly string[],
  game: ReadonlyArray<{ readonly san: string }>,
): StorySeed | null {
  let onGame = 0;
  while (onGame < line.length && onGame < game.length && game[onGame].san === line[onGame]) onGame += 1;
  return storySeed(narration, Math.min(walkedThroughPly, onGame));
}

/** THE MERGE INSTRUMENT (the lead, 2026-10-20): at a mid-walk swap, what the
 *  walk SPOKE through the swap (claims and sentences), how many of those the
 *  new build's story does not hold by then (`missing` — the stories diverged),
 *  and how many it says only after the swap (`reSaid` — heard twice). */
export function storyAtMerge(prev: ReviewNarration | null, next: ReviewNarration, walkedThroughPly: number): { spoken: number; missing: number; reSaid: number; reSaidKeys: string[] } {
  const said = (narration: ReviewNarration | null): Map<string, number> => {
    const st = storyOf(narration?.story ?? null);
    return new Map([...[...st.said].map(([k, at]) => [`c|${k}`, at] as const), ...[...st.sentences].map(([k, at]) => [`s|${k}`, at] as const)]);
  };
  const walked = [...said(prev)].filter(([, at]) => at <= walkedThroughPly).map(([k]) => k);
  if (walked.length === 0) return { spoken: 0, missing: 0, reSaid: 0, reSaidKeys: [] };
  const ahead = said(next);
  const reSaidKeys = walked.filter((k) => (ahead.get(k) ?? 0) > walkedThroughPly);
  return { spoken: walked.length, missing: walked.filter((k) => !((ahead.get(k) ?? Number.POSITIVE_INFINITY) <= walkedThroughPly)).length, reSaid: reSaidKeys.length, reSaidKeys: reSaidKeys.slice(0, 8) };
}

/** A newer build of the walk, merged into the one the student is hearing: the
 *  plies already walked keep the words they were given (and so does the intro,
 *  once spoken), every later ply takes the newer build — and so does the
 *  story: what the walk said through the frozen ply, then what the newer build
 *  says after it (`spliceStory`). A move is never re-narrated under a student
 *  who has heard it. */
export function mergeReviewNarration(
  prev: ReviewNarration | null,
  next: ReviewNarration,
  frozenThroughPly: number,
  introSpoken: boolean,
): ReviewNarration {
  if (!prev) return next;
  const kept = prev.segments.filter((sg) => sg.ply <= frozenThroughPly);
  const keptPlies = new Set(kept.map((sg) => sg.ply));
  const segments = [...kept, ...next.segments.filter((sg) => !keptPlies.has(sg.ply))].sort((a, b) => a.ply - b.ply);
  return { ...next, intro: introSpoken ? prev.intro : next.intro, segments, story: spliceStory(prev.story, next.story, frozenThroughPly) };
}
