import { useState, useCallback, useRef, useEffect, useMemo, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Home, Undo2, ArrowLeft, MessageCircle, Loader2, Play, Pause, Target, Crosshair, Zap, CheckCircle2, XCircle, GraduationCap, AlertTriangle, Sparkles, FastForward } from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { voiceService } from '../../services/voiceService';
import { PlayerInfoBar } from './PlayerInfoBar';
import { MoveNavigationControls } from './MoveNavigationControls';
import { MoveListPanel } from './MoveListPanel';
import { ReviewSummaryCard } from './ReviewSummaryCard';
import { KeyMomentNav } from './KeyMomentNav';
import { MoveActionButtons } from './MoveActionButtons';
import { ChatInput } from './ChatInput';
import { getAdaptiveMove } from '../../services/coachGameEngine';
import { getCoachCommentary } from '../../services/coachApi';
import { generateMoveCommentary } from '../../services/coachMoveCommentary';
import { INTERACTIVE_REVIEW_ADDITION } from '../../services/coachPrompts';
import { stockfishEngine } from '../../services/stockfishEngine';
import { uciToArrow, getCapturedPieces, getMaterialAdvantage } from '../../services/boardUtils';
import { calculateAccuracy, getClassificationCounts, detectMisses } from '../../services/accuracyService';
import { getPhaseBreakdown } from '../../services/gamePhaseService';
import { detectMissedTactics } from '../../services/missedTacticService';
import {
  generateNarrativeSummary,
  generateReviewNarrationSegments,
  generateReviewNarration,
} from '../../services/coachFeatureService';
import type {
  NarrativeMoveData,
  ReviewNarrationSegments,
  ReviewNarration,
  ReviewMoveInput,
} from '../../services/coachFeatureService';
import { useReviewPlayback } from '../../hooks/useReviewPlayback';
import { useReviewEngineLines } from '../../hooks/useReviewEngineLines';
import { SkipBack, SkipForward, ChevronLeft, ChevronRight, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tryCaptureForgetIntent } from '../../services/openingIntentCapture';
import { coachService } from '../../coach/coachService';
import type { LiveState } from '../../coach/types';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { logAppAudit } from '../../services/appAuditor';
import { getClassificationHighlightColor, CLASSIFICATION_STYLES } from './classificationStyles';
import { Chess } from 'chess.js';
import type { KeyMoment, CoachGameMove, ReviewState, GameAccuracy, MoveClassificationCounts, CoachContext, PhaseAccuracy, MissedTactic } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

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
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PLAYED_MOVE_ARROW_COLORS: Record<string, string> = {
  blunder: 'rgba(239, 68, 68, 0.7)',
  mistake: 'rgba(249, 115, 22, 0.7)',
  inaccuracy: 'rgba(251, 191, 36, 0.6)',
  miss: 'rgba(168, 85, 247, 0.7)',
};

function sanToSquares(san: string, fen: string): { from: string; to: string } | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

// Pacing tuned to feel like chess.com's post-game review: each move gets
// enough air for the narration to play, for the student to read the
// classification badge, and for the eval change to register. Users told
// us the previous 2.5s/6s/8s values felt rushed. Opponent moves still
// get the shorter delay so a full move pair lands in ~7-8s total.
const AUTO_REVIEW_ADVANCE_MS = 4000;
const AUTO_REVIEW_PAUSE_MS = 9000;
const AUTO_REVIEW_NARRATION_PAUSE_MS = 12000;
// Removed AUTO_REVIEW_REPLY_MS (600ms was too fast — opponent moves now use
// longer delays to prevent perception of two pieces moving simultaneously)

const CLASSIFICATION_BORDER_COLORS: Record<string, string> = {
  brilliant: 'rgba(34, 197, 94, 0.6)',
  great: 'rgba(74, 222, 128, 0.5)',
  inaccuracy: 'rgba(251, 191, 36, 0.5)',
  mistake: 'rgba(249, 115, 22, 0.5)',
  blunder: 'rgba(239, 68, 68, 0.6)',
};

