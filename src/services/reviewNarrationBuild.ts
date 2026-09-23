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
import { generateReviewNarration, type ReviewMoveInput, type ReviewNarration } from './coachFeatureService';
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
    ...(m.pv ? { pv: m.pv } : {}),
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
}

export interface ReviewNarrationResult {
  narration: ReviewNarration | null;
  cacheHit: boolean;
  key: string;
}

const inflight = new Map<string, Promise<ReviewNarrationResult>>();

/** The cached narration for these inputs, else a fresh build (stored when it
 *  produced segments). Concurrent asks for the same game+key share one build. */
export function getOrBuildReviewNarration(req: ReviewNarrationRequest): Promise<ReviewNarrationResult> {
  const key = reviewNarrationCacheKey(req);
  const slot = `${req.gameId ?? ''}|${key}`;
  const running = inflight.get(slot);
  if (running) return running;
  const build = (async (): Promise<ReviewNarrationResult> => {
    if (req.gameId) {
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
    });
    if (req.gameId && narration.segments.length > 0) {
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
