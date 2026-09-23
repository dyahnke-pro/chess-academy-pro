/**
 * CoachReviewSessionPage — review a previously played game with the
 * teaching coach.
 *
 * The actual review surface IS the existing `CoachGameReview` — same
 * layout, same big nav buttons, same eval bar, same MoveListPanel,
 * same auto-review controls, same accuracy/material bars. We just
 * adapt a `GameRecord` (chess.com / lichess / coach game) into the
 * `CoachGameMove[] + KeyMoment[]` shape `CoachGameReview` already
 * understands.
 *
 * The "new teaching style" merger is handled at the envelope level —
 * `REVIEW_MODE_ADDITION` in `src/coach/envelope.ts` fires whenever
 * `surface === 'review'`, so both the new picker entry point AND the
 * post-game review path (after a finished coach game) get the same
 * Stockfish-grounded, [VOICE: ...]-marker pedagogy automatically.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { isFixtureGame } from '../../services/fixtureGames';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { CoachGameReview } from './CoachGameReview';
import { db } from '../../db/schema';
import { gameNeedsAnalysis, analyzeSingleGame } from '../../services/gameAnalysisService';
import { ensureSampleGameSeeded } from '../../services/reviewSampleGames';
import { useAppStore } from '../../stores/appStore';
import { resolvePlayerColor } from '../../services/playerIdentity';
import { logAppAudit } from '../../services/appAuditor';
import { adaptGameRecordExplained } from '../../services/reviewGameAdapter';
import { prebuildReviewNarration } from '../../services/reviewNarrationBuild';
import type { GameRecord } from '../../types';

// Re-exported for callers and tests that import the adapter from the page.
export { adaptGameRecordExplained, adaptGameRecord, describeGameForStudent } from '../../services/reviewGameAdapter';
export type { AdaptOutcome } from '../../services/reviewGameAdapter';

export function CoachReviewSessionPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  // Where to send the user when they tap Back. Callers (Weaknesses
  // tabs, Games drilldown, Coach Review list) pass `state.from` so
  // back routes to the page the user actually came from rather than
  // a hard-coded `/coach/review`. The optional `tab` rides along
  // for surfaces like GameInsightsPage that need to restore which
  // sub-tab was active. Falls back to the review list when no
  // state is present (e.g. deep-link / direct URL load).
  const navState = (location.state ?? null) as
    | { from?: string; tab?: string }
    | null;
  const backTarget = navState?.from ?? '/coach/review';
  const backState = navState?.tab ? { tab: navState.tab } : undefined;
  const { gameId } = useParams<{ gameId: string }>();
  // Deep-link support: `/coach/review/:gameId?move=N` jumps the
  // review to ply N on first paint. Used by Insights tab rows
  // (costliest-mistake / worst-miss / best-sequence) so tapping a
  // specific move lands the user at that exact ply instead of the
  // start of the game. `move` is a 1-indexed ply number — we
  // normalize to the 0-indexed `initialMoveIndex` contract that
  // CoachGameReview already accepts.
  const [searchParams] = useSearchParams();
  const moveParam = searchParams.get('move');
  const parsedMove = moveParam !== null ? Number(moveParam) : NaN;
  const initialMoveIndex = Number.isFinite(parsedMove) && parsedMove >= 1
    ? Math.floor(parsedMove) - 1
    : -1;
  const { activeProfile } = useAppStore();
  const [game, setGame] = useState<GameRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<string | null>(null);
  /** A background deepen is running (the review is already on screen). */
  const [deepening, setDeepening] = useState(false);
  const walkStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (!gameId) {
        setLoadError('No game id in URL.');
        return;
      }
      try {
        let rec = await db.games.get(gameId);
        // Deep link to a sample game (e.g. the Opera Game "Walk it" chip from
        // the fundamentals lane) can arrive before the review LIST seeded the
        // samples — seed the one we need on demand, then re-read.
        if (!rec && isFixtureGame({ id: gameId })) {
          await ensureSampleGameSeeded(gameId);
          if (cancelled) return;
          rec = await db.games.get(gameId);
        }
        if (cancelled) return;
        if (!rec) {
          setLoadError('That game is no longer in your library.');
          return;
        }
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachReviewSessionPage.load',
          summary: `loaded game id=${rec.id} source=${rec.source} moves=${rec.annotations?.length ?? 0}`,
          details: JSON.stringify({ gameId, source: rec.source, fullyAnalyzed: rec.fullyAnalyzed }),
        });
        // 🔒 NEVER BLOCK ON ANALYSIS THE GAME ALREADY HAS (David 2026-09-05:
        // "very long initial analysis … use the pre analysis from after
        // import"). The sweep, a coach game, or a lichess import already wrote
        // a usable eval curve; the only thing the review adds on open is the
        // key-moment deep dive. So: annotations present → render NOW and
        // deepen in the BACKGROUND (a small pill says so). The result lands
        // only if the walk has not started — once the student is walking,
        // the review is frozen and the deeper pass waits for the next open
        // (never rewrite the walk under them). The blocking spinner survives
        // ONLY for a game with no usable annotations at all.
        const usable = Array.isArray(rec.annotations) && rec.annotations.length > 0
          && rec.annotations[0].bestMoveEval !== undefined;
        /** Key-moment deep dive BEHIND the open review: the pill says so, and
         *  the result lands only if the walk has not started. Shared by the
         *  swept-game open and the cold open (after its sweep). */
        const deepenBehind = (started: GameRecord): void => {
          setDeepening(true);
          void analyzeSingleGame(started.id).then(async () => {
            if (cancelled) return;
            const refreshed = await db.games.get(started.id);
            if (cancelled || !refreshed) return;
            // 🔒 THE DEEPEN NEVER RESETS AN OPEN REVIEW (2026-09-23). It used to
            // remount the review whenever it landed before the walk STARTED —
            // which is exactly while the student is watching "Preparing…". The
            // remount threw the in-flight narration away and ran the whole prep
            // again: measured on a real 53-ply game, first open reached Start at
            // 126s with the prep run twice (four times under dev StrictMode).
            // The deeper annotations are already written to the game, so the
            // next open narrates from them — the same rule the after-start case
            // always had.
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'CoachReviewSessionPage.deepen',
              summary: `deepen landed ${walkStartedRef.current ? 'after walk start' : 'before walk start'} — held for next open (game ${started.id})`,
              details: JSON.stringify({ gameId: started.id, analysisDepth: refreshed.analysisDepth }),
            });
            // …and BUILD that next open now, off-screen, so it is a cache hit
            // rather than a full prep (measured: 62s without this, 5s with).
            void prebuildReviewNarration(started.id, 'deepen');
          }).catch((err: unknown) => {
            if (cancelled) return;
            void logAppAudit({
              kind: 'stockfish-error',
              category: 'subsystem',
              source: 'CoachReviewSessionPage.deepen',
              summary: `background deepen failed: ${err instanceof Error ? err.message : String(err)}`,
              details: JSON.stringify({ gameId: started.id }),
            });
          }).finally(() => {
            if (!cancelled) setDeepening(false);
          });
        };
        if (usable && gameNeedsAnalysis(rec)) {
          setGame(rec);
          deepenBehind(rec);
        } else if (gameNeedsAnalysis(rec)) {
          // COLD open (no usable curve at all): the spinner covers the SWEEP
          // only — every ply at the sweep depth, which is what the walk needs
          // to render — then the key-moment deep dive runs behind the open
          // review exactly like a swept game's (David 2026-09-06: the dive
          // grew to 24 plies × 8s; that is never the student's wait).
          setAnalyzing(true);
          try {
            await analyzeSingleGame(rec.id, (phase) => {
              if (!cancelled) setAnalyzeProgress(phase);
            }, { sweepOnly: true });
            if (cancelled) return;
            const refreshed = await db.games.get(rec.id);
            if (cancelled) return;
            setGame(refreshed ?? rec);
            if (refreshed && gameNeedsAnalysis(refreshed)) deepenBehind(refreshed);
          } catch (err) {
            if (cancelled) return;
            void logAppAudit({
              // analyzeSingleGame is Stockfish-driven, not Lichess —
              // mis-categorised as lichess-error on this branch. Fixed
              // per audit item #28.
              kind: 'stockfish-error',
              category: 'subsystem',
              source: 'CoachReviewSessionPage.analyze',
              summary: `analyzeSingleGame failed: ${err instanceof Error ? err.message : String(err)}`,
              details: JSON.stringify({ gameId }),
            });
            setGame(rec);
          } finally {
            if (!cancelled) setAnalyzing(false);
          }
        } else {
          setGame(rec);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const playerColor = useMemo(
    // Board orientation needs a side even when the identity is unresolved;
    // White is the historical default. The card's WIN/LOSS badge does NOT
    // inherit this default — it shows `?` instead (playerIdentity.ts).
    () => (game ? (resolvePlayerColor(game, {
      profileName: activeProfile?.name,
      chessComUsername: activeProfile?.preferences.chessComUsername,
      lichessUsername: activeProfile?.preferences.lichessUsername,
    }) ?? 'white') : 'white'),
    [
      game,
      activeProfile?.name,
      activeProfile?.preferences.chessComUsername,
      activeProfile?.preferences.lichessUsername,
    ],
  );

  const outcome = useMemo(
    () => (game ? adaptGameRecordExplained(game, playerColor) : null),
    [game, playerColor],
  );
  const adapted = outcome?.adapted ?? null;

  // REPAIR OR EXPLAIN (WO-STANDARD-01 H3). If the game loaded from Dexie but
  // cannot be replayed, the page used to sit on "Loading game…" and then show a
  // blank "could not replay" naming nothing. Now the sentence names THE GAME
  // and the move that broke it (`replayGamePgn`); a game cut to its legal
  // prefix opens and says so. Production repros: sample-london-amateur-3
  // (illegal 8.Qxd3) and the native Learn game teach-1788396074396 (headerless
  // bare SANs from a lesson position, saved before the 2026-09-03 fix).
  useEffect(() => {
    if (!game || !outcome || loadError || analyzing) return;
    if (outcome.adapted) {
      if (outcome.repairNote) {
        void logAppAudit({
          kind: 'stockfish-error',
          category: 'subsystem',
          source: 'CoachReviewSessionPage.adapt',
          summary: `game ${game.id} replayed to its legal prefix — ${outcome.repairNote}`,
          details: JSON.stringify({ gameId: game.id, pgnLength: game.pgn.length }),
        });
      }
      return;
    }
    void logAppAudit({
      kind: 'stockfish-error',
      category: 'subsystem',
      source: 'CoachReviewSessionPage.adapt',
      summary: `game ${game.id} cannot be replayed — ${outcome.reason}`,
      details: JSON.stringify({ gameId: game.id, pgnLength: game.pgn.length }),
    });
    setLoadError(`${outcome.reason} Pick a different game from the list, or import a fresh one.`);
  }, [game, outcome, loadError, analyzing]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-3 flex-1">
        <p className="text-sm text-red-400">{loadError}</p>
        <button
          onClick={() => { void navigate('/coach/review'); }}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-medium"
        >
          Back to game list
        </button>
      </div>
    );
  }

  if (!game || !adapted) {
    return (
      <div className="flex items-center justify-center p-6 flex-1 gap-2 text-theme-text-muted text-sm" data-testid="review-analyze-spinner">
        <Loader2 size={16} className="animate-spin" />
        {analyzing ? (analyzeProgress ?? 'Preparing your review…') : 'Loading game…'}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col md:flex-row flex-1 min-h-0">
      {outcome?.repairNote && (
        <div
          data-testid="review-repair-note"
          className="absolute top-2 left-2 z-20 max-w-[70%] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-medium pointer-events-none"
        >
          {outcome.repairNote}
        </div>
      )}
      {deepening && (
        <div
          data-testid="review-deepening-pill"
          className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium pointer-events-none"
        >
          <Loader2 size={12} className="animate-spin" />
          Sharpening analysis…
        </div>
      )}
      {/* `autoStartReview` was previously passed here, forcing
          `reviewPhase` to initialize to `'analysis'`. That made
          sense in the old design where analysis was the dominant
          review surface. Today the walk phase IS the review
          experience (big yellow Next, interactive arrow, narrated
          per ply, key-moment nav). Auto-starting analysis (a) shows
          the wrong layout and (b) gates out the walk-phase prep
          effect entirely — the per-ply commentary segments never
          generate because the effect early-returns on
          `reviewPhase !== 'summary'`. Production audit on build
          088fe97 confirmed: zero coach-brain-ask-received entries on
          /coach/review/game-* loads. Removing the prop lets walk
          phase render and the prep scan fire on mount. */}
      <CoachGameReview
        // key forces a fresh mount when the user navigates
        // from /coach/review/A → /coach/review/B. Without it, walk
        // narration state, aiCommentaryCache, and other refs from
        // game A leak into game B until the prep effect overwrites
        // (and the cache stays game-A-keyed against game-B's move
        // indices). Audit-driven (Coach-tab full audit, item #9).
        // The move-param suffix forces a remount when the user taps
        // a different deep-linked ply on the same game (e.g. moving
        // from one costliest-mistake row to another) so
        // `initialMoveIndex` re-applies on mount.
        key={`${gameId}:${initialMoveIndex}`}
        onWalkStarted={() => { walkStartedRef.current = true; }}
        // ship-5: forward gameId so `useReviewPlayback` can scope hint
        // callouts to this specific game (no cross-game leakage via
        // useCoachMemoryStore.hintRequests).
        gameId={gameId}
        moves={adapted.moves}
        keyMoments={adapted.keyMoments}
        playerColor={adapted.playerColor}
        result={adapted.result}
        openingName={adapted.openingName}
        playerName={adapted.playerName}
        playerRating={adapted.playerRating}
        opponentRating={adapted.opponentRating}
        onPlayAgain={() => { void navigate('/coach/play'); }}
        onBackToCoach={() => { void navigate(backTarget, { state: backState }); }}
        onPracticeInChat={(prompt) => {
          // Route to /coach/chat with the tactic prompt seeded as a
          // URL query param. CoachChatPage reads `?q=` and pre-fills
          // the chat input so the user lands on a populated draft
          // they can immediately send.
          void navigate(`/coach/chat?q=${encodeURIComponent(prompt)}`);
        }}
        pgn={adapted.pgn}
        initialMoveIndex={initialMoveIndex}
      />
    </div>
  );
}