export function CoachGameReview(props: CoachGameReviewProps): JSX.Element {
  const {
    moves, keyMoments, playerColor, result, openingName,
    playerName, playerRating, opponentRating,
    onPlayAgain, onBackToCoach, onPracticeInChat,
    isGuidedLesson, pgn,
  } = props;
  const initialMoveIndex = props.initialMoveIndex;
  const navigate = useNavigate();

  // ─── Summary-First Flow ─────────────────────────────────────────────────────
  const [reviewPhase, setReviewPhase] = useState<'summary' | 'analysis'>(
    isGuidedLesson ? 'analysis' : 'summary',
  );

  const startIndex = initialMoveIndex !== undefined
    ? Math.min(initialMoveIndex, moves.length - 1)
    : isGuidedLesson ? -1 : (moves.length > 0 ? moves.length - 1 : -1);

  const [reviewState, setReviewState] = useState<ReviewState>({
    mode: isGuidedLesson ? 'guided_lesson' : 'analysis',
    currentMoveIndex: startIndex,
    whatIfMoves: [],
    whatIfStartFen: null,
  });

  const [whatIfFen, setWhatIfFen] = useState<string | null>(null);
  const [whatIfCommentary, setWhatIfCommentary] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [boardFlash, setBoardFlash] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── AI Commentary State ────────────────────────────────────────────────────
  const aiCommentaryCacheRef = useRef<Map<number, string>>(new Map());
  const [aiCommentary, setAiCommentary] = useState<string | null>(null);
  const [isLoadingAiCommentary, setIsLoadingAiCommentary] = useState(false);

  // ─── Ask About Position State ───────────────────────────────────────────────
  const [askExpanded, setAskExpanded] = useState(false);
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAskStreaming, setIsAskStreaming] = useState(false);
  const askAbortRef = useRef<AbortController | null>(null);

  // ─── Practice Mode State ───────────────────────────────────────────────────
  const [practiceTarget, setPracticeTarget] = useState<MissedTactic | null>(null);
  const [practiceResult, setPracticeResult] = useState<'pending' | 'correct' | 'incorrect' | null>(null);

  // "Drill all mistakes" mode — sequentially walks through every
  // missed tactic, advancing to the next one after each practice
  // attempt resolves (correct or three-attempts-then-reveal). When the
  // queue is empty or exited early we return to normal analysis.
  const [mistakeDrillQueue, setMistakeDrillQueue] = useState<MissedTactic[]>([]);
  const [mistakeDrillIndex, setMistakeDrillIndex] = useState(0);
  const isDrillingMistakes = mistakeDrillQueue.length > 0;
  const [practiceAttempts, setPracticeAttempts] = useState(0);

  // ─── Show Best Move Arrow State ─────────────────────────────────────────────
  const [bestMoveRevealed, setBestMoveRevealed] = useState(false);

  // ─── Best Line Explorer State ──────────────────────────────────────────────
  // Revision counter: incremented on every new best-line request.
  // Async Stockfish callbacks check their captured revision against
  // the current ref — if they differ, the response is stale (user
  // navigated away) and gets discarded. Fixes the race where two
  // rapid "Show Best Line" clicks spawn parallel analyses.
  const bestLineRevisionRef = useRef(0);
  const [bestLineActive, setBestLineActive] = useState(false);
  const [bestLineMoves, setBestLineMoves] = useState<string[]>([]); // UCI moves
  const [bestLineSans, setBestLineSans] = useState<string[]>([]); // SAN moves
  const [bestLineIndex, setBestLineIndex] = useState(0); // current step in the line
  const [bestLineFen, setBestLineFen] = useState<string | null>(null); // current FEN in the line
  const [bestLineBaseFen, setBestLineBaseFen] = useState<string | null>(null); // starting FEN
  const [bestLineLoading, setBestLineLoading] = useState(false);

  // ─── Auto-Review State ────────────────────────────────────────────────────
  const [autoReviewActive, setAutoReviewActive] = useState(false);
  // Ref mirror of autoReviewActive — readable inside async callbacks
  // (closures) that resolve after the state setter has been batched.
  // Without this, a getCoachCommentary().then() that resolves after
  // the user stops auto-review would still call voiceService.speak()
  // and schedule a new advance timer, making the review "un-stoppable"
  // until the LLM response finishes.
  const autoReviewActiveRef = useRef(false);
  const [autoReviewPaused, setAutoReviewPaused] = useState(false);
  const [reviewDepth, setReviewDepth] = useState<'quick' | 'full'>('quick');
  const autoReviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we're waiting for AI commentary to finish before advancing
  const [awaitingAiNarration, setAwaitingAiNarration] = useState(false);
  // Structured narration segments (intro/closing) for the walkthrough
  const [narrationSegments, setNarrationSegments] = useState<ReviewNarrationSegments | null>(null);

  // ─── Guided Lesson State ────────────────────────────────────────────────────
  const [guidedLessonActive, setGuidedLessonActive] = useState(!!isGuidedLesson);
  const [guidedStopped, setGuidedStopped] = useState(false);
  const [guidedComplete, setGuidedComplete] = useState(false);
  const [narrativeSummary, setNarrativeSummary] = useState<string | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  // WO-REVIEW-02 walk-the-game state. Fetched once per review mount;
  // null while loading, set to a ReviewNarration once ready. Falls back
  // to the ReviewSummaryCard's paragraph view if generation fails.
  const [walkNarration, setWalkNarration] = useState<ReviewNarration | null>(null);
  const [isLoadingWalk, setIsLoadingWalk] = useState(false);
  const guidedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (reviewPhase !== 'summary' || isGuidedLesson || narrativeSummary !== null) return;
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
  }, [reviewPhase]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    if (reviewPhase !== 'summary' || isGuidedLesson || walkNarration !== null || isLoadingWalk) return;
    if (reviewMoveInputs.length === 0) return;
    setIsLoadingWalk(true);
    void generateReviewNarration({
      moves: reviewMoveInputs,
      playerColor,
      openingName,
      result,
      playerRating,
    }).then((narration) => {
      setWalkNarration(narration);
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'CoachGameReview.walkNarration',
        summary: 'generateReviewNarration rejected',
        details: msg,
      });
    }).finally(() => {
      setIsLoadingWalk(false);
    });
  }, [reviewPhase, isGuidedLesson, reviewMoveInputs, playerColor, openingName, result, playerRating, walkNarration, isLoadingWalk]);

  // Instantiate the playback hook; drives the walk-the-game UI below.
  // totalPlies is the authoritative ceiling — nav walks every move the
  // student played, even when the LLM narrated only a subset
  // (WO-REVIEW-02a-FIX).
  const walkPlayback = useReviewPlayback({
    narration: walkNarration,
    totalPlies: moves.length,
  });

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

  // Derived state from current move index
  const currentMove = reviewState.currentMoveIndex >= 0 && reviewState.currentMoveIndex < moves.length
    ? moves[reviewState.currentMoveIndex]
    : null;

  const displayFen = bestLineActive && bestLineFen
    ? bestLineFen
    : reviewState.mode === 'practice' && practiceTarget
      ? practiceTarget.fen
      : reviewState.mode === 'whatif' && whatIfFen
        ? whatIfFen
        : currentMove?.fen ?? STARTING_FEN;

  // Captured pieces + material advantage for current position
  const capturedPieces = useMemo(() => getCapturedPieces(displayFen), [displayFen]);
  const materialAdv = useMemo(() => getMaterialAdvantage(displayFen), [displayFen]);
  const isPlayerWhite = playerColor === 'white';

  // Best-move arrow: show for suboptimal player moves (only when revealed)
  const arrows = useMemo(() => {
    if (reviewState.mode !== 'analysis' && reviewState.mode !== 'guided_lesson') return [];
    if (!currentMove) return [];
    if (currentMove.isCoachMove) return [];
    if (!currentMove.bestMove) return [];
    const cls = currentMove.classification;
    if (cls === 'brilliant' || cls === 'great' || cls === 'good' || cls === 'book') return [];
    const result: Array<{ startSquare: string; endSquare: string; color: string }> = [];

    // Played move arrow (red/orange) — always show what was actually played
    const playedMoveColor = cls ? PLAYED_MOVE_ARROW_COLORS[cls] : null;
    if (playedMoveColor) {
      const prevMoveIdx = reviewState.currentMoveIndex - 1;
      const prevFen = prevMoveIdx >= 0 ? moves[prevMoveIdx]?.fen ?? STARTING_FEN : STARTING_FEN;
      const squares = sanToSquares(currentMove.san, prevFen);
      if (squares) {
        result.push({ startSquare: squares.from, endSquare: squares.to, color: playedMoveColor });
      }
    }

    // Best move arrow (green) — show when revealed via button, in guided lesson,
    // or automatically during auto-review. chess.com's review shows the best
    // move on every non-played-it-perfectly position, so relax the auto-show
    // to include inaccuracies and "miss" too (not just blunders/mistakes).
    const autoShowArrow = autoReviewActive
      && (cls === 'blunder' || cls === 'mistake' || cls === 'miss' || cls === 'inaccuracy');
    if (bestMoveRevealed || reviewState.mode === 'guided_lesson' || autoShowArrow) {
      const bestArrow = uciToArrow(currentMove.bestMove, 'rgba(34, 197, 94, 0.8)');
      if (bestArrow) result.push(bestArrow);
    }

    return result;
  }, [reviewState.mode, reviewState.currentMoveIndex, currentMove, moves, bestMoveRevealed, autoReviewActive]);

  // Board highlights: classification-colored square for played move (mistakes/blunders)
  const classificationHighlights = useMemo(() => {
    if (reviewState.mode !== 'analysis' && reviewState.mode !== 'guided_lesson') return [];
    if (!currentMove) return [];
    if (currentMove.isCoachMove) return [];
    const cls = currentMove.classification;
    if (!cls) return [];
    const highlightColor = getClassificationHighlightColor(cls);
    if (!highlightColor) return [];
    // Highlight the destination square of the played move
    const san = currentMove.san;
    // Extract destination square from SAN (last 2 chars before optional +/#/=)
    const cleaned = san.replace(/[+#=].*/, '');
    const dest = cleaned.slice(-2);
    if (dest.length === 2 && dest[0] >= 'a' && dest[0] <= 'h' && dest[1] >= '1' && dest[1] <= '8') {
      return [{ square: dest, color: highlightColor }];
    }
    return [];
  }, [reviewState.mode, currentMove]);

  // Classification badge overlay for the board (Chess.com-style icon on square)
  const classificationOverlay = useMemo(() => {
    if (reviewState.mode !== 'analysis' && reviewState.mode !== 'guided_lesson') return null;
    if (!currentMove) return null;
    if (currentMove.isCoachMove) return null;
    const cls = currentMove.classification;
    if (!cls || cls === 'good' || cls === 'book') return null;
    const style = CLASSIFICATION_STYLES[cls];
    const cleaned = currentMove.san.replace(/[+#=].*/, '');
    const dest = cleaned.slice(-2);
    if (dest.length === 2 && dest[0] >= 'a' && dest[0] <= 'h' && dest[1] >= '1' && dest[1] <= '8') {
      return { square: dest, symbol: style.symbol, color: style.color };
    }
    return null;
  }, [reviewState.mode, currentMove]);

  // Commentary for current move
  const commentary = useMemo<string>(() => {
    if (reviewState.mode === 'whatif' && whatIfCommentary) return whatIfCommentary;
    if (!currentMove) return 'Starting position';
    // Check if this move is a key moment
    const keyMoment = keyMoments.find((km) => km.moveNumber === currentMove.moveNumber);
    if (keyMoment) return keyMoment.explanation;
    return currentMove.commentary || '';
  }, [reviewState.mode, whatIfCommentary, currentMove, keyMoments]);

  // Flash board border on classification change
  useEffect(() => {
    if (!currentMove?.classification) {
      setBoardFlash(null);
      return;
    }
    const color = CLASSIFICATION_BORDER_COLORS[currentMove.classification];
    if (color) {
      setBoardFlash(color);
      const timer = setTimeout(() => setBoardFlash(null), 600);
      return () => clearTimeout(timer);
    }
    setBoardFlash(null);
  }, [reviewState.currentMoveIndex, currentMove?.classification]);

  // Keyboard navigation effect is declared below navigateMove — it
  // needs navigateMove in its dep array, so it has to come after the
  // useCallback declaration to avoid a TDZ error at render time.

  // ─── AI Commentary: lazy-load for key moments and significant positions ─────
  // Skipped during auto-review / guided lesson auto-advance — those modes
  // handle their own narration and voice. Running both simultaneously causes
  // duplicate fetches, interleaved streaming chunks, and a mismatch between
  // the spoken text (template) and displayed text (AI analysis).
  useEffect(() => {
    if (reviewState.mode !== 'analysis' && reviewState.mode !== 'guided_lesson') return;
    if (autoReviewActive || (guidedLessonActive && !guidedStopped)) {
      // Auto-advance modes manage their own commentary; clear stale AI text
      setAiCommentary(null);
      setIsLoadingAiCommentary(false);
      return;
    }
    if (!currentMove) {
      setAiCommentary(null);
      return;
    }

    // Fetch AI commentary for EVERY move the user navigates to — opponent
    // moves included, ordinary "good" moves included. Users complained
    // that the review was silent on most moves because we used to gate
    // on classification (blunder/mistake/brilliant/inaccuracy) or a
    // 50cp eval swing. The cache below makes re-visits instant, so the
    // only real cost is one LLM call the first time each move is
    // displayed.
    const moveIdx = reviewState.currentMoveIndex;

    // Check cache first
    const cached = aiCommentaryCacheRef.current.get(moveIdx);
    if (cached) {
      setAiCommentary(cached);
      return;
    }

    // Build context and fetch from Claude with positional narration prompt
    let cancelled = false;
    setIsLoadingAiCommentary(true);
    setAiCommentary(null);

    const moveNum = Math.floor(moveIdx / 2) + 1;
    const ctx: CoachContext = {
      fen: currentMove.fen,
      lastMoveSan: currentMove.san,
      moveNumber: moveNum,
      pgn: moves.slice(0, moveIdx + 1).map((m) => m.san).join(' '),
      openingName,
      stockfishAnalysis: currentMove.evaluation !== null ? {
        evaluation: currentMove.evaluation,
        bestMove: currentMove.bestMove ?? '',
        isMate: false,
        mateIn: null,
        depth: 0,
        topLines: [],
        nodesPerSecond: 0,
      } : null,
      playerMove: currentMove.san,
      moveClassification: currentMove.classification,
      playerProfile: { rating: playerRating, weaknesses: [] },
      additionalContext: INTERACTIVE_REVIEW_ADDITION,
    };

    void getCoachCommentary('interactive_review', ctx, (chunk) => {
      if (!cancelled) {
        setAiCommentary((prev: string | null) => (prev ?? '') + chunk);
      }
    }).then((fullText) => {
      if (!cancelled) {
        aiCommentaryCacheRef.current.set(moveIdx, fullText);
        setAiCommentary(fullText);
        // Disabled by WO-COACH-NARRATION-04 — legacy per-move voice overlaps
        // with post-game review voice (the summary narrative auto-speak above
        // is the canonical review voice). Text surface retained: aiCommentary
        // still renders so the student can read the per-move analysis.
        void fullText;
      }
    }).finally(() => {
      if (!cancelled) setIsLoadingAiCommentary(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depends on moveIndex, not full currentMove
  }, [reviewState.currentMoveIndex, reviewState.mode, autoReviewActive, guidedLessonActive, guidedStopped]);

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
    const reviewLiveState: LiveState = {
      surface: 'review',
      fen: fenForQ,
      moveHistory: moves.slice(0, Math.max(0, moveIdx + 1)).map((m) => m.san),
      userJustDid: question,
      currentRoute: '/coach/play',
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
    void coachService
      .ask(
        { surface: 'review', ask: question, liveState: reviewLiveState },
        {
          onChunk: (chunk: string) => {
            if (!abortSignal.aborted) {
              setAskResponse((prev: string | null) => (prev ?? '') + chunk);
            }
          },
          onNavigate: (path: string) => {
            void navigate(path);
          },
        },
      )
      .then((answer) => {
        // WO-BRAIN-04: persist coach reply into conversation history.
        if (!abortSignal.aborted && answer.text.trim().length > 0) {
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-review-ask',
            role: 'coach',
            text: answer.text,
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

  // Reset ask state and best-move reveal when navigating to a different move
  useEffect(() => {
    setAskExpanded(false);
    setAskResponse(null);
    setIsAskStreaming(false);
    setBestMoveRevealed(false);
    if (askAbortRef.current) askAbortRef.current.abort();
  }, [reviewState.currentMoveIndex]);

  const navigateMove = useCallback((direction: 'first' | 'prev' | 'next' | 'last') => {
    voiceService.stop();
    // Cancel any pending auto-advance timers + halt auto-review / guided
    // playback. Without this, a manual click while an auto-timer is in
    // flight produces a visible "two pieces moved" jump (the user's +1
    // followed by the timer's +1), which was the reported review-mode
    // bug.
    if (autoReviewTimerRef.current) {
      clearTimeout(autoReviewTimerRef.current);
      autoReviewTimerRef.current = null;
    }
    if (guidedTimerRef.current) {
      clearTimeout(guidedTimerRef.current);
      guidedTimerRef.current = null;
    }
    setAutoReviewActive(false);
    autoReviewActiveRef.current = false;
    setAutoReviewPaused(false);
    setAwaitingAiNarration(false);
    // Clean up practice mode if the user navigates away mid-drill.
    // Without this, practiceTarget stays set → board remains
    // interactive when it shouldn't be, and the practice UI bleeds
    // into analysis mode.
    setPracticeTarget(null);
    setPracticeResult('pending');
    // Also exit best-line view so the board shows the actual game
    // position, not a stale engine line.
    setBestLineActive(false);
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
  // press advances N plies at once. navigateMove is stable
  // (only depends on moves.length) so this installs exactly once per
  // review session.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
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
  }, [reviewState.mode, navigateMove]);

  const handleMoveClick = useCallback((moveIndex: number) => {
    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'analysis',
      currentMoveIndex: moveIndex,
      whatIfMoves: [],
      whatIfStartFen: null,
    }));
    setWhatIfFen(null);
    setWhatIfCommentary(null);
  }, []);

  // Handle player move on the board — enter what-if mode
  const handleBoardMove = useCallback(async (moveResult: MoveResult) => {
    // If we were in best line mode, exit it and use the best line FEN as the start
    const startFen = bestLineActive && bestLineFen
      ? bestLineBaseFen ?? bestLineFen
      : reviewState.whatIfStartFen ?? currentMove?.fen ?? null;

    if (bestLineActive) {
      setBestLineActive(false);
      setBestLineMoves([]);
      setBestLineSans([]);
      setBestLineIndex(0);
      setBestLineFen(null);
      setBestLineBaseFen(null);
    }

    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'whatif',
      whatIfMoves: [...prev.whatIfMoves, moveResult.san],
      whatIfStartFen: startFen,
    }));

    setWhatIfFen(moveResult.fen);

    // In-depth commentary on the what-if move — tied to Stockfish eval
    // swing and narrated by the coach LLM. Returns empty string when
    // the LLM isn't configured; we only surface real analysis, never
    // generic template filler.
    try {
      const [analysisBefore, analysisAfter] = await Promise.all([
        startFen
          ? stockfishEngine.queueAnalysis(startFen, 12).catch(() => null)
          : Promise.resolve(null),
        stockfishEngine.queueAnalysis(moveResult.fen, 12).catch(() => null),
      ]);
      const probe = new Chess();
      probe.load(moveResult.fen);
      const moverThatJustMoved: 'w' | 'b' =
        probe.turn() === 'w' ? 'b' : 'w';
      let bestReplySan: string | undefined;
      const bestUci = analysisAfter?.bestMove;
      if (bestUci) {
        try {
          const p = new Chess(moveResult.fen);
          const bestMoveResult = p.move({
            from: bestUci.slice(0, 2),
            to: bestUci.slice(2, 4),
            promotion: bestUci.length > 4 ? bestUci[4] : undefined,
          });
          bestReplySan = bestMoveResult.san;
        } catch {
          // best-reply probe is best-effort only
        }
      }
      const commentary = await generateMoveCommentary({
        gameAfter: probe,
        mover: moverThatJustMoved,
        evalBefore: analysisBefore?.evaluation ?? null,
        evalAfter: analysisAfter?.evaluation ?? null,
        bestReplySan,
        reviewTone: true,
      });
      setWhatIfCommentary(commentary || null);
    } catch {
      setWhatIfCommentary(null);
    }

    // Check whose turn it is after the player's move
    const turnFromFen = moveResult.fen.split(' ')[1]; // 'w' or 'b'
    const isOpponentTurn = (playerColor === 'white' && turnFromFen === 'b')
                        || (playerColor === 'black' && turnFromFen === 'w');

    // Auto-respond as the opponent; if the player moved the opponent's pieces, skip
    if (isOpponentTurn) {
      setIsThinking(true);
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const { move } = await getAdaptiveMove(moveResult.fen, 2500);
        if (abortRef.current.signal.aborted) return;

        const chess = new Chess(moveResult.fen);
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const promotion = move.length > 4 ? move[4] : undefined;
        const sfResult = chess.move({ from, to, promotion });

        setReviewState((prev: ReviewState) => ({
          ...prev,
          whatIfMoves: [...prev.whatIfMoves, sfResult.san],
        }));
        setWhatIfFen(chess.fen());
      } catch {
        // Stockfish failed — stay on current position, player can move manually
      } finally {
        setIsThinking(false);
      }
    }
  }, [reviewState.whatIfStartFen, currentMove?.fen, playerColor, bestLineActive, bestLineFen, bestLineBaseFen]);

  const handleBackToReview = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'analysis',
      whatIfMoves: [],
      whatIfStartFen: null,
    }));
    setWhatIfFen(null);
    setWhatIfCommentary(null);
    setIsThinking(false);
  }, []);

  /**
   * "Play from here" — drop the student into what-if mode from the
   * current position so they can explore alternatives on the real
   * interactive board. Pairs with the Show Best Move / Show Best Line
   * buttons: see the best move, then play it out yourself.
   */
  const handlePlayFromHere = useCallback(() => {
    const fen = currentMove?.fen ?? null;
    if (!fen) return;
    if (reviewState.mode === 'whatif') {
      handleBackToReview();
      return;
    }
    setWhatIfFen(fen);
    setWhatIfCommentary(null);
    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'whatif',
      whatIfMoves: [],
      whatIfStartFen: fen,
    }));
  }, [currentMove, reviewState.mode, handleBackToReview]);

  // ─── Practice Mode Handlers ──────────────────────────────────────────────────
  const handleStartPractice = useCallback((tactic: MissedTactic) => {
    setPracticeTarget(tactic);
    setPracticeResult('pending');
    setPracticeAttempts(0);
    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'practice',
      whatIfMoves: [],
      whatIfStartFen: null,
    }));
    setWhatIfFen(null);
    setWhatIfCommentary(null);
  }, []);

  const handlePracticeMove = useCallback((moveResult: MoveResult) => {
    if (!practiceTarget) return;

    // Compare with best move (UCI format)
    const playerUci = `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`;
    const bestMoveUci = practiceTarget.bestMove;

    // Check if the player found the best move
    if (playerUci === bestMoveUci) {
      setPracticeResult('correct');
      setBoardFlash('rgba(34, 197, 94, 0.6)');
    } else {
      const newAttempts = practiceAttempts + 1;
      setPracticeAttempts(newAttempts);

      if (newAttempts >= 3) {
        // Reveal the answer
        setPracticeResult('incorrect');
        setBoardFlash('rgba(239, 68, 68, 0.6)');
      } else {
        // Allow retry
        setBoardFlash('rgba(245, 158, 11, 0.6)');
      }
    }

    const timer = setTimeout(() => setBoardFlash(null), 600);
    return () => clearTimeout(timer);
  }, [practiceTarget, practiceAttempts]);

  const handleExitPractice = useCallback(() => {
    setPracticeTarget(null);
    setPracticeResult(null);
    setPracticeAttempts(0);
    // Stop any running drill too — explicit exit should not keep
    // queuing up the next mistake.
    setMistakeDrillQueue([]);
    setMistakeDrillIndex(0);
    handleBackToReview();
  }, [handleBackToReview]);

  /** Start a sequential drill through every missed tactic in the
   *  current game. Each tactic is presented in turn; after the
   *  student resolves the current one (correct or reveal), the next
   *  one auto-loads. */
  const handleStartMistakeDrill = useCallback(() => {
    if (missedTactics.length === 0) return;
    setMistakeDrillQueue(missedTactics);
    setMistakeDrillIndex(0);
    handleStartPractice(missedTactics[0]);
  }, [missedTactics, handleStartPractice]);

  /**
   * "Show" the missed tactic — navigate to the move and play out
   * what the engine wanted in the best-line view, speaking the
   * coach's explanation alongside. Different from "Try It" (which
   * puts the user in practice mode and asks them to find the move).
   * Show is the "I just want to see what I missed and hear why"
   * affordance.
   */
  const handleShowMissedTactic = useCallback(async (tactic: MissedTactic): Promise<void> => {
    voiceService.stop();

    // Land on the missed-tactic move so the move list highlight + the
    // surrounding context update. The board itself will switch to the
    // best-line view via setBestLineFen below.
    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'analysis',
      currentMoveIndex: tactic.moveIndex,
      whatIfMoves: [],
    }));

    // Pull the engine's full PV from the position BEFORE the missed
    // move (tactic.fen is the preFen) and seed the existing
    // best-line view. The user can then step through with the
    // existing prev/next arrows under the board.
    setBestLineLoading(true);
    try {
      const analysis = await stockfishEngine.analyzePosition(tactic.fen, 18);
      const pvMoves = analysis.topLines[0]?.moves ?? [];
      if (pvMoves.length > 0) {
        // UCI → SAN for display in the best-line strip.
        const sans: string[] = [];
        try {
          const chess = new Chess(tactic.fen);
          for (const uci of pvMoves) {
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const promotion = uci.length > 4 ? uci[4] : undefined;
            // chess.js throws on illegal moves; the outer try/catch
            // catches it so we just walk as far as the line is legal.
            const m = chess.move({ from, to, promotion });
            sans.push(m.san);
          }
        } catch {
          // SAN conversion failed — surface UCI moves anyway.
        }

        setBestLineMoves(pvMoves);
        setBestLineSans(sans);
        setBestLineIndex(0);
        setBestLineBaseFen(tactic.fen);
        setBestLineFen(tactic.fen);
        setBestLineActive(true);
      }
    } catch {
      // Stockfish failed — degrade gracefully; the explanation still speaks.
    }
    setBestLineLoading(false);

    // Silenced by WO-LEGACY-VOICE-01 — tactic.explanation strings carry
    // deterministic piece-letter shorthand ("hanging X on Y") that is
    // the legacy voice Dave wants gone. Text surface retained: the
    // tactic banner / highlight still renders.
    void tactic.explanation;
  }, []);

  /** Advance the drill to the next missed tactic, or exit if done. */
  const handleDrillNext = useCallback(() => {
    const nextIdx = mistakeDrillIndex + 1;
    if (nextIdx >= mistakeDrillQueue.length) {
      setMistakeDrillQueue([]);
      setMistakeDrillIndex(0);
      handleExitPractice();
      return;
    }
    setMistakeDrillIndex(nextIdx);
    // Reset practice state locally then start the next tactic without
    // going through handleExitPractice (which would clear the drill
    // queue).
    setPracticeTarget(null);
    setPracticeResult(null);
    setPracticeAttempts(0);
    handleStartPractice(mistakeDrillQueue[nextIdx]);
  }, [mistakeDrillIndex, mistakeDrillQueue, handleStartPractice, handleExitPractice]);

  // Reveal arrow for the best move in practice mode
  const practiceArrows = useMemo(() => {
    if (reviewState.mode !== 'practice' || !practiceTarget) return [];
    if (practiceResult !== 'incorrect' && practiceResult !== 'correct') return [];
    const arrow = uciToArrow(practiceTarget.bestMove, 'rgba(34, 197, 94, 0.8)');
    return arrow ? [arrow] : [];
  }, [reviewState.mode, practiceTarget, practiceResult]);

  // ─── Best Line Explorer ────────────────────────────────────────────────────
  const handleToggleBestLine = useCallback(async () => {
    if (bestLineActive) {
      // Exit best line mode
      bestLineRevisionRef.current++;
      setBestLineActive(false);
      setBestLineMoves([]);
      setBestLineSans([]);
      setBestLineIndex(0);
      setBestLineFen(null);
      setBestLineBaseFen(null);
      return;
    }

    // Get the pre-move position FEN
    const moveIdx = reviewState.currentMoveIndex;
    const preFen = moveIdx > 0 ? moves[moveIdx - 1]?.fen ?? STARTING_FEN : STARTING_FEN;

    bestLineRevisionRef.current++;
    const thisRevision = bestLineRevisionRef.current;
    setBestLineLoading(true);
    try {
      const analysis = await stockfishEngine.analyzePosition(preFen, 18);
      // Discard stale response if user navigated away during analysis
      if (bestLineRevisionRef.current !== thisRevision) return;
      const pvMoves = analysis.topLines[0]?.moves ?? [];
      if (pvMoves.length === 0) {
        setBestLineLoading(false);
        return;
      }

      // Convert UCI moves to SAN for display
      const sans: string[] = [];
      const chess = new Chess(preFen);
      for (const uci of pvMoves) {
        try {
          const from = uci.slice(0, 2);
          const to = uci.slice(2, 4);
          const promotion = uci.length > 4 ? uci[4] : undefined;
          const move = chess.move({ from, to, promotion });
          sans.push(move.san);
        } catch {
          break;
        }
      }

      setBestLineMoves(pvMoves.slice(0, sans.length));
      setBestLineSans(sans);
      setBestLineIndex(0);
      setBestLineBaseFen(preFen);
      setBestLineFen(preFen);
      setBestLineActive(true);
    } catch {
      // Analysis failed
    }
    setBestLineLoading(false);
  }, [bestLineActive, reviewState.currentMoveIndex, moves]);

  const handleBestLineStep = useCallback((direction: 'next' | 'prev') => {
    if (!bestLineBaseFen || bestLineMoves.length === 0) return;

    const newIndex = direction === 'next'
      ? Math.min(bestLineIndex + 1, bestLineMoves.length)
      : Math.max(bestLineIndex - 1, 0);

    // Replay moves from base FEN up to newIndex
    const chess = new Chess(bestLineBaseFen);
    for (let i = 0; i < newIndex; i++) {
      const uci = bestLineMoves[i];
      try {
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      } catch {
        break;
      }
    }

    setBestLineIndex(newIndex);
    setBestLineFen(chess.fen());
  }, [bestLineBaseFen, bestLineMoves, bestLineIndex]);

  // Reset best line when move changes
  useEffect(() => {
    if (bestLineActive) {
      setBestLineActive(false);
      setBestLineMoves([]);
      setBestLineSans([]);
      setBestLineIndex(0);
      setBestLineFen(null);
      setBestLineBaseFen(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewState.currentMoveIndex]);

  // ─── Auto-Review Mode ──────────────────────────────────────────────────────
  const handleStartAutoReview = useCallback(() => {
    // Mutex: kill guided-lesson if it's running — both auto-advance
    // moveIndex independently and would otherwise double-step.
    if (guidedTimerRef.current) {
      clearTimeout(guidedTimerRef.current);
      guidedTimerRef.current = null;
    }
    setGuidedLessonActive(false);
    setGuidedStopped(false);
    setAutoReviewActive(true);
    autoReviewActiveRef.current = true;
    setAutoReviewPaused(false);
    setAwaitingAiNarration(false);
    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'analysis',
      currentMoveIndex: -1,
      whatIfMoves: [],
      whatIfStartFen: null,
    }));
    setWhatIfFen(null);
    setWhatIfCommentary(null);
  }, []);

  const handleStopAutoReview = useCallback(() => {
    setAutoReviewActive(false);
    autoReviewActiveRef.current = false;
    setAutoReviewPaused(false);
    setAwaitingAiNarration(false);
    voiceService.stop();
    if (autoReviewTimerRef.current) {
      clearTimeout(autoReviewTimerRef.current);
      autoReviewTimerRef.current = null;
    }
  }, []);

  const handleToggleAutoReviewPause = useCallback(() => {
    setAutoReviewPaused((prev: boolean) => {
      if (!prev) voiceService.stop(); // Pause → stop speaking
      return !prev;
    });
  }, []);

  // Auto-review advancement effect with voice narration
  useEffect(() => {
    // Shared cleanup: always clear any pending auto-review timer when this
    // effect re-runs or unmounts, preventing leaked timeouts that could
    // double-advance the move index.
    const cleanup = (): void => {
      if (autoReviewTimerRef.current) {
        clearTimeout(autoReviewTimerRef.current);
        autoReviewTimerRef.current = null;
      }
    };

    if (!autoReviewActive || autoReviewPaused || awaitingAiNarration) {
      cleanup();
      return cleanup;
    }

    const moveIdx = reviewState.currentMoveIndex;
    if (moveIdx >= moves.length - 1) {
      cleanup();
      // Silenced by WO-LEGACY-VOICE-01 — auto-review closing. Grounded
      // review summary speaks once at mount; subsequent auto-review
      // speaks used to interrupt it. Text surface retained elsewhere.
      const closingText = narrationSegments?.closing ?? 'That concludes the game review.';
      void closingText;
      setAutoReviewActive(false);
      return cleanup;
    }

    // Starting position (moveIdx === -1): speak the intro narration segment
    if (moveIdx === -1) {
      if (narrationSegments?.intro) {
        // Silenced by WO-LEGACY-VOICE-01 — auto-review intro. Grounded
        // review summary is the canonical voice; this used to interrupt it.
        void narrationSegments.intro;
        const introDelay = Math.max(4000, narrationSegments.intro.length * 55);
        autoReviewTimerRef.current = setTimeout(() => {
          setReviewState((prev: ReviewState) => ({ ...prev, currentMoveIndex: 0 }));
        }, introDelay);
      } else {
        // Segments still loading — brief pause then start
        autoReviewTimerRef.current = setTimeout(() => {
          setReviewState((prev: ReviewState) => ({ ...prev, currentMoveIndex: 0 }));
        }, 1500);
      }
      return cleanup;
    }

    const currentMoveForAutoReview = moveIdx >= 0 && moveIdx < moves.length ? moves[moveIdx] : null;
    const isOpponentMove = currentMoveForAutoReview?.isCoachMove === true;

    // Determine if this is a key moment (only for player moves)
    const cls = currentMoveForAutoReview?.classification;
    const isKeyMoment = !isOpponentMove && (cls === 'blunder' || cls === 'mistake' || cls === 'brilliant');
    const isNotable = !isOpponentMove && (cls === 'inaccuracy' || cls === 'great' || cls === 'miss');

    // Helper: schedule advancement to the next move
    const scheduleAdvance = (delay: number): void => {
      autoReviewTimerRef.current = setTimeout(() => {
        setReviewState((prev: ReviewState) => ({
          ...prev,
          currentMoveIndex: Math.min(moves.length - 1, prev.currentMoveIndex + 1),
        }));
      }, delay);
    };

    // ─── Full Review: fetch AI commentary for key moments, pause until done ──
    if (reviewDepth === 'full' && isKeyMoment && currentMoveForAutoReview) {
      const cachedComment = aiCommentaryCacheRef.current.get(moveIdx);
      if (cachedComment) {
        // Silenced by WO-LEGACY-VOICE-01 — per-move cached comment.
        // Text surface retained via setAiCommentary; timing preserved.
        setAiCommentary(cachedComment);
        void cachedComment;
        scheduleAdvance(Math.max(AUTO_REVIEW_NARRATION_PAUSE_MS, cachedComment.length * 55));
      } else {
        // Fetch AI commentary — pause advancement until it's done
        setAwaitingAiNarration(true);
        setAiCommentary(null);
        setIsLoadingAiCommentary(true);
        const moveNum = Math.floor(moveIdx / 2) + 1;
        const ctx: CoachContext = {
          fen: currentMoveForAutoReview.fen,
          lastMoveSan: currentMoveForAutoReview.san,
          moveNumber: moveNum,
          pgn: moves.slice(0, moveIdx + 1).map((m) => m.san).join(' '),
          openingName,
          stockfishAnalysis: currentMoveForAutoReview.evaluation !== null ? {
            evaluation: currentMoveForAutoReview.evaluation,
            bestMove: currentMoveForAutoReview.bestMove ?? '',
            isMate: false,
            mateIn: null,
            depth: 0,
            topLines: [],
            nodesPerSecond: 0,
          } : null,
          playerMove: currentMoveForAutoReview.san,
          moveClassification: currentMoveForAutoReview.classification,
          playerProfile: { rating: playerRating, weaknesses: [] },
          additionalContext: INTERACTIVE_REVIEW_ADDITION,
        };

        void getCoachCommentary('interactive_review', ctx, (chunk) => {
          // Guard streaming chunks: if user stopped auto-review while
          // the LLM was streaming, don't keep updating the UI with
          // stale chunks.
          if (!autoReviewActiveRef.current) return;
          setAiCommentary((prev: string | null) => (prev ?? '') + chunk);
        }).then((fullText) => {
          aiCommentaryCacheRef.current.set(moveIdx, fullText);
          // If auto-review was stopped while the LLM call was in
          // flight, don't speak the response or schedule a new
          // advance. This closes the "un-stoppable review" race
          // where a slow LLM response would re-start voice + advance
          // after the user had already pressed Stop.
          if (!autoReviewActiveRef.current) {
            setIsLoadingAiCommentary(false);
            setAwaitingAiNarration(false);
            return;
          }
          setAiCommentary(fullText);
          setIsLoadingAiCommentary(false);
          // Silenced by WO-LEGACY-VOICE-01 — streamed per-move LLM
          // commentary. Text surface retained via setAiCommentary.
          void fullText;
          const narrationDelay = Math.max(AUTO_REVIEW_NARRATION_PAUSE_MS, fullText.length * 55);
          autoReviewTimerRef.current = setTimeout(() => {
            setAwaitingAiNarration(false);
            setReviewState((prev: ReviewState) => ({
              ...prev,
              currentMoveIndex: Math.min(moves.length - 1, prev.currentMoveIndex + 1),
            }));
          }, narrationDelay);
        }).catch(() => {
          setIsLoadingAiCommentary(false);
          setAwaitingAiNarration(false);
        });
      }
      return cleanup;
    }

    // ─── Voice narration: speak the commentary that matches what's displayed ──
    if (currentMoveForAutoReview && !isOpponentMove) {
      const moveNum = Math.ceil(currentMoveForAutoReview.moveNumber / 2);
      // Use cached AI commentary if available (richer), otherwise template
      const cachedAi = aiCommentaryCacheRef.current.get(moveIdx);
      const spokenText = cachedAi ?? currentMoveForAutoReview.commentary;
      // Silenced by WO-LEGACY-VOICE-01 — these per-move speaks carried
      // CoachGameMove.commentary which contains tacticSuffix text
      // ("Hanging: White pawn on h7") — the exact legacy voice Dave
      // flagged. Text surface retained via setAiCommentary above.
      if (isKeyMoment && spokenText) {
        void `Move ${moveNum}. ${spokenText}`;
      } else if (reviewDepth === 'full' && isNotable && spokenText) {
        void spokenText;
      }
    }

    // ─── Timing ─────────────────────────────────────────────────────────────
    let delay: number;
    if (isKeyMoment) {
      delay = AUTO_REVIEW_NARRATION_PAUSE_MS;
    } else if (isNotable) {
      delay = reviewDepth === 'full' ? AUTO_REVIEW_PAUSE_MS : AUTO_REVIEW_ADVANCE_MS;
    } else if (isOpponentMove) {
      // Visible pause so each side's move is distinct (not simultaneous).
      // Must be longer than the board animation (200ms) to avoid perception
      // of two pieces moving at once.
      delay = AUTO_REVIEW_ADVANCE_MS;
    } else {
      delay = AUTO_REVIEW_ADVANCE_MS;
    }

    scheduleAdvance(delay);
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depend on specific values
  }, [autoReviewActive, autoReviewPaused, awaitingAiNarration, reviewState.currentMoveIndex, moves, reviewDepth, narrationSegments]);

  // ─── Guided Lesson Auto-Advance Effect ────────────────────────────────────
  const GUIDED_ADVANCE_MS = 2000;

  useEffect(() => {
    if (!guidedLessonActive || guidedStopped || guidedComplete) return;
    if (reviewState.mode !== 'guided_lesson') return;

    const moveIdx = reviewState.currentMoveIndex;

    // Check if we've reached the end
    if (moveIdx >= moves.length - 1) {
      setGuidedComplete(true);
      setGuidedLessonActive(false);

      // Silenced by WO-LEGACY-VOICE-01 — guided-lesson closing announcement.
      // Grounded review summary is the canonical post-game voice.

      // Generate narrative summary
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
        setNarrativeSummary(fullText);
      }).finally(() => {
        setIsLoadingNarrative(false);
      });
      return;
    }

    // Check if current move is a critical moment that should stop
    const nextIdx = moveIdx + 1;
    const nextMove = nextIdx < moves.length ? moves[nextIdx] : null;
    if (nextMove && !nextMove.isCoachMove) {
      const cls = nextMove.classification;
      if (cls === 'blunder' || cls === 'mistake' || cls === 'brilliant') {
        // Advance to the critical move, then stop and narrate
        guidedTimerRef.current = setTimeout(() => {
          setReviewState((prev: ReviewState) => ({
            ...prev,
            currentMoveIndex: nextIdx,
          }));
          setGuidedStopped(true);

          // Silenced by WO-LEGACY-VOICE-01 — guided-lesson per-move speak
          // carried the same tacticSuffix-tainted CoachGameMove.commentary
          // as the auto-review path. Text surface retained elsewhere.
          if (nextMove.commentary) {
            const moveNum = Math.ceil(nextMove.moveNumber / 2);
            void `Move ${moveNum}. ${nextMove.commentary}`;
          }
        }, GUIDED_ADVANCE_MS);

        return () => {
          if (guidedTimerRef.current) clearTimeout(guidedTimerRef.current);
        };
      }
    }

    // Normal advance — opponent replies use a shorter delay but still long
    // enough for the board animation (200ms) to complete so that moves are
    // visually distinct and don't appear to happen simultaneously.
    const currentGuidedMove = moveIdx >= 0 && moveIdx < moves.length ? moves[moveIdx] : null;
    const guidedDelay = currentGuidedMove?.isCoachMove ? 1200 : GUIDED_ADVANCE_MS;

    guidedTimerRef.current = setTimeout(() => {
      setReviewState((prev: ReviewState) => ({
        ...prev,
        currentMoveIndex: Math.min(moves.length - 1, prev.currentMoveIndex + 1),
      }));
    }, guidedDelay);

    return () => {
      if (guidedTimerRef.current) clearTimeout(guidedTimerRef.current);
    };
  }, [guidedLessonActive, guidedStopped, guidedComplete, reviewState.currentMoveIndex, reviewState.mode, moves, pgn, playerColor, openingName, result, playerRating, narrativeMoveData]);

  // Guided lesson: resume auto-advance
  const handleGuidedContinue = useCallback(() => {
    setGuidedStopped(false);
  }, []);

  // Guided lesson: enter practice mode for the stopped critical moment
  const handleGuidedTryIt = useCallback(() => {
    const moveIdx = reviewState.currentMoveIndex;
    const move = moveIdx >= 0 && moveIdx < moves.length ? moves[moveIdx] : null;
    if (!move || !move.bestMove) return;

    // Find the pre-move FEN (the position before the critical move was played)
    const preFen = moveIdx > 0 ? moves[moveIdx - 1].fen : STARTING_FEN;

    const tactic: MissedTactic = {
      moveIndex: moveIdx,
      fen: preFen,
      bestMove: move.bestMove,
      playerMoved: move.san,
      evalSwing: move.preMoveEval !== null && move.evaluation !== null
        ? Math.abs(move.evaluation - move.preMoveEval)
        : 0,
      tacticType: 'tactical_sequence',
      explanation: move.commentary || `The best move here was ${move.bestMove}.`,
    };

    handleStartPractice(tactic);
  }, [reviewState.currentMoveIndex, moves, handleStartPractice]);

  // Guided lesson: exit practice and resume lesson
  const handleGuidedExitPractice = useCallback(() => {
    setPracticeTarget(null);
    setPracticeResult(null);
    setPracticeAttempts(0);
    setReviewState((prev: ReviewState) => ({
      ...prev,
      mode: 'guided_lesson',
      whatIfMoves: [],
      whatIfStartFen: null,
    }));
    setWhatIfFen(null);
    setWhatIfCommentary(null);
    setIsThinking(false);
    // Resume auto-advance
    setGuidedStopped(false);
  }, []);

  // ─── Practice In Chat Handler ─────────────────────────────────────────────
  const handlePracticeInChat = useCallback(() => {
    const tacticTypes = [...new Set(missedTactics.map((t: MissedTactic) => t.tacticType))];
    const prompt = tacticTypes.length > 0
      ? `I want to practice the tactics I missed in my last game. I struggled with: ${tacticTypes.join(', ')}. Set up some practice positions for me.`
      : 'I want to practice tactics based on my recent game. Set up some practice positions for me.';
    onPracticeInChat?.(prompt);
  }, [missedTactics, onPracticeInChat]);

  // Handle transitioning from summary to analysis
  const handleStartReview = useCallback((depth: 'quick' | 'full') => {
    setReviewPhase('analysis');
    setReviewDepth(depth);
    // Start at the beginning and immediately kick off auto-review
    setReviewState((prev: ReviewState) => ({
      ...prev,
      currentMoveIndex: -1,
    }));
    setAutoReviewActive(true);
    setAutoReviewPaused(false);

    // Fetch structured intro/closing narration segments in the background
    const gamePgn = pgn ?? moves.map((m) => m.san).join(' ');
    void generateReviewNarrationSegments(
      gamePgn, playerColor, openingName, result, playerRating, narrativeMoveData,
    ).then((segments) => {
      setNarrationSegments(segments);
    }).catch(() => {
      // Fallback handled inside generateReviewNarrationSegments
    });
  }, [pgn, moves, playerColor, openingName, result, playerRating, narrativeMoveData]);

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

  // ─── Summary Phase ──────────────────────────────────────────────────────────
  if (reviewPhase === 'summary') {
    // WO-REVIEW-02 walk-the-game: when per-ply narration is ready,
    // render the walk UI (board + nav + subtitle banner). While
    // loading, show the summary card with a spinner tag. If generation
    // fails entirely (walkNarration stays null + not loading), also
    // fall through to the card so the student isn't blocked.
    if (walkNarration && walkNarration.segments.length > 0) {
      const seg = walkPlayback.currentSegment;
      // Board FEN source of truth: the walk segment when available,
      // otherwise the game's move history (moves[ply-1].fen). This
      // keeps the board in sync even when the narration bundle is
      // truncated or missing for the current ply (WO-REVIEW-02a-FIX).
      const displayFen = seg
        ? seg.fenAfter
        : walkPlayback.currentPly > 0
          ? moves[walkPlayback.currentPly - 1]?.fen ?? STARTING_FEN
          : STARTING_FEN;
      const walkArrows = (() => {
        if (!seg) return undefined;
        const showBest = seg.classification === 'inaccuracy' || seg.classification === 'mistake' || seg.classification === 'blunder';
        if (!showBest || !seg.bestMoveUci || seg.bestMoveUci.length < 4) return undefined;
        const startSquare = seg.bestMoveUci.slice(0, 2);
        const endSquare = seg.bestMoveUci.slice(2, 4);
        return [{ startSquare, endSquare, color: '#22c55e' }];
      })();
      const badge = seg?.classification ?? null;
      const lastPly = walkNarration.segments[walkNarration.segments.length - 1].ply;
      // Map the walk's 1-indexed ply to the move list / KeyMomentNav's
      // 0-indexed move index. ply 0 = intro (no selected move).
      const walkMoveIndex = walkPlayback.currentPly > 0 ? walkPlayback.currentPly - 1 : -1;

      // WO-REVIEW-02a: walk-preserved handlers. When a walk-UI missed-
      // tactic button fires a feature that renders inside the analysis
      // phase (practice banner, best-line nav), we switch reviewPhase
      // to 'analysis' first so the feature's UI has somewhere to render.
      // Drill All / Show / Try It go through here. Ask, move-list,
      // key-moment nav, and Practice in Chat work from walk directly.
      const enterAnalysisAnd = (fn: () => void): void => {
        setReviewPhase('analysis');
        fn();
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
          return !v;
        });
      };
      // Seed the existing under-board best-line nav with a tapped
      // candidate (up to 5 plies deep) and switch to analysis phase so
      // the nav UI renders. Reuses bestLineMoves/Sans/Index/BaseFen/Fen.
      const handleExploreCandidate = (line: { moves: string[]; rank: number }): void => {
        if (!currentBaseFen) return;
        const chess = new Chess(currentBaseFen);
        const uci = line.moves.slice(0, 5);
        const sans: string[] = [];
        const playedUci: string[] = [];
        for (const move of uci) {
          try {
            const res = chess.move({
              from: move.slice(0, 2),
              to: move.slice(2, 4),
              promotion: move.length > 4 ? move.slice(4, 5) : undefined,
            });
            sans.push(res.san);
            playedUci.push(move);
          } catch {
            break;
          }
        }
        if (sans.length === 0) return;
        bestLineRevisionRef.current++;
        setBestLineMoves(playedUci);
        setBestLineSans(sans);
        setBestLineIndex(0);
        setBestLineBaseFen(currentBaseFen);
        setBestLineFen(currentBaseFen);
        setBestLineActive(true);
        void logAppAudit({
          kind: 'review-engine-candidate-explored',
          category: 'subsystem',
          source: 'CoachGameReview',
          summary: `ply=${walkPlayback.currentPly} rank=${line.rank} plies=${sans.length}`,
        });
        setReviewPhase('analysis');
      };
      const formatEval = (line: { evaluation: number; mate: number | null }): string => {
        if (line.mate !== null) return line.mate > 0 ? `M${line.mate}` : `-M${Math.abs(line.mate)}`;
        const pawns = line.evaluation / 100;
        return (pawns >= 0 ? '+' : '') + pawns.toFixed(2);
      };

      return (
        <div className="flex flex-col w-full h-full overflow-hidden" data-testid="coach-game-review-walk">
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
              <div className="w-full md:max-w-[420px] relative">
                <ChessBoard
                  initialFen={displayFen}
                  orientation={playerColor}
                  interactive={false}
                  arrows={walkArrows}
                  showEvalBar={false}
                  showFlipButton
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
              </div>
            </div>

            {/* HERO nav: four big arrows centered, 64px tap targets */}
            <div className="flex items-center justify-center gap-3 py-2" data-testid="review-nav-controls">
              <button
                onClick={walkPlayback.goToStart}
                className="p-4 rounded-xl hover:bg-theme-surface disabled:opacity-30 min-w-[60px] min-h-[60px] flex items-center justify-center"
                disabled={walkPlayback.currentPly === 0}
                aria-label="Jump to start"
              >
                <SkipBack size={28} style={{ color: 'var(--color-text)' }} />
              </button>
              <button
                onClick={walkPlayback.goBack}
                className="p-4 rounded-xl hover:bg-theme-surface disabled:opacity-30 min-w-[60px] min-h-[60px] flex items-center justify-center"
                disabled={walkPlayback.currentPly === 0}
                aria-label="Back one move"
                data-testid="review-back-btn"
              >
                <ChevronLeft size={32} style={{ color: 'var(--color-text)' }} />
              </button>
              <button
                onClick={walkPlayback.goForward}
                className="p-4 rounded-xl disabled:opacity-30 min-w-[60px] min-h-[60px] flex items-center justify-center"
                disabled={walkPlayback.currentPly >= lastPly}
                style={{ background: 'var(--color-accent)' }}
                aria-label="Forward one move"
                data-testid="review-forward-btn"
              >
                <ChevronRight size={32} style={{ color: 'var(--color-bg)' }} />
              </button>
              <button
                onClick={walkPlayback.goToEnd}
                className="p-4 rounded-xl hover:bg-theme-surface disabled:opacity-30 min-w-[60px] min-h-[60px] flex items-center justify-center"
                disabled={walkPlayback.currentPly >= lastPly}
                aria-label="Jump to end"
              >
                <SkipForward size={28} style={{ color: 'var(--color-text)' }} />
              </button>
            </div>

            {/* Secondary controls row: pause/play + Ask (inline, small) */}
            <div className="flex items-center justify-center gap-2 pb-2">
              <button
                onClick={walkPlayback.togglePausePlay}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-theme-border hover:bg-theme-surface"
                style={{ color: 'var(--color-text)' }}
                aria-label={walkPlayback.narrationState === 'speaking' ? 'Pause narration' : 'Play narration'}
              >
                {walkPlayback.narrationState === 'speaking'
                  ? <><Pause size={12} /> Pause</>
                  : <><Play size={12} /> Play</>}
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
            </div>
          </div>

          {/* ── Scrollable middle: narration, move list, tactics, ask ── */}
          <div className="flex-1 min-h-0 overflow-y-auto" data-testid="review-scroll-middle">
            {/* Current-move narration banner */}
            <div className="px-3 pt-2 pb-1">
              <div
                className="rounded-xl backdrop-blur-md border border-emerald-500/30 px-3 py-2"
                style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, rgba(16,185,129,0.3))' }}
                data-testid="review-narration-banner"
              >
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  {walkPlayback.currentText ?? '(this move passes silently — tap forward to continue)'}
                </p>
              </div>
            </div>

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
                      return (
                        <button
                          key={`${line.rank}-${i}`}
                          onClick={() => handleExploreCandidate(line)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-theme-border hover:bg-theme-surface text-left"
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
                        </button>
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
                  onNavigate={(idx: number) => walkPlayback.jumpToPly(idx + 1)}
                  className=""
                  extraIndices={walkPlayback.hintPlies.map((ply) => ply - 1)}
                />
              </div>
              <div className="max-h-[180px] overflow-y-auto">
                <MoveListPanel
                  moves={moves}
                  openingName={openingName}
                  currentMoveIndex={walkMoveIndex >= 0 ? walkMoveIndex : null}
                  onMoveClick={(idx: number) => walkPlayback.jumpToPly(idx + 1)}
                  className="h-full"
                />
              </div>
            </div>

            {/* Missed tactics */}
            {missedTactics.length > 0 && (
              <div className="border-t border-theme-border px-3 py-2" data-testid="walk-missed-tactics">
                <div className="flex items-center gap-1.5 mb-2">
                  <Crosshair size={12} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    Missed tactics ({missedTactics.length})
                  </span>
                  <button
                    onClick={() => enterAnalysisAnd(handleStartMistakeDrill)}
                    className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded hover:opacity-80"
                    style={{ background: 'var(--color-warning)', color: 'var(--color-bg)' }}
                    data-testid="walk-drill-all-btn"
                  >
                    Drill All
                  </button>
                </div>
                <div className="space-y-1.5">
                  {missedTactics.map((tactic: MissedTactic, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-1.5 rounded-md hover:bg-theme-surface transition-colors cursor-pointer"
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
                      <button
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          enterAnalysisAnd(() => { void handleShowMissedTactic(tactic); });
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap border"
                        style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                        data-testid={`walk-show-tactic-${i}`}
                      >
                        Show
                      </button>
                      <button
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          enterAnalysisAnd(() => handleStartPractice(tactic));
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                        data-testid={`walk-try-it-${i}`}
                      >
                        Try It
                      </button>
                    </div>
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

            {/* Full analysis escape hatch */}
            <div className="px-3 py-2 border-t border-theme-border">
              <button
                onClick={() => handleStartReview('full')}
                className="text-xs px-3 py-1.5 rounded-lg border border-theme-border hover:bg-theme-surface"
                style={{ color: 'var(--color-text)' }}
              >
                Full analysis
              </button>
            </div>
          </div>

          {/* ── Fixed bottom: Play Again + Back to Coach ─────────────── */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-3 border-t border-theme-border"
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

    // Fallback / loading: show the summary card (legacy paragraph view).
    return (
      <div className="flex flex-col items-center justify-center w-full h-full overflow-y-auto" data-testid="coach-game-review">
        <ReviewSummaryCard
          result={result}
          playerColor={playerColor}
          accuracy={accuracy}
          classificationCounts={classificationCounts}
          phaseBreakdown={phaseBreakdown}
          openingName={openingName}
          moveCount={accuracy.moveCount}
          moves={moves}
          narrativeSummary={isLoadingNarrative ? (narrativeSummary ?? undefined) : (narrativeSummary ?? undefined)}
          missedOpportunities={missCount}
          onStartReview={handleStartReview}
          onPlayAgain={onPlayAgain}
          onBackToCoach={onBackToCoach}
        />
      </div>
    );
  }

  // ─── Analysis Phase ─────────────────────────────────────────────────────────
  // Layout: Left column = fixed board area (no scroll), Right column = scrollable panels
  // Mobile: board section is static at top, bottom panel scrolls independently
  return (
    <>
      {/* Left column: STATIC board area — never scrolls */}
      <div className="flex flex-col md:w-3/5 min-h-0 shrink-0" data-testid="coach-game-review">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBackToCoach} className="p-1 rounded-lg hover:bg-theme-surface">
              <ArrowLeft size={18} style={{ color: 'var(--color-text)' }} />
            </button>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              {isGuidedLesson ? 'Guided Lesson' : 'Game Review'}
            </h2>
            {!isGuidedLesson && (
              <div className="flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface)' }}>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: getAccuracyColor(playerColor === 'white' ? accuracy.white : accuracy.black) }}
                />
                <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                  {Math.round(playerColor === 'white' ? accuracy.white : accuracy.black)}%
                </span>
              </div>
            )}
          </div>
          {!autoReviewActive ? (
            <button
              onClick={handleStartAutoReview}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="auto-review-btn"
            >
              <Play size={12} />
              Full Review
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleAutoReviewPause}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                data-testid="auto-review-pause-btn"
              >
                {autoReviewPaused ? <Play size={12} /> : <Pause size={12} />}
                {autoReviewPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleStopAutoReview}
                className="px-2 py-1.5 rounded-lg text-xs font-medium"
                style={{ color: 'var(--color-text-muted)' }}
                data-testid="auto-review-stop-btn"
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Eval graph removed — the vertical eval bar on the board side
            (showEvalBar prop on ChessBoard) carries the same information
            without taking screen real estate above the board. */}

        {/* Opponent info bar */}
        <div className="px-2 shrink-0">
          <PlayerInfoBar
            name="Stockfish Bot"
            rating={opponentRating}
            isBot
            capturedPieces={isPlayerWhite ? capturedPieces.black : capturedPieces.white}
            materialAdvantage={isPlayerWhite ? Math.max(0, -materialAdv) : Math.max(0, materialAdv)}
            isActive={false}
          />
        </div>

        {/* Board — fixed size, centered */}
        <div className="px-2 py-0.5 flex justify-center shrink-0">
          <div
            className="w-full md:max-w-[420px] rounded-sm transition-shadow duration-300"
            style={{
              boxShadow: boardFlash ? `0 0 0 3px ${boardFlash}` : 'none',
            }}
          >
            <ChessBoard
              initialFen={displayFen}
              orientation={playerColor}
              interactive={reviewState.mode === 'practice' ? (practiceResult === 'pending') : !isThinking}
              onMove={(moveResult) => {
                if (reviewState.mode === 'practice') {
                  void handlePracticeMove(moveResult);
                } else {
                  void handleBoardMove(moveResult);
                }
              }}
              showEvalBar
              evaluation={currentMove?.evaluation ?? null}
              arrows={reviewState.mode === 'practice' ? practiceArrows : arrows}
              annotationHighlights={reviewState.mode === 'practice' ? [] : classificationHighlights}
              classificationOverlay={reviewState.mode === 'practice' ? null : classificationOverlay}
            />
          </div>
        </div>

        {/* Player info bar */}
        <div className="px-2 shrink-0">
          <PlayerInfoBar
            name={playerName}
            rating={playerRating}
            capturedPieces={isPlayerWhite ? capturedPieces.white : capturedPieces.black}
            materialAdvantage={isPlayerWhite ? Math.max(0, materialAdv) : Math.max(0, -materialAdv)}
            isActive={false}
          />
        </div>

        {/* Navigation controls — always visible, fixed at bottom of board section */}
        <div className="px-2 pb-1 shrink-0">
          {(reviewState.mode === 'analysis' || reviewState.mode === 'guided_lesson') && (
            <div className="flex items-center justify-between">
              <MoveNavigationControls
                currentIndex={reviewState.currentMoveIndex}
                totalMoves={moves.length}
                onFirst={() => navigateMove('first')}
                onPrev={() => navigateMove('prev')}
                onNext={() => navigateMove('next')}
                onLast={() => navigateMove('last')}
                className="py-0.5"
              />
              <div className="flex items-center gap-1">
                <MoveActionButtons
                  currentMove={currentMove}
                  onShowBestMove={() => {
                    setBestMoveRevealed((prev: boolean) => !prev);
                  }}
                  onRetryPosition={() => {
                    if (!currentMove || !currentMove.bestMove) return;
                    const prevFen = reviewState.currentMoveIndex > 0
                      ? moves[reviewState.currentMoveIndex - 1]?.fen ?? STARTING_FEN
                      : STARTING_FEN;
                    handleStartPractice({
                      moveIndex: reviewState.currentMoveIndex,
                      fen: prevFen,
                      bestMove: currentMove.bestMove,
                      explanation: currentMove.commentary || 'Find the best move here.',
                      tacticType: 'tactical_sequence',
                      playerMoved: currentMove.san,
                      evalSwing: Math.abs((currentMove.bestMoveEval ?? 0) - (currentMove.evaluation ?? 0)),
                    });
                  }}
                  onShowBestLine={() => void handleToggleBestLine()}
                  showingBestLine={bestLineActive}
                  onPlayFromHere={handlePlayFromHere}
                  // Button is only rendered inside the analysis /
                  // guided_lesson branch (see the wrapping conditional
                  // above), so `playingFromHere` is always false here —
                  // once the user clicks Play the whole nav row is
                  // replaced by the what-if UI.
                  playingFromHere={false}
                />
                <KeyMomentNav
                  moves={moves}
                  currentIndex={reviewState.currentMoveIndex}
                  onNavigate={handleMoveClick}
                  className=""
                  extraIndices={walkPlayback.hintPlies.map((ply) => ply - 1)}
                />
              </div>
            </div>
          )}

          {/* Best Line Navigator — overlays below nav when active */}
          {bestLineActive && bestLineSans.length > 0 && (
            <div
              className="rounded-lg p-1.5 flex items-center gap-1 mt-0.5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-accent)' }}
              data-testid="best-line-nav"
            >
              <button
                onClick={() => handleBestLineStep('prev')}
                disabled={bestLineIndex <= 0}
                className="px-1.5 py-0.5 rounded text-xs font-medium disabled:opacity-30"
                style={{ color: 'var(--color-text)' }}
              >
                ‹
              </button>
              <div className="flex-1 text-center text-[11px] font-mono overflow-hidden whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                <span className="font-medium" style={{ color: 'var(--color-accent)' }}>Best: </span>
                {bestLineSans.map((san: string, i: number) => (
                  <span
                    key={i}
                    className={i < bestLineIndex ? 'opacity-40' : i === bestLineIndex ? 'font-bold' : 'opacity-60'}
                    style={i === bestLineIndex ? { color: 'var(--color-accent)' } : undefined}
                  >
                    {san}{i < bestLineSans.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleBestLineStep('next')}
                disabled={bestLineIndex >= bestLineMoves.length}
                className="px-1.5 py-0.5 rounded text-xs font-medium disabled:opacity-30"
                style={{ color: 'var(--color-text)' }}
              >
                ›
              </button>
            </div>
          )}
          {bestLineLoading && (
            <div className="text-center text-xs py-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Analyzing position...
            </div>
          )}

          {/* What-If Move List */}
          {reviewState.mode === 'whatif' && reviewState.whatIfMoves.length > 0 && (
            <div className="py-0.5" data-testid="whatif-moves">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Variation:{' '}
              </span>
              {reviewState.whatIfMoves.map((m: string, i: number) => (
                <span
                  key={i}
                  className="text-xs font-mono"
                  style={{ color: i % 2 === 0 ? 'var(--color-accent)' : 'var(--color-text)' }}
                >
                  {m}{' '}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column: scrollable panels — move list, commentary, banners, actions */}
      <div className="flex flex-col flex-1 md:border-l border-theme-border min-h-0 overflow-hidden">
        {/* Mode banners — fixed at top of right column */}
        <AnimatePresence>
          {reviewState.mode === 'whatif' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-2.5 flex items-center justify-between overflow-hidden shrink-0 border-b border-theme-border"
              style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))' }}
              data-testid="whatif-banner"
            >
              <div className="flex items-center gap-2">
                <Undo2 size={14} style={{ color: 'var(--color-accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  What-If Mode
                </span>
                {isThinking && (
                  <span className="text-xs animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                    Thinking...
                  </span>
                )}
              </div>
              <button
                onClick={handleBackToReview}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="back-to-review-btn"
              >
                Back to Review
              </button>
            </motion.div>
          )}
          {reviewState.mode === 'practice' && practiceTarget && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-2.5 overflow-hidden shrink-0 border-b border-theme-border"
              style={{ background: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))' }}
              data-testid="practice-banner"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={14} style={{ color: 'var(--color-success)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {isDrillingMistakes
                      ? `Mistake ${mistakeDrillIndex + 1} of ${mistakeDrillQueue.length} — find the best move`
                      : 'Find the best move!'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isDrillingMistakes && practiceResult !== 'pending' && (
                    <button
                      onClick={handleDrillNext}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--color-warning)', color: 'var(--color-bg)' }}
                      data-testid="drill-next-btn"
                    >
                      {mistakeDrillIndex + 1 >= mistakeDrillQueue.length ? 'Finish Drill' : 'Next Mistake →'}
                    </button>
                  )}
                  <button
                    onClick={isGuidedLesson ? handleGuidedExitPractice : handleExitPractice}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                    data-testid="exit-practice-btn"
                  >
                    {isGuidedLesson ? 'Back to Lesson' : 'Back to Review'}
                  </button>
                </div>
              </div>
              {practiceResult === 'correct' && (
                <div className="flex items-center gap-1.5 mt-2" data-testid="practice-correct">
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                    You found it! {practiceTarget.explanation}
                  </span>
                </div>
              )}
              {practiceResult === 'incorrect' && (
                <div className="flex items-center gap-1.5 mt-2" data-testid="practice-incorrect">
                  <XCircle size={14} style={{ color: 'var(--color-error)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    The best move was {practiceTarget.bestMove}. {practiceTarget.explanation}
                  </span>
                </div>
              )}
              {practiceResult === 'pending' && practiceAttempts > 0 && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Not quite — try again ({3 - practiceAttempts} attempt{3 - practiceAttempts !== 1 ? 's' : ''} left)
                </p>
              )}
            </motion.div>
          )}
          {isGuidedLesson && guidedStopped && reviewState.mode === 'guided_lesson' && currentMove && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-2.5 overflow-hidden shrink-0 border-b border-theme-border"
              style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, var(--color-surface))' }}
              data-testid="guided-stop-banner"
            >
              <div className="flex items-center gap-2 mb-1.5">
                {currentMove.classification === 'brilliant' ? (
                  <Sparkles size={14} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
                )}
                <span className="text-xs font-semibold capitalize" style={{ color: 'var(--color-text)' }}>
                  {currentMove.classification === 'brilliant' ? 'Brilliant Move!' : `${currentMove.classification} Detected`}
                </span>
              </div>
              {currentMove.commentary && (
                <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  {currentMove.commentary}
                </p>
              )}
              <div className="flex items-center gap-2">
                {currentMove.bestMove && currentMove.classification !== 'brilliant' && (
                  <button
                    onClick={handleGuidedTryIt}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                    data-testid="guided-try-it-btn"
                  >
                    <Target size={12} />
                    Try It Yourself
                  </button>
                )}
                <button
                  onClick={handleGuidedContinue}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                  data-testid="guided-continue-btn"
                >
                  <FastForward size={12} />
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable content area */}
        {/* Right panel scrolls. pb-24 on mobile keeps the bottom
            "Play Again" / "Back to Coach" buttons clear of the mobile
            tab bar — without this they were getting cut off. */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-6">
          {/* Move list panel */}
          <div className="min-h-[120px] max-h-[200px] md:max-h-none md:min-h-[150px] border-b border-theme-border overflow-hidden">
            <MoveListPanel
              moves={moves}
              openingName={openingName}
              currentMoveIndex={reviewState.mode === 'analysis' || reviewState.mode === 'guided_lesson' ? reviewState.currentMoveIndex : null}
              onMoveClick={handleMoveClick}
              className="h-full"
            />
          </div>

          {/* Commentary panel — inline with move context */}
          {commentary && (
            <div className="p-3 border-b border-theme-border" data-testid="review-commentary">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                {commentary}
              </p>
            </div>
          )}

          {/* AI Key Moment Commentary */}
          {(aiCommentary || isLoadingAiCommentary) && (
            <div className="px-3 py-2 border-b border-theme-border" data-testid="ai-commentary">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageCircle size={12} style={{ color: 'var(--color-accent)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                  AI Analysis
                </span>
                {isLoadingAiCommentary && (
                  <Loader2 size={10} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                )}
              </div>
              {aiCommentary && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  {aiCommentary}
                </p>
              )}
            </div>
          )}

          {/* Missed Tactics Panel */}
          {missedTactics.length > 0 && (
            <div className="px-3 py-2 border-b border-theme-border" data-testid="missed-tactics-panel">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={12} style={{ color: 'var(--color-warning)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-warning)' }}>
                  Missed Tactics ({missedTactics.length})
                </span>
                {isDrillingMistakes ? (
                  <span
                    className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                    data-testid="drill-progress"
                  >
                    {mistakeDrillIndex + 1} / {mistakeDrillQueue.length}
                  </span>
                ) : (
                  <button
                    onClick={handleStartMistakeDrill}
                    className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded hover:opacity-80"
                    style={{ background: 'var(--color-warning)', color: 'var(--color-bg)' }}
                    data-testid="drill-all-mistakes-btn"
                  >
                    Drill All
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {missedTactics.map((tactic: MissedTactic, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-theme-surface transition-colors cursor-pointer"
                    onClick={() => handleMoveClick(tactic.moveIndex)}
                    data-testid={`missed-tactic-${i}`}
                  >
                    <Crosshair size={12} style={{ color: 'var(--color-text-muted)' }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                        Move {Math.ceil(moves[tactic.moveIndex].moveNumber / 2)}:{' '}
                        <span className="capitalize">{tactic.tacticType.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="text-[10px] ml-1.5" style={{ color: 'var(--color-text-muted)' }}>
                        ({(tactic.evalSwing / 100).toFixed(1)} pawns)
                      </span>
                    </div>
                    <button
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        void handleShowMissedTactic(tactic);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap border"
                      style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                      data-testid={`show-tactic-${i}`}
                      aria-label="Show what was missed"
                      title="Watch the engine's intended line and hear why"
                    >
                      Show
                    </button>
                    <button
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handleStartPractice(tactic);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                      style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                      data-testid={`try-it-${i}`}
                    >
                      Try It
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ask About This Position */}
          <div className="border-b border-theme-border">
            {!askExpanded ? (
              <button
                onClick={() => setAskExpanded(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-accent)' }}
                data-testid="ask-position-btn"
              >
                <MessageCircle size={14} />
                Ask about this position
              </button>
            ) : (
              <div data-testid="ask-position-panel">
                {askResponse !== null && (
                  <div className="px-3 pt-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                        Coach
                      </span>
                      {isAskStreaming && (
                        <Loader2 size={10} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                      )}
                    </div>
                    <p
                      className="text-xs leading-relaxed mb-2"
                      style={{ color: 'var(--color-text)' }}
                      data-testid="ask-response"
                    >
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
          </div>

          {/* Practice Suggestions */}
          {missedTactics.length > 0 && onPracticeInChat && (
            <div className="px-3 py-2 border-b border-theme-border" data-testid="practice-suggestions">
              <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Want to practice similar positions? The coach can set up interactive tactics for you.
              </p>
              <button
                onClick={handlePracticeInChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="practice-in-chat-btn"
              >
                <Target size={12} />
                Practice in Chat
              </button>
            </div>
          )}

          {/* Guided Lesson Narrative Summary */}
          {isGuidedLesson && guidedComplete && (
            <div className="p-3 border-b border-theme-border" data-testid="narrative-summary">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={16} style={{ color: 'var(--color-accent)' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
                  Game Summary
                </span>
                {isLoadingNarrative && (
                  <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                )}
              </div>
              {narrativeSummary ? (
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                  {narrativeSummary}
                </p>
              ) : isLoadingNarrative ? (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Generating your game summary...
                </p>
              ) : null}
            </div>
          )}

          {/* Action buttons — with safe area padding for mobile */}
          <div className="flex gap-2 justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,20px))]">
            <button
              onClick={onPlayAgain}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="play-again-btn"
            >
              <RotateCcw size={14} />
              Play Again
            </button>
            <button
              onClick={onBackToCoach}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:opacity-90"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              data-testid="back-to-coach-btn"
            >
              <Home size={14} />
              Back to Coach
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return '#22c55e';
  if (accuracy >= 60) return '#fbbf24';
  return '#ef4444';
}
