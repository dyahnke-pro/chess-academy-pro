import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RotateCcw, Home, ArrowLeft, MessageCircle, Loader2, Volume2, VolumeX, Target, Crosshair } from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { voiceService } from '../../services/voiceService';
import { usePieceSound } from '../../hooks/usePieceSound';
import { getCoachMove, resolveConfig } from '../../services/coachPlaySession';
import { stockfishEngine } from '../../services/stockfishEngine';
import { MoveListPanel } from './MoveListPanel';
import { ReviewSummaryCard } from './ReviewSummaryCard';
import { GameReviewWeaknessCapture } from './GameReviewWeaknessCapture';
import { KeyMomentNav } from './KeyMomentNav';
import { ChatInput } from './ChatInput';
import { ReviewReadingChallenge } from './ReviewReadingChallenge';
import { useReviewBlunderCapture } from '../../hooks/useReviewBlunderCapture';
import { resolveOpeningIdFromName } from '../../services/chessConceptService';
import { useSettings } from '../../hooks/useSettings';
import { calculateAccuracy, getClassificationCounts, detectMisses } from '../../services/accuracyService';
import { getPhaseBreakdown, classifyPhase } from '../../services/gamePhaseService';
import { useDiscussionPractice } from '../../hooks/useDiscussionPractice';
import { DiscussionPracticePanel } from '../Openings/DiscussionPracticePanel';
import { buildGuidedFindChallenge, buildHoldChallenge, judgeGuidedFindAttempt, GUIDED_FIND_MIN_EVAL_CP, type GuidedFindChallenge } from '../../services/guidedFindTheMove';
import { buildTrapQuestion, judgeTrapAnswer, type TrapQuestion, type TrapChoiceId } from '../../services/reviewTrapQuestion';
import { selectReviewQuestions, type ReviewQuestionMoment } from '../../services/reviewQuestionPlan';
import { computePvLine, renderPlyFactLine, plyFactsString, type PvLine } from '../../services/pvPlayback';
import { buildReviewMoveTeaching } from '../../services/reviewMoveTeaching';
import { judgeSequenceAttempt, moverPlies, type SequenceVerdict } from '../../services/sequenceChallenge';
import { pickCameoAnchor, buildCameoPlayback, type CameoAnchor, type CameoPlayback } from '../../services/modelGameMatcher';
import { voiceFacts, voiceReviewLines } from '../../services/coachApi';
import { logMisconception } from '../../services/misconceptionService';
import { buildMisconceptionCallback } from '../../services/misconceptionCallbacks';
import { principleFor } from '../../data/principles';
import { buildPrincipleQuiz, quizVerdictLine, type PrincipleQuiz } from '../../services/principleQuiz';
import { findTheoryDeparture, walkBookLine, type TheoryDeparture, type BookLinePly } from '../../services/theoryDeparture';
import { pauseBatchAnalysis, resumeBatchAnalysis } from '../../services/gameAnalysisService';
import { classifyGameTheme, type GameThemeResult } from '../../services/gameThemeClassifier';
import { findRewindTarget, type RewindTarget } from '../../services/blunderRewind';
import { buildTurningPointQuestion, judgeTurningPointPick, type TurningPointQuestion } from '../../services/reviewTurningPoint';
import { buildOpeningTheoryLecture, buildTheoryLectureBeats, resolveOpeningIdeas, type TheoryLectureBeat } from '../../services/reviewOpeningTheory';
import { captureEvent } from '../../services/analytics';
import { detectMissedTactics } from '../../services/missedTacticService';
import {
  generateNarrativeSummary,
  generateReviewNarration,
  buildReviewCitations,
} from '../../services/coachFeatureService';
import type {
  NarrativeMoveData,
  ReviewNarration,
  ReviewMoveInput,
} from '../../services/coachFeatureService';
import { ReviewCitationPreviews } from './ReviewCitationPreviews';
import { useReviewPlayback } from '../../hooks/useReviewPlayback';
import { useReviewEngineLines } from '../../hooks/useReviewEngineLines';
import { SkipBack, SkipForward, ChevronLeft, ChevronRight, Cpu, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tryCaptureForgetIntent } from '../../services/openingIntentCapture';
import { coachService } from '../../coach/coachService';
import type { LiveState } from '../../coach/types';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { useAppStore } from '../../stores/appStore';
import { buildTacticsLiveContext } from '../../services/liveTacticsContext';
// groundCoachReply import removed — the spine grounds the answer (David 2026-07-09).
import { resolveCoachNarration } from '../../utils/coachNarration';
import { logAppAudit } from '../../services/appAuditor';
import { generateMistakePuzzlesFromGame } from '../../services/mistakePuzzleService';
import { autoAnalyzeGameMisconceptions } from '../../services/autoAnalyzeGame';
import { db } from '../../db/schema';
import { CLASSIFICATION_STYLES } from './classificationStyles';
import { Chess } from 'chess.js';
import type { CoachGameMove, KeyMoment, ReviewState, GameAccuracy, MoveClassificationCounts, PhaseAccuracy, MissedTactic } from '../../types';

/** UNCAPPED review diagnostic (David 2026-07-20): opt-in via `?uncapped=1` on the
 *  URL or `window.__REVIEW_UNCAPPED__ = true` (the audit sets the latter via an
 *  init script). No localStorage (project rule). Off → production-capped review. */
function isReviewUncapped(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).get('uncapped') === '1') return true;
    return (window as unknown as { __REVIEW_UNCAPPED__?: boolean }).__REVIEW_UNCAPPED__ === true;
  } catch { return false; }
}

interface CoachGameReviewProps {
  moves: CoachGameMove[];
  keyMoments: KeyMoment[];
  playerColor: 'white' | 'black';
  result: string;
  openingName: string | null;
  playerName: string;
  playerRating: number;
  opponentRating: number;
  onPlayAgain: () => void;
  onBackToCoach: () => void;
  onPracticeInChat?: (prompt: string) => void;
  isGuidedLesson?: boolean;
  pgn?: string;
  initialMoveIndex?: number;
  /** When true, auto-fire the post-game walkthrough as soon as the
   *  component mounts — the user lands directly in the big-button +
   *  chat-panel mode with the intro narration playing instead of
   *  having to tap "Full Review" first. Used by the new
   *  /coach/review/:gameId entry point so opening a game from the
   *  picker drops the student straight into the walkthrough. */
  autoStartReview?: boolean;
  /** Game id of the review being walked. Forwarded to `useReviewPlayback`
   *  so hint callouts are scoped to THIS game and don't leak across
   *  reviews via the global `useCoachMemoryStore` (ship-5). */
  gameId?: string;
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// The principle "device" quiz is hidden from the UI for now (David 2026-07-20);
// the arming/build/show code + service stay intact behind this flag.
const PRINCIPLE_QUIZ_ENABLED: boolean = false;
// The in-walk theory-departure CARD is hidden (redundant with the 📖 Opening
// Theory button, which stays). Code kept behind the flag.
const THEORY_DEPARTURE_CARD_ENABLED: boolean = false;

// ship-4: PLAYED_MOVE_ARROW_COLORS + sanToSquares + AUTO_REVIEW_* pacing
// + CLASSIFICATION_BORDER_COLORS removed alongside the analysis-phase
// board they served. The walk-phase board derives its own arrow/badge
// styling inline from the segment classification.

export function CoachGameReview(props: CoachGameReviewProps): JSX.Element {
  const {
    moves, playerColor, result, openingName,
    playerRating,
    onPlayAgain, onBackToCoach, onPracticeInChat,
    pgn,
  } = props;
  const initialMoveIndex = props.initialMoveIndex;
  // ship-4: `keyMoments`, `playerName`, `opponentRating`, `isGuidedLesson`,
  // `autoStartReview` are retained on the prop interface for
  // backwards-compat with legacy callers but no longer consumed —
  // the walk surface derives everything it needs from `moves`.
  const navigate = useNavigate();
  const { settings } = useSettings();
  const coachedReview = settings.coachedReview;

  // ship-4: `reviewPhase` state removed. The walk-phase UI is the only
  // review surface; when narration generation fails or the prep effect
  // is still in flight, the `ReviewSummaryCard` fallback renders.

  // ship-4: guided-lesson mode removed — `isGuidedLesson` no longer
  // branches the start index. The walk surface owns navigation.
  const startIndex = initialMoveIndex !== undefined
    ? Math.min(initialMoveIndex, moves.length - 1)
    : (moves.length > 0 ? moves.length - 1 : -1);

  const [reviewState, setReviewState] = useState<ReviewState>({
    mode: 'analysis',
    currentMoveIndex: startIndex,
    whatIfMoves: [],
    whatIfStartFen: null,
  });

  // ship-4: what-if mode, practice/drill mode, best-line state, and
  // best-move-reveal toggle all removed — their UI lived in the
  // deleted analysis phase. The walk surface gets its arrow + badge
  // gating inline (see the walk render); board interactivity is
  // owned by `walkExplorationFen` below.

  // ─── Ask About Position State ───────────────────────────────────────────────
  const [askExpanded, setAskExpanded] = useState(false);
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAskStreaming, setIsAskStreaming] = useState(false);
  const askAbortRef = useRef<AbortController | null>(null);

  // Audit-driven (review walk #4): tracks whether this component is
  // still mounted. The walk-prep effect's generateReviewNarration call
  // can take 5–60s; if the user navigates back to the list and opens
  // a different game before it resolves, the orphan Promise's .then
  // would call setWalkNarration on the unmounted component (React
  // warning) AND any partial-state mutation could land on the next
  // game's UI before the new prep call completes. Production audit
  // (Audit 3, build 6459def+ Finding 41) showed `43 of 43 plies
  // narrated` landing on a 9-ply game's URL — the prior 43-ply game's
  // segments call leaked through on the new page. The mountedRef
  // is set to false in an unmount-only cleanup; the .then/.catch
  // guards check it and emit a cancellation audit instead of
  // applying state.
  const walkMountedRef = useRef(true);
  useEffect(() => {
    walkMountedRef.current = true;
    return () => {
      walkMountedRef.current = false;
    };
  }, []);

  // The bulk analyzer stays PAUSED for the whole review session, not just
  // the pre-walk analysis (David 2026-07-19: the 694-game batch resumed
  // mid-walk on his phone's single asm.js engine and starved the walk's
  // own engine moments — PV prefetch, quiz build, shot probes).
  useEffect(() => {
    pauseBatchAnalysis();
    return () => {
      resumeBatchAnalysis();
    };
  }, []);


  // Auto-enroll THIS game's mistakes into the My Mistakes drill set on
  // review — the student should never have to tap "add my mistakes to
  // puzzles" by hand (David 2026-06-11). The bulk analyze pipeline does
  // this inline per game, but a single-game review never did, so a game
  // opened straight from the picker dropped its mistakes on the floor.
  // generateMistakePuzzlesFromGame is idempotent (per-game meta guard)
  // and self-analyzes with Stockfish when annotations are missing, so
  // re-reviewing is a cheap no-op. Best-effort + background; the review
  // UI never waits on it, and the manual capture button stays as a
  // fallback.
  useEffect(() => {
    const gid = props.gameId;
    if (!gid) return;
    let cancelled = false;
    void (async () => {
      try {
        const game = await db.games.get(gid);
        if (cancelled || !game) return;
        const prefs = useAppStore.getState().activeProfile?.preferences;
        const username = game.source === 'chesscom' ? prefs?.chessComUsername
          : game.source === 'lichess' ? prefs?.lichessUsername
          : undefined;
        const made = await generateMistakePuzzlesFromGame(gid, username, playerRating ?? 1200);
        // Also fill the Thinking-Errors bucket from this game's annotations
        // (deterministic, idempotent per game) — the tactical-only puzzle gate
        // drops positional slips, but those ARE thinking errors.
        if (!cancelled) {
          try { await autoAnalyzeGameMisconceptions(gid, username); } catch { /* best-effort */ }
        }
        if (!cancelled && made > 0) {
          void logAppAudit({
            kind: 'review-walk-started',
            category: 'subsystem',
            source: 'CoachGameReview.autoEnrollMistakes',
            summary: `auto-enrolled ${made} mistake puzzle(s) from reviewed game ${gid}`,
          });
        }
      } catch { /* best-effort — manual capture button remains */ }
    })();
    return () => { cancelled = true; };
  }, [props.gameId, playerRating]);

  // Walk-mode exploration: when the student is on a ply that has a
  // better-move arrow (inaccuracy/mistake/blunder), they can grab the
  // suggested piece on the board and play that move themselves. The
  // resulting FEN lives here until they tap "Resume game" — at which
  // point we clear it and the board returns to the actual game line.
  const [walkExplorationFen, setWalkExplorationFen] = useState<string | null>(null);
  const [walkExplorationSan, setWalkExplorationSan] = useState<string | null>(null);
  // Lead-the-eye arrows painted DURING the better-line playout (David 2026-07-19:
  // the stronger line "has no arrows"). Each played ply of the shown line paints
  // a green arrow on the move it's narrating, so the eye lands where the voice is.
  const [walkExplorationArrows, setWalkExplorationArrows] =
    useState<Array<{ startSquare: string; endSquare: string; color: string }> | null>(null);
  const walkExplorationPlyRef = useRef<number | null>(null);
  // Opt-in toggle: when on at an arrow-bearing ply, the board
  // displays `seg.fenBefore` (so the missed move is playable)
  // instead of the canonical `seg.fenAfter`. Resets when the
  // student steps to a different ply.
  const [walkExploreToggleOn, setWalkExploreToggleOn] = useState<boolean>(false);
  // "Show me" playout: when active, Stockfish auto-plays the
  // punishment line from `seg.fenAfter` so the student can SEE
  // why their move was a mistake/blunder. Each engine ply updates
  // `walkExplorationFen` so the board animates the slide. Board
  // is non-interactive while this is true. Cleared on Resume,
  // ply change, or when the playout reaches its stop condition
  // (4 plies, mate, or game over).
  const [walkShowMeActive, setWalkShowMeActive] = useState<boolean>(false);
  // Mirror walkShowMeActive in a ref so the async playout loop can
  // detect cancellation (Resume tap, ply nav) AFTER awaiting a
  // Stockfish round-trip. Reading state directly inside the loop
  // would close over the stale value at loop-entry.
  const walkShowMeActiveRef = useRef<boolean>(false);
  useEffect(() => {
    walkShowMeActiveRef.current = walkShowMeActive;
  }, [walkShowMeActive]);

  // ship-4: auto-review state machine + guided-lesson state machine
  // both removed. The walk-phase UI driven by `useReviewPlayback` is
  // the only review playback path now. See the function comment near
  // the bottom of the file for the prior decomposition history.
  const [narrativeSummary, setNarrativeSummary] = useState<string | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  // WO-REVIEW-02 walk-the-game state. Fetched once per review mount;
  // null while loading, set to a ReviewNarration once ready. Falls back
  // to the ReviewSummaryCard's paragraph view if generation fails.
  const [walkNarration, setWalkNarration] = useState<ReviewNarration | null>(null);
  const [isLoadingWalk, setIsLoadingWalk] = useState(false);
  // The scrollable middle (cards live here). We scroll cards into view WITHIN
  // this container only — never element.scrollIntoView, which on iOS recurses
  // past the review frame's overflow-hidden to the app-level scroller and drags
  // the fixed board up under the header, stranding it (David 2026-07-20: "the
  // board shifted down and wouldn't let me scroll back up").
  const scrollMiddleRef = useRef<HTMLDivElement | null>(null);
  // Summary page persists until the user explicitly taps the big
  // green "Start" button on the summary card. Default false so the
  // walk-phase never auto-renders — David's call (2026-05-14): "i
  // want this page to persist until user clicks a start button."
  // The button itself is gated on `walkNarration` being ready so the
  // transition is instant when tapped.
  const [walkStarted, setWalkStarted] = useState(false);

  // OPENING THEORY LECTURE (David 2026-07-20: "a solid 5 minutes explaining the
  // theory behind the opening and the variation played"). Built once per game
  // from the masters DB; played on demand from the walk view.
  const [theoryBeats, setTheoryBeats] = useState<TheoryLectureBeat[] | null>(null);
  const [theoryLecturePlaying, setTheoryLecturePlaying] = useState(false);
  // The theory lecture is voice + board moves; on a muted device (or the old
  // buried-board layout) it looked DEAD (David 2026-07-21: "Opening theory button
  // didn't work"). Surface each beat's text as an on-screen caption so it visibly
  // plays without depending on audio.
  const [theoryCaption, setTheoryCaption] = useState<string | null>(null);
  const theoryLectureTokenRef = useRef(0);

  // Pre-compute accuracy + classification counts
  const accuracy = useMemo<GameAccuracy>(() => calculateAccuracy(moves), [moves]);
  const classificationCounts = useMemo<MoveClassificationCounts>(
    () => getClassificationCounts(moves, playerColor),
    [moves, playerColor],
  );

  // Pre-compute phase breakdown + missed tactics
  const phaseBreakdown = useMemo<PhaseAccuracy[]>(
    () => getPhaseBreakdown(moves, playerColor),
    [moves, playerColor],
  );
  const missedTactics = useMemo<MissedTactic[]>(
    () => detectMissedTactics(moves, playerColor),
    [moves, playerColor],
  );

  const missCount = useMemo(() => detectMisses(moves, playerColor), [moves, playerColor]);

  // Build engine move data for narrative summary enrichment
  const narrativeMoveData = useMemo<NarrativeMoveData[]>(() =>
    moves.map((m) => ({
      moveNumber: m.moveNumber,
      san: m.san,
      classification: m.classification,
      commentary: m.commentary || '',
      evaluation: m.evaluation,
      bestMove: m.bestMove,
      isCoachMove: m.isCoachMove,
    })),
    [moves],
  );

