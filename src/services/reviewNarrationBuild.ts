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
import { generateReviewNarration, type ReviewMoveInput, type ReviewNarration, type SpokenLedgerSeed } from './coachFeatureService';
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
   *  this build replaces only the plies ahead, so its say-once ledgers start
   *  from what was spoken. Such a build answers ONE walk — never cached, never
   *  joined with an unseeded one. */
  spokenBefore?: SpokenLedgerSeed | null;
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
  const seeded = !!req.spokenBefore && req.spokenBefore.keys.size > 0;
  const key = `${reviewNarrationCacheKey(req)}${complete ? '' : ':partial'}`;
  const slot = `${req.gameId ?? ''}|${key}${seeded ? `|spoken:${req.spokenBefore?.throughPly}:${req.spokenBefore?.keys.size}` : ''}`;
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
      spokenBefore: seeded ? req.spokenBefore : null,
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

/** A newer build of the walk, merged into the one the student is hearing: the
 *  plies already walked keep the words they were given (and so does the intro,
 *  once spoken), every later ply takes the newer build. A move is never
 *  re-narrated under a student who has heard it. */
/** The say-once keys a walk has SPOKEN: every ply it has walked through —
 *  and the game's story as it stood there: the last checkpoint at or before
 *  that ply (none: the walk had said no plan yet). */
export function spokenLedgerSeed(narration: ReviewNarration | null, walkedThroughPly: number): SpokenLedgerSeed | null {
  if (!narration || walkedThroughPly <= 0) return null;
  const walked = narration.segments.filter((sg) => sg.ply <= walkedThroughPly).sort((a, b) => a.ply - b.ply);
  const keys = new Set(walked.flatMap((sg) => sg.ledgerKeys ?? []));
  const story = walked.reduce<string | null>((at, sg) => sg.storyCheckpoint ?? at, null);
  return { throughPly: walkedThroughPly, keys, story };
}

/** THE MERGE INSTRUMENT (the lead, 2026-10-20): at a mid-walk swap, the
 *  say-once keys the walk SPOKE that the new build's own past does not hold
 *  (`missing` — the ledgers diverged), and how many of the spoken ones the new
 *  build commits again on the plies ahead (`reSaid` — heard twice). */
export function ledgerAtMerge(prev: ReviewNarration | null, next: ReviewNarration, walkedThroughPly: number): { spoken: number; missing: number; reSaid: number; reSaidKeys: string[] } {
  const seed = spokenLedgerSeed(prev, walkedThroughPly);
  if (!seed) return { spoken: 0, missing: 0, reSaid: 0, reSaidKeys: [] };
  const nextPast = new Set(next.segments.filter((sg) => sg.ply <= walkedThroughPly).flatMap((sg) => sg.ledgerKeys ?? []));
  const reSaidKeys = next.segments.filter((sg) => sg.ply > walkedThroughPly).flatMap((sg) => (sg.ledgerKeys ?? []).filter((k) => seed.keys.has(k)));
  return { spoken: seed.keys.size, missing: [...seed.keys].filter((k) => !nextPast.has(k)).length, reSaid: reSaidKeys.length, reSaidKeys: reSaidKeys.slice(0, 8) };
}

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
  return { ...next, intro: introSpoken ? prev.intro : next.intro, segments };
}
