import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Home, Undo2, ArrowLeft, MessageCircle, Loader2, Play, Pause, Target, Crosshair, Zap, CheckCircle2, XCircle, GraduationCap, AlertTriangle, Sparkles, FastForward } from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { PlayerInfoBar } from './PlayerInfoBar';
import { MoveNavigationControls } from './MoveNavigationControls';
import { MoveListPanel } from './MoveListPanel';
import { EvalGraph } from './EvalGraph';
import { ReviewSummaryCard } from './ReviewSummaryCard';
import { KeyMomentNav } from './KeyMomentNav';
import { MoveActionButtons } from './MoveActionButtons';
import { ChatInput } from './ChatInput';
import { getAdaptiveMove } from '../../services/coachGameEngine';
import { getMoveCommentaryTemplate } from '../../services/coachTemplates';
import { getCoachCommentary, getCoachChatResponse } from '../../services/coachApi';
import { buildChessContextMessage, POSITION_ANALYSIS_ADDITION } from '../../services/coachPrompts';
import { stockfishEngine } from '../../services/stockfishEngine';
import { uciToArrow, getCapturedPieces, getMaterialAdvantage } from '../../services/boardUtils';
import { calculateAccuracy, getClassificationCounts, detectMisses } from '../../services/accuracyService';
import { getPhaseBreakdown } from '../../services/gamePhaseService';
import { detectMissedTactics } from '../../services/missedTacticService';
import { generateNarrativeSummary } from '../../services/coachFeatureService';
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
    if (!move) return null;
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