  // Generate narrative summary on summary phase mount (for non-guided lessons)
  useEffect(() => {
    if (narrativeSummary !== null) return;
    const gamePgn = pgn ?? moves.map((m) => m.san).join(' ');
    setIsLoadingNarrative(true);
    setNarrativeSummary('');
    void generateNarrativeSummary(
      gamePgn,
      playerColor,
      openingName,
      result,
      playerRating,
      (chunk: string) => setNarrativeSummary((prev: string | null) => (prev ?? '') + chunk),
      narrativeMoveData,
    ).then((fullText) => {
      // getCoachChatResponse never throws on API failure — it returns
      // "⚠️ Coach error: …" strings. Translate those to the degraded
      // UI state so the student isn't shown a raw error string and no
      // half-generated review is spoken aloud.
      if (fullText.startsWith('⚠️')) {
        setNarrativeSummary('Review is unavailable for this game. Tap Full Review for detailed analysis.');
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'CoachGameReview.narrativeSummary',
          summary: 'generateNarrativeSummary returned error placeholder',
          details: fullText,
        });
        return;
      }
      setNarrativeSummary(fullText);
      // WO-REVIEW-02a-FIX: do NOT speak the legacy monolithic summary
      // — the walk-the-game narration owns voice at review mount. The
      // summary text is still shown as a fallback card when the walk
      // bundle fails to load; speaking it here produced a dual-voice
      // regression (summary + walk intro overlapping on mount).
    }).catch((err: unknown) => {
      // Surface a graceful degraded state rather than leaving the
      // review blank. Log the actual error so silent failures are
      // visible post-WO-REVIEW-01.
      const msg = err instanceof Error ? err.message : String(err);
      setNarrativeSummary('Review is unavailable for this game. Tap Full Review for detailed analysis.');
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'CoachGameReview.narrativeSummary',
        summary: 'generateNarrativeSummary rejected',
        details: msg,
      });
    }).finally(() => {
      setIsLoadingNarrative(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- narrative summary fires once on mount
  }, []);

  // WO-REVIEW-02 walk-the-game: fetch per-ply segments + intro when
  // the summary phase mounts (non-guided lessons only). Runs in
  // parallel with the legacy narrativeSummary fetch; if the walk
  // narration succeeds we render the walk UI, otherwise the summary
  // card's paragraph is the graceful fallback.
  const reviewMoveInputs = useMemo<ReviewMoveInput[]>(() =>
    moves.map((m, i) => ({
      ply: i + 1,
      san: m.san,
      isCoachMove: m.isCoachMove,
      classification: m.classification ?? null,
      evaluation: m.evaluation,
      preMoveEval: m.preMoveEval,
      bestMove: m.bestMove,
      fenAfter: m.fen,
    })),
    [moves],
  );

  // Grounded preview spine (Phase 1c) — the student's flagged moves as
  // structured citations (position + played/suggested squares), computed from
  // the engine annotations, never the LLM. Feeds the inline board previews.
  const reviewCitations = useMemo(
    () => buildReviewCitations(reviewMoveInputs, playerColor),
    [reviewMoveInputs, playerColor],
  );

  useEffect(() => {
    if (walkNarration !== null || isLoadingWalk) return;
    if (reviewMoveInputs.length === 0) return;
    setIsLoadingWalk(true);
    void generateReviewNarration({
      moves: reviewMoveInputs,
      playerColor,
      openingName,
      result,
      playerRating,
      // Tied to the unified Settings → Coach → Coach Narration dial.
      // Silent skips the intro LLM call entirely; Brief caps it at
      // ~80 tokens; Full uses the legacy 200-token allowance. Resolved
      // fresh per mount so a Settings change between reviews takes
      // effect on the next open.
      coachNarration: resolveCoachNarration(useAppStore.getState().activeProfile?.preferences),
      // UNCAPPED diagnostic mode (David 2026-07-20): speak EVERY computed facet on
      // EVERY move + the future-position projections. Opt-in via ?uncapped=1 or
      // localStorage reviewUncapped=1 (the audit + David toggle it) — production
      // review stays capped.
      uncapped: isReviewUncapped(),
    }).then((narration) => {
      // Audit-driven (review walk #4): bail if the component
      // unmounted mid-call (user navigated away). React-level
      // protection is also there — setWalkNarration on an unmounted
      // component is a no-op + warning — but we want the explicit
      // observability trail.
      if (!walkMountedRef.current) {
        void logAppAudit({
          kind: 'review-walk-skipped',
          category: 'subsystem',
          source: 'CoachGameReview.walkNarration',
          summary: `walk-prep result discarded — component unmounted (${narration?.segments.length ?? 0} segments)`,
          details: JSON.stringify({
            reason: 'component-unmounted-before-prep-resolved',
            segmentCount: narration?.segments.length ?? 0,
            plyCount: reviewMoveInputs.length,
          }),
        });
        return;
      }
      // Empty segments → keep the summary card visible as a
      // graceful fallback. The walk UI requires segments to render;
      // without them, the student stays on the card with stats only.
      if (narration && narration.segments.length > 0) {
        setWalkNarration(narration);
      } else {
        // Audit-driven (#26): the empty-segments fallback used to be
        // silent — paste-back audit logs showed nothing for "I tapped
        // Review and got the summary card, not the walk." Now we
        // log the skip with the segment count + ply count so a
        // regression in generateReviewNarration is debuggable from
        // the audit panel without DevTools.
        void logAppAudit({
          kind: 'review-walk-skipped',
          category: 'subsystem',
          source: 'CoachGameReview.walkNarration',
          summary: `walk UI skipped — ${narration?.segments.length ?? 0} segments for ${reviewMoveInputs.length} plies`,
          details: JSON.stringify({
            segmentCount: narration?.segments.length ?? 0,
            plyCount: reviewMoveInputs.length,
            hasIntro: Boolean(narration?.intro?.trim()),
          }),
        });
      }
    }).catch((err: unknown) => {
      if (!walkMountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'CoachGameReview.walkNarration',
        summary: 'generateReviewNarration rejected',
        details: msg,
      });
    }).finally(() => {
      if (!walkMountedRef.current) return;
      setIsLoadingWalk(false);
    });
  }, [reviewMoveInputs, playerColor, openingName, result, playerRating, walkNarration, isLoadingWalk]);

  // Instantiate the playback hook; drives the walk-the-game UI below.
  // totalPlies is the authoritative ceiling — nav walks every move the
  // student played, even when the LLM narrated only a subset
  // (WO-REVIEW-02a-FIX).
  const walkPlayback = useReviewPlayback({
    narration: walkNarration,
    totalPlies: moves.length,
    // ship-5: scope hint callouts to this specific game.
    gameId: props.gameId,
    // Deep-link: /coach/review/:id?move=N → the page hands us a
    // 0-indexed initialMoveIndex; the walk's ply is 1-indexed (ply =
    // moveIndex + 1). Without this the deep link only seeded the legacy
    // reviewState and the walk header stayed at Ply 0 (audit 2026-06-27).
    initialPly: initialMoveIndex !== undefined && initialMoveIndex >= 0
      ? initialMoveIndex + 1
      : undefined,
  });

  // ── Surface A: "quiz me as I review" reading gate (opt-in, default OFF) ──
  // When the setting is on, advancing the walk PAUSES on the position before
  // each of the student's mistakes and asks them to READ it — graded against
  // the engine — BEFORE the move (and its better-move arrow) is revealed. The
  // walk is manual-only (no auto-advance), so we just guard the forward action;
  // the board already shows the pre-move position, so no override is needed.
  // Inline + skippable; NEVER a modal (the retired blunder-capture's mistake).
  const readingQuizOn = settings.readingChallengesInReview;
  const studentColorWB: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
  // AUTHORITATIVE "is this the student's move?" — the side-to-move in the
  // position BEFORE the move must equal the student's color. `isCoachMove` is
  // NOT reliable for a REVIEWED/imported game (no coach played it → it's false
  // for BOTH sides; see coachFeatureService: "the opponent isn't isCoachMove,
  // so filter by color"), so `!isCoachMove` alone let find-the-shot / the
  // why-picker / the rewind fire on the OPPONENT's move (David 2026-07-19
  // audit: a shot card on ply 18 while the narration said "your opponent
  // slipped"). Color is the belt the narration side already wears — wear it in
  // the walk gates too.
  const moverIsStudent = useCallback((fenBefore: string | undefined): boolean => {
    if (!fenBefore) return false;
    try { return new Chess(fenBefore).turn() === studentColorWB; } catch { return false; }
  }, [studentColorWB]);
  // The QUESTION PLAN (David 2026-07-20: "insert questions ONLY when relevant…
  // don't overwhelm"). The ranked, budget-capped set of plies where the walk
  // STOPS to ask — at most 2 mid-game stops, each tied to the student's ACTUAL
  // move (find-shot on a miss, trap on a greedy capture, why on any other slip);
  // the turning-point is the 3rd and final stop. Computed once from the
  // segments, so a question never fires at an irrelevant moment.
  const questionPlan = useMemo<Map<number, ReviewQuestionMoment>>(() => {
    if (!walkNarration || !playerColor) return new Map();
    return selectReviewQuestions(walkNarration.segments, playerColor, { budget: 2 });
  }, [walkNarration, playerColor]);

  const [readingGate, setReadingGate] = useState<{ ply: number; fen: string } | null>(null);
  const quizzedPliesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    quizzedPliesRef.current = new Set();
    setReadingGate(null);
  }, [props.gameId]);

  // The "why'd you play that?" faucet — post-game review now responds like
  // Learn-with-Coach (David 2026-07-06). Landing on one of the student's own
  // mistakes raises the SAME picker → narrated grounded reveal → weakness
  // bucket, tagged to THIS game (source game-review). It REPLACES the reading
  // challenge on mistakes (same trigger point + the readingChallengesInReview
  // toggle) so the student never gets two prompts on one move.
  // THE DEVICE QUIZ (Phase 3.3, David 2026-07-18) — after a slip's reveal
  // states the principle, the student immediately APPLIES it: 2-3 candidate
  // moves from the SAME position, which passes the device? Candidates +
  // verdicts are engine-computed (principleQuiz service, G0). Armed here
  // when the faucet logs a slip; shown ONCE per review after the reveal.
  const principleQuizRef = useRef<PrincipleQuiz | null>(null);
  const principleQuizShownRef = useRef(false);
  const [principleQuizState, setPrincipleQuizState] = useState<PrincipleQuiz | null>(null);
  const principleQuizStateRef = useRef<PrincipleQuiz | null>(null);
  useEffect(() => { principleQuizStateRef.current = principleQuizState; }, [principleQuizState]);
  const armPrincipleQuiz = useCallback((tag: string, ctx: { fen: string; playedSan: string; bestSan: string }): void => {
    // Hidden from the UI (David 2026-07-20: "remove the principle quiz from the
    // UI, keep the code for now"). The arm/build/show + service stay intact so
    // it can be re-enabled by flipping PRINCIPLE_QUIZ_ENABLED.
    if (!PRINCIPLE_QUIZ_ENABLED) return;
    if (principleQuizShownRef.current || principleQuizRef.current) return;
    void buildPrincipleQuiz({
      tag,
      fen: ctx.fen,
      playedSan: ctx.playedSan,
      engine: { analyzePosition: (f, d) => stockfishEngine.analyzeWithBudget(f, d, 4000) },
      depth: 12,
    }).then((quiz) => {
      if (quiz && !principleQuizShownRef.current) principleQuizRef.current = quiz;
    }).catch(() => undefined);
  }, []);

  const reviewFaucet = useDiscussionPractice(true, {
    surface: 'coach-review', interruptive: true, source: 'game-review',
    onSlipLogged: armPrincipleQuiz,
  });
  // The hook's callbacks are stable (memoized); destructure them so the
  // walk-forward + resume callbacks don't churn on every render (the hook
  // returns a fresh object each render). `phase` is the one live value.
  const { phase: faucetPhase, raiseSlipPrompt: raiseFaucet, reset: resetFaucet } = reviewFaucet;

  // FIND-THE-SHOT (review questions, David 2026-07-11). When the mistake the
  // walk is pausing on MISSED A WINNING SHOT (the student was clearly better
  // and the engine's move was notable), the coach asks the student to FIND it
  // on the review board instead of opening the why-picker — Danya's
  // pause-and-guess format. The question is computed square-free
  // (guidedFindTheMove.ts) and the better-move arrow is suppressed while the
  // question is open, so nothing on screen leaks the answer.
  const [shotState, setShotState] = useState<{ challenge: GuidedFindChallenge; playedSan: string; costPawns: number | null } | null>(null);
  // Hint LADDER (David 2026-07-20): each Hint tap reveals the next rung (piece →
  // from-square → move) instead of dumping the answer. The rung index + the
  // last-shown rung text; both reset when a new shot opens.
  const shotHintRungRef = useRef(0);
  const [shotHintText, setShotHintText] = useState<string | null>(null);
  const [shotReveal, setShotReveal] = useState<string | null>(null);
  const shotAttemptsRef = useRef(0);
  /** Bumped on a wrong attempt — remounts the walk board so the wrong move
   *  snaps back to the challenge position (the takeback). */
  const [shotBoardEpoch, setShotBoardEpoch] = useState(0);
  /** Late-bound handle to tryStartSequence (defined below with the sequence
   *  block) so handleShotContinue, declared earlier, can call it without a
   *  forward reference. */
  const tryStartSequenceRef = useRef<(() => boolean) | null>(null);
  /** Mirror of the cameo card state (declared with the cameo block below);
   *  early handlers read it through this ref, same pattern as seqStateRef. */
  const cameoStateRef = useRef<{ stage: 'ask' | 'playback' } | null>(null);
  /** Mirror of the theory-departure card state (Phase 4 block below). */
  const theoryStateRef = useRef<{ stage: 'ask' | 'playback' } | null>(null);
  /** Late-bound canceller for the cards declared BELOW handleWalkForward
   *  (sequence / cameo / theory). Populated by an effect once those cancel
   *  helpers exist, so forward can DISMISS them (escape-hatch) instead of
   *  no-op'ing — the "board frozen behind the card" bug (David 2026-07-19),
   *  which the real-game audit caught still live for the cameo (stall at
   *  ply 21, 2026-07-20). */
  const dismissLateCardsRef = useRef<(() => void) | null>(null);

  // BLUNDER REWIND (David 2026-07-11: "return to the last moment you had a
  // choice"). After a blunder's question resolves, offer to jump the board
  // back to the last student-to-move ply where the eval was still holdable
  // (computed from the eval trace) and pose the HOLD challenge there.
  const [rewindOffer, setRewindOffer] = useState<RewindTarget | null>(null);
  const rewindOfferedPliesRef = useRef<Set<number>>(new Set());

  // TURNING-POINT question — asked ONCE per game when the walk reaches the
  // end: "where do you think this game turned?" Candidates + answer are
  // computed from the eval record (reviewTurningPoint.ts).
  const [turningQ, setTurningQ] = useState<TurningPointQuestion | null>(null);
  const [turningReveal, setTurningReveal] = useState<{ correct: boolean; text: string } | null>(null);
  const turningAskedRef = useRef(false);
  // Preview-then-commit for the turning-point chips (David 2026-07-19: "chips
  // are bare SAN, I can't recall the position"). First tap on a chip STEPS THE
  // BOARD to that candidate; a second tap (or Confirm) commits it.
  const [turningPreviewPly, setTurningPreviewPly] = useState<number | null>(null);

  // §4 TRAP — "this piece looks free — take it or leave it?" Fires only when the
  // student's flagged move GRABBED poisoned material (the question plan tags the
  // ply). The reveal plays out the real losing swap (reviewTrapQuestion.ts).
  const [trapQ, setTrapQ] = useState<TrapQuestion | null>(null);
  const [trapReveal, setTrapReveal] = useState<{ correct: boolean; text: string } | null>(null);

  useEffect(() => {
    // Fresh game → fresh question state.
    setShotState(null);
    setShotReveal(null);
    shotAttemptsRef.current = 0;
    setRewindOffer(null);
    rewindOfferedPliesRef.current = new Set();
    setTurningQ(null);
    setTurningReveal(null);
    turningAskedRef.current = false;
    setTurningPreviewPly(null);
    setTrapQ(null);
    setTrapReveal(null);
  }, [props.gameId]);

  const handleWalkForward = useCallback((): void => {
    if (readingGate) return;             // a legacy gate is open (defensive)
    // FORWARD IS AN ESCAPE HATCH — never a frozen board (David 2026-07-19: "a
    // card popped up… i want to click forward to ignore it but the board is
    // frozen"). When the why-picker faucet or the end-of-game turning-point card
    // is open, forward DISMISSES it and advances rather than no-op'ing. (The
    // turning-point one also fixes his "hit back to answer, couldn't go forward
    // again" glitch — the card stayed open and froze forward.)
    if (faucetPhase !== 'idle') {
      resetFaucet();
      setWalkExplorationFen(null);
      setWalkExplorationSan(null);
      setWalkExplorationArrows(null);
      walkPlayback.goForward();
      return;
    }
    if (turningQ) {
      setTurningQ(null);
      setTurningPreviewPly(null);
      setWalkExplorationFen(null);
      walkPlayback.goForward();
      return;
    }
    if (trapQ) {
      setTrapQ(null);
      walkPlayback.goForward();
      return;
    }
    // Forward SKIPS the find-the-shot too (David 2026-07-20: "arrow forward
    // should skip this… we talked about this"). Dismiss the card + advance.
    if (shotState || shotReveal) {
      setShotState(null);
      setShotReveal(null);
      walkPlayback.goForward();
      return;
    }
    // FORWARD IS ALWAYS AN ESCAPE HATCH — dismiss any open card + advance, never
    // freeze the board (David 2026-07-19). These cards are declared BELOW, so
    // rewind uses its in-scope setter and seq/cameo/theory go through the
    // late-bound canceller ref. (The real-game audit caught the cameo still
    // freezing forward at ply 21, 2026-07-20.)
    if (rewindOffer) { setRewindOffer(null); walkPlayback.goForward(); return; }
    if (seqStateRef.current || cameoStateRef.current || theoryStateRef.current) {
      dismissLateCardsRef.current?.();
      walkPlayback.goForward();
      return;
    }
    if (principleQuizStateRef.current) return; // device quiz (hidden) — never opens
    if (readingQuizOn) {
      const nextPly = walkPlayback.currentPly + 1;
      const seg = walkNarration?.segments.find((s) => s.ply === nextPly) ?? null;
      // The AUTHORITATIVE "is this the student's move?" signal is isCoachMove
      // (the adapter sets it = color !== playerColor, and the NARRATION uses
      // it) — NOT the parity-derived seg.playerColor, which disagreed and let
      // the "Why'd you play that?" picker fire on the OPPONENT's move while the
      // narration on the SAME ply said "your opponent slipped" (David
      // 2026-07-19: "set the picker to iscoach move"). moves[nextPly-1] is the
      // move being questioned; it's the student's iff it isn't a coach move.
      const nextMove = moves[nextPly - 1] ?? null;
      const isStudentMistake = !!seg
        && !!nextMove
        && !nextMove.isCoachMove
        && moverIsStudent(seg.fenBefore) // color is authoritative for reviewed games
        && (seg.classification === 'inaccuracy' || seg.classification === 'mistake' || seg.classification === 'blunder');
      // THE QUESTION PLAN gates every mid-game stop: fire ONLY at a planned ply
      // (≤2 per game, the biggest moments), and use the KIND the plan chose for
      // that moment. Everything else stays narration — no overwhelm (David
      // 2026-07-20). quizzedPliesRef stops a re-fire on the same ply.
      const planned = questionPlan.get(nextPly);
      if (seg && isStudentMistake && planned && !quizzedPliesRef.current.has(nextPly)) {
        quizzedPliesRef.current.add(nextPly);
        // The board already shows seg.fenBefore (the position before the move).
        const sign = playerColor === 'white' ? 1 : -1;
        const cpLoss = seg.evalBefore != null && seg.evalAfter != null
          ? (seg.evalBefore - seg.evalAfter) * sign : 0;
        // TRAP: your flagged move GRABBED poisoned material. Ask the re-decision
        // at the position BEFORE the capture ("do you take it?"); the reveal
        // plays out the losing swap. Board stays at fenBefore.
        if (planned.kind === 'trap') {
          const trap = buildTrapQuestion({ fen: seg.fenBefore, studentColor: playerColor });
          if (trap) {
            setTrapQ(trap);
            captureEvent('review_trap_asked', { target: trap.targetSquare, tempting: trap.temptingSan, ply: nextPly });
            void voiceService.speakForced(trap.prompt).catch(() => undefined);
            return; // pause the walk; resumes when the student answers + dismisses
          }
          // couldn't build (edge) → fall through to the why-picker below.
        }
        // FIND-THE-SHOT: the plan tagged a missed winning shot → ask them to
        // FIND it on the board instead of "why'd you play that?".
        const evalBeforeMoverCp = seg.evalBefore != null ? seg.evalBefore * sign : null;
        const shot = planned.kind === 'find-shot' && seg.bestMoveUci && evalBeforeMoverCp !== null && evalBeforeMoverCp >= GUIDED_FIND_MIN_EVAL_CP
          ? buildGuidedFindChallenge(seg.fenBefore, seg.bestMoveUci)
          : null;
        if (shot) {
          shotAttemptsRef.current = 0;
      shotHintRungRef.current = 0;
      setShotHintText(null);
          setShotState({ challenge: shot, playedSan: seg.san, costPawns: cpLoss > 0 ? cpLoss / 100 : null });
          setShotReveal(null);
          captureEvent('review_find_shot_asked', { answer: shot.answerSan, played: seg.san, ply: nextPly });
          // Prefetch the follow-up PV in the background so the
          // spot-the-sequence ask is ready the moment the shot resolves
          // (Phase 1; budget-capped, never blocks the card).
          if (seg.bestMoveUci) prefetchPvForShot(nextPly, seg.fenBefore, seg.bestMoveUci);
          void voiceService.speakForced(`Hold on — right here you had something. ${shot.question}`).catch(() => undefined);
          return; // pause the walk; resumes from the shot card
        }
        // §5 WALK-THE-BETTER-LINE: after you answer the picker, the coach plays
        // the engine's better line OUT on the board with the why per move
        // (Danya's #1 habit). The line is the real engine PV (computePvLine,
        // G0) — captured here, played out in resumeAfterFaucet. Only when a
        // genuine distinct best move exists.
        pendingBetterLineRef.current = seg.bestMoveUci && seg.bestMoveSan !== seg.san
          ? { fenBefore: seg.fenBefore, bestUci: seg.bestMoveUci, playedSan: seg.san, bestSan: seg.bestMoveSan ?? null }
          : null;
        // SHOW THE MOVE FIRST, let it land, THEN ask "why'd you play that?" — the
        // board was paused at fenBefore (before the flagged move), so the student
        // was asked about a move they hadn't been shown yet (David 2026-07-19:
        // "the card appears before I make my move… I haven't seen it yet"), and
        // it slammed up with no time to absorb ("give the student time to absorb
        // the move"). So: push the played move onto the board (no spoiler),
        // speak a NEUTRAL orienting beat (reveals nothing about quality — the
        // grounded diagnosis stays post-commit, honesty contract), give a beat to
        // absorb, THEN raise the picker. resumeAfterFaucet clears the FEN.
        setWalkExplorationFen(seg.fenAfter);
        setWalkExplorationSan(seg.san);
        playMoveSound(seg.san);
        const faucetArgs = {
          fenBefore: seg.fenBefore,
          fenAfter: seg.fenAfter,
          playedSan: seg.san,
          bestSan: seg.bestMoveSan ?? undefined,
          cpLoss: cpLoss > 0 ? cpLoss : 0,
          shouldCount: true, // a deliberate review of your own game → it counts
          gamePhase: classifyPhase(seg.fenBefore, nextPly),
          moveNumber: seg.moveNumber,
          openingName: openingName ?? undefined,
          studentRating: playerRating ?? undefined,
        };
        void (async () => {
          try { await voiceService.speakForced('Here’s the move you played. Take a look.'); } catch { /* voice off */ }
          await new Promise((r) => setTimeout(r, 900)); // a beat to absorb the move
          if (!walkMountedRef.current) return;
          raiseFaucet(faucetArgs);
        })();
        return; // pause the walk; resumes when the student answers + dismisses
      }
    }
    walkPlayback.goForward();
  }, [readingGate, faucetPhase, resetFaucet, raiseFaucet, readingQuizOn, walkPlayback, walkNarration, playerColor, openingName, playerRating, shotState, shotReveal, turningQ, trapQ, rewindOffer, questionPlan, moves, moverIsStudent]);

  // Advance the walk once the faucet is done (answered + reveal dismissed, or
  // skipped) — the "resume" side of the pause above.
  // ── Blunder rewind: offer after a blunder's question resolves ────────────
  const maybeOfferRewind = useCallback((): boolean => {
    const ply = walkPlayback.currentPly + 1; // the move the walk paused on
    const seg = walkNarration?.segments.find((s) => s.ply === ply);
    const move = moves[ply - 1] ?? null;
    // Only offer the rewind on the STUDENT's own blunder — color (side-to-move
    // before the move) is the authoritative side signal for a REVIEWED game;
    // isCoachMove is false for both sides there, so keep it as the belt but let
    // color be the suspenders (matches the picker fix + the narration).
    if (!seg || !move || move.isCoachMove || !moverIsStudent(seg.fenBefore) || seg.classification !== 'blunder') return false;
    if (rewindOfferedPliesRef.current.has(ply)) return false;
    rewindOfferedPliesRef.current.add(ply); // one offer per blunder, ever
    const target = findRewindTarget(walkNarration?.segments ?? [], ply, playerColor);
    if (!target) return false;
    setRewindOffer(target);
    captureEvent('review_rewind_offered', { blunder_ply: ply, rewind_ply: target.ply });
    void voiceService.speakForced('Before we move on — want to go back to the last moment this was still holdable?').catch(() => undefined);
    return true;
  }, [walkPlayback, walkNarration, playerColor, moves, moverIsStudent]);

  const handleRewindAccept = useCallback((): void => {
    const t = rewindOffer;
    if (!t) return;
    setRewindOffer(null);
    const ch = buildHoldChallenge(t.fenBefore, t.bestUci);
    walkPlayback.jumpToPly(t.ply - 1); // board shows the position the student faced
    captureEvent('review_rewind_result', { outcome: 'accepted', rewind_ply: t.ply, challenge: ch?.answerSan ?? null });
    if (ch) {
      shotAttemptsRef.current = 0;
      shotHintRungRef.current = 0;
      setShotHintText(null);
      const segAt = walkNarration?.segments.find((s) => s.ply === t.ply);
      setShotState({ challenge: ch, playedSan: segAt?.san ?? '', costPawns: null });
      setShotReveal(null);
      void voiceService.speakForced(ch.question).catch(() => undefined);
    }
  }, [rewindOffer, walkPlayback, walkNarration]);

  const handleRewindDecline = useCallback((): void => {
    if (!rewindOffer) return;
    captureEvent('review_rewind_result', { outcome: 'declined', rewind_ply: rewindOffer.ply });
    setRewindOffer(null);
    walkPlayback.goForward();
  }, [rewindOffer, walkPlayback]);

  // NOTE: the faucet-resume + §5 better-line-playout callbacks live BELOW,
  // right above runSequencePlayback — they depend on playMoveSound / the
  // exploration-board setters / the better-line refs, all defined further down.

  const handlePrincipleQuizPick = useCallback((san: string | null): void => {
    const quiz = principleQuizStateRef.current;
    if (!quiz) return;
    setPrincipleQuizState(null);
    if (san !== null) {
      const line = quizVerdictLine(quiz, san);
      captureEvent('review_principle_quiz_result', { tag: quiz.tag, picked: san, correct: san === quiz.correctSan });
      void voiceService.speakForced(line).catch(() => undefined);
    } else {
      captureEvent('review_principle_quiz_result', { tag: quiz.tag, picked: null, correct: false });
    }
    if (!maybeOfferRewind()) walkPlayback.goForward();
  }, [maybeOfferRewind, walkPlayback]);

  // ── Find-the-shot handlers ────────────────────────────────────────────────
  /** The computed cost line appended to every shot reveal — what the game
   *  move actually gave up, in pawns. */
  const shotCostLine = useCallback((s: { playedSan: string; costPawns: number | null }): string => {
    if (!s.playedSan) return ''; // rewind hold-challenges have no single "game move" to cite
    return s.costPawns !== null && s.costPawns >= 0.5
      ? ` In the game you played ${s.playedSan} — that cost about ${s.costPawns.toFixed(1)} pawns.`
      : ` In the game you played ${s.playedSan}.`;
  }, []);

  const handleShotHint = useCallback((): void => {
    if (!shotState) return;
    const ladder = shotState.challenge.hintLadder?.length ? shotState.challenge.hintLadder : [shotState.challenge.hint];
    const rung = shotHintRungRef.current;
    if (rung < ladder.length - 1) {
      // Intermediate rung — leak a little (piece, then from-square), KEEP the
      // shot open so the student can still play it after the nudge.
      shotHintRungRef.current = rung + 1;
      setShotHintText(ladder[rung]);
      captureEvent('review_find_shot_result', { outcome: `hint-${rung}`, attempts: shotAttemptsRef.current, answer: shotState.challenge.answerSan });
      void voiceService.speakForced(ladder[rung]).catch(() => undefined);
      return;
    }
    // Final rung — the full answer; end the shot.
    const text = `${ladder[ladder.length - 1]}${shotCostLine(shotState)}`;
    captureEvent('review_find_shot_result', { outcome: 'hint', attempts: shotAttemptsRef.current, answer: shotState.challenge.answerSan });
    setShotState(null);
    setShotHintText(null);
    setShotReveal(text);
    void voiceService.speakForced(text).catch(() => undefined);
  }, [shotState, shotCostLine]);

  const handleShotSkip = useCallback((): void => {
    if (!shotState) return;
    captureEvent('review_find_shot_result', { outcome: 'skip', attempts: shotAttemptsRef.current, answer: shotState.challenge.answerSan });
    setShotState(null);
    setShotReveal(null);
    walkPlayback.goForward();
  }, [shotState, walkPlayback]);

  const handleShotContinue = useCallback((): void => {
    setShotReveal(null);
    // Spot-the-sequence (Phase 1): before moving on, ask whether the student
    // can SEE THE FOLLOW-UP of the shot they just found/saw.
    if (tryStartSequenceRef.current?.()) return;
    if (maybeOfferRewind()) return; // a blunder's shot resolved → offer the rewind
    walkPlayback.goForward();
  }, [walkPlayback, maybeOfferRewind]);

  // ── PostHog instrumentation — make a review session queryable (David
  // 2026-07-19: "if post game review doesn't send to posthog, fix it"). Emits
  // review_started once, review_narration per narrated ply (WHAT is played +
  // which beat produced it, independent of whether TTS vocalises), and
  // review_completed at the leaf. This is how we can SEE what the coach said
  // without the ephemeral audit-stream.
  const reviewStartedRef = useRef(false);
  const reviewCompletedRef = useRef(false);
  const narratedPliesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!walkNarration) return;
    const ply = walkPlayback.currentPly;
    if (!reviewStartedRef.current && ply >= 1) {
      reviewStartedRef.current = true;
      captureEvent('review_started', {
        game_id: props.gameId, opening: openingName ?? null, result,
        player_color: playerColor, plies: moves.length, rating: playerRating ?? null,
      });
    }
    const seg = walkNarration.segments.find((s) => s.ply === ply);
    if (seg && seg.narration && !narratedPliesRef.current.has(ply)) {
      narratedPliesRef.current.add(ply);
      captureEvent('review_narration', {
        game_id: props.gameId, ply, move: seg.san,
        source: seg.narrationSource ?? 'unknown',
        classification: seg.classification, chars: seg.narration.length,
        text: seg.narration.slice(0, 280),
      });
    }
    if (!reviewCompletedRef.current && moves.length > 0 && ply >= moves.length) {
      reviewCompletedRef.current = true;
      captureEvent('review_completed', { game_id: props.gameId, plies: moves.length });
    }
  }, [walkPlayback.currentPly, walkNarration, props.gameId, openingName, result, playerColor, moves.length, playerRating]);

  // ── Turning-point ask — fires once, when the walk reaches the last ply ────
  useEffect(() => {
    if (turningAskedRef.current) return;
    if (!walkNarration || moves.length === 0) return;
    if (walkPlayback.currentPly !== moves.length) return;
    turningAskedRef.current = true; // one ask per game, even when unanswerable
    const q = buildTurningPointQuestion(walkNarration.segments);
    if (!q) return; // clean game / single obvious moment — no question to ask
    setTurningQ(q);
    captureEvent('review_turning_point_asked', { candidates: q.candidates.length, answer_ply: q.answer.ply });
    void voiceService.speakForced(q.question).catch(() => undefined);
  }, [walkPlayback.currentPly, walkNarration, moves.length]);

  const handleTurningPick = useCallback((ply: number): void => {
    if (!turningQ) return;
    setTurningPreviewPly(null);
    setWalkExplorationFen(null);
    const correct = judgeTurningPointPick(turningQ, ply);
    // Phase 5: the theme's reprise closes the reveal — but only when it
    // was actually NAMED during the walk (never introduce it cold here).
    const reprise = themeSpokenRef.current && themeRef.current
      ? ` It fits the thread of the game — ${themeRef.current.reprise}.`
      : '';
    const text = `${correct ? 'You called it.' : 'Not quite.'} ${turningQ.reveal}${reprise}`;
    captureEvent('review_turning_point_result', { correct, picked_ply: ply, answer_ply: turningQ.answer.ply });
    setTurningQ(null);
    setTurningReveal({ correct, text });
    // Decisive-beat prosody spike (#25): the payoff line lifts only when
    // the student CALLED it — a wrong pick keeps the flat register.
    void voiceService.speakForced(text, correct ? { prosodySpike: true } : undefined).catch(() => undefined);
  }, [turningQ]);

  // First tap PREVIEWS the candidate on the board; a second tap on the SAME chip
  // commits it (David 2026-07-19: "give board context, step to each candidate").
  const handleTurningChip = useCallback((cand: { ply: number; fenBefore?: string }): void => {
    if (turningPreviewPly === cand.ply) { handleTurningPick(cand.ply); return; }
    setTurningPreviewPly(cand.ply);
    if (cand.fenBefore) {
      setWalkExplorationFen(cand.fenBefore);
      setWalkExplorationSan(null);
      setWalkExplorationArrows(null);
    }
  }, [turningPreviewPly, handleTurningPick]);

  // ── TYPE-NOT-MOVE ask — fires once at a student position whose best move is a
  // forcing check/capture. "What KIND of move does this call for?" ───────────
  const handleTrapPick = useCallback((id: TrapChoiceId): void => {
    if (!trapQ) return;
    const correct = judgeTrapAnswer(trapQ, id);
    const text = `${correct ? 'Good discipline.' : 'That\'s the trap.'} ${trapQ.reveal}`;
    captureEvent('review_trap_result', { correct, picked: id, answer: trapQ.answerId });
    setTrapQ(null);
    setTrapReveal({ correct, text });
    void voiceService.speakForced(text, correct ? { prosodySpike: true } : undefined).catch(() => undefined);
  }, [trapQ]);


  // Move-sound hook — called here (above the sequence block) because the
  // sequence handlers below chime on auto-played defender/playback plies.
  const { playMoveSound } = usePieceSound();

  // ── SPOT-THE-SEQUENCE + PV PLAYBACK (Phase 1, David 2026-07-18) ──────────
  // After a find-the-shot resolves, the coach asks whether the student can
  // SEE THE FOLLOW-UP — they play their calculation for the mover's side on
  // the board, the defender's PV reply auto-plays, and each ply is judged
  // (R4 trust contract: eval-equivalent counts; unverifiable is credited
  // generously; only a VERIFIED fall-off feeds the calculation-depth
  // bucket). Then the coach PLAYS THE FULL LINE OUT with per-ply grounded
  // narration (facts computed in pvPlayback; phrasing via voiceFacts, the
  // deterministic renderPlyFactLine as fallback — G0 throughout).
  //
  // R6 note: this is a STAGE of the existing shot flow (shot → sequence →
  // playback are sequential, never concurrent with shotState), not a new
  // independent card — the collision surface stays the shot card's.
  interface SeqState {
    line: PvLine;
    /** Prefetched spoken line per ply (null = quiet ply / phrasing failed →
     *  deterministic fallback at speak time). */
    voice: (string | null)[];
    stage: 'ask' | 'playback';
    /** Index into line.plies of the NEXT expected ply. */
    ptr: number;
    /** Mover plies the student got through in the ask stage. */
    reached: number;
    /** Mover plies the ask stage asks for (plies from ptr0, mover's side). */
    totalAsk: number;
    /** The walk ply the parent shot fired on (bucket metadata). */
    atPly: number;
    /** Set when the playback follows a VERIFIED fall-off — the closing
     *  line then teaches the calculation-depth device (Phase 3). */
    fellOff?: boolean;
  }
  const [seqState, setSeqState] = useState<SeqState | null>(null);
  const seqStateRef = useRef<SeqState | null>(null);
  useEffect(() => { seqStateRef.current = seqState; }, [seqState]);
  /** Cancellation token for the playback loop — bumped to cancel. */
  const seqRunTokenRef = useRef(0);
  /** PV prefetch per shot ply (computed in background when the shot fires). */
  const pvPrefetchRef = useRef<Map<number, PvLine | null>>(new Map());
  /** The ply of the most recent shot (sequence eligibility is checked when
   *  the shot resolves, after shotState is already cleared). */
  const lastShotPlyRef = useRef<number | null>(null);
  /** §5: the flagged move's better-line seed, captured when the why-picker
   *  fires and consumed in resumeAfterFaucet to play the engine's PV out. */
  const pendingBetterLineRef = useRef<{ fenBefore: string; bestUci: string; playedSan: string; bestSan: string | null } | null>(null);
  /** Cancellation token for the better-line playback loop. */
  const betterLineTokenRef = useRef(0);

  useEffect(() => {
    // Fresh game → nothing carried over.
    setSeqState(null);
    seqRunTokenRef.current += 1;
    pvPrefetchRef.current = new Map();
    lastShotPlyRef.current = null;
  }, [props.gameId]);

  const cancelSequence = useCallback((): void => {
    seqRunTokenRef.current += 1;
    if (seqStateRef.current) {
      setSeqState(null);
      setWalkExplorationFen(null);
      setWalkExplorationSan(null);
      setWalkExplorationArrows(null);
    }
  }, []);

  /** Background PV prefetch when a shot fires (R5: ready by resolution;
   *  budget-capped so it never stalls anything). */
  const prefetchPvForShot = useCallback((ply: number, fenBefore: string, bestUci: string): void => {
    lastShotPlyRef.current = ply;
    if (pvPrefetchRef.current.has(ply)) return;
    pvPrefetchRef.current.set(ply, null); // reserve — single flight
    void computePvLine(fenBefore, {
      firstUci: bestUci,
      maxPlies: 8,
      depth: 12,
      engine: { analyzePosition: (f, d) => stockfishEngine.analyzeWithBudget(f, d, 4000) },
    }).then((line) => {
      pvPrefetchRef.current.set(ply, line);
      if (!line) return;
      // Prefetch the spoken lines too (per-ply voiceFacts; quiet plies stay
      // null → silent). Fire-and-forget — playback falls back per ply.
      void Promise.all(line.plies.map(async (p) => {
        const facts = plyFactsString(p);
        if (!facts) return null;
        try {
          const phrased = await voiceFacts(facts, { intent: 'review-pv-playback', warm: true });
          return phrased ?? null;
        } catch { return null; }
      })).then((voice) => {
        const cur = pvPrefetchRef.current.get(ply);
        if (cur === line) {
          (line as PvLine & { __voice?: (string | null)[] }).__voice = voice;
        }
      });
    });
  }, []);

  // The resume TAIL after the faucet (+ better-line playout) finishes: an armed
  // device quiz, else the rewind offer, else advance. Extracted so both the
  // plain path and the better-line path end the same way.
  const finishFaucetResume = useCallback((): void => {
    // Clear the "show the played move" exploration FEN set when the why-picker
    // was raised, so the board doesn't stick on the flagged move as we resume.
    setWalkExplorationFen(null);
    setWalkExplorationSan(null);
    setWalkExplorationArrows(null);
    const quiz = principleQuizRef.current;
    if (quiz && !principleQuizShownRef.current) {
      principleQuizShownRef.current = true;
      principleQuizRef.current = null;
      setPrincipleQuizState(quiz);
      captureEvent('review_principle_quiz_offered', { tag: quiz.tag, candidates: quiz.candidates.length });
      void voiceService.speakForced(quiz.ask).catch(() => undefined);
      return;
    }
    if (maybeOfferRewind()) return; // the rewind card takes over the advance
    walkPlayback.goForward();
  }, [walkPlayback, maybeOfferRewind]);

  // §5 WALK-THE-BETTER-LINE: after a flagged-move reveal, play the engine's
  // better line OUT on the exploration board with the why per move — Danya's
  // #1 habit. FULLY G0: the line is the real engine PV (computePvLine); the
  // per-move why is computed from PlyFacts (plyFactsString → voiceFacts, with
  // renderPlyFactLine as the deterministic fallback); the closing verdict is
  // the line's terminal eval. Nothing is invented — a quiet ply stays silent.
  const playBetterLineOut = useCallback(async (
    seed: { fenBefore: string; bestUci: string; bestSan: string | null },
    onDone: () => void,
  ): Promise<void> => {
    const token = ++betterLineTokenRef.current;
    let line: PvLine | null = null;
    try {
      line = await computePvLine(seed.fenBefore, {
        firstUci: seed.bestUci,
        maxPlies: 6,
        depth: 12,
        engine: { analyzePosition: (f, d) => stockfishEngine.analyzeWithBudget(f, d, 3500) },
      });
    } catch { line = null; }
    if (betterLineTokenRef.current !== token || !walkMountedRef.current) { onDone(); return; }
    if (!line || line.plies.length === 0) { onDone(); return; }
    // EVERY move in the shown line gets a why — not just the tactical ones
    // (David 2026-07-19: "no per move why… quickly moves from move to move, then
    // states the verdict"). plyFactsString is null on a quiet ply, so fall back
    // to the positional teaching note. BATCH-WARM the whole line's whys through
    // the ONE house-voice call (same as the walk) so each is in the register,
    // not a raw template — one call, no per-ply racing.
    const rawWhys = line.plies.map((ply, i) => ({
      id: i,
      fact: plyFactsString(ply) ?? renderPlyFactLine(ply) ?? buildReviewMoveTeaching(ply.fenBefore, ply.san) ?? '',
    }));
    // PACE ON REAL AUDIO (David 2026-07-19: "no per move why… quickly moves from
    // move to move then states the verdict"). The bug: the flagged ply's own
    // narration is a ~5s clip still PLAYING when the playout starts, and
    // voiceService's no-overlap guard DROPS any forced line fired while a clip
    // plays (it isn't gated on force) — so every per-move why was dropped and
    // only the verdict survived. speakForced can also resolve before audio-END.
    // So we gate on isPlaying(): wait for the voice to be free before AND after
    // each line, so exactly one why plays per board move, in order, none dropped.
    // In UNCAPPED mode the per-move narration is much longer (all facts voiced),
    // so a 9s idle-wait timed out and the playout intro fired into still-playing
    // voice and got DROPPED (David 2026-07-20 sweep: the IQP playout collided).
    // Give it room to wait for the long narration to finish first.
    const IDLE_MAX = isReviewUncapped() ? 22000 : 9000;
    const waitVoiceIdle = async (maxMs = IDLE_MAX): Promise<void> => {
      const start = performance.now();
      while (voiceService.isPlaying() && performance.now() - start < maxMs) {
        if (betterLineTokenRef.current !== token || !walkMountedRef.current) return;
        await new Promise((r) => setTimeout(r, 120));
      }
    };
    const speakPaced = async (t: string): Promise<void> => {
      await waitVoiceIdle();              // let whatever is playing finish → guard passes
      if (betterLineTokenRef.current !== token || !walkMountedRef.current) return;
      try { await voiceService.speakForced(t); } catch { /* voice off */ }
      await waitVoiceIdle();              // hold the board until THIS why finishes
    };
    // Speak the intro FIRST — masks the ~2s grounding warm below so the walk
    // doesn't feel like a dead pause after the card (David 2026-07-20: "decrease
    // the time from card to best line walk"). The warm runs while it plays.
    const intro = seed.bestSan ? `Here's the stronger line — ${seed.bestSan}.` : "Here's the stronger line.";
    await speakPaced(intro);
    let warmed = new Map<number, string>();
    try { warmed = await voiceReviewLines(rawWhys.filter((w) => w.fact.length > 0)); } catch { /* raw fallback */ }
    if (betterLineTokenRef.current !== token || !walkMountedRef.current) { onDone(); return; }
    for (let i = 0; i < line.plies.length; i++) {
      if (betterLineTokenRef.current !== token || !walkMountedRef.current) { onDone(); return; }
      const ply = line.plies[i];
      setWalkExplorationFen(ply.fenAfter);
      setWalkExplorationSan(ply.san);
      setWalkExplorationArrows([{ startSquare: ply.uci.slice(0, 2), endSquare: ply.uci.slice(2, 4), color: '#22c55e' }]);
      playMoveSound(ply.san);
      const spoken = warmed.get(i) ?? (rawWhys[i].fact.length > 0 ? rawWhys[i].fact : null);
      if (betterLineTokenRef.current !== token || !walkMountedRef.current) { onDone(); return; }
      if (spoken) await speakPaced(spoken);
      else await new Promise((r) => setTimeout(r, 500));
    }
    if (betterLineTokenRef.current !== token || !walkMountedRef.current) { onDone(); return; }
    const moverIsWhite = line.plies[0].moverColor === 'white';
    const povCp = (moverIsWhite ? 1 : -1) * (line.terminalEvalCp ?? line.rootEvalCp);
    const closing = line.plies[line.plies.length - 1].facts.isMate
      ? 'That line goes all the way to mate.'
      : `That line is about ${(Math.abs(povCp) / 100).toFixed(1)} pawns better.`;
    await speakPaced(closing);
    setWalkExplorationFen(null);
    setWalkExplorationSan(null);
    setWalkExplorationArrows(null);
    onDone();
  }, [playMoveSound]);

  // Play the OPENING THEORY LECTURE — the masters-DB tour of the mainline,
  // sidelines, best moves, and where the game left theory. Each beat sits the
  // board on the game's position, arrows the theory move, and speaks the
  // grounded fact through the house voice (batch-warmed, paced on real audio).
  const playOpeningTheory = useCallback(async (): Promise<void> => {
    const beats = theoryBeats;
    if (!beats || beats.length === 0 || theoryLecturePlaying) return;
    const token = ++theoryLectureTokenRef.current;
    setTheoryLecturePlaying(true);
    const waitIdle = async (maxMs = 12000): Promise<void> => {
      const start = performance.now();
      while (voiceService.isPlaying() && performance.now() - start < maxMs) {
        if (theoryLectureTokenRef.current !== token || !walkMountedRef.current) return;
        await new Promise((r) => setTimeout(r, 120));
      }
    };
    let warmed = new Map<number, string>();
    try { warmed = await voiceReviewLines(beats.map((b, i) => ({ id: i, fact: b.fact }))); } catch { /* raw */ }
    for (let i = 0; i < beats.length; i++) {
      if (theoryLectureTokenRef.current !== token || !walkMountedRef.current) break;
      const b = beats[i];
      setWalkExplorationFen(b.fenBefore);
      if (b.showUci) {
        setWalkExplorationArrows([{ startSquare: b.showUci.slice(0, 2), endSquare: b.showUci.slice(2, 4), color: '#3b82f6' }]);
      } else {
        setWalkExplorationArrows(null);
      }
      await waitIdle();
      if (theoryLectureTokenRef.current !== token || !walkMountedRef.current) break;
      const line = warmed.get(i) ?? b.fact;
      setTheoryCaption(line); // visible even if voice is muted (David 2026-07-21)
      try { await voiceService.speakForced(line); } catch { /* voice off */ }
      await waitIdle();
      // DIVE DOWN the line (Danya's "let's see the next couple of moves"): play
      // out the masters continuation on the board, arrowing each move.
      if (b.dive && b.diveFromFen && b.dive.length > 0) {
        let prevFen = b.diveFromFen;
        setWalkExplorationFen(prevFen);
        setWalkExplorationArrows(null);
        await new Promise((r) => setTimeout(r, 500));
        for (const step of b.dive) {
          if (theoryLectureTokenRef.current !== token || !walkMountedRef.current) break;
          try {
            const cc = new Chess(prevFen);
            const m = cc.move(step.san);
            if (m) setWalkExplorationArrows([{ startSquare: m.from, endSquare: m.to, color: '#3b82f6' }]);
          } catch { /* arrow is a bonus */ }
          setWalkExplorationFen(step.fenAfter);
          playMoveSound(step.san);
          prevFen = step.fenAfter;
          await new Promise((r) => setTimeout(r, 850));
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    setWalkExplorationFen(null);
    setWalkExplorationSan(null);
    setWalkExplorationArrows(null);
    setTheoryCaption(null);
    setTheoryLecturePlaying(false);
  }, [theoryBeats, theoryLecturePlaying, playMoveSound]);

  const stopOpeningTheory = useCallback((): void => {
    theoryLectureTokenRef.current += 1;
    setTheoryLecturePlaying(false);
    setWalkExplorationFen(null);
    setWalkExplorationSan(null);
    setWalkExplorationArrows(null);
    setTheoryCaption(null);
    voiceService.stop();
  }, []);

  const resumeAfterFaucet = useCallback((): void => {
    resetFaucet();
    const better = pendingBetterLineRef.current;
    pendingBetterLineRef.current = null;
    // §5: play the engine's better line out first (if the flagged move had a
    // distinct best move), THEN run the resume tail. Otherwise resume directly.
    if (better) {
      void playBetterLineOut(better, finishFaucetResume);
      return;
    }
    finishFaucetResume();
  }, [resetFaucet, playBetterLineOut, finishFaucetResume]);

  /** The playback leg: the coach plays the line out on the exploration
   *  board, narrating keystones. Cancellable; resumes the walk at the end. */
  const runSequencePlayback = useCallback(async (state: SeqState, fromIdx: number): Promise<void> => {
    const token = ++seqRunTokenRef.current;
    setSeqState({ ...state, stage: 'playback', ptr: fromIdx });
    const { line } = state;
    captureEvent('review_sequence_playback', { plies: line.plies.length, from: fromIdx });
    for (let i = fromIdx; i < line.plies.length; i++) {
      if (seqRunTokenRef.current !== token || !walkMountedRef.current) return;
      const ply = line.plies[i];
      setWalkExplorationFen(ply.fenAfter);
      setWalkExplorationSan(ply.san);
      playMoveSound(ply.san);
      const spoken = state.voice[i] ?? renderPlyFactLine(ply);
      if (spoken) {
        try { await voiceService.speakForced(spoken); } catch { /* voice off */ }
        if (seqRunTokenRef.current !== token || !walkMountedRef.current) return;
        await new Promise((r) => setTimeout(r, 350));
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }
    }
    if (seqRunTokenRef.current !== token || !walkMountedRef.current) return;
    // Land the verdict the line's computed facts give.
    const last = line.plies[line.plies.length - 1];
    const moverIsWhite = line.plies[0].moverColor === 'white';
    const povCp = (moverIsWhite ? 1 : -1) * (line.terminalEvalCp ?? line.rootEvalCp);
    let closing = last.facts.isMate
      ? "That's the line — all the way to mate."
      : `That's the line — about ${(Math.abs(povCp) / 100).toFixed(1)} pawns better at the end.`;
    if (state.fellOff) {
      // THE DEVICE (Phase 3) — a verified fall-off closes with the
      // calculation-depth tool + the computed "seen this before" history.
      const device = principleFor('calculation-depth');
      if (device) closing = `${closing} ${device}`;
      try {
        const callback = await buildMisconceptionCallback('calculation-depth');
        if (callback) closing = `${closing} ${callback}`;
      } catch { /* history is a bonus, never a blocker */ }
    }
    try { await voiceService.speakForced(closing); } catch { /* voice off */ }
    setSeqState(null);
    setWalkExplorationFen(null);
    setWalkExplorationSan(null);
    if (!maybeOfferRewind()) walkPlayback.goForward();
  }, [maybeOfferRewind, walkPlayback, playMoveSound]);

  /** Called when a shot resolves (found or hint). Starts the sequence ask
   *  when the prefetched PV delivers and is deep enough; false = caller
   *  proceeds as before (rewind offer / walk forward). */
  const tryStartSequence = useCallback((): boolean => {
    const ply = lastShotPlyRef.current;
    if (ply === null) return false;
    const line = pvPrefetchRef.current.get(ply);
    if (!line || !line.delivers || line.plies.length < 4) return false;
    // The student just found/saw plies[0]; the defender's reply auto-plays;
    // the ask covers the MOVER plies from index 2 on.
    const totalAsk = moverPlies(line.plies.slice(2)).length;
    if (totalAsk === 0) return false;
    const voice = (line as PvLine & { __voice?: (string | null)[] }).__voice
      ?? line.plies.map(() => null);
    const state: SeqState = { line, voice, stage: 'ask', ptr: 2, reached: 0, totalAsk, atPly: ply };
    setSeqState(state);
    captureEvent('review_sequence_asked', { plies: line.plies.length, total_ask: totalAsk });
    // Show move 1 landing, then the defender's reply, then ask.
    setWalkExplorationFen(line.plies[0].fenAfter);
    setWalkExplorationSan(line.plies[0].san);
    const token = ++seqRunTokenRef.current;
    void (async () => {
      await new Promise((r) => setTimeout(r, 700));
      if (seqRunTokenRef.current !== token || !walkMountedRef.current) return;
      if (line.plies[1]) {
        setWalkExplorationFen(line.plies[1].fenAfter);
        setWalkExplorationSan(line.plies[1].san);
        playMoveSound(line.plies[1].san);
      }
      const ask = `${line.plies[1] ? `He answers ${line.plies[1].san}. ` : ''}Can you see the follow-up? Play your next move.`;
      try { await voiceService.speakForced(ask); } catch { /* voice off */ }
    })();
    return true;
  }, [playMoveSound]);
  tryStartSequenceRef.current = tryStartSequence;

  /** Judge a board move played during the ask stage. */
  const handleSequenceMove = useCallback((moveResult: { san: string; from: string; to: string; fen: string }): void => {
    const state = seqStateRef.current;
    if (!state || state.stage !== 'ask') return;
    const expected = state.line.plies[state.ptr];
    if (!expected) return;
    void (async () => {
      let verdict: SequenceVerdict;
      try {
        verdict = await judgeSequenceAttempt({
          expected,
          attempt: { san: moveResult.san, from: moveResult.from, to: moveResult.to },
          pvLineEvalCp: state.line.rootEvalCp,
          evalProbe: async (fen, uciMove) => {
            const probe = new Chess(fen);
            const applied = probe.move({
              from: uciMove.slice(0, 2),
              to: uciMove.slice(2, 4),
              promotion: uciMove.length > 4 ? uciMove.slice(4) : undefined,
            });
            if (!applied) throw new Error('illegal probe move');
            const a = await stockfishEngine.analyzeWithBudget(probe.fen(), 12, 2500);
            return a.evaluation;
          },
        });
      } catch {
        verdict = 'unverified';
      }
      if (!walkMountedRef.current || seqStateRef.current !== state) return;
      captureEvent('review_sequence_ply', { verdict, ptr: state.ptr, expected: expected.san, played: moveResult.san });
      if (verdict === 'wrong') {
        // VERIFIED fall-off → this is the calculation-depth data point
        // (David: "that's a bucket we can tag") — then teach the line.
        const seg = walkNarration?.segments.find((s) => s.ply === state.atPly);
        void logMisconception({
          tag: 'calculation-depth',
          source: 'game-review',
          fen: expected.fenBefore,
          playedSan: moveResult.san,
          bestSan: expected.san,
          gamePhase: classifyPhase(expected.fenBefore, state.atPly),
          moveNumber: Math.ceil(state.atPly / 2),
          openingId: openingName ? resolveOpeningIdFromName(openingName) ?? undefined : undefined,
          openingName: openingName ?? undefined,
          coachNote: `Spot-the-sequence: reached ${state.reached} of ${state.totalAsk} follow-up moves (line: ${state.line.plies.map((p) => p.san).join(' ')})`,
          sourceGameId: props.gameId,
        });
        captureEvent('review_sequence_falloff', { reached: state.reached, total: state.totalAsk, at_ply: state.atPly, opening: seg ? openingName : openingName });
        setShotBoardEpoch((e) => e + 1); // snap their move back
        void voiceService.speakForced(`Not quite — ${moveResult.san} lets it slip. Watch the full line.`).catch(() => undefined);
        void runSequencePlayback({ ...state, fellOff: true }, state.ptr);
        return;
      }
      // Credit (exact / equivalent / unverified-generous).
      const reached = state.reached + 1;
      if (verdict !== 'exact') {
        // Their equally-good move diverges from the PV — credit it, then
        // show the engine's line from here so the teaching stays coherent.
        void voiceService.speakForced(`${moveResult.san} works just as well — you're seeing it. Here's the engine's own line.`).catch(() => undefined);
        void runSequencePlayback({ ...state, reached }, state.ptr);
        return;
      }
      // Exact: land their move, auto-play the defender's reply, continue.
      setWalkExplorationFen(expected.fenAfter);
      setWalkExplorationSan(expected.san);
      const next = state.ptr + 1;
      const defender = state.line.plies[next];
      const afterDefender = next + 1;
      const done = afterDefender >= state.line.plies.length;
      const token = ++seqRunTokenRef.current;
      void (async () => {
        await new Promise((r) => setTimeout(r, 650));
        if (seqRunTokenRef.current !== token || !walkMountedRef.current) return;
        if (defender) {
          setWalkExplorationFen(defender.fenAfter);
          setWalkExplorationSan(defender.san);
          playMoveSound(defender.san);
        }
        if (done) {
          captureEvent('review_sequence_completed', { reached, total: state.totalAsk, at_ply: state.atPly });
          const bravo = 'You saw the whole thing — that was the line, move for move.';
          try { await voiceService.speakForced(bravo, { prosodySpike: true }); } catch { /* voice off */ }
          if (seqRunTokenRef.current !== token || !walkMountedRef.current) return;
          setSeqState(null);
          setWalkExplorationFen(null);
          setWalkExplorationSan(null);
          if (!maybeOfferRewind()) walkPlayback.goForward();
        } else {
          setSeqState({ ...state, ptr: afterDefender, reached });
          void voiceService.speakForced(defender ? `${defender.san}. And now?` : 'And now?').catch(() => undefined);
        }
      })();
    })();
  }, [walkNarration, openingName, props.gameId, runSequencePlayback, maybeOfferRewind, walkPlayback, playMoveSound]);

  const resolveReadingGate = useCallback((): void => {
    setReadingGate((g) => { if (g) quizzedPliesRef.current.add(g.ply); return null; });
    walkPlayback.goForward();
  }, [walkPlayback]);

  // Move sound on every walk advance — Polly + voice narration is
  // great pedagogy but the silent piece transition makes it hard to
  // pick out which piece moved. usePieceSound matches the chime the
  // Learn-with-Coach board plays on student moves (per David's
  // 2026-05 review audit feedback). (The hook CALL moved above the
  // sequence block — Phase 1 — which needs playMoveSound earlier.)
  const lastSoundPlyRef = useRef<number>(walkPlayback.currentPly);
  useEffect(() => {
    if (walkPlayback.currentPly === lastSoundPlyRef.current) return;
    const advancedForward = walkPlayback.currentPly > lastSoundPlyRef.current;
    const targetPly = walkPlayback.currentPly;
    lastSoundPlyRef.current = targetPly;
    // Skip the silent boot-up render (no transition to sound).
    if (targetPly === 0) return;
    // Use the SAN of the ply we just arrived at — for forward
    // motion that's the move played; for back motion it's the move
    // we're un-playing (sound still helps signal that something
    // moved). When the segment SAN is missing fall back to
    // moves[ply-1].san.
    const seg = walkPlayback.currentSegment;
    const san = seg?.san ?? moves[targetPly - 1]?.san;
    if (san) playMoveSound(san);
    void advancedForward;
  }, [walkPlayback.currentPly, walkPlayback.currentSegment, moves, playMoveSound]);

  // Auto-clear walk exploration when the student steps to a different
  // ply. Exploration is anchored to ONE position — once they nav away,
  // the actual game line resumes silently (snap-back is implicit).
  useEffect(() => {
    if (
      walkExplorationFen !== null &&
      walkExplorationPlyRef.current !== null &&
      walkExplorationPlyRef.current !== walkPlayback.currentPly
    ) {
      void logAppAudit({
        kind: 'review-walk-resumed',
        category: 'subsystem',
        source: 'CoachGameReview.walkAutoResume',
        summary: `ply changed (${walkExplorationPlyRef.current}→${walkPlayback.currentPly}) — auto-resumed actual line`,
        details: JSON.stringify({
          fromPly: walkExplorationPlyRef.current,
          toPly: walkPlayback.currentPly,
          exploredSan: walkExplorationSan,
          reason: 'ply-changed',
        }),
      });
      setWalkExplorationFen(null);
      setWalkExplorationSan(null);
      walkExplorationPlyRef.current = null;
    }
  }, [walkPlayback.currentPly, walkExplorationFen, walkExplorationSan]);

  // Reset the explore-toggle on every ply change. Each arrow-bearing
  // ply has its OWN suggested-move-vs-played-move discussion, so the
  // student should opt in fresh on each one. Keeps the canonical
  // playback path animating cleanly when they just press Next.
  useEffect(() => {
    setWalkExploreToggleOn(false);
    // Show-me playout is also ply-anchored — if the student nav's
    // away mid-playout we cancel it. The async loop checks this
    // flag every iteration and bails when it flips false.
    setWalkShowMeActive(false);
  }, [walkPlayback.currentPly]);

  // WO-REVIEW-02b — Engine lines panel. Off by default. Analyzes every
  // position in the walk (starting position + one FEN per ply) via
  // Stockfish MultiPV once the user toggles it on.
  const [engineLinesEnabled, setEngineLinesEnabled] = useState(false);
  const reviewFens = useMemo<string[] | null>(() => {
    if (!walkNarration || walkNarration.segments.length === 0) return null;
    const fens: string[] = [walkNarration.segments[0].fenBefore];
    for (const seg of walkNarration.segments) fens.push(seg.fenAfter);
    return fens;
  }, [walkNarration]);
  const engineLines = useReviewEngineLines({ fens: reviewFens, enabled: engineLinesEnabled });

  // ── MODEL-GAME CAMEO (Phase 2, David 2026-07-18) ─────────────────────────
  // Danya's cameo: RARE (one per review, never more), NAMED (players, year,
  // event), entering at the THEMATIC moment, with the comparison verified on
  // BOTH boards (sharedFeatures are computed feature intersections — G0).
  // The anchor ply is where the student game's structural match against the
  // corpus PEAKS; the card offers the classic, never forces it.
  interface CameoState {
    anchor: CameoAnchor;
    playback: CameoPlayback;
    stage: 'ask' | 'playback';
  }
  const [cameoState, setCameoState] = useState<CameoState | null>(null);
  useEffect(() => { cameoStateRef.current = cameoState; }, [cameoState]);
  const cameoAnchorRef = useRef<{ anchor: CameoAnchor; playback: CameoPlayback } | null>(null);
  const cameoScanDoneRef = useRef(false);
  const cameoShownRef = useRef(false);
  const cameoRunTokenRef = useRef(0);

  useEffect(() => {
    setCameoState(null);
    cameoAnchorRef.current = null;
    cameoScanDoneRef.current = false;
    cameoShownRef.current = false;
    cameoRunTokenRef.current += 1;
    setPrincipleQuizState(null);
    principleQuizRef.current = null;
    principleQuizShownRef.current = false;
  }, [props.gameId]);

  // One corpus scan per game, deferred off the mount path.
  useEffect(() => {
    if (cameoScanDoneRef.current || !reviewFens || reviewFens.length === 0) return;
    cameoScanDoneRef.current = true;
    const fens = reviewFens;
    const family = openingName ? openingName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null;
    const t = window.setTimeout(() => {
      const anchor = pickCameoAnchor(fens, { openingFamily: family });
      const playback = anchor ? buildCameoPlayback(anchor.cameo) : null;
      if (anchor && playback) cameoAnchorRef.current = { anchor, playback };
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'CoachGameReview.cameoScan',
        summary: `cameo scan: ${anchor ? (playback ? `found ${anchor.cameo.white} vs ${anchor.cameo.black} @ ply ${anchor.plyIndex}` : 'found-but-unplayable') : 'no-match-above-floor'}`,
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [reviewFens, openingName]);

  const cancelCameo = useCallback((): void => {
    cameoRunTokenRef.current += 1;
    if (cameoStateRef.current) {
      setCameoState(null);
      setWalkExplorationFen(null);
      setWalkExplorationSan(null);
    }
  }, []);

  /** Play the classic's thematic stretch on the review board: intro line,
   *  silent voice-free plies (the board is the lesson), then the tie-back
   *  citing the SHARED feature — every word computed metadata (G0). */
  const runCameoPlayback = useCallback(async (state: CameoState): Promise<void> => {
    const token = ++cameoRunTokenRef.current;
    setCameoState({ ...state, stage: 'playback' });
    const { anchor, playback } = state;
    const c = anchor.cameo;
    const yearPart = c.year !== null ? `, ${c.year}` : '';
    const eventPart = c.event ? `. ${c.event}` : '';
    const feature = c.sharedFeatures[0] ?? 'the same structure';
    const intro = `${c.white} against ${c.black}${yearPart}${eventPart}. Same fabric as your game — ${feature}. Watch.`;
    setWalkExplorationFen(playback.startFen);
    setWalkExplorationSan(null);
    try {
      await voiceService.speakForced(intro);
    } catch { /* voice failure never blocks the board */ }
    if (cameoRunTokenRef.current !== token || !walkMountedRef.current) return;
    for (const p of playback.plies) {
      await new Promise((r) => setTimeout(r, 1100));
      if (cameoRunTokenRef.current !== token || !walkMountedRef.current) return;
      setWalkExplorationFen(p.fenAfter);
      setWalkExplorationSan(p.san);
      playMoveSound(p.san);
    }
    await new Promise((r) => setTimeout(r, 900));
    if (cameoRunTokenRef.current !== token || !walkMountedRef.current) return;
    const tieBack = `Back to your board — ${feature}, just like theirs.`;
    try {
      await voiceService.speakForced(tieBack);
    } catch { /* ignore */ }
    if (cameoRunTokenRef.current !== token || !walkMountedRef.current) return;
    setCameoState(null);
    setWalkExplorationFen(null);
    setWalkExplorationSan(null);
    captureEvent('review_cameo_watched', { game_id: c.gameId, ratio: c.ratio, matched: c.matched });
  }, [playMoveSound]);

  // Fire the ask ONCE, when the walk reaches the anchor ply and no other
  // card is open. The card is an offer — Skip costs nothing.
  useEffect(() => {
    if (cameoShownRef.current) return;
    const found = cameoAnchorRef.current;
    if (!found) return;
    if (walkPlayback.currentPly < found.anchor.plyIndex) return;
    if (shotState || shotReveal || turningQ || rewindOffer || seqStateRef.current) return;
    if (walkPlayback.currentPly >= moves.length) return; // game over → summary owns the wrap
    cameoShownRef.current = true;
    setCameoState({ anchor: found.anchor, playback: found.playback, stage: 'ask' });
    captureEvent('review_cameo_offered', {
      game_id: found.anchor.cameo.gameId,
      ply: found.anchor.plyIndex,
      ratio: found.anchor.cameo.ratio,
    });
  }, [walkPlayback.currentPly, shotState, shotReveal, turningQ, rewindOffer, moves.length]);

  // ── THEORY DEPARTURE (Phase 4, David 2026-07-18) ─────────────────────────
  // Danya quizzes theory before telling: at the ply where the game left
  // known master practice, the card first ASKS "what's the main move
  // here?" (board answer, Hint reveals), THEN plays the book line with
  // masters + your-level stats. Everything is a database aggregate
  // (theoryDeparture service — G0/G3); self-hides when the game never
  // left book or the data is thin.
  interface TheoryState {
    dep: TheoryDeparture;
    bookLine: BookLinePly[];
    stage: 'ask' | 'playback';
  }
  const [theoryState, setTheoryState] = useState<TheoryState | null>(null);
  useEffect(() => { theoryStateRef.current = theoryState; }, [theoryState]);
  const theoryFoundRef = useRef<{ dep: TheoryDeparture; bookLine: BookLinePly[] } | null>(null);
  const theoryScanDoneRef = useRef(false);
  const theoryShownRef = useRef(false);
  const theoryRunTokenRef = useRef(0);
  const theoryAttemptsRef = useRef(0);

  useEffect(() => {
    setTheoryState(null);
    theoryFoundRef.current = null;
    theoryScanDoneRef.current = false;
    theoryShownRef.current = false;
    theoryRunTokenRef.current += 1;
    theoryAttemptsRef.current = 0;
  }, [props.gameId]);

  // One departure scan per game, deferred; the book-line playback is
  // prefetched with it so Watch never waits on the network.
  useEffect(() => {
    if (theoryScanDoneRef.current || !reviewFens || reviewFens.length < 2) return;
    theoryScanDoneRef.current = true;
    const fens = reviewFens;
    const sans = moves.map((m) => m.san);
    const t = window.setTimeout(() => {
      const diag: { reason?: string } = {};
      void findTheoryDeparture(fens, sans, { studentRating: playerRating ?? null, diag })
        .then(async (dep) => {
          let outcome = diag.reason ?? 'unknown';
          if (dep) {
            const bookLine = await walkBookLine(dep.bookFen);
            if (bookLine.length === 0) {
              outcome = 'found-but-no-book-line';
            } else {
              theoryFoundRef.current = { dep, bookLine };
            }
          }
          // Observability (David 2026-07-19: the departure moment failed
          // SILENTLY on his real game) — every scan outcome is auditable.
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachGameReview.theoryScan',
            summary: `theory-departure scan: ${outcome}`,
            details: JSON.stringify({ outcome, plies: fens.length }),
          });
        })
        .catch((err: unknown) => {
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachGameReview.theoryScan',
            summary: `theory-departure scan THREW: ${err instanceof Error ? err.message : String(err)}`,
          });
        });
    }, 400);
    return () => window.clearTimeout(t);
  }, [reviewFens, moves, playerRating]);

  const cancelTheory = useCallback((): void => {
    theoryRunTokenRef.current += 1;
    if (theoryStateRef.current) {
      setTheoryState(null);
      setWalkExplorationFen(null);
      setWalkExplorationSan(null);
    }
  }, []);

  // Wire the late-bound canceller so handleWalkForward (declared ABOVE these
  // cards) can DISMISS the sequence / cameo / theory cards + advance, instead of
  // freezing the board behind them (the ply-21 stall the audit caught).
  useEffect(() => {
    dismissLateCardsRef.current = (): void => {
      cancelSequence();
      cancelCameo();
      cancelTheory();
    };
    return () => { dismissLateCardsRef.current = null; };
  }, [cancelSequence, cancelCameo, cancelTheory]);

  // Build the opening-theory lecture once per game (masters-DB tour of the
  // mainline / sidelines / best moves / departure), deferred off the mount path.
  useEffect(() => {
    setTheoryBeats(null);
    if (!reviewFens || reviewFens.length < 2) return;
    const sans = moves.map((m) => m.san);
    let cancelled = false;
    const t = window.setTimeout(() => {
      void buildOpeningTheoryLecture(reviewFens, sans, openingName ?? 'this opening')
        .then((lec) => {
          if (cancelled || !lec) return;
          setTheoryBeats(buildTheoryLectureBeats(lec, resolveOpeningIdeas(openingName)));
        })
        .catch(() => { /* DB down — no lecture, no crash */ });
    }, 500);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [reviewFens, moves, openingName]);

  /** The computed stats line — masters share + your-level share. */
  const theoryStatsLine = useCallback((dep: TheoryDeparture): string => {
    const pct = Math.round(dep.mainMove.pct * 100);
    let line = `Masters play ${dep.mainMove.san} here — ${pct} percent of ${dep.totalGames} games.`;
    if (dep.yourLevel && dep.yourLevel.san !== dep.mainMove.san) {
      line += ` At your level ${dep.yourLevel.san} is the popular pick, ${Math.round(dep.yourLevel.pct * 100)} percent.`;
    } else if (dep.yourLevel) {
      line += ` Your level agrees — ${Math.round(dep.yourLevel.pct * 100)} percent play it too.`;
    }
    return line;
  }, []);

  /** Book-line playback: board jumps to the book position and the masters'
   *  main line plays out silently (the board is the lesson), stats spoken
   *  at the start, a short hand-back at the end. */
  const runTheoryPlayback = useCallback(async (state: TheoryState): Promise<void> => {
    const token = ++theoryRunTokenRef.current;
    setTheoryState({ ...state, stage: 'playback' });
    setWalkExplorationFen(state.dep.bookFen);
    setWalkExplorationSan(null);
    try {
      await voiceService.speakForced(`${theoryStatsLine(state.dep)} Watch the book line.`);
    } catch { /* voice off */ }
    if (theoryRunTokenRef.current !== token || !walkMountedRef.current) return;
    for (const p of state.bookLine) {
      await new Promise((r) => setTimeout(r, 1100));
      if (theoryRunTokenRef.current !== token || !walkMountedRef.current) return;
      setWalkExplorationFen(p.fenAfter);
      setWalkExplorationSan(p.san);
      playMoveSound(p.san);
    }
    await new Promise((r) => setTimeout(r, 900));
    if (theoryRunTokenRef.current !== token || !walkMountedRef.current) return;
    try {
      await voiceService.speakForced('That is where the book goes — back to your game.');
    } catch { /* ignore */ }
    if (theoryRunTokenRef.current !== token || !walkMountedRef.current) return;
    setTheoryState(null);
    setWalkExplorationFen(null);
    setWalkExplorationSan(null);
    captureEvent('review_theory_playback_done', { plies: state.bookLine.length });
  }, [playMoveSound, theoryStatsLine]);

  /** Board answer during the ask — judged against the masters' book. */
  const handleTheoryMove = useCallback((san: string): void => {
    const state = theoryStateRef.current as TheoryState | null;
    if (!state || state.stage !== 'ask') return;
    const dep = state.dep;
    if (san === dep.mainMove.san) {
      captureEvent('review_theory_result', { outcome: 'main', attempts: theoryAttemptsRef.current + 1 });
      void voiceService.speakForced(`${san} — you know the book.`, { prosodySpike: true }).catch(() => undefined);
      void runTheoryPlayback(state);
      return;
    }
    if (dep.topMoves.some((m) => m.san === san)) {
      captureEvent('review_theory_result', { outcome: 'book-alt', attempts: theoryAttemptsRef.current + 1 });
      void voiceService.speakForced(`${san} is book too — the main move is ${dep.mainMove.san}.`).catch(() => undefined);
      void runTheoryPlayback(state);
      return;
    }
    theoryAttemptsRef.current += 1;
    setShotBoardEpoch((e) => e + 1); // snap the guess back
    if (theoryAttemptsRef.current >= 2) {
      captureEvent('review_theory_result', { outcome: 'revealed', attempts: theoryAttemptsRef.current });
      void runTheoryPlayback(state);
      return;
    }
    captureEvent('review_theory_result', { outcome: 'retry', attempts: theoryAttemptsRef.current });
    void voiceService.speakForced('Not that one — look again.').catch(() => undefined);
  }, [runTheoryPlayback]);

  // Fire ONCE, when the walk reaches the departure ply and no other card
  // is open. Hidden from the UI (David 2026-07-20: "remove 3 and 4" — the
  // in-walk theory-departure CARD is redundant with the 📖 Opening Theory
  // button, which stays). Code kept behind the flag; the button is separate.
  useEffect(() => {
    if (!THEORY_DEPARTURE_CARD_ENABLED) return;
    if (theoryShownRef.current) return;
    const found = theoryFoundRef.current;
    if (!found) return;
    if (walkPlayback.currentPly < found.dep.departurePly) return;
    if (walkPlayback.currentPly >= moves.length) return;
    if (shotState || shotReveal || turningQ || rewindOffer || seqStateRef.current || cameoStateRef.current || principleQuizStateRef.current) return;
    theoryShownRef.current = true;
    setTheoryState({ dep: found.dep, bookLine: found.bookLine, stage: 'ask' });
    setWalkExplorationFen(found.dep.bookFen); // the ask happens AT the book position
    setWalkExplorationSan(null);
    captureEvent('review_theory_offered', { ply: found.dep.departurePly, total_games: found.dep.totalGames });
    void voiceService
      .speakForced(`Book ended here — ${found.dep.departedSan} left known practice. What's the main move in this position?`)
      .catch(() => undefined);
  }, [walkPlayback.currentPly, shotState, shotReveal, turningQ, rewindOffer, moves.length]);

  // ── THEME OF THE GAME (Phase 5, David 2026-07-18) ────────────────────────
  // The theme EMERGES — never promised up front. Classified once from the
  // computed eval trace + classifications + structure (closed set, hard
  // confidence floor, honest null); NAMED by voice at the peak-evidence
  // ply; reprised in the turning-point reveal. No card — it's a thread,
  // not an interruption.
  const themeRef = useRef<GameThemeResult | null>(null);
  const themeSpokenRef = useRef(false);
  useEffect(() => {
    themeRef.current = null;
    themeSpokenRef.current = false;
  }, [props.gameId]);

  useEffect(() => {
    if (themeRef.current || !walkNarration || walkNarration.segments.length === 0) return;
    themeRef.current = classifyGameTheme(walkNarration.segments, playerColor);
    if (themeRef.current) {
      captureEvent('review_theme_classified', {
        theme: themeRef.current.theme,
        peak_ply: themeRef.current.peakPly,
        confidence: themeRef.current.confidence,
      });
    }
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachGameReview.themeScan',
      summary: themeRef.current
        ? `theme: ${themeRef.current.theme} @ peak ply ${themeRef.current.peakPly} (conf ${themeRef.current.confidence.toFixed(2)})`
        : 'theme: none (below floor or ambiguous)',
    });
  }, [walkNarration, playerColor]);

  useEffect(() => {
    if (themeSpokenRef.current) return;
    const theme = themeRef.current;
    if (!theme) return;
    if (walkPlayback.currentPly < theme.peakPly) return;
    // Non-blocking, but never talk over an open question or playback.
    if (shotState || shotReveal || turningQ || rewindOffer || seqStateRef.current || cameoStateRef.current || theoryStateRef.current || principleQuizStateRef.current) return;
    themeSpokenRef.current = true;
    captureEvent('review_theme_named', { theme: theme.theme, at_ply: walkPlayback.currentPly });
    void voiceService.speakForced(theme.line).catch(() => undefined);
  }, [walkPlayback.currentPly, shotState, shotReveal, turningQ, rewindOffer]);

  // A blocking card the user can't SEE is indistinguishable from a hang
  // (David 2026-07-19: the why-picker opened below the fold on his phone
  // and the walk "froze"). Whenever any question/playback card opens,
  // scroll the first present one into view.
  const anyCardOpen = Boolean(
    shotState || shotReveal || turningQ || trapQ || trapReveal || rewindOffer || seqState || cameoState || theoryState || principleQuizState || faucetPhase !== 'idle',
  );
  useEffect(() => {
    if (!anyCardOpen) return;
    const t = window.setTimeout(() => {
      const container = scrollMiddleRef.current;
      if (!container) return;
      const card = container.querySelector(
        [
          '[data-testid="review-find-shot-card"]',
          '[data-testid="review-find-shot-reveal"]',
          '[data-testid="review-sequence-ask"]',
          '[data-testid="review-sequence-playback"]',
          '[data-testid="review-cameo-ask"]',
          '[data-testid="review-cameo-playback"]',
          '[data-testid="review-theory-ask"]',
          '[data-testid="review-theory-playback"]',
          '[data-testid="review-principle-quiz"]',
          '[data-testid="review-turning-card"]',
          '[data-testid="review-trap-card"]',
          '[data-testid="review-rewind-card"]',
          '[data-testid="discussion-practice-panel"]',
        ].join(', '),
      ) as HTMLElement | null;
      if (!card) return;
      // MOBILE (whole-page scroll, David 2026-07-21): the surface is now ONE
      // scrolling column, so the board is NOT fixed — scrollIntoView is the right
      // tool and can't strand the board off-screen the way it did under the old
      // fixed-board model (the 2026-07-20 caveat below applies to md+ only). Bring
      // the card to CENTER so a blocking picker is unmistakably on-screen.
      if (window.innerWidth < 768) {
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      // DESKTOP: scroll the card into view WITHIN the middle container only —
      // compute the delta from bounding rects and adjust the container's own
      // scrollTop, never element.scrollIntoView (which would recurse to ancestor
      // scrollers and drag the fixed board off-screen). The board stays put.
      const cRect = container.getBoundingClientRect();
      const kRect = card.getBoundingClientRect();
      const delta = (kRect.top - cRect.top) - 8;
      container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' });
    }, 150); // after the card's mount/layout settles
    return () => window.clearTimeout(t);
  }, [anyCardOpen]);

  // ship-4: `currentMove` removed — only the deleted analysis-phase
  // board read it. Walk render uses `walkPlayback.currentSegment` and
  // computes its own per-ply derivations.

  // ship-4: `displayFen` derivation removed — only the analysis-phase
  // board read it. Walk render derives its own displayFen inline
  // from the segment + walkExplorationFen.

  // ship-4: removed `capturedPieces`, `materialAdv`, `isPlayerWhite`,
  // `arrows`, `classificationHighlights`, `classificationOverlay`,
  // `commentary` — all fed the old analysis-phase PlayerInfoBar +
  // ChessBoard render that's gone. The walk-phase render computes its
  // own arrow gating + classification badge inline; captured-pieces +
  // material chips are not currently surfaced in the walk UI.

  // ship-4: `boardFlash` border-pulse effect removed — only the
  // analysis-phase board read it. Walk-phase uses the inline
  // classification badge for the same signal.

  // Keyboard navigation effect is declared below navigateMove — it
  // needs navigateMove in its dep array, so it has to come after the
  // useCallback declaration to avoid a TDZ error at render time.

  // ─── Ask About Position handler ────────────────────────────────────────────
  const handleAskSend = useCallback((question: string) => {
    if (isAskStreaming) return;

    // WO-BRAIN-03: review-ask now routes through coachService.ask. The
    // brain envelope carries the same memory + manifest awareness as
    // every other migrated surface; the LLM emits set_intended_opening
    // via tool when it should, so the deterministic regex is retired
    // here too. tryCaptureForgetIntent stays as belt-and-suspenders
    // until BRAIN-06 cleanup.
    tryCaptureForgetIntent(question, 'review-ask');

    // Abort previous ask
    if (askAbortRef.current) askAbortRef.current.abort();
    askAbortRef.current = new AbortController();

    setAskResponse('');
    setIsAskStreaming(true);

    const moveIdx = reviewState.currentMoveIndex;
    const move = moveIdx >= 0 && moveIdx < moves.length ? moves[moveIdx] : null;
    const fenForQ = move?.fen ?? STARTING_FEN;

    const abortSignal = askAbortRef.current.signal;
    // Tactical context for the review surface — the brain gets the
    // named patterns visible at the position the student is asking
    // about (forks/pins/hanging/etc.) plus the depth-N PV scan, so
    // post-game commentary can articulate "you missed an x-ray on
    // move 14" by pattern instead of just citing the eval swing.
    // No cached Stockfish analysis at the ask site (review uses its
    // own per-move analysis stream); immediate + hanging detection
    // still fires from the FEN alone, and the brain falls back to
    // the existing eval-context prose for upcoming threats.
    const reviewStudentColor = fenForQ.split(' ')[1] === 'b' ? 'b' : 'w';
    const reviewStudentRating =
      useAppStore.getState().activeProfile?.puzzleRating ?? 1200;
    const reviewTactics = buildTacticsLiveContext(
      fenForQ,
      null,
      reviewStudentColor,
      reviewStudentRating,
    );
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachGameReview.handleAskSend.buildLiveTactics',
      summary: `tactics ctx: immediate=${reviewTactics.immediate.length} hanging=${reviewTactics.hanging.length} threats=${reviewTactics.threats.length} opps=${reviewTactics.opportunities.length} depth=${reviewTactics.lookaheadDepth}`,
      fen: fenForQ,
    });
    const reviewLiveState: LiveState = {
      surface: 'review',
      fen: fenForQ,
      moveHistory: moves.slice(0, Math.max(0, moveIdx + 1)).map((m) => m.san),
      // Full game move list — ground truth for the master-play claim
      // validator so the coach can discuss the student's OWN game
      // (including moves past the current review ply, and after the game
      // left master book) without every SAN being flagged as an
      // ungrounded hallucination and the answer stocking out.
      gameSans: moves.map((m) => m.san),
      // Thread the opening name into lichessSnapshot so the
      // book-context loader in coachService.ask pulls the curated
      // annotation passages for this opening — the review-ask
      // narration gets Capablanca/Lasker-grounded instead of
      // freestyle. The other lichessSnapshot fields stay empty
      // (the brain has lichess_opening_lookup if it needs depth).
      lichessSnapshot: openingName
        ? {
            eco: '',
            name: openingName,
            topAmateurMoves: [],
            topMasterMoves: [],
            topMasterGames: [],
          }
        : undefined,
      userJustDid: question,
      currentRoute: '/coach/play',
      tactics: reviewTactics,
    };
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachGameReview.handleAskSend',
      summary: 'surface=review viaSpine=true',
      details: JSON.stringify({
        surface: 'review',
        viaSpine: true,
        timestamp: Date.now(),
        fenIfPresent: fenForQ,
      }),
      fen: fenForQ,
    });
    // WO-BRAIN-04: thread the user ask into conversation history.
    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'chat-review-ask',
      role: 'user',
      text: question,
      fen: fenForQ,
      trigger: null,
    });

    // WO-REVIEW-MERGE: per-turn voice marker extraction. The brain's
    // REVIEW_MODE_ADDITION asks for one `[VOICE: ...]` per response;
    // we capture the first closed marker as it streams and speak it
    // via Polly so the surface matches the /coach/teach voice cue.
    let voiceRawBuffer = '';
    let voiceSpokenForTurn = false;
    // The EXACT text we spoke — the chat bubble shows THIS, not the long
    // teaching prose, so the student reads what the voice says (text ==
    // narration, David 2026-06-11).
    let spokenDisplayText = '';
    const VOICE_MARKER_RE = /\[VOICE:\s*([\s\S]*?)\]/g;
    const tryExtractVoiceMarker = (): void => {
      if (voiceSpokenForTurn) return;
      VOICE_MARKER_RE.lastIndex = 0;
      const match = VOICE_MARKER_RE.exec(voiceRawBuffer);
      if (!match) return;
      const rawInner = match[1].trim();
      if (!rawInner) return;
      // The [VOICE:] block came from the grounded spine (coachService.ask) —
      // computed facts, voiced. The post-hoc groundCoachReply strip is DELETED
      // (David 2026-07-09 — "finish ripping"); there is nothing to gate.
      const inner = rawInner.trim();
      if (!inner) return;
      voiceSpokenForTurn = true;
      spokenDisplayText = inner;
      void logAppAudit({
        kind: 'coach-voice-marker-extracted',
        category: 'subsystem',
        source: 'CoachGameReview.tryExtractVoiceMarker',
        summary: `extracted [VOICE: ...] block (${inner.length} chars${inner.length !== rawInner.length ? `, grounded from ${rawInner.length}` : ''})`,
        details: JSON.stringify({ length: inner.length, preview: inner.slice(0, 80) }),
      });
      void voiceService.speakForced(inner);
    };

    void coachService
      .ask(
        { surface: 'review', ask: question, liveState: reviewLiveState },
        {
          // WO-COACH-TEACHING-01: review chat now also wires the
          // board-state callbacks so the brain can demonstrate
          // variations on the review board — play a candidate,
          // narrate, take back. Same teaching loop the in-game
          // chat got via the OPERATOR_BASE_BODY teaching directive.
          maxToolRoundTrips: 6,
          onChunk: (chunk: string) => {
            if (abortSignal.aborted) return;
            // WO-REVIEW-MERGE: extract `[VOICE: ...]` markers from the
            // streamed response and route them to Polly. Mirrors the
            // /coach/teach pattern so the new REVIEW_MODE_ADDITION's
            // mandate ("emit one [VOICE: ...] per turn") actually
            // produces spoken summaries here too. The marker text is
            // also stripped from the chat display so the bubble shows
            // clean prose instead of leaking the directive.
            voiceRawBuffer += chunk;
            tryExtractVoiceMarker();
            // Once the `[VOICE:]` marker (which leads the response) is in
            // hand, show exactly what we speak — never the divergent long
            // prose that streams after it. Until then, stream the live
            // prose so the bubble isn't blank.
            if (spokenDisplayText.trim()) {
              setAskResponse(spokenDisplayText);
            } else {
              const visible = chunk.replace(VOICE_MARKER_RE, '');
              setAskResponse((prev: string | null) => (prev ?? '') + visible);
            }
          },
          onNavigate: (path: string) => {
            void navigate(path);
          },
          // ship-8 — defense-in-depth: lock the board against brain
          // tool-use in review mode. The REVIEW_MODE_ADDITION envelope
          // (envelope.ts:316–320) already tells the brain "do NOT call
          // play_move / take_back_move / set_board_position — the
          // timeline is the source of truth." But the surface used to
          // expose those callbacks anyway, wired to handleBoardMove +
          // navigateMove + setWhatIfFen, each of which can fire
          // Stockfish (5s timeout) and generateMoveCommentary
          // (maxTokens=1500). At maxToolRoundTrips=6 a single chat
          // reply could chain up to ~12 Stockfish + 6 LLM calls. If
          // the brain ever forgets the directive (or a future prompt
          // regresses), the surface itself enforces the rule. The
          // refusal reasons name [BOARD: arrow:...] so the brain
          // learns to use the marker mandate instead.
          onPlayMove: (): { ok: false; reason: string } => ({
            ok: false,
            reason:
              'play_move is locked on the review surface — the timeline is the source of truth. Use a [BOARD: arrow:from-to:green] marker to show the move, and the student can tap the suggested piece to explore.',
          }),
          onTakeBackMove: (): { ok: false; reason: string } => ({
            ok: false,
            reason: 'take_back_move is locked on the review surface — the student drives navigation with the forward/back buttons.',
          }),
          onSetBoardPosition: (): { ok: false; reason: string } => ({
            ok: false,
            reason: 'set_board_position is locked on the review surface — the timeline is the source of truth.',
          }),
          onResetBoard: (): { ok: false; reason: string } => ({
            ok: false,
            reason: 'reset_board is locked on the review surface — the student can use the Jump-to-Start nav button to rewind.',
          }),
        },
      )
      .then((answer) => {
        // WO-BRAIN-04: persist coach reply into conversation history.
        if (!abortSignal.aborted && answer.text.trim().length > 0) {
          // The review-ask reply is spine-grounded (coachService.ask) — computed
          // facts, voiced. The post-hoc groundCoachReply strip is DELETED (David
          // 2026-07-09 — "finish ripping"); the stored text is already grounded.
          const groundedAnswer = answer.text;
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-review-ask',
            role: 'coach',
            text: groundedAnswer,
            fen: fenForQ,
            trigger: null,
          });
        }
      })
      .finally(() => {
        if (!abortSignal.aborted) {
          setIsAskStreaming(false);
        }
      });
  }, [isAskStreaming, reviewState.currentMoveIndex, moves, navigate]);

  // Reset Ask state when navigating to a different move so a stale
  // response doesn't linger after the student clicks forward.
  useEffect(() => {
    setAskExpanded(false);
    setAskResponse(null);
    setIsAskStreaming(false);
    if (askAbortRef.current) askAbortRef.current.abort();
  }, [reviewState.currentMoveIndex]);

  const navigateMove = useCallback((direction: 'first' | 'prev' | 'next' | 'last') => {
    voiceService.stop();
    // ship-4: practice / best-line / auto-review state clearing
    // removed — all those state machines are gone.
    setReviewState((prev: ReviewState) => {
      let newIndex = prev.currentMoveIndex;
      switch (direction) {
        case 'first': newIndex = -1; break;
        case 'prev': newIndex = Math.max(-1, prev.currentMoveIndex - 1); break;
        case 'next': newIndex = Math.min(moves.length - 1, prev.currentMoveIndex + 1); break;
        case 'last': newIndex = moves.length - 1; break;
      }
      return { ...prev, currentMoveIndex: newIndex, mode: 'analysis' };
    });
  }, [moves.length]);

  // Keyboard navigation. Dep array is REQUIRED — without it the effect
  // re-runs on every render and stacks keydown listeners, so one key
  // press advances N plies at once.
  //
  // Audit-driven (#17): the walk UI took over the summary phase but
  // this handler still drove the legacy `navigateMove` (analysis-phase
  // currentMoveIndex), so arrow keys updated a hidden index that the
  // walk UI never consulted. Now we branch on the same condition the
  // render uses: when the walk is up, route to walkPlayback; only the
  // analysis-phase path keeps the legacy navigateMove drive.
  const walkUiActive =
    walkNarration !== null &&
    walkNarration.segments.length > 0;

  // Per-blunder capture (David 2026-05-21, wired into the walk 2026-05-25):
  // as the walk lands on one of the student's own blunder/mistake plies the
  // coach asks "why did you play that?", classifies the answer into the
  // closed-set misconception taxonomy, and logs it to the shared weakness
  // bucket (source 'game-review'). Previously this hook was built + tested
  // but mounted nowhere, so the review walk captured nothing.
  const reviewCapture = useReviewBlunderCapture({
    moves,
    playerColor,
    openingName,
    openingId: openingName ? (resolveOpeningIdFromName(openingName) ?? undefined) : undefined,
    gameId: props.gameId,
    learned: true,
  });
  useEffect(() => {
    // Standalone-review opt-out (David 2026-05-25): when coached review is
    // off, never raise the "why?" prompt — the review becomes a plain
    // walk-through. The summary-card "add this game's mistakes" button still
    // works for deliberate, user-initiated capture.
    if (!walkUiActive || !coachedReview) return;
    reviewCapture.onPlyLanded(walkPlayback.currentPly);
  }, [walkUiActive, coachedReview, walkPlayback.currentPly, reviewCapture]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (walkUiActive) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          walkPlayback.goBack();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleWalkForward();
        }
        return;
      }
      if (reviewState.mode !== 'analysis' && reviewState.mode !== 'guided_lesson') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateMove('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateMove('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewState.mode, navigateMove, walkUiActive, walkPlayback, handleWalkForward]);

  // ship-4: handleMoveClick / handleBoardMove / handleBackToReview
  // removed alongside the analysis-phase what-if board. Walk-phase
  // exploration is owned by `walkExplorationFen` + the green-arrow
  // grab affordance on the live walk board.
  // ship-4: handlePlayFromHere + the whole practice/drill handler
  // family (handleStartPractice, handlePracticeMove, handleExitPractice,
  // handleStartMistakeDrill) removed. They drove the deleted
  // analysis-phase what-if board + the 3-attempt practice prompt.
  // Walk-phase exploration is owned by `walkExplorationFen` and the
  // green-arrow grab affordance.

  // ship-4: handleShowMissedTactic + handleDrillNext + practiceArrows
  // removed alongside the practice/drill UI. The missed-tactics list
  // in the walk render now just jumps to the relevant ply on tap
  // (jumpToPly via the row's onClick); the board there already shows
  // the classification badge + green best-move arrow + narration.

  // ─── Best Line Explorer ────────────────────────────────────────────────────
  // ship-4: handleToggleBestLine + handleBestLineStep + the reset-on-ply
  // effect all removed alongside the bestLine state they drove. The
  // walk-phase engine-lines panel now shows the top 3 PVs as static
  // display rows (no exploration affordance).

  // ─── Practice In Chat Handler ─────────────────────────────────────────────
  const handlePracticeInChat = useCallback(() => {
    const tacticTypes = [...new Set(missedTactics.map((t: MissedTactic) => t.tacticType))];
    const prompt = tacticTypes.length > 0
      ? `I want to practice the tactics I missed in my last game. I struggled with: ${tacticTypes.join(', ')}. Set up some practice positions for me.`
      : 'I want to practice tactics based on my recent game. Set up some practice positions for me.';
    onPracticeInChat?.(prompt);
  }, [missedTactics, onPracticeInChat]);

  // ship-4: handleStartReview removed alongside auto-review state. The
  // "Full Analysis" button it backed never had a live JSX target —
  // tapping it landed the user on the prep-failed fallback summary
  // card with no way back. Walk phase is the only review surface.

  // Empty state
  if (moves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 w-full" data-testid="coach-game-review">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No moves to review.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            Play Again
          </button>
          <button
            onClick={onBackToCoach}
            className="px-4 py-2 rounded-lg border text-sm font-medium"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Back to Coach
          </button>
        </div>
      </div>
    );
  }

  // ─── Walk Phase (only review surface — ship-4) ─────────────────────────────
  // When per-ply narration is ready, render the walk UI (board + nav +
  // subtitle banner). While loading or after a prep failure, the
  // ReviewSummaryCard fallback at the bottom of this function renders
  // so the student isn't blocked.
  {
    if (walkStarted && walkNarration && walkNarration.segments.length > 0) {
      const seg = walkPlayback.currentSegment;
      // Board FEN source of truth: the walk segment when available,
      // otherwise the game's move history (moves[ply-1].fen). This
      // keeps the board in sync even when the narration bundle is
      // truncated or missing for the current ply (WO-REVIEW-02a-FIX).
      //
      // Canonical playback shows `seg.fenAfter` — the position
      // AFTER the displayed ply was played. This gives react-
      // chessboard a clean one-move animation per Next press.
      //
      // At inaccuracy / mistake / blunder plies WITH a known better
      // move, we ALSO expose a separate "Explore this position"
      // affordance (via `walkExploreToggleOn` below) that swaps the
      // board to `seg.fenBefore` so the suggested missed move is
      // actually playable. This swap is OPT-IN — by default the
      // walk uses fenAfter so stepping Next ↔ Prev animates as a
      // single move on the board, not a double-jump that hides
      // which piece moved (David's review-audit feedback, 2026-05).
      const showBest = !!seg && (
        seg.classification === 'inaccuracy' ||
        seg.classification === 'mistake' ||
        seg.classification === 'blunder'
      );
      const hasArrow = showBest && !!seg && !!seg.bestMoveUci && seg.bestMoveUci.length >= 4;
      const displayFen = seg
        ? (walkExploreToggleOn && hasArrow ? seg.fenBefore : seg.fenAfter)
        : walkPlayback.currentPly > 0
          ? moves[walkPlayback.currentPly - 1]?.fen ?? STARTING_FEN
          : STARTING_FEN;
      const walkArrows = (() => {
        // NEVER paint the better-move arrow while a find-the-shot question is
        // open — the arrow IS the answer (honesty contract rule 1). Same for
        // the spot-the-sequence ask: an arrow would leak the next ply.
        if (shotState || seqState || cameoState || theoryState) return undefined;
        // Better-line PLAYOUT arrows: the board is on the exploration FEN and each
        // played ply paints a green lead-the-eye arrow on the move being narrated
        // (David 2026-07-19: the stronger line "has no arrows"). Take precedence
        // over the "hide after exploration" rule below.
        if (walkExplorationArrows && walkExplorationArrows.length) return walkExplorationArrows;
        // Hide the arrow once the student has explored — they've seen
        // the suggestion, no need to clutter the post-exploration view.
        if (walkExplorationFen) return undefined;
        // PLAN-IDEA arrows (opening development / middlegame orientation): the
        // board stays put and these arrows SHOW the plan instead of moving
        // pieces (David 2026-07-19). They live on the segment itself.
        if (seg?.planArrows && seg.planArrows.length) return seg.planArrows;
        if (!seg || !hasArrow) return undefined;
        const uci = seg.bestMoveUci;
        if (!uci) return undefined;
        const startSquare = uci.slice(0, 2);
        const endSquare = uci.slice(2, 4);
        return [{ startSquare, endSquare, color: '#22c55e' }];
      })();
      // Walk-mode board is interactive only when a green arrow is on
      // screen — the student can grab the suggested piece and play it
      // themselves. Otherwise the board stays read-only (passive
      // playback). The exploration FEN takes over the displayed
      // position until they tap "Resume game".
      //
      // Board is interactive in two cases:
      //   (a) the student tapped "Explore this position" at an
      //       arrow-bearing ply — display flips to fenBefore so the
      //       missed move is legal + the drop captures their pick.
      //   (b) they're already in exploration mode and want to play
      //       further continuation moves (engine replies handled
      //       separately via the onMove handler).
      // Show-me playout drives the board itself — the student must
      // not be able to interrupt by dragging a piece mid-animation.
      // We gate explicitly off `walkShowMeActive` even though it
      // sets `walkExplorationFen` on the first tick (which would
      // otherwise flip this true via the second clause below).
      const walkBoardInteractive = walkShowMeActive || seqState?.stage === 'playback' || cameoState !== null || theoryState?.stage === 'playback'
        ? false // playback (and the cameo) drives the board — no mid-animation drags
        : theoryState?.stage === 'ask' || // theory quiz: the board IS the answer input
          seqState?.stage === 'ask' || // sequence: the board IS the answer input
          shotState !== null || // find-the-shot: the board IS the answer input
          (walkExploreToggleOn && hasArrow && walkExplorationFen === null) ||
          walkExplorationFen !== null;
      // During a find-the-shot the board MUST sit on the shot's own position
      // (the pre-move FEN where the better move is legal) — otherwise it shows
      // the position AFTER the played move and the answer can't be played at
      // all (David 2026-07-20: "unable to click on the square to answer").
      const walkDisplayFen = shotState ? shotState.challenge.fen : (walkExplorationFen ?? displayFen);
      const badge = seg?.classification ?? null;
      // Authoritative nav ceiling = the full game length, not the
      // segments' trailing ply. The LLM frequently truncates segment
      // generation (audit cycle 8: a 32-ply game came back with only
      // segment 1, which froze the forward button after the first
      // move). The hook itself already walks past missing segments —
      // see useReviewPlayback's `totalPlies` plumbing — so the UI
      // ceiling needs to match or the buttons grey out prematurely.
      const lastPly = moves.length;
      // Map the walk's 1-indexed ply to the move list / KeyMomentNav's
      // 0-indexed move index. ply 0 = intro (no selected move).
      const walkMoveIndex = walkPlayback.currentPly > 0 ? walkPlayback.currentPly - 1 : -1;

      // ship-4: `enterAnalysisAnd` wrapper removed alongside the
      // Drill All / Show / Try It buttons that consumed it.

      // "Show me" playout — when the student taps the button at an
      // inaccuracy / mistake / blunder ply, play the BEST move they should
      // have played (from `seg.fenBefore`), then let Stockfish continue the
      // good line so they SEE the right plan — NOT the punishment of the move
      // they actually played. Silent (no narration), standard board animation
      // cadence (200ms slide + 600ms pause ≈ 800ms/ply), capped at 4 plies or
      // game-over (whichever comes first).
      //
      // Why silent in v1: the chat/voice surface around it is already
      // narrating the position; the playout is a visual demonstration,
      // not a teaching moment. If we later want narration on each ply
      // it goes through voiceService.speak() with the same density
      // gating the rest of the review uses.
      const runShowMePlayout = async (): Promise<void> => {
        if (!seg || !hasArrow) return;
        if (walkShowMeActive) return;
        setWalkShowMeActive(true);
        const startedAtPly = walkPlayback.currentPly;
        walkExplorationPlyRef.current = startedAtPly;
        void logAppAudit({
          kind: 'review-show-me-started',
          category: 'subsystem',
          source: 'CoachGameReview.runShowMePlayout',
          summary: `ply ${startedAtPly} show-me playout begin (${seg.classification})`,
          fen: seg.fenAfter,
          details: JSON.stringify({
            ply: startedAtPly,
            classification: seg.classification,
            playedSan: seg.san,
            bestMoveUci: seg.bestMoveUci ?? null,
          }),
        });
        // Start from the position BEFORE the move and play the BEST move first —
        // the move the student SHOULD have played — then let Stockfish continue
        // the good line. (Previously this started from `seg.fenAfter` and played
        // the punishment of the move they DID play.)
        let currentFen = seg.fenBefore;
        let pliesPlayed = 0;
        const MAX_PLIES = 4;
        // Surface the pre-move position first so the best move animates from it.
        setWalkExplorationFen(currentFen);
        setWalkExplorationSan(null);
        const bestUci = seg.bestMoveUci;
        if (bestUci && bestUci.length >= 4) {
          await new Promise((r) => setTimeout(r, 350));
          const bestProbe = new Chess(currentFen);
          const bestApplied = bestProbe.move({
            from: bestUci.slice(0, 2),
            to: bestUci.slice(2, 4),
            promotion: bestUci.length > 4 ? bestUci.slice(4, 5) : undefined,
          });
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- chess.js returns null for an illegal move at runtime
          if (bestApplied && walkMountedRef.current && walkShowMeActiveRef.current) {
            currentFen = bestProbe.fen();
            setWalkExplorationFen(currentFen);
            playMoveSound(bestApplied.san);
            pliesPlayed++;
            await new Promise((r) => setTimeout(r, 600));
          }
        }
        try {
          while (pliesPlayed < MAX_PLIES && walkMountedRef.current) {
            const probe = new Chess(currentFen);
            if (probe.isGameOver()) break;
            const config = resolveConfig('hard', playerRating);
            let coachMove;
            try {
              coachMove = await getCoachMove(currentFen, config);
            } catch {
              break; // Stockfish unreachable — bail silently
            }
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ref can flip during the await above
            if (!walkMountedRef.current) break;
            // Re-check the active flag AFTER the await — the student
            // may have hit Resume or navigated away while Stockfish
            // was thinking. Without this guard the loop overwrites
            // their fresh state with a stale engine ply.
            // We read the latest state via a ref to dodge the
            // closure-staleness — see walkShowMeActiveRef below.
            if (!walkShowMeActiveRef.current) break;
            const applied = probe.move({
              from: coachMove.from,
              to: coachMove.to,
              promotion: coachMove.promotion,
            });
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- chess.js types claim non-null but returns null for illegal moves at runtime
            if (!applied) break;
            currentFen = probe.fen();
            setWalkExplorationFen(currentFen);
            playMoveSound(applied.san);
            pliesPlayed++;
            if (probe.isCheckmate()) break;
            // Standard board cadence: 200ms slide + 600ms beat so the
            // student's eye catches each move before the next fires.
            await new Promise((r) => setTimeout(r, 600));
          }
        } finally {
          if (walkMountedRef.current) setWalkShowMeActive(false);
          void logAppAudit({
            kind: 'review-show-me-finished',
            category: 'subsystem',
            source: 'CoachGameReview.runShowMePlayout',
            summary: `ply ${startedAtPly} show-me played ${pliesPlayed} plies`,
            details: JSON.stringify({
              startedAtPly,
              pliesPlayed,
            }),
          });
        }
      };

      // WO-REVIEW-02b — Engine lines panel helpers.
      const currentPlyLines = engineLines.linesForPly(walkPlayback.currentPly);
      const currentBaseFen = reviewFens ? reviewFens[walkPlayback.currentPly] : null;
      const handleToggleEngineLines = (): void => {
        setEngineLinesEnabled((v: boolean) => {
          void logAppAudit({
            kind: 'review-engine-lines-toggled',
            category: 'subsystem',
            source: 'CoachGameReview',
            summary: `enabled=${!v}`,
          });
          // Layout state snapshot — captures viewport + board container
          // dims at the moment the panel opens / closes. Diagnoses
          // "showing engine lines shrinks the board" by making the
          // before/after diff measurable. The panel renders on the next
          // tick; we run after a microtask so the measurement reflects
          // the new layout state.
          if (typeof window !== 'undefined') {
            const enabling = !v;
            queueMicrotask(() => {
              const vw = window.innerWidth;
              const vh = window.innerHeight;
              const orientation = vw > vh ? 'landscape' : 'portrait';
              // Best-effort board measurement via a stable selector.
              // Falls back to null when the wrapper can't be found —
              // never throws, never blocks the toggle.
              const boardEl = document.querySelector<HTMLElement>(
                '[data-testid="consistent-chessboard"], .chessboard-wrapper, .react-chessboard',
              );
              const boardW = boardEl?.getBoundingClientRect().width ?? null;
              const boardH = boardEl?.getBoundingClientRect().height ?? null;
              void logAppAudit({
                kind: 'engine-lines-layout-state',
                category: 'subsystem',
                source: 'CoachGameReview.handleToggleEngineLines',
                summary: `panel=${enabling ? 'open' : 'closed'} orientation=${orientation} viewport=${vw}x${vh} board=${boardW ? Math.round(boardW) : '?'}x${boardH ? Math.round(boardH) : '?'}`,
                details: JSON.stringify({
                  panelEnabled: enabling,
                  viewport: { width: vw, height: vh, orientation },
                  board: { width: boardW, height: boardH },
                }),
              });
            });
          }
          return !v;
        });
      };
      // Seed the existing under-board best-line nav with a tapped
      // ship-4: `handleExploreCandidate` removed — the engine-lines
      // panel rows are now static display labels. Tapping a row in
      // the old surface staged the PV in `bestLine*` state and flipped
      // to the deleted analysis phase. The green best-move arrow on
      // the board already conveys the top suggestion, and the engine
      // lines panel still shows the eval + 5-ply preview for context.
      const formatEval = (line: { evaluation: number; mate: number | null }): string => {
        if (line.mate !== null) return line.mate > 0 ? `M${line.mate}` : `-M${Math.abs(line.mate)}`;
        const pawns = line.evaluation / 100;
        return (pawns >= 0 ? '+' : '') + pawns.toFixed(2);
      };

      // MOBILE = ONE SCROLLING COLUMN (David 2026-07-21, IMG_4565: "pickers don't
      // pop up … couldn't scroll down to see the rest of the buttons or the
      // written narration"). The old fixed-top + flex-1 scroll-middle +
      // fixed-bottom model STARVED the middle — with a w-full board the middle
      // collapsed to ~0px on a phone, so the pickers rendered off-screen and
      // unreachable. Match the WORKING Learn/Play shape (CoachTeachPage): the
      // whole surface is overflow-y-auto on mobile so board + controls +
      // narration + pickers + move list + bottom bar all stack and SCROLL as one
      // column; md+ keeps the fixed-region layout (height isn't the constraint).
      return (
        <div className="flex flex-col w-full h-full overflow-y-auto overflow-x-hidden md:overflow-hidden" data-testid="coach-game-review-walk">
          {/* ── Fixed top: header, board, badge, HERO nav ─────────────── */}
          <div className="shrink-0 border-b border-theme-border">
            <div className="flex items-center gap-2 w-full px-3 py-2">
              <button onClick={onBackToCoach} className="p-1 rounded-lg hover:bg-theme-surface" aria-label="Back to coach">
                <ArrowLeft size={18} style={{ color: 'var(--color-text)' }} />
              </button>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                Game Review
              </h2>
              <div className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Ply {walkPlayback.currentPly}/{lastPly}
              </div>
            </div>

            <div className="px-2 pt-1 pb-2 flex justify-center relative">
              {/* Cap the board to a viewport-relative width on mobile so the
                  square board can't eat the screen and STARVE the flex-1
                  scroll middle (Ask chat + move list). David 2026-06-27:
                  "Play Again / Back to Coach … preventing me from seeing the
                  chat" — the top block is shrink-0, so an uncapped full-width
                  board left the middle ~0px tall. Trimmed 46vh→42vh (David
                  2026-07-10, same report recurring) now that the narration
                  banner is PINNED in the fixed region above the middle — the
                  board + header + nav + pinned narration + bottom bar must
                  still leave the middle usable for the Ask panel. Desktop keeps
                  the original 420px (height is not the constraint there).
                  David 2026-07-20 (IMG_4565): "board still not the same size as
                  learn and play." The 42vh cap was still HEIGHT-binding on a
                  tall phone (42vh≈391 < the ~414 Learn/Play get from w-full).
                  MATCH them: w-full (identical to CoachTeachPage's board
                  wrapper) so the review board is exactly the Learn/Play size on
                  every portrait phone; the 68vh max-width only guards landscape/
                  very-short viewports from a board that would starve the middle.
                  Narration is PINNED above the scroll middle, so a full-width
                  board no longer hides the coach's why (the old 2026-06-27/07-10
                  complaint the vh cap was solving). */}
              <div className="w-full max-w-[68vh] mx-auto md:max-w-[420px] relative">
                <ChessBoard
                  // Re-key on exploration toggle so the underlying chess
                  // instance resets cleanly when the user enters or
                  // resumes from exploration. Without the key, the
                  // board's internal Chess() retains move history from
                  // the prior FEN and rejects the next move.
                  //
                  // Audit-driven (review walk #1): the key originally
                  // included `-ply${currentPly}` which forced a fresh
                  // ChessBoard mount on every forward/back press. The
                  // brief unmount+remount collapsed the board wrapper's
                  // height to 0 for one frame, causing the HERO nav row
                  // below to jump up and back down — user reported as
                  // "board shifts down after each press." Per-ply key
                  // is also redundant: useChessGame already syncs FEN
                  // changes via its [initialFen] effect (rebuilds the
                  // Chess instance, clears lastMove + selection). The
                  // exploration half of the key stays — it forces a
                  // clean remount when entering/exiting exploration so
                  // any chess.js move history accumulated during
                  // exploration is wiped.
                  key={`walk-board-${walkExplorationFen ? 'expl' : 'live'}-${shotState ? 'shot' : 'nshot'}${shotBoardEpoch}`}
                  initialFen={walkDisplayFen}
                  orientation={playerColor}
                  interactive={walkBoardInteractive}
                  arrows={walkArrows}
                  // Eval bar parity with Learn-with-Coach: pass the
                  // segment's per-ply evaluation through so the user
                  // can see the position eval as they walk forward.
                  // During exploration there's no fresh Stockfish run
                  // yet, so the bar holds the last known eval until
                  // the next ply.
                  showEvalBar
                  evaluation={seg?.evalAfter ?? null}
                  showFlipButton
                  // Parity with Learn-with-Coach board: last-move
                  // highlight on every transition so the piece that
                  // just moved is visually obvious. useChessGame
                  // resets `lastMove` on every initialFen change, so
                  // we pass an explicit `highlightSquares` derived
                  // from the segment's played-move SAN.
                  showLastMoveHighlight
                  highlightSquares={(() => {
                    if (walkExplorationFen || !seg) return null;
                    try {
                      const probe = new Chess(seg.fenBefore);
                      const m = probe.move(seg.san);
                      return m ? { from: m.from, to: m.to } : null;
                    } catch {
                      return null;
                    }
                  })()}
                  onMove={theoryState?.stage === 'ask' ? (moveResult) => {
                    // THEORY QUIZ answer (Phase 4) — the board move is the
                    // student's "main move" guess at the book position.
                    playMoveSound(moveResult.san);
                    handleTheoryMove(moveResult.san);
                  } : seqState?.stage === 'ask' ? (moveResult) => {
                    // SPOT-THE-SEQUENCE attempt — the board move is the
                    // student's calculation ply (Phase 1). Judged async
                    // (eval-equivalence probe); wrong verified moves snap
                    // back via the epoch remount inside the handler.
                    playMoveSound(moveResult.san);
                    handleSequenceMove({
                      san: moveResult.san, from: moveResult.from,
                      to: moveResult.to, fen: moveResult.fen,
                    });
                  } : shotState ? (moveResult) => {
                    // FIND-THE-SHOT answer attempt — the board move IS the
                    // student's answer. Found → reveal + the shot stays on
                    // the board. Wrong → remount snaps the move back
                    // (takeback) and they look again. Stale → clear silently.
                    const verdict = judgeGuidedFindAttempt(shotState.challenge, {
                      san: moveResult.san, from: moveResult.from, to: moveResult.to,
                      fenBefore: walkDisplayFen,
                    });
                    if (verdict === 'found') {
                      playMoveSound(moveResult.san);
                      const text = `${shotState.challenge.confirm}${shotCostLine(shotState)}`;
                      captureEvent('review_find_shot_result', { outcome: 'found', attempts: shotAttemptsRef.current + 1, answer: shotState.challenge.answerSan });
                      setShotState(null);
                      setShotReveal(text);
                      // Decisive-beat prosody spike (#25) — the found shot is THE payoff.
                      void voiceService.speakForced(text, { prosodySpike: true }).catch(() => undefined);
                    } else if (verdict === 'retry') {
                      shotAttemptsRef.current += 1;
                      captureEvent('review_find_shot_result', { outcome: 'retry', attempts: shotAttemptsRef.current, answer: shotState.challenge.answerSan });
                      setShotBoardEpoch((e) => e + 1); // takeback: remount → initialFen
                      void voiceService.speakForced(shotState.challenge.retry).catch(() => undefined);
                    } else {
                      setShotState(null); // board drifted — never judge the wrong position
                    }
                  } : walkBoardInteractive ? (moveResult) => {
                    // Student played a piece while a better-move arrow
                    // was showing → record their exploration. We capture
                    // the post-move FEN + SAN and surface a "Resume game"
                    // button. Audit emit so the unified panel shows the
                    // exploration trail.
                    setWalkExplorationFen(moveResult.fen);
                    setWalkExplorationSan(moveResult.san);
                    walkExplorationPlyRef.current = walkPlayback.currentPly;
                    playMoveSound(moveResult.san);
                    void logAppAudit({
                      kind: 'review-walk-explored',
                      category: 'subsystem',
                      source: 'CoachGameReview.walkExplore',
                      summary: `ply ${walkPlayback.currentPly} explored ${moveResult.san}`,
                      fen: moveResult.fen,
                      details: JSON.stringify({
                        ply: walkPlayback.currentPly,
                        playedSan: moveResult.san,
                        suggestedUci: seg?.bestMoveUci ?? null,
                        classification: seg?.classification ?? null,
                      }),
                    });
                    // Engine reply — David's review-audit feedback:
                    // "I could only move my piece on the board and the
                    // opponent did not make a move after I did." Fire
                    // Stockfish at medium strength (~1500 ELO) so the
                    // exploration feels like a continuation rather than
                    // a frozen one-move analysis.
                    void (async () => {
                      try {
                        const config = resolveConfig('medium', 1500);
                        const reply = await getCoachMove(moveResult.fen, config);
                        // Apply on a local chess.js, get the post-reply
                        // FEN, then swap walkExplorationFen so the board
                        // animates the opponent's slide.
                        const probe = new Chess(moveResult.fen);
                        const applied = probe.move({
                          from: reply.from,
                          to: reply.to,
                          promotion: reply.promotion,
                        });
                        if (!applied || !walkMountedRef.current) return;
                        setWalkExplorationFen(probe.fen());
                        playMoveSound(applied.san);
                      } catch {
                        // Stockfish unreachable / engine error — stay
                        // on the student's exploration FEN. The Resume
                        // button still lets them snap back.
                      }
                    })();
                  } : undefined}
                />
                {badge && (
                  <div
                    className="absolute top-1 right-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide pointer-events-none text-white"
                    style={{
                      background: CLASSIFICATION_STYLES[badge as keyof typeof CLASSIFICATION_STYLES].color,
                    }}
                    data-testid="review-classification-badge"
                  >
                    {CLASSIFICATION_STYLES[badge as keyof typeof CLASSIFICATION_STYLES].label}
                  </div>
                )}
                {/* Resume-game button — appears whenever the student
                    has explored a move that diverges from the actual
                    game line. Tap to clear exploration and snap the
                    board back to the real game position at this ply. */}
                {walkExplorationFen && (
                  <button
                    onClick={() => {
                      void logAppAudit({
                        kind: 'review-walk-resumed',
                        category: 'subsystem',
                        source: 'CoachGameReview.walkResume',
                        summary: `ply ${walkPlayback.currentPly} resumed (was ${walkShowMeActive ? 'show-me playing' : `exploring ${walkExplorationSan ?? '?'}`})`,
                        fen: displayFen,
                        details: JSON.stringify({
                          ply: walkPlayback.currentPly,
                          exploredSan: walkExplorationSan,
                          showMeActive: walkShowMeActive,
                        }),
                      });
                      // Cancel any in-flight show-me playout. The async
                      // loop reads walkShowMeActiveRef every iteration
                      // and bails when it flips false.
                      setWalkShowMeActive(false);
                      setWalkExplorationFen(null);
                      setWalkExplorationSan(null);
                      walkExplorationPlyRef.current = null;
                    }}
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg"
                    style={{
                      background: 'var(--color-accent)',
                      color: 'var(--color-bg)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                    data-testid="walk-resume-game-btn"
                    aria-label="Resume the actual game line"
                  >
                    <RotateCcw size={12} />
                    Resume game
                  </button>
                )}
                {/* Pre-exploration action row at the bottom of the
                    board on inaccuracy/mistake/blunder plies. Two CTAs:
                    - "Explore this position" — flips the board to
                      `seg.fenBefore` so the student can play the
                      missed move themselves (existing behavior).
                    - "Show me" — Stockfish auto-plays the punishment
                      line from `seg.fenAfter` so the student sees
                      WHY their move was bad. Silent v1, standard
                      board cadence, capped at 4 plies / game-over.
                    Both hidden once exploration or playout starts;
                    the Resume button takes over. */}
                {hasArrow && walkExplorationFen === null && !walkExploreToggleOn && !walkShowMeActive && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setWalkExploreToggleOn(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg"
                      style={{
                        background: '#22c55e',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                      data-testid="walk-explore-toggle-btn"
                      aria-label="Try the missed move yourself"
                    >
                      Explore this position
                    </button>
                    <button
                      onClick={() => { void runShowMePlayout(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg"
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                      data-testid="walk-show-me-btn"
                      aria-label="Show me the punishment line"
                    >
                      Show me
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Walk nav: four uniform 52px buttons, forward gets a
                subtle accent border so it reads as primary without
                dwarfing the others. Audit-driven redesign — the prior
                gold 120×90 forward chevron next to 60×60 transparent
                siblings was visually unbalanced. All four now share
                the same shape, size, and active-press affordance. */}
            <div className="flex items-center justify-center gap-2 py-2" data-testid="review-nav-controls">
              <button
                onClick={walkPlayback.goToStart}
                className="w-[52px] h-[52px] rounded-xl border border-theme-border hover:bg-theme-surface disabled:opacity-30 flex items-center justify-center transition-transform active:scale-[0.96]"
                disabled={walkPlayback.currentPly === 0}
                aria-label="Jump to start"
              >
                <SkipBack size={22} style={{ color: 'var(--color-text)' }} />
              </button>
              <button
                onClick={walkPlayback.goBack}
                className="w-[52px] h-[52px] rounded-xl border border-theme-border hover:bg-theme-surface disabled:opacity-30 flex items-center justify-center transition-transform active:scale-[0.96]"
                disabled={walkPlayback.currentPly === 0}
                aria-label="Back one move"
                data-testid="review-back-btn"
              >
                <ChevronLeft size={24} style={{ color: 'var(--color-text)' }} />
              </button>
              <button
                onClick={handleWalkForward}
                className="w-[52px] h-[52px] rounded-xl border-2 disabled:opacity-30 flex items-center justify-center transition-transform active:scale-[0.96]"
                disabled={walkPlayback.currentPly >= lastPly}
                style={{
                  borderColor: 'var(--color-accent)',
                }}
                aria-label="Forward one move"
                data-testid="review-forward-btn"
              >
                <ChevronRight size={24} style={{ color: 'var(--color-accent)' }} />
              </button>
              <button
                onClick={walkPlayback.goToEnd}
                className="w-[52px] h-[52px] rounded-xl border border-theme-border hover:bg-theme-surface disabled:opacity-30 flex items-center justify-center transition-transform active:scale-[0.96]"
                disabled={walkPlayback.currentPly >= lastPly}
                aria-label="Jump to end"
              >
                <SkipForward size={22} style={{ color: 'var(--color-text)' }} />
              </button>
            </div>

            {/* Secondary controls row: pause/play + Ask (inline, small) */}
            <div className="flex items-center justify-center gap-2 pb-2">
              {/* Narration toggle — pauses or replays the SPOKEN narration
                  for the current ply. Does NOT advance to the next ply
                  (manual-only stepping). User feedback (build 3d8e3ef)
                  caught the prior "Play / Pause" labels reading like an
                  auto-advance toggle; this rename + Volume icons make
                  voice control unambiguous. */}
              <button
                onClick={walkPlayback.togglePausePlay}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-theme-border hover:bg-theme-surface"
                style={{ color: 'var(--color-text)' }}
                aria-label={walkPlayback.narrationState === 'speaking' ? 'Stop narration' : 'Replay narration'}
                data-testid="walk-narration-toggle-btn"
              >
                {walkPlayback.narrationState === 'speaking'
                  ? <><VolumeX size={12} /> Stop narration</>
                  : <><Volume2 size={12} /> Replay narration</>}
              </button>
              <button
                onClick={() => setAskExpanded((v: boolean) => !v)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-theme-border hover:bg-theme-surface"
                style={{ color: 'var(--color-text)' }}
                data-testid="walk-ask-toggle-btn"
              >
                <MessageCircle size={12} />
                Ask
              </button>
              {/* OPENING THEORY LECTURE — the masters-DB tour of the mainline,
                  sidelines, and where the game left theory (David 2026-07-20). */}
              {theoryBeats && theoryBeats.length > 0 && (
                <button
                  onClick={() => { if (theoryLecturePlaying) stopOpeningTheory(); else void playOpeningTheory(); }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20"
                  style={{ color: 'var(--color-text)' }}
                  data-testid="walk-theory-btn"
                >
                  <BookOpen size={12} />
                  {theoryLecturePlaying ? 'Stop theory' : 'Opening theory'}
                </button>
              )}
            </div>

            {/* Current-move narration banner — PINNED in the fixed region so
                the coach's per-move "why" is ALWAYS visible. It used to live in
                the flex-1 scroll middle, which the board + nav + bottom bar
                starve to a sliver on a phone (David 2026-07-10: "something is
                blocking me from seeing the narration/chat field"). The banner is
                short (2-3 lines); keeping it here guarantees the student reads
                the WHY without scrolling, and frees the middle for Ask + the
                move list. */}
            <div className="px-3 pt-1 pb-2 border-t border-theme-border">
              <div
                className="rounded-xl backdrop-blur-md border border-emerald-500/30 px-3 py-2 max-h-[4.5rem] overflow-y-auto"
                style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, rgba(16,185,129,0.3))' }}
                data-testid="review-narration-banner"
                data-narration-source={walkPlayback.currentSegment?.narrationSource ?? ''}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  {/* While the Opening-theory lecture plays, show its caption so
                      it's visibly working even on a muted device (David
                      2026-07-21). Otherwise show the move's narration — and no
                      apology placeholder on quiet plies (David 2026-07-19:
                      "(passes silently)" printed itself all game). */}
                  {theoryCaption ?? walkPlayback.currentText ?? walkPlayback.currentSegment?.san ?? ''}
                </p>
              </div>
            </div>
          </div>

          {/* ── Scrollable middle: move list, tactics, ask ── */}
          {/* Mobile: flex-none so it takes its NATURAL height and the outer
              column scrolls it into reach (no collapse-to-zero). Desktop: the
              internal flex-1 scroller as before. */}
          <div ref={scrollMiddleRef} className="flex-none md:flex-1 md:min-h-0 md:overflow-y-auto" data-testid="review-scroll-middle">
            {/* Surface A: reading gate — paused before the student's next
                mistake, asks them to read the (clean) position before the move
                is revealed. The board already shows readingGate.fen. */}
            {readingGate && (
              <ReviewReadingChallenge
                key={readingGate.ply}
                fen={readingGate.fen}
                studentColor={studentColorWB}
                rating={playerRating ?? 1200}
                onProceed={resolveReadingGate}
              />
            )}
            {/* The "why'd you play that?" faucet — post-game review responds
                like Learn-with-Coach: picker → narrated grounded reveal →
                weakness bucket. Skipping or dismissing resumes the walk. */}
            <DiscussionPracticePanel
              phase={reviewFaucet.phase}
              prompt={reviewFaucet.prompt}
              teach={reviewFaucet.teach}
              onSubmit={(reason) => void reviewFaucet.submitReason(reason)}
              onSkip={resumeAfterFaucet}
              onDismissTeach={resumeAfterFaucet}
            />

            {/* FIND-THE-SHOT — "right here you had something; find it." The
                student answers ON the board above; Hint reveals, Skip moves on. */}
            {shotState && (
              <div data-testid="review-find-shot-card" className="mx-3 my-1 rounded-xl border-2 border-purple-500/40 bg-purple-500/10 px-3 py-2">
                <div className="text-sm text-purple-100">Right here you had something. {shotState.challenge.question}</div>
                {shotHintText && (
                  <div className="mt-1 text-xs text-amber-200" data-testid="review-find-shot-hint-text">{shotHintText}</div>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-purple-300/70">Play your answer on the board.</span>
                  <button type="button" data-testid="review-find-shot-hint" onClick={handleShotHint}
                    className="ml-auto rounded-lg border border-purple-400/50 px-2.5 py-1 text-xs font-semibold text-purple-200 hover:bg-purple-500/20">
                    Hint
                  </button>
                  <button type="button" data-testid="review-find-shot-skip" onClick={handleShotSkip}
                    className="rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                    Skip
                  </button>
                </div>
              </div>
            )}
            {shotReveal && (
              <div data-testid="review-find-shot-reveal" className="mx-3 my-1 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                <div className="text-sm text-emerald-100">{shotReveal}</div>
                <button type="button" data-testid="review-find-shot-continue" onClick={handleShotContinue}
                  className="mt-1.5 rounded-lg border border-emerald-400/50 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20">
                  Continue
                </button>
              </div>
            )}

            {/* SPOT-THE-SEQUENCE (Phase 1) — after the shot, calculate the
                follow-up ON the board; the defender's replies auto-play.
                Playback stage: the coach plays the full line out. */}
            {seqState?.stage === 'ask' && (
              <div data-testid="review-sequence-ask" className="mx-3 my-1 rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 px-3 py-2">
                <div className="text-sm text-cyan-100">
                  Can you see the follow-up? Play your next move on the board.
                  <span className="ml-1 text-cyan-300/70">({seqState.reached} of {seqState.totalAsk} found)</span>
                </div>
                <button type="button" data-testid="review-sequence-show"
                  onClick={() => { if (seqStateRef.current) void runSequencePlayback({ ...seqStateRef.current }, seqStateRef.current.ptr); }}
                  className="mt-1.5 rounded-lg border border-cyan-400/50 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
                  Show me the line
                </button>
              </div>
            )}
            {seqState?.stage === 'playback' && (
              <div data-testid="review-sequence-playback" className="mx-3 my-1 rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 px-3 py-2">
                <div className="text-sm text-cyan-100">Watch the line play out…</div>
                <button type="button" data-testid="review-sequence-skip"
                  onClick={() => { cancelSequence(); if (!maybeOfferRewind()) walkPlayback.goForward(); }}
                  className="mt-1.5 rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                  Skip
                </button>
              </div>
            )}

            {/* MODEL-GAME CAMEO (Phase 2) — the ONE classic whose structure
                matches this game, offered at the thematic ply. */}
            {cameoState?.stage === 'ask' && (
              <div data-testid="review-cameo-ask" className="mx-3 my-1 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <div className="text-sm text-amber-100">
                  This structure has a famous echo — {cameoState.anchor.cameo.white} vs {cameoState.anchor.cameo.black}
                  {cameoState.anchor.cameo.year !== null ? `, ${cameoState.anchor.cameo.year}` : ''}
                  {cameoState.anchor.cameo.event ? ` (${cameoState.anchor.cameo.event})` : ''}.
                  <span className="ml-1 text-amber-300/80">Shared with your game: {cameoState.anchor.cameo.sharedFeatures[0]}.</span>
                </div>
                <div className="mt-1.5 flex gap-2">
                  <button type="button" data-testid="review-cameo-watch"
                    onClick={() => { if (cameoStateRef.current) void runCameoPlayback(cameoState); }}
                    className="rounded-lg border border-amber-400/50 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/20">
                    Watch the classic
                  </button>
                  <button type="button" data-testid="review-cameo-skip"
                    onClick={() => { cancelCameo(); }}
                    className="rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                    Skip
                  </button>
                </div>
              </div>
            )}
            {cameoState?.stage === 'playback' && (
              <div data-testid="review-cameo-playback" className="mx-3 my-1 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <div className="text-sm text-amber-100">
                  {cameoState.anchor.cameo.white} vs {cameoState.anchor.cameo.black} — the thematic stretch…
                </div>
                <button type="button" data-testid="review-cameo-stop"
                  onClick={() => { cancelCameo(); }}
                  className="mt-1.5 rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                  Back to my game
                </button>
              </div>
            )}

            {/* THEORY DEPARTURE (Phase 4) — book ended here: quiz the main
                move on the board, then play the book line with stats. */}
            {theoryState?.stage === 'ask' && (
              <div data-testid="review-theory-ask" className="mx-3 my-1 rounded-xl border-2 border-sky-500/40 bg-sky-500/10 px-3 py-2">
                <div className="text-sm text-sky-100">
                  Book ended here — {theoryState.dep.departedSan} left known practice
                  ({theoryState.dep.totalGames} master games reached this position).
                  What's the main move? Play it on the board.
                </div>
                <div className="mt-1.5 flex gap-2">
                  <button type="button" data-testid="review-theory-hint"
                    onClick={() => { const s = theoryStateRef.current as TheoryState | null; if (s) { captureEvent('review_theory_result', { outcome: 'hint', attempts: theoryAttemptsRef.current }); void runTheoryPlayback(s); } }}
                    className="rounded-lg border border-sky-400/50 px-2.5 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-500/20">
                    Show me
                  </button>
                  <button type="button" data-testid="review-theory-skip"
                    onClick={() => { cancelTheory(); }}
                    className="rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                    Skip
                  </button>
                </div>
              </div>
            )}
            {theoryState?.stage === 'playback' && (
              <div data-testid="review-theory-playback" className="mx-3 my-1 rounded-xl border-2 border-sky-500/40 bg-sky-500/10 px-3 py-2">
                <div className="text-sm text-sky-100">The book line — {theoryState.dep.mainMove.san} and on…</div>
                <button type="button" data-testid="review-theory-stop"
                  onClick={() => { cancelTheory(); }}
                  className="mt-1.5 rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                  Back to my game
                </button>
              </div>
            )}

            {/* THE DEVICE QUIZ (Phase 3.3) — apply the principle on the spot:
                which of these candidate moves passes the device? */}
            {principleQuizState && (
              <div data-testid="review-principle-quiz" className="mx-3 my-1 rounded-xl border-2 border-violet-500/40 bg-violet-500/10 px-3 py-2">
                <div className="text-sm text-violet-100">{principleQuizState.ask}</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {principleQuizState.candidates.map((c) => (
                    <button key={c.san} type="button" data-testid={`principle-quiz-pick-${c.san}`}
                      onClick={() => { handlePrincipleQuizPick(c.san); }}
                      className="rounded-lg border border-violet-400/50 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-500/20">
                      {c.san}
                    </button>
                  ))}
                  <button type="button" data-testid="principle-quiz-skip"
                    onClick={() => { handlePrincipleQuizPick(null); }}
                    className="rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* BLUNDER REWIND — offered once per blunder after its question
                resolves: jump back to the last holdable moment and hold it. */}
            {rewindOffer && (
              <div data-testid="review-rewind-card" className="mx-3 my-1 rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 px-3 py-2">
                <div className="text-sm text-cyan-100">
                  Want to go back to the last moment this game was still in your hands?
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <button type="button" data-testid="review-rewind-accept" onClick={handleRewindAccept}
                    className="rounded-lg border border-cyan-400/50 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
                    Rewind
                  </button>
                  <button type="button" data-testid="review-rewind-decline" onClick={handleRewindDecline}
                    className="rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                    Keep walking
                  </button>
                </div>
              </div>
            )}

            {/* TURNING-POINT — asked once, at the end of the walk. Candidates
                are the game's costed moments; the answer is the biggest swing. */}
            {turningQ && (
              <div data-testid="review-turning-point-card" className="mx-3 my-1 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <div className="text-sm text-amber-100">{turningQ.question}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {turningQ.candidates.map((c) => (
                    <button key={c.ply} type="button" data-testid={`turning-point-pick-${c.ply}`}
                      onClick={() => handleTurningChip(c)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${turningPreviewPly === c.ply ? 'border-amber-300 bg-amber-500/30 text-amber-50 ring-1 ring-amber-300' : 'border-amber-400/50 text-amber-200 hover:bg-amber-500/20'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-amber-200/70">
                  {turningPreviewPly !== null
                    ? 'Board stepped to that moment — tap it again (or Confirm) to lock it in.'
                    : 'Tap a move to see the position, then confirm your pick.'}
                </div>
                {turningPreviewPly !== null && (
                  <button type="button" data-testid="review-turning-point-confirm"
                    onClick={() => handleTurningPick(turningPreviewPly)}
                    className="mt-1.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/30">
                    Confirm this turning point
                  </button>
                )}
              </div>
            )}
            {turningReveal && (
              <div data-testid="review-turning-point-reveal"
                className={`mx-3 my-1 rounded-xl border-2 px-3 py-2 ${turningReveal.correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
                <div className={`text-sm ${turningReveal.correct ? 'text-emerald-100' : 'text-amber-100'}`}>{turningReveal.text}</div>
                <button type="button" data-testid="review-turning-point-done" onClick={() => setTurningReveal(null)}
                  className="mt-1.5 rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                  Done
                </button>
              </div>
            )}
            {/* §4 TRAP — "take it or leave it?" The answer is computed by static
                exchange; the reveal plays out the real losing swap. */}
            {trapQ && (
              <div data-testid="review-trap-card" className="mx-3 my-1 rounded-xl border-2 border-rose-500/40 bg-rose-500/10 px-3 py-2">
                <div className="text-sm text-rose-100">{trapQ.prompt}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {trapQ.choices.map((c) => (
                    <button key={c.id} type="button" data-testid={`review-trap-pick-${c.id}`}
                      onClick={() => handleTrapPick(c.id)}
                      className="rounded-lg border border-rose-400/50 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/20">
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {trapReveal && (
              <div data-testid="review-trap-reveal"
                className={`mx-3 my-1 rounded-xl border-2 px-3 py-2 ${trapReveal.correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
                <div className={`text-sm ${trapReveal.correct ? 'text-emerald-100' : 'text-rose-100'}`}>{trapReveal.text}</div>
                <button type="button" data-testid="review-trap-done" onClick={() => setTrapReveal(null)}
                  className="mt-1.5 rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                  Done
                </button>
              </div>
            )}
            {/* Engine lines panel (WO-REVIEW-02b) */}
            <div className="px-3 pt-2 pb-1" data-testid="review-engine-lines-section">
              <button
                onClick={handleToggleEngineLines}
                className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-theme-border hover:bg-theme-surface"
                style={{ color: 'var(--color-text)' }}
                data-testid="review-engine-lines-toggle"
              >
                <Cpu size={12} style={{ color: 'var(--color-accent)' }} />
                <span className="font-semibold">
                  {engineLinesEnabled ? 'Hide engine lines' : 'Show engine lines'}
                </span>
                {engineLinesEnabled && engineLines.loading && (
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    Analyzing {engineLines.progress.current}/{engineLines.progress.total}…
                  </span>
                )}
              </button>
              {engineLinesEnabled && (
                <div className="mt-2 space-y-1.5" data-testid="review-engine-lines-panel">
                  {currentPlyLines && currentPlyLines.length > 0 ? (
                    currentPlyLines.map((line, i) => {
                      const previewSans: string[] = [];
                      if (currentBaseFen) {
                        try {
                          const c = new Chess(currentBaseFen);
                          for (const u of line.moves.slice(0, 5)) {
                            const r = c.move({
                              from: u.slice(0, 2),
                              to: u.slice(2, 4),
                              promotion: u.length > 4 ? u.slice(4, 5) : undefined,
                            });
                            previewSans.push(r.san);
                          }
                        } catch {
                          // ignore — bad fen/uci, preview stays empty
                        }
                      }
                      // ship-4: rows are static display labels. The
                      // old `handleExploreCandidate` onClick routed to
                      // the deleted analysis-phase bestLine nav.
                      return (
                        <div
                          key={`${line.rank}-${i}`}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-theme-border text-left"
                          data-testid={`review-engine-line-${i}`}
                        >
                          <span
                            className="text-[11px] font-bold font-mono min-w-[52px]"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {formatEval(line)}
                          </span>
                          <span className="text-xs font-mono truncate" style={{ color: 'var(--color-text)' }}>
                            {previewSans.length > 0 ? previewSans.join(' ') : '—'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[11px] px-2 py-1" style={{ color: 'var(--color-text-muted)' }}>
                      {engineLines.loading
                        ? 'Analyzing this position…'
                        : 'No engine lines for this ply.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Per-blunder capture: coach asks "why did you play that?" */}
            {reviewCapture.phase !== 'idle' && (
              <div className="px-3 py-2 border-t border-amber-500/30 bg-amber-500/5" data-testid="review-blunder-capture">
                {reviewCapture.prompt && (reviewCapture.phase === 'asking' || reviewCapture.phase === 'thinking') && (
                  <>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Crosshair size={12} style={{ color: 'var(--color-accent)' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                        Coach
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text)' }}>
                      You played {reviewCapture.prompt.playedSan} here — what was the idea behind it?
                    </p>
                    {reviewCapture.phase === 'thinking' ? (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <Loader2 size={12} className="animate-spin" /> Thinking…
                      </div>
                    ) : (
                      <>
                        <ChatInput
                          onSend={(reason) => void reviewCapture.submitReason(reason)}
                          placeholder="Tell the coach your reasoning…"
                        />
                        <button
                          type="button"
                          onClick={() => void reviewCapture.skip()}
                          className="mt-1.5 text-[11px] font-semibold"
                          style={{ color: 'var(--color-text-muted)' }}
                          data-testid="review-capture-skip"
                        >
                          Skip
                        </button>
                      </>
                    )}
                  </>
                )}
                {reviewCapture.phase === 'teaching' && reviewCapture.teach && (
                  <div data-testid="review-capture-teach">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Crosshair size={12} style={{ color: 'var(--color-accent)' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                        Coach
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text)' }}>
                      {reviewCapture.teach}
                    </p>
                    <button
                      type="button"
                      onClick={reviewCapture.dismissTeach}
                      className="text-[11px] font-semibold"
                      style={{ color: 'var(--color-accent)' }}
                      data-testid="review-capture-continue"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Ask panel (expandable) */}
            {askExpanded && (
              <div className="px-3 py-2 border-t border-theme-border" data-testid="walk-ask-panel">
                {askResponse !== null && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                        Coach
                      </span>
                      {isAskStreaming && (
                        <Loader2 size={10} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }} data-testid="walk-ask-response">
                      {askResponse || (isAskStreaming ? '' : 'No response')}
                    </p>
                  </div>
                )}
                <ChatInput
                  onSend={handleAskSend}
                  disabled={isAskStreaming}
                  placeholder="Ask about this position..."
                />
              </div>
            )}

            {/* Opening + move list */}
            <div className="border-t border-theme-border">
              <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                  {openingName ?? 'Move list'}
                </span>
                <KeyMomentNav
                  moves={moves}
                  currentIndex={walkMoveIndex}
                  onNavigate={(idx: number) => { cancelSequence(); cancelCameo(); cancelTheory(); setPrincipleQuizState(null); walkPlayback.jumpToPly(idx + 1); }}
                  className=""
                  extraIndices={walkPlayback.hintPlies.map((ply) => ply - 1)}
                />
              </div>
              <div className="max-h-[180px] overflow-y-auto">
                <MoveListPanel
                  moves={moves}
                  openingName={openingName}
                  currentMoveIndex={walkMoveIndex >= 0 ? walkMoveIndex : null}
                  onMoveClick={(idx: number) => { cancelSequence(); cancelCameo(); cancelTheory(); setPrincipleQuizState(null); walkPlayback.jumpToPly(idx + 1); }}
                  className="h-full"
                />
              </div>
            </div>

            {/* Grounded board previews for the student's flagged moves
                (Phase 1c, David IMG_4298). Each mini-board shows the position
                with the played move (red) + the engine's better move (green);
                tapping jumps the main board to that ply. */}
            <ReviewCitationPreviews
              citations={reviewCitations}
              onJumpToPly={(ply: number) => { cancelSequence(); cancelCameo(); cancelTheory(); setPrincipleQuizState(null); walkPlayback.jumpToPly(ply); }}
            />

            {/* Missed tactics — ship-1 made this non-empty for every
                reviewed game. Tapping a row jumps to the ply; the
                board there already surfaces the classification badge,
                the green best-move arrow, and the deterministic
                narration banner. The prior Drill All / Show / Try It
                buttons routed through a now-deleted practice phase —
                dropped in ship-4. Future ship can add a leaner
                inline drill flow if needed. */}
            {missedTactics.length > 0 && (
              <div className="border-t border-theme-border px-3 py-2" data-testid="walk-missed-tactics">
                <div className="flex items-center gap-1.5 mb-2">
                  <Crosshair size={12} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    Missed tactics ({missedTactics.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {missedTactics.map((tactic: MissedTactic, i: number) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-theme-surface transition-colors text-left"
                      onClick={() => walkPlayback.jumpToPly(tactic.moveIndex + 1)}
                      data-testid={`walk-missed-tactic-${i}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                          Move {Math.ceil(moves[tactic.moveIndex].moveNumber / 2)}:{' '}
                          <span className="capitalize">{tactic.tacticType.replace(/_/g, ' ')}</span>
                        </span>
                        <span className="text-[10px] ml-1.5" style={{ color: 'var(--color-text-muted)' }}>
                          ({(tactic.evalSwing / 100).toFixed(1)} pawns)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Practice in Chat */}
            {missedTactics.length > 0 && onPracticeInChat && (
              <div className="border-t border-theme-border px-3 py-2" data-testid="walk-practice-in-chat">
                <button
                  onClick={handlePracticeInChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="walk-practice-in-chat-btn"
                >
                  <Target size={12} />
                  Practice in Chat
                </button>
              </div>
            )}

            {/* ship-4: "Full analysis" escape hatch removed — it
                routed to a deleted analysis phase and landed users on
                the prep-failed fallback summary card with no way back.
                Walk phase is the canonical review surface. */}
          </div>

          {/* ── Fixed bottom: Play Again + Back to Coach ──────────────
              mb-[4.5rem] (mobile only) lifts the bar above
              AppLayout's md:hidden fixed bottom-0 nav (≈4.5rem tall)
              so its click area isn't intercepted. Audit-driven:
              audit-coach-review.mjs caught `walk-back-to-coach-btn`
              clicks failing on mobile viewport because the nav sat on
              top of the bar. md+ hides the nav, so md:mb-0. */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-3 border-t border-theme-border mb-[4.5rem] md:mb-0"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            data-testid="review-bottom-bar"
          >
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="walk-play-again-btn"
            >
              <RotateCcw size={14} />
              Play Again
            </button>
            <button
              onClick={onBackToCoach}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium hover:opacity-90"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="walk-back-to-coach-btn"
            >
              <Home size={14} />
              Back to Coach
            </button>
          </div>
        </div>
      );
    }

    // Loading / prep-failed fallback: show the summary card.
    // Per user architecture: there should NOT be a separate analysis
    // phase the user opts into. The walk UI is the only review
    // experience and auto-renders above when walkNarration arrives.
    // The `onStartReview` prop is still wired for backwards-compat
    // with the legacy "Quick / Full Review" buttons (covered by 21
    // existing tests) — but since CoachReviewSessionPage no longer
    // passes `autoStartReview` and walk-phase auto-renders on prep
    // success, normal users never need to click them. Cleanup of
    // those buttons + their tests is deferred to a follow-up commit
    // that rewrites the tests against walk-phase rendering.
    // Walk-readiness: the big green Start button on the summary card
    // becomes tappable the moment walk narration is prepped + has
    // segments. Disabled-with-spinner state covers the prep window
    // (typically 5–60s) so the user sees the affordance immediately
    // but can't fire it on an empty narration.
    const walkReady = !!walkNarration && walkNarration.segments.length > 0;
    return (
      <div className="flex flex-col items-center justify-center w-full h-full overflow-y-auto" data-testid="coach-game-review">
        <ReviewSummaryCard
          result={result}
          playerColor={playerColor}
          accuracy={accuracy}
          classificationCounts={classificationCounts}
          phaseBreakdown={phaseBreakdown}
          openingName={openingName}
          moveCount={Math.max(1, Math.ceil(moves.length / 2))}
          moves={moves}
          narrativeSummary={isLoadingNarrative ? (narrativeSummary ?? undefined) : (narrativeSummary ?? undefined)}
          missedOpportunities={missCount}
          // onStartReview omitted: clicking it would route to the
          // deleted analysis-phase, leaving the user on a dead-end
          // fallback render with no way forward. The new big-green
          // `onStartWalk` button below handles entry into the walk
          // surface — summary persists until the user taps it.
          onStartWalk={() => {
            void logAppAudit({
              kind: 'review-walk-started',
              category: 'subsystem',
              source: 'CoachGameReview.onStartWalk',
              summary: `user tapped Start (walkReady=${walkReady})`,
              details: JSON.stringify({
                walkReady,
                segmentCount: walkNarration?.segments.length ?? 0,
              }),
            });
            setWalkStarted(true);
          }}
          walkReady={walkReady}
          onPlayAgain={onPlayAgain}
          onBackToCoach={onBackToCoach}
          // Wire the "N missed opportunities → Practice" button to the
          // My Mistakes drill surface, SCOPED to this game so it drills the
          // mistakes you just made — same board, same format (David 2026-06-11).
          onNavigateToMistakes={() => {
            void logAppAudit({
              kind: 'review-walk-started',
              category: 'subsystem',
              source: 'CoachGameReview.onNavigateToMistakes',
              summary: `missed-opportunities → /tactics/mistakes (this game, ${missCount} missed)`,
            });
            void navigate('/tactics/mistakes', props.gameId ? { state: { sourceGameId: props.gameId } } : undefined);
          }}
        />
        <div className="w-full max-w-md px-4 pb-4">
          <GameReviewWeaknessCapture
            moves={moves}
            playerColor={playerColor}
            pgn={pgn}
            openingName={openingName}
            gameId={props.gameId}
          />
        </div>
      </div>
    );
  }

}