const AUTO_REVIEW_ADVANCE_MS = 2000;
const AUTO_REVIEW_PAUSE_MS = 5000;

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

  // ─── Summary-First Flow ─────────────────────────────────────────────────────
  const [reviewPhase, setReviewPhase] = useState<'summary' | 'analysis'>(
    isGuidedLesson ? 'analysis' : 'summary',
  );

  const [reviewState, setReviewState] = useState<ReviewState>({
    mode: isGuidedLesson ? 'guided_lesson' : 'analysis',
    currentMoveIndex: isGuidedLesson ? -1 : (moves.length > 0 ? moves.length - 1 : -1),
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
  const [practiceAttempts, setPracticeAttempts] = useState(0);

  // ─── Auto-Review State ────────────────────────────────────────────────────
  const [autoReviewActive, setAutoReviewActive] = useState(false);
  const [autoReviewPaused, setAutoReviewPaused] = useState(false);
  const autoReviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Guided Lesson State ────────────────────────────────────────────────────
  const [guidedLessonActive, setGuidedLessonActive] = useState(!!isGuidedLesson);
  const [guidedStopped, setGuidedStopped] = useState(false);
  const [guidedComplete, setGuidedComplete] = useState(false);
  const [narrativeSummary, setNarrativeSummary] = useState<string | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  const guidedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-compute accuracy + classification counts
  const accuracy = useMemo<GameAccuracy>(() => calculateAccuracy(moves), [moves]);
  const classificationCounts = useMemo<MoveClassificationCounts>(
    () => getClassificationCounts(moves, playerColor),
    [moves, playerColor],
  );

  // Opponent classification counts for summary card
  const opponentColor = playerColor === 'white' ? 'black' : 'white';
  const opponentClassificationCounts = useMemo<MoveClassificationCounts>(
    () => getClassificationCounts(moves, opponentColor),
    [moves, opponentColor],
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
      (chunk) => setNarrativeSummary((prev) => (prev ?? '') + chunk),
    ).then((fullText) => {
      setNarrativeSummary(fullText);
    }).catch(() => {
      setNarrativeSummary(null);
    }).finally(() => {
      setIsLoadingNarrative(false);
    });
  }, [reviewPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived state from current move index
  const currentMove = reviewState.currentMoveIndex >= 0 && reviewState.currentMoveIndex < moves.length
    ? moves[reviewState.currentMoveIndex]
    : null;

  const displayFen = reviewState.mode === 'practice' && practiceTarget
    ? practiceTarget.fen
    : reviewState.mode === 'whatif' && whatIfFen
      ? whatIfFen
      : currentMove?.fen ?? STARTING_FEN;

  // Captured pieces + material advantage for current position
  const capturedPieces = useMemo(() => getCapturedPieces(displayFen), [displayFen]);
  const materialAdv = useMemo(() => getMaterialAdvantage(displayFen), [displayFen]);
  const isPlayerWhite = playerColor === 'white';

  // Best-move arrow: show for suboptimal player moves
  const arrows = useMemo(() => {
    if (reviewState.mode !== 'analysis' && reviewState.mode !== 'guided_lesson') return [];
    if (!currentMove) return [];
    if (currentMove.isCoachMove) return [];
    if (!currentMove.bestMove) return [];
    const cls = currentMove.classification;
    if (cls === 'brilliant' || cls === 'great' || cls === 'good' || cls === 'book') return [];
    const result: Array<{ startSquare: string; endSquare: string; color: string }> = [];

    // Played move arrow (red/orange) — show what was actually played
    const playedMoveColor = cls ? PLAYED_MOVE_ARROW_COLORS[cls] : null;
    if (playedMoveColor) {
      const prevMoveIdx = reviewState.currentMoveIndex - 1;
      const prevFen = prevMoveIdx >= 0 ? moves[prevMoveIdx]?.fen ?? STARTING_FEN : STARTING_FEN;
      const squares = sanToSquares(currentMove.san, prevFen);
      if (squares) {
        result.push({ startSquare: squares.from, endSquare: squares.to, color: playedMoveColor });
      }
    }

    // Best move arrow (green) — show what should have been played
    const bestArrow = uciToArrow(currentMove.bestMove, 'rgba(34, 197, 94, 0.8)');
    if (bestArrow) result.push(bestArrow);

    return result;
  }, [reviewState.mode, reviewState.currentMoveIndex, currentMove, moves]);

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

  // Keyboard navigation
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
  });

  // ─── AI Commentary: lazy-load for key moments ───────────────────────────────
  useEffect(() => {
    if (reviewState.mode !== 'analysis' && reviewState.mode !== 'guided_lesson') return;
    if (!currentMove) {
      setAiCommentary(null);
      return;
    }

    // Only fetch AI commentary for key moments (blunders, mistakes, brilliancies)
    const cls = currentMove.classification;
    const isKeyMoment = cls === 'blunder' || cls === 'mistake' || cls === 'brilliant';
    if (!isKeyMoment || currentMove.isCoachMove) {
      setAiCommentary(null);
      return;
    }

    const moveIdx = reviewState.currentMoveIndex;

    // Check cache first
    const cached = aiCommentaryCacheRef.current.get(moveIdx);
    if (cached) {
      setAiCommentary(cached);
      return;
    }

    // Build context and fetch from Claude
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
    };

    void getCoachCommentary('interactive_review', ctx, (chunk) => {
      if (!cancelled) {
        setAiCommentary((prev) => (prev ?? '') + chunk);
      }
    }).then((fullText) => {
      if (!cancelled) {
        aiCommentaryCacheRef.current.set(moveIdx, fullText);
        setAiCommentary(fullText);
      }
    }).finally(() => {
      if (!cancelled) setIsLoadingAiCommentary(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depends on moveIndex, not full currentMove
  }, [reviewState.currentMoveIndex, reviewState.mode]);

  // ─── Ask About Position handler ────────────────────────────────────────────
  const handleAskSend = useCallback((question: string) => {
    if (isAskStreaming) return;

    // Abort previous ask
    if (askAbortRef.current) askAbortRef.current.abort();
    askAbortRef.current = new AbortController();

    setAskResponse('');
    setIsAskStreaming(true);

    const moveIdx = reviewState.currentMoveIndex;
    const move = moveIdx >= 0 && moveIdx < moves.length ? moves[moveIdx] : null;
    const fenForQ = move?.fen ?? STARTING_FEN;
    const moveNum = moveIdx >= 0 ? Math.floor(moveIdx / 2) + 1 : 0;

    const ctx: CoachContext = {
      fen: fenForQ,
      lastMoveSan: move?.san ?? null,
      moveNumber: moveNum,
      pgn: moves.slice(0, Math.max(0, moveIdx + 1)).map((m) => m.san).join(' '),
      openingName,
      stockfishAnalysis: move?.evaluation !== null && move?.evaluation !== undefined ? {
        evaluation: move.evaluation,
        bestMove: move.bestMove ?? '',
        isMate: false,
        mateIn: null,
        depth: 0,
        topLines: [],
        nodesPerSecond: 0,
      } : null,
      playerMove: null,
      moveClassification: null,
      playerProfile: { rating: playerRating, weaknesses: [] },
    };

    const contextMessage = buildChessContextMessage(ctx);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: `${contextMessage}\n\nStudent's question: ${question}` },
    ];

    const abortSignal = askAbortRef.current.signal;

    void getCoachChatResponse(messages, POSITION_ANALYSIS_ADDITION, (chunk) => {
      if (!abortSignal.aborted) {
        setAskResponse((prev) => (prev ?? '') + chunk);
      }
    }).finally(() => {
      if (!abortSignal.aborted) {
        setIsAskStreaming(false);
      }
    });
  }, [isAskStreaming, reviewState.currentMoveIndex, moves, openingName, playerRating]);

  // Reset ask state when navigating to a different move
  useEffect(() => {
    setAskExpanded(false);
    setAskResponse(null);
    setIsAskStreaming(false);
    if (askAbortRef.current) askAbortRef.current.abort();
  }, [reviewState.currentMoveIndex]);

  const navigateMove = useCallback((direction: 'first' | 'prev' | 'next' | 'last') => {
    setReviewState((prev) => {
      let newIndex = prev.currentMoveIndex;
      switch (direction) {
        case 'first': newIndex = -1; break;
        case 'prev': newIndex = Math.max(-1, prev.currentMoveIndex - 1); break;
        case 'next': newIndex = Math.min(moves.length - 1, prev.currentMoveIndex + 1); break;
        case 'last': newIndex = moves.length - 1; break;
      }
      return { ...prev, currentMoveIndex: newIndex };
    });
  }, [moves.length]);

  const handleMoveClick = useCallback((moveIndex: number) => {
    setReviewState((prev) => ({
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
    const startFen = reviewState.whatIfStartFen ?? currentMove?.fen ?? null;

    setReviewState((prev) => ({
      ...prev,
      mode: 'whatif',
      whatIfMoves: [...prev.whatIfMoves, moveResult.san],
      whatIfStartFen: startFen,
    }));

    setWhatIfFen(moveResult.fen);

    // Get quick commentary on the what-if move
    try {
      const analysis = await stockfishEngine.analyzePosition(moveResult.fen, 10).catch(() => null);
      const cmtry = getMoveCommentaryTemplate('good', {
        playerMove: moveResult.san,
        bestMove: analysis?.bestMove ?? '?',
      });
      setWhatIfCommentary(cmtry);
    } catch {
      setWhatIfCommentary(null);
    }

    // Stockfish responds
    setIsThinking(true);
    try {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const { move } = await getAdaptiveMove(moveResult.fen, 2500);
      if (abortRef.current.signal.aborted) return;

      const { Chess } = await import('chess.js');
      const chess = new Chess(moveResult.fen);
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);
      const promotion = move.length > 4 ? move[4] : undefined;
      const sfResult = chess.move({ from, to, promotion });

      setReviewState((prev) => ({
        ...prev,
        whatIfMoves: [...prev.whatIfMoves, sfResult.san],
      }));
      setWhatIfFen(chess.fen());
    } catch {
      // Stockfish failed — stay on current position
    } finally {
      setIsThinking(false);
    }
  }, [reviewState.whatIfStartFen, currentMove?.fen]);

  const handleBackToReview = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setReviewState((prev) => ({
      ...prev,
      mode: 'analysis',
      whatIfMoves: [],
      whatIfStartFen: null,
    }));
    setWhatIfFen(null);
    setWhatIfCommentary(null);
    setIsThinking(false);
  }, []);

  // ─── Practice Mode Handlers ──────────────────────────────────────────────────
  const handleStartPractice = useCallback((tactic: MissedTactic) => {
    setPracticeTarget(tactic);
    setPracticeResult('pending');
    setPracticeAttempts(0);
    setReviewState((prev) => ({
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
    handleBackToReview();
  }, [handleBackToReview]);

  // Reveal arrow for the best move in practice mode
  const practiceArrows = useMemo(() => {
    if (reviewState.mode !== 'practice' || !practiceTarget) return [];
    if (practiceResult !== 'incorrect' && practiceResult !== 'correct') return [];
    const arrow = uciToArrow(practiceTarget.bestMove, 'rgba(34, 197, 94, 0.8)');
    return arrow ? [arrow] : [];
  }, [reviewState.mode, practiceTarget, practiceResult]);

  // ─── Auto-Review Mode ──────────────────────────────────────────────────────
  const handleStartAutoReview = useCallback(() => {
    setAutoReviewActive(true);
    setAutoReviewPaused(false);
    setReviewState((prev) => ({
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
    setAutoReviewPaused(false);
    if (autoReviewTimerRef.current) {
      clearTimeout(autoReviewTimerRef.current);
      autoReviewTimerRef.current = null;
    }
  }, []);

  const handleToggleAutoReviewPause = useCallback(() => {
    setAutoReviewPaused((prev) => !prev);
  }, []);

  // Auto-review advancement effect
  useEffect(() => {
    if (!autoReviewActive || autoReviewPaused) return;

    const moveIdx = reviewState.currentMoveIndex;
    if (moveIdx >= moves.length - 1) {
      // Reached end of game
      setAutoReviewActive(false);
      return;
    }

    // Check if current move is a key moment that should pause
    const currentMoveForAutoReview = moveIdx >= 0 && moveIdx < moves.length ? moves[moveIdx] : null;
    const isKeyMove = currentMoveForAutoReview && (
      currentMoveForAutoReview.classification === 'blunder' ||
      currentMoveForAutoReview.classification === 'mistake' ||
      currentMoveForAutoReview.classification === 'brilliant' ||
      currentMoveForAutoReview.classification === 'inaccuracy'
    );

    const delay = isKeyMove ? AUTO_REVIEW_PAUSE_MS : AUTO_REVIEW_ADVANCE_MS;

    autoReviewTimerRef.current = setTimeout(() => {
      setReviewState((prev) => ({
        ...prev,
        currentMoveIndex: Math.min(moves.length - 1, prev.currentMoveIndex + 1),
      }));
    }, delay);

    return () => {
      if (autoReviewTimerRef.current) {
        clearTimeout(autoReviewTimerRef.current);
      }
    };
  }, [autoReviewActive, autoReviewPaused, reviewState.currentMoveIndex, moves]);

  // ─── Guided Lesson Auto-Advance Effect ────────────────────────────────────
  const GUIDED_ADVANCE_MS = 1500;

  useEffect(() => {
    if (!guidedLessonActive || guidedStopped || guidedComplete) return;
    if (reviewState.mode !== 'guided_lesson') return;

    const moveIdx = reviewState.currentMoveIndex;

    // Check if we've reached the end
    if (moveIdx >= moves.length - 1) {
      setGuidedComplete(true);
      setGuidedLessonActive(false);

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
        (chunk) => setNarrativeSummary((prev) => (prev ?? '') + chunk),
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
        // Advance to the critical move, then stop
        guidedTimerRef.current = setTimeout(() => {
          setReviewState((prev) => ({
            ...prev,
            currentMoveIndex: nextIdx,
          }));
          setGuidedStopped(true);
        }, GUIDED_ADVANCE_MS);

        return () => {
          if (guidedTimerRef.current) clearTimeout(guidedTimerRef.current);
        };
      }
    }

    // Normal advance
    guidedTimerRef.current = setTimeout(() => {
      setReviewState((prev) => ({
        ...prev,
        currentMoveIndex: Math.min(moves.length - 1, prev.currentMoveIndex + 1),
      }));
    }, GUIDED_ADVANCE_MS);

    return () => {
      if (guidedTimerRef.current) clearTimeout(guidedTimerRef.current);
    };
  }, [guidedLessonActive, guidedStopped, guidedComplete, reviewState.currentMoveIndex, reviewState.mode, moves, pgn, playerColor, openingName, result, playerRating]);

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
    setReviewState((prev) => ({
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
    const tacticTypes = [...new Set(missedTactics.map((t) => t.tacticType))];
    const prompt = tacticTypes.length > 0
      ? `I want to practice the tactics I missed in my last game. I struggled with: ${tacticTypes.join(', ')}. Set up some practice positions for me.`
      : 'I want to practice tactics based on my recent game. Set up some practice positions for me.';
    onPracticeInChat?.(prompt);
  }, [missedTactics, onPracticeInChat]);

  // Handle transitioning from summary to analysis
  const handleStartReview = useCallback(() => {
    setReviewPhase('analysis');
    // Start at the beginning for step-through
    setReviewState((prev) => ({
      ...prev,
      currentMoveIndex: -1,
    }));
  }, []);

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
  return (
    <>
      {/* Left column: board + nav */}
      <div className="flex flex-col md:w-3/5 min-h-0 overflow-y-auto" data-testid="coach-game-review">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <button onClick={onBackToCoach} className="p-1.5 rounded-lg hover:bg-theme-surface">
              <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
            </button>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              {isGuidedLesson ? 'Guided Lesson' : 'Game Review'}
            </h2>
            {/* Compact accuracy badge */}
            {!isGuidedLesson && (
              <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface)' }}>
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
          {/* Auto-Review Button */}
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

        {/* What-If Mode Banner */}
        <AnimatePresence>
          {reviewState.mode === 'whatif' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-lg mx-2 mt-1 p-2.5 flex items-center justify-between overflow-hidden"
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
          {/* Practice Mode Banner */}
          {reviewState.mode === 'practice' && practiceTarget && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-lg mx-2 mt-1 p-2.5 overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))' }}
              data-testid="practice-banner"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={14} style={{ color: 'var(--color-success)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    Find the best move!
                  </span>
                </div>
                <button
                  onClick={isGuidedLesson ? handleGuidedExitPractice : handleExitPractice}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="exit-practice-btn"
                >
                  {isGuidedLesson ? 'Back to Lesson' : 'Back to Review'}
                </button>
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
          {/* Guided Lesson Stop Banner */}
          {isGuidedLesson && guidedStopped && reviewState.mode === 'guided_lesson' && currentMove && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-lg mx-2 mt-1 p-2.5 overflow-hidden"
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

        {/* Eval graph — always visible above board */}
        <div className="px-2 py-1">
          <EvalGraph
            moves={moves}
            currentMoveIndex={reviewState.mode === 'analysis' || reviewState.mode === 'guided_lesson' ? reviewState.currentMoveIndex : null}
            onMoveClick={handleMoveClick}
            size="full"
          />
        </div>

        {/* Key Moment Navigation */}
        {(reviewState.mode === 'analysis' || reviewState.mode === 'guided_lesson') && (
          <KeyMomentNav
            moves={moves}
            currentIndex={reviewState.currentMoveIndex}
            onNavigate={handleMoveClick}
            className="py-1"
          />
        )}

        {/* Opponent info bar */}
        <div className="px-2 pt-1">
          <PlayerInfoBar
            name="Stockfish Bot"
            rating={opponentRating}
            isBot
            capturedPieces={isPlayerWhite ? capturedPieces.black : capturedPieces.white}
            materialAdvantage={isPlayerWhite ? Math.max(0, -materialAdv) : Math.max(0, materialAdv)}
            isActive={false}
          />
        </div>

        {/* Board with optional classification flash border */}
        <div className="px-2 py-1 flex justify-center">
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
        <div className="px-2">
          <PlayerInfoBar
            name={playerName}
            rating={playerRating}
            capturedPieces={isPlayerWhite ? capturedPieces.white : capturedPieces.black}
            materialAdvantage={isPlayerWhite ? Math.max(0, materialAdv) : Math.max(0, -materialAdv)}
            isActive={false}
          />
        </div>

        {/* Move navigation controls + action buttons */}
        {(reviewState.mode === 'analysis' || reviewState.mode === 'guided_lesson') && (
          <div className="flex items-center justify-between px-2">
            <MoveNavigationControls
              currentIndex={reviewState.currentMoveIndex}
              totalMoves={moves.length}
              onFirst={() => navigateMove('first')}
              onPrev={() => navigateMove('prev')}
              onNext={() => navigateMove('next')}
              onLast={() => navigateMove('last')}
              className="py-1"
            />
            <MoveActionButtons
              currentMove={currentMove}
              onShowBestMove={() => {
                // Toggle best-move arrow visibility (arrows are already computed)
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
                  type: 'tactical_sequence',
                  evalSwing: Math.abs((currentMove.bestMoveEval ?? 0) - (currentMove.evaluation ?? 0)),
                });
              }}
            />
          </div>
        )}

        {/* What-If Move List (mobile) */}
        {reviewState.mode === 'whatif' && reviewState.whatIfMoves.length > 0 && (
          <div className="px-3 py-1" data-testid="whatif-moves">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Variation:{' '}
            </span>
            {reviewState.whatIfMoves.map((m, i) => (
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

      {/* Right column: eval graph + move list + commentary + actions */}
      <div className="flex flex-col h-[45dvh] md:h-auto md:flex-1 md:border-l border-theme-border min-h-[220px] overflow-y-auto">
        {/* Move list panel */}
        <div className="flex-1 min-h-[100px] border-b border-theme-border overflow-hidden">
          <MoveListPanel
            moves={moves}
            openingName={openingName}
            currentMoveIndex={reviewState.mode === 'analysis' || reviewState.mode === 'guided_lesson' ? reviewState.currentMoveIndex : null}
            onMoveClick={handleMoveClick}
            className="h-full"
          />
        </div>

        {/* Missed Tactics Panel */}
        {missedTactics.length > 0 && (
          <div className="px-3 py-2 border-b border-theme-border" data-testid="missed-tactics-panel">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={12} style={{ color: 'var(--color-warning)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-warning)' }}>
                Missed Tactics ({missedTactics.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {missedTactics.map((tactic, i) => (
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
                    onClick={(e) => {
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

        {/* Commentary panel */}
        {commentary && (
          <div
            className="p-3 border-b border-theme-border"
            data-testid="review-commentary"
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {commentary}
            </p>
          </div>
        )}

        {/* AI Key Moment Commentary */}
        {(aiCommentary || isLoadingAiCommentary) && (
          <div
            className="px-3 py-2 border-b border-theme-border"
            data-testid="ai-commentary"
          >
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

        {/* Action buttons */}
        <div className="flex gap-2 justify-center p-3">
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
    </>
  );
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return '#22c55e';
  if (accuracy >= 60) return '#fbbf24';
  return '#ef4444';
}
