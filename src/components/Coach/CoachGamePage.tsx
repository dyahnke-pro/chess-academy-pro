import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Undo2, Volume2, VolumeX, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChessGame } from '../../hooks/useChessGame';
import { usePracticePosition } from '../../hooks/usePracticePosition';
import { useHintSystem } from '../../hooks/useHintSystem';
import { ChessBoard } from '../Board/ChessBoard';
import { DifficultyToggle } from './DifficultyToggle';
import { HintButton } from './HintButton';
import { CoachGameReview } from './CoachGameReview';
import { GameChatPanel } from './GameChatPanel';
import type { GameChatPanelHandle } from './GameChatPanel';
import { PlayerInfoBar } from './PlayerInfoBar';
import { MoveListPanel } from './MoveListPanel';
import { MobileChatDrawer } from './MobileChatDrawer';
import { ResignButton } from './ResignButton';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAppStore } from '../../stores/appStore';
import { getAdaptiveMove, getRandomLegalMove, getTargetStrength } from '../../services/coachGameEngine';
import { getScenarioTemplate, getMoveCommentaryTemplate } from '../../services/coachTemplates';
import { stockfishEngine } from '../../services/stockfishEngine';
import { detectOpening } from '../../services/openingDetectionService';
import { getCapturedPieces, getMaterialAdvantage } from '../../services/boardUtils';
import { db } from '../../db/schema';
import { checkAndAwardAchievements } from '../../services/gamificationService';
import { calculateAccuracy, getClassificationCounts } from '../../services/accuracyService';
import { getPhaseBreakdown } from '../../services/gamePhaseService';
import { detectMissedTactics } from '../../services/missedTacticService';
import { detectBadHabitsFromGame } from '../../services/coachFeatureService';
import { generateMistakePuzzlesFromGame } from '../../services/mistakePuzzleService';
import { reconstructMovesFromGame } from '../../services/gameReconstructionService';
import type {
  CoachGameState, CoachGameMove, KeyMoment, DetectedOpening,
  CoachDifficulty, MoveClassification, MoveAnnotation,
  StockfishAnalysis, GameAnalysisSummary, GameRecord,
  GameResult, BoardArrow, BoardHighlight, BoardAnnotationCommand,
} from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

function classifyMove(
  preMoveEval: number | null,
  postMoveEval: number,
  bestMoveEval: number | null,
  isEngineBestMove: boolean,
  playerColor: 'white' | 'black',
  secondBestEval?: number | null,
): MoveClassification {
  if (preMoveEval === null) return 'good';
  // Both evals are from White's perspective (normalized by stockfishEngine).

  // cpLostVsBest = how much worse the played move is vs the engine's best
  const cpLostVsBest = bestMoveEval !== null
    ? (playerColor === 'white'
        ? bestMoveEval - postMoveEval
        : postMoveEval - bestMoveEval)
    : 0;

  // Brilliant: player found the engine's best move AND second-best was significantly worse.
  // This means the move was the *only* good option in a critical position (Chess.com-style).
  // We require second-best to be ≥150cp worse than best to qualify as brilliant.
  if (isEngineBestMove && secondBestEval !== null && secondBestEval !== undefined) {
    const secondBestGap = playerColor === 'white'
      ? (bestMoveEval ?? postMoveEval) - secondBestEval
      : secondBestEval - (bestMoveEval ?? postMoveEval);
    if (secondBestGap >= 150) return 'brilliant';
  }

  // Great: played the best move or very close (<10cp off)
  if (cpLostVsBest <= 10) return 'great';
  // Good: small inaccuracy vs best
  if (cpLostVsBest < 50) return 'good';
  // Suboptimal classifications based on cp lost vs best move
  if (cpLostVsBest < 100) return 'inaccuracy';
  if (cpLostVsBest < 250) return 'mistake';
  return 'blunder';
}

function findKeyMoments(moves: CoachGameMove[]): KeyMoment[] {
  const evaluated = moves.filter((m) => m.evaluation !== null && !m.isCoachMove);
  if (evaluated.length < 2) return [];

  // Find largest eval swings
  const swings: { index: number; delta: number; move: CoachGameMove }[] = [];

  for (let i = 1; i < evaluated.length; i++) {
    const prev = evaluated[i - 1];
    const curr = evaluated[i];
    if (prev.evaluation !== null && curr.evaluation !== null) {
      const delta = Math.abs(curr.evaluation - prev.evaluation);
      swings.push({ index: i, delta, move: curr });
    }
  }

  swings.sort((a, b) => b.delta - a.delta);

  return swings.slice(0, 5).map((s) => {
    const type: KeyMoment['type'] = s.delta > 200
      ? (s.move.classification === 'brilliant' || s.move.classification === 'great' ? 'brilliant' : 'blunder')
      : 'turning_point';

    return {
      moveNumber: s.move.moveNumber,
      fen: s.move.fen,
      explanation: s.move.commentary || `Move ${s.move.moveNumber}: ${s.move.san} — evaluation changed significantly.`,
      type,
    };
  });
}

function movesToAnnotations(moves: CoachGameMove[]): MoveAnnotation[] {
  return moves
    .filter((m): m is CoachGameMove & { classification: MoveClassification } =>
      !m.isCoachMove && m.classification !== null)
    .map((m) => ({
      moveNumber: m.moveNumber,
      color: m.moveNumber % 2 === 1 ? 'white' : 'black',
      san: m.san,
      evaluation: m.evaluation,
      bestMove: m.bestMove,
      classification: m.classification,
      comment: m.commentary || null,
    }));
}

function buildAnalysisSummary(
  moves: CoachGameMove[],
  keyMoments: KeyMoment[],
  playerColor: 'white' | 'black',
  result: 'win' | 'loss' | 'draw',
): GameAnalysisSummary {
  const accuracy = calculateAccuracy(moves);
  const classificationCounts = getClassificationCounts(moves, playerColor);
  const phaseBreakdown = getPhaseBreakdown(moves, playerColor);
  const missedTactics = detectMissedTactics(moves, playerColor);

  return {
    accuracy,
    classificationCounts,
    phaseBreakdown,
    missedTactics,
    keyMoments,
    playerColor,
    result,
  };
}

export function CoachGamePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewGameId = searchParams.get('review');
  const activeProfile = useAppStore((s) => s.activeProfile);

  // ─── Guided Lesson State (review query param) ──────────────────────────────
  const [reviewGame, setReviewGame] = useState<GameRecord | null>(null);
  const [reviewMoves, setReviewMoves] = useState<CoachGameMove[] | null>(null);
  const [reviewLoading, setReviewLoading] = useState(!!reviewGameId);

  useEffect(() => {
    if (!reviewGameId) return;
    setReviewLoading(true);
    void db.games.get(reviewGameId).then((game) => {
      if (game) {
        setReviewGame(game);
        setReviewMoves(reconstructMovesFromGame(game));
      }
      setReviewLoading(false);
    });
  }, [reviewGameId]);

  const coachVoiceOn = useAppStore((s) => s.coachVoiceOn);
  const toggleCoachVoice = useAppStore((s) => s.toggleCoachVoice);
  const setPendingAchievement = useAppStore((s) => s.setPendingAchievement);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  // Ref to inject messages into GameChatPanel (hints, takeback msgs)
  const gameChatRef = useRef<GameChatPanelHandle>(null);

  const playerRating = activeProfile?.currentRating ?? 1420;

  const [difficulty, setDifficulty] = useState<CoachDifficulty>('medium');
  const targetStrength = getTargetStrength(playerRating, difficulty);

  // Player color selection (disabled once game has started)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const game = useChessGame(undefined, playerColor);

  const [gameState, setGameState] = useState<CoachGameState>({
    gameId: `game-${Date.now()}`,
    playerColor,
    targetStrength,
    moves: [],
    hintsUsed: 0,
    currentHintLevel: 0,
    takebacksUsed: 0,
    status: 'playing',
    result: 'ongoing',
    keyMoments: [],
  });

  const isMobile = useIsMobile();
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [coachLastMove, setCoachLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const moveCountRef = useRef(0);

  // Resizable split between move list and chat panel (percentage for chat)
  const [chatPercent, setChatPercent] = useState(80);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !rightColumnRef.current) return;
    const rect = rightColumnRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalHeight = rect.height;
    const moveListPercent = Math.max(15, Math.min(75, (y / totalHeight) * 100));
    setChatPercent(Math.max(25, Math.min(85, 100 - moveListPercent)));
  }, []);

  const handleDividerPointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Board annotation state (controlled by chat)
  const [annotationArrows, setAnnotationArrows] = useState<BoardArrow[]>([]);
  const [annotationHighlights, setAnnotationHighlights] = useState<BoardHighlight[]>([]);
  const [temporaryFen, setTemporaryFen] = useState<string | null>(null);
  const [temporaryLabel, setTemporaryLabel] = useState<string | null>(null);

  // Practice position (reusable hook)
  const {
    practicePosition,
    practiceAttempts,
    handlePracticeMove: evaluatePracticeMove,
    exitPractice,
    setPracticeFromAnnotation,
  } = usePracticePosition();

  // Post-game practice bridge prompt
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);

  // Evaluation tracking for eval bar
  const [latestEval, setLatestEval] = useState<number>(0);
  const [latestIsMate, setLatestIsMate] = useState(false);
  const [latestMateIn, setLatestMateIn] = useState<number | null>(null);

  // 3-tier visual hint system (Stockfish-powered, no knownMove)
  const isPlayersTurn =
    (playerColor === 'white' && game.turn === 'w') ||
    (playerColor === 'black' && game.turn === 'b');
  const { hintState, requestHint, resetHints } = useHintSystem({
    fen: game.fen,
    playerColor,
    enabled: gameState.status === 'playing' && isPlayersTurn && !game.isGameOver,
  });

  // Inject nudge text into chat when it appears
  const prevNudgeRef = useRef<string | null>(null);
  useEffect(() => {
    if (hintState.nudgeText && hintState.nudgeText !== prevNudgeRef.current) {
      prevNudgeRef.current = hintState.nudgeText;
      gameChatRef.current?.injectAssistantMessage(hintState.nudgeText);
    }
  }, [hintState.nudgeText]);

  // Move navigation — null means live position
  const [viewedMoveIndex, setViewedMoveIndex] = useState<number | null>(null);

  const handleBackToGame = useCallback(() => {
    setTemporaryFen(null);
    setTemporaryLabel(null);
    setAnnotationArrows([]);
    setAnnotationHighlights([]);
    exitPractice();
  }, [exitPractice]);

  const handleBoardAnnotation = useCallback((commands: BoardAnnotationCommand[]) => {
    // Collect all arrows and highlights from the full response so they accumulate
    const newArrows: BoardArrow[] = [];
    const newHighlights: BoardHighlight[] = [];
    let hasClear = false;
    let hasPractice = false;

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'arrow':
          newArrows.push(...(cmd.arrows ?? []));
          break;
        case 'highlight':
          newHighlights.push(...(cmd.highlights ?? []));
          break;
        case 'show_position':
          if (cmd.fen) {
            setTemporaryFen(cmd.fen);
            setTemporaryLabel(cmd.label ?? 'Analysis position');
          }
          break;
        case 'practice':
          hasPractice = true;
          break;
        case 'clear':
          hasClear = true;
          break;
      }
    }

    if (hasClear) {
      handleBackToGame();
    } else {
      if (hasPractice) setPracticeFromAnnotation(commands);
      if (newArrows.length > 0) setAnnotationArrows(newArrows);
      if (newHighlights.length > 0) setAnnotationHighlights(newHighlights);
    }
  }, [handleBackToGame, setPracticeFromAnnotation]);

  // Color change handler — resets the game
  const handleColorChange = useCallback((color: 'white' | 'black') => {
    setPlayerColor(color);
    game.resetGame();
    moveCountRef.current = 0;
    setGameState({
      gameId: `game-${Date.now()}`,
      playerColor: color,
      targetStrength,
      moves: [],
      hintsUsed: 0,
      currentHintLevel: 0,
      takebacksUsed: 0,
      status: 'playing',
      result: 'ongoing',
      keyMoments: [],
    });
    setLatestEval(0);
    setLatestIsMate(false);
    setLatestMateIn(null);
    setViewedMoveIndex(null);
    resetHints();
    prevNudgeRef.current = null;
    handleBackToGame();
  }, [game, targetStrength, handleBackToGame, resetHints]);

  // Move navigation handlers
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const goToFirstMove = useCallback(() => {
    if (gameState.moves.length === 0) return;
    setViewedMoveIndex(-1);
    handleBackToGame();
  }, [gameState.moves.length, handleBackToGame]);

  const goToPrevMove = useCallback(() => {
    if (gameState.moves.length === 0) return;
    setViewedMoveIndex((prev) => {
      if (prev === null) return gameState.moves.length - 2;
      return Math.max(-1, prev - 1);
    });
    handleBackToGame();
  }, [gameState.moves.length, handleBackToGame]);

  const goToNextMove = useCallback(() => {
    if (gameState.moves.length === 0) return;
    setViewedMoveIndex((prev) => {
      if (prev === null) return null;
      if (prev >= gameState.moves.length - 1) return null;
      return prev + 1;
    });
  }, [gameState.moves.length]);

  const goToLastMove = useCallback(() => {
    setViewedMoveIndex(null);
  }, []);

  // Compute the displayed FEN based on navigation state
  const displayFen = practicePosition?.fen
    ?? temporaryFen
    ?? (viewedMoveIndex !== null
      ? (viewedMoveIndex === -1 ? START_FEN : gameState.moves[viewedMoveIndex]?.fen ?? game.fen)
      : game.fen);

  // Opening detection — recalculated when move history changes
  const detectedOpening = useMemo<DetectedOpening | null>(
    () => detectOpening(game.history),
    [game.history],
  );

  // Captured pieces — recalculated when FEN changes
  const capturedPieces = useMemo(
    () => getCapturedPieces(game.fen),
    [game.fen],
  );
  const materialAdv = useMemo(
    () => getMaterialAdvantage(game.fen),
    [game.fen],
  );

  // Resign handler
  const handleResign = useCallback(() => {
    const keyMoments = findKeyMoments(gameState.moves);
    setGameState((prev) => ({
      ...prev,
      status: 'postgame',
      result: 'loss',
      keyMoments,
    }));
  }, [gameState.moves]);

  // Inject coach message into the Game Chat panel (hints, takeback msgs)
  const coachSay = useCallback((text: string): void => {
    gameChatRef.current?.injectAssistantMessage(text);
  }, []);

  // Check for game over
  useEffect(() => {
    if (game.isGameOver && gameState.status === 'playing') {
      const result: 'win' | 'loss' | 'draw' = game.isCheckmate
        ? (game.turn === 'w' && playerColor === 'white' ? 'loss' : 'win')
        : 'draw';

      const keyMoments = findKeyMoments(gameState.moves);

      setGameState((prev) => ({
        ...prev,
        status: 'postgame',
        result,
        keyMoments,
      }));

      // Save game to DB and check achievements
      const playerWon = result === 'win';
      const playerLost = result === 'loss';
      const pgnResult: GameResult = playerColor === 'white'
        ? (playerWon ? '1-0' : playerLost ? '0-1' : '1/2-1/2')
        : (playerWon ? '0-1' : playerLost ? '1-0' : '1/2-1/2');
      const tags: string[] = [difficulty === 'hard' ? 'Hard' : '', gameState.hintsUsed === 0 ? 'NoHints' : ''].filter(Boolean);

      const annotations = movesToAnnotations(gameState.moves);
      const summary = buildAnalysisSummary(gameState.moves, keyMoments, playerColor, result);

      const playerName = activeProfile?.name ?? 'Player';
      const gameRecord = {
        id: gameState.gameId,
        pgn: game.history.join(' '),
        white: playerColor === 'white' ? playerName : 'Stockfish Bot',
        black: playerColor === 'black' ? playerName : 'Stockfish Bot',
        result: pgnResult,
        date: new Date().toISOString().split('T')[0],
        event: `Coach Game ${tags.join(' ')}`.trim(),
        eco: detectedOpening?.eco ?? null,
        whiteElo: playerColor === 'white' ? playerRating : targetStrength,
        blackElo: playerColor === 'black' ? playerRating : targetStrength,
        source: 'coach' as const,
        annotations,
        coachAnalysis: JSON.stringify(summary),
        isMasterGame: false,
        openingId: detectedOpening?.name ?? null,
      };

      void db.games.add(gameRecord).then(() => {
        if (!activeProfile) return;

        // Detect bad habits from game moves
        void detectBadHabitsFromGame(gameState.moves, activeProfile);

        // Generate mistake puzzles from the completed game
        void generateMistakePuzzlesFromGame(gameRecord.id);

        void checkAndAwardAchievements(activeProfile).then((earned) => {
          if (earned.length > 0) {
            // Queue achievement toasts
            earned.forEach((achievement, i) => {
              setTimeout(() => setPendingAchievement(achievement), i * 3500);
            });
            // Refresh profile from DB
            void db.profiles.get(activeProfile.id).then((updated) => {
              if (updated) setActiveProfile(updated);
            });
          }
        });
      });
    }
  }, [game.isGameOver, game.isCheckmate, game.turn, gameState.status, gameState.moves, playerColor, difficulty, gameState.hintsUsed, gameState.gameId, game.history, activeProfile, playerRating, targetStrength, setPendingAchievement, setActiveProfile, detectedOpening]);

  // Coach makes a move when it's their turn.
  // Uses an AbortController (not a ref guard) to handle React strict-mode
  // double-invocation and dependency-change re-runs safely.
  useEffect(() => {
    const isCoachTurn =
      gameState.status === 'playing' &&
      !game.isGameOver &&
      ((playerColor === 'white' && game.turn === 'b') ||
       (playerColor === 'black' && game.turn === 'w'));

    if (!isCoachTurn) return;

    setIsCoachThinking(true);
    const abortController = new AbortController();
    const isCancelled = (): boolean => abortController.signal.aborted;

    const applyCoachMove = (
      result: MoveResult,
      evaluation: number,
    ): void => {
      moveCountRef.current += 1;

      const coachMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: result.san,
        fen: result.fen,
        isCoachMove: true,
        commentary: '',
        evaluation,
        classification: null,
        expanded: false,
        bestMove: null,
        bestMoveEval: null,
        preMoveEval: null,
      };

      setCoachLastMove({ from: result.from, to: result.to });
      setGameState((prev) => ({
        ...prev,
        moves: [...prev.moves, coachMove],
      }));
    };

    const tryMakeMove = (moveUci: string): MoveResult | null => {
      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      return game.makeMove(from, to, promotion);
    };

    const makeCoachMove = async (): Promise<void> => {
      if (isCancelled()) return;

      try {
        console.log('[CoachGame] Coach thinking... FEN:', game.fen);
        const { move, analysis } = await getAdaptiveMove(game.fen, targetStrength);

        if (isCancelled()) return;

        let result = tryMakeMove(move);

        // If Stockfish's move was invalid, fall back to a random legal move
        if (!result) {
          console.warn('[CoachGame] Stockfish move invalid:', move, '— trying random fallback');
          const randomMove = getRandomLegalMove(game.fen);
          if (randomMove) {
            result = tryMakeMove(randomMove);
          }
        }

        if (!result) {
          console.error('[CoachGame] No valid move could be made');
          return;
        }

        if (isCancelled()) return;

        console.log('[CoachGame] Coach played:', result.san);

        // Analyze the position AFTER the coach moved to get accurate
        // preMoveEval for the player's next move classification.
        let postCoachEval = analysis.evaluation;
        try {
          const postCoachAnalysis = await stockfishEngine.analyzePosition(result.fen, 10);
          if (!isCancelled()) {
            postCoachEval = postCoachAnalysis.evaluation;
          }
        } catch {
          // Fall back to pre-coach eval if analysis fails
        }

        applyCoachMove(result, postCoachEval);
        setLatestEval(postCoachEval);
        setLatestIsMate(analysis.isMate);
        setLatestMateIn(analysis.mateIn);
      } catch (error) {
        if (isCancelled()) return;
        console.error('[CoachGame] Coach move failed, attempting random fallback:', error);

        // Last resort: random legal move so the game never freezes
        const randomMove = getRandomLegalMove(game.fen);
        if (randomMove) {
          const result = tryMakeMove(randomMove);
          if (result) {
            console.log('[CoachGame] Fallback random move played:', result.san);
            applyCoachMove(result, 0);
            return;
          }
        }
        console.error('[CoachGame] All move attempts failed');
      } finally {
        // Only clear thinking state if this operation wasn't cancelled.
        // If cancelled, the cleanup function already handled it.
        if (!isCancelled()) {
          setIsCoachThinking(false);
        }
      }
    };

    // Small delay to feel natural
    const timer = setTimeout(() => void makeCoachMove(), 800);

    return () => {
      abortController.abort();
      clearTimeout(timer);
      setIsCoachThinking(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depend on specific game properties, not the whole object
  }, [game.turn, game.fen, game.isGameOver, gameState.status, playerColor, targetStrength, game.makeMove]);

  // Handle player move
  const handlePlayerMove = useCallback(async (moveResult: MoveResult) => {
    // Clear any coach annotations, hints, and reset move navigation when player moves
    handleBackToGame();
    setViewedMoveIndex(null);
    resetHints();
    prevNudgeRef.current = null;

    // Capture pre-move FEN before making the move
    const preFen = game.fen;

    // Sync the page's game instance with the board's move so game.turn
    // flips to the coach's color and triggers the coach move useEffect.
    game.makeMove(moveResult.from, moveResult.to, moveResult.promotion);
    setCoachLastMove(null);
    moveCountRef.current += 1;

    // Analyze the position AFTER the player's move (for eval bar + post-move eval)
    let analysis: StockfishAnalysis | null = null;
    try {
      analysis = await stockfishEngine.analyzePosition(moveResult.fen, 12);
    } catch {
      // If analysis fails, default to 'good'
    }

    // Analyze the position BEFORE the player's move (for best move comparison)
    let preAnalysis: StockfishAnalysis | null = null;
    try {
      preAnalysis = await stockfishEngine.analyzePosition(preFen, 12);
    } catch {
      // If pre-analysis fails, we'll use simpler classification
    }

    // Update eval bar
    if (analysis) {
      setLatestEval(analysis.evaluation);
      setLatestIsMate(analysis.isMate);
      setLatestMateIn(analysis.mateIn);
    }

    // Check if the player played the engine's best move
    const playerUci = moveResult.from + moveResult.to + (moveResult.promotion ?? '');
    const isEngineBestMove = preAnalysis?.bestMove === playerUci;
    const bestMoveEval = preAnalysis?.topLines[0]?.evaluation ?? null;
    const secondBestEval = preAnalysis?.topLines[1]?.evaluation ?? null;

    setGameState((prev) => {
      const preMoveEval = prev.moves.length > 0 ? (prev.moves[prev.moves.length - 1].evaluation ?? null) : 0;
      const classification = analysis
        ? classifyMove(preMoveEval, analysis.evaluation, bestMoveEval, isEngineBestMove, playerColor, secondBestEval)
        : 'good';

      const evalLoss = analysis && preMoveEval !== null
        ? Math.max(0, playerColor === 'white'
            ? preMoveEval - analysis.evaluation
            : analysis.evaluation - preMoveEval)
        : 0;
      // bestMove from pre-analysis = what the player SHOULD have played
      const engineBestMove = preAnalysis?.bestMove ?? null;
      const vars = {
        playerMove: moveResult.san,
        bestMove: engineBestMove ?? '?',
        evalDelta: String(evalLoss),
      };
      const commentary = getMoveCommentaryTemplate(classification, vars);

      const playerMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: moveResult.san,
        fen: moveResult.fen,
        isCoachMove: false,
        commentary,
        evaluation: analysis?.evaluation ?? null,
        classification,
        expanded: false,
        bestMove: engineBestMove,
        bestMoveEval: bestMoveEval,
        preMoveEval,
      };
      return {
        ...prev,
        moves: [...prev.moves, playerMove],
        currentHintLevel: 0,
      };
    });
  }, [game, handleBackToGame, resetHints, playerColor]);

  // Handle practice move (when in chat-driven practice mode)
  const handlePracticeMove = useCallback(async (moveResult: MoveResult) => {
    const result = await evaluatePracticeMove(moveResult);
    coachSay(result.message);
  }, [evaluatePracticeMove, coachSay]);

  // Handle board move routing — practice mode or normal gameplay
  const handleBoardMoveRouted = useCallback((moveResult: MoveResult) => {
    if (practicePosition) {
      void handlePracticeMove(moveResult);
    } else {
      void handlePlayerMove(moveResult);
    }
  }, [practicePosition, handlePracticeMove, handlePlayerMove]);

  // Handle practice-in-chat from post-game review
  const handlePracticeInChat = useCallback((prompt: string) => {
    // Transition from postgame back to playing mode with chat
    game.resetGame();
    moveCountRef.current = 0;
    setGameState({
      gameId: `game-${Date.now()}`,
      playerColor,
      targetStrength,
      moves: [],
      hintsUsed: 0,
      currentHintLevel: 0,
      takebacksUsed: 0,
      status: 'playing',
      result: 'ongoing',
      keyMoments: [],
    });
    setLatestEval(0);
    setLatestIsMate(false);
    setLatestMateIn(null);
    setViewedMoveIndex(null);
    setPendingChatPrompt(prompt);
  }, [game, playerColor, targetStrength]);

  // Hint request — uses 3-tier visual hint system
  const handleHint = useCallback(() => {
    requestHint();
    setGameState((prev) => ({
      ...prev,
      currentHintLevel: Math.min(prev.currentHintLevel + 1, 3) as 0 | 1 | 2 | 3,
      hintsUsed: prev.hintsUsed + 1,
    }));
  }, [requestHint]);

  // Takeback — always allowed
  const handleTakeback = useCallback(() => {
    // Undo both player and coach moves
    game.undoMove(); // Undo coach's response
    game.undoMove(); // Undo player's move
    moveCountRef.current = Math.max(0, moveCountRef.current - 2);
    resetHints();
    prevNudgeRef.current = null;

    setGameState((prev) => ({
      ...prev,
      moves: prev.moves.slice(0, -2),
      takebacksUsed: prev.takebacksUsed + 1,
    }));

    const msg = getScenarioTemplate('takeback_allowed');
    coachSay(msg);
  }, [game, coachSay, resetHints]);

  // Derive opponent/player info for PlayerInfoBar
  const isPlayerWhite = playerColor === 'white';
  const playerName = activeProfile?.name ?? 'Player';
  const opponentName = 'Stockfish Bot';
  const isPlayerTurn = (isPlayerWhite && game.turn === 'w') || (!isPlayerWhite && game.turn === 'b');

  // Guided Lesson Mode — review a past game
  if (reviewGameId) {
    if (reviewLoading) {
      return (
        <div className="flex items-center justify-center h-dvh" data-testid="coach-game-page">
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm">Loading game...</span>
          </div>
        </div>
      );
    }

    if (!reviewGame || !reviewMoves) {
      return (
        <div className="flex flex-col items-center justify-center h-dvh gap-3" data-testid="coach-game-page">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Game not found.</p>
          <button
            onClick={() => void navigate('/coach')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            Back to Coach
          </button>
        </div>
      );
    }

    const reviewPlayerColor: 'white' | 'black' = reviewGame.white !== 'Stockfish Bot' && reviewGame.white !== 'AI Coach' ? 'white' : 'black';
    const reviewPlayerName = reviewPlayerColor === 'white' ? reviewGame.white : reviewGame.black;
    const reviewOpponentRating = reviewPlayerColor === 'white' ? (reviewGame.blackElo ?? 1500) : (reviewGame.whiteElo ?? 1500);
    const reviewPlayerRating = reviewPlayerColor === 'white' ? (reviewGame.whiteElo ?? playerRating) : (reviewGame.blackElo ?? playerRating);

    return (
      <CoachGameReview
        moves={reviewMoves}
        keyMoments={[]}
        playerColor={reviewPlayerColor}
        result={reviewGame.result}
        openingName={reviewGame.openingId}
        playerName={reviewPlayerName}
        playerRating={reviewPlayerRating}
        opponentRating={reviewOpponentRating}
        onPlayAgain={() => void navigate('/coach/play')}
        onBackToCoach={() => void navigate('/coach')}
        isGuidedLesson
        pgn={reviewGame.pgn}
      />
    );
  }

  // Post-game review — CoachGameReview handles its own layout
  if (gameState.status === 'postgame') {
    return (
      <CoachGameReview
        moves={gameState.moves}
        keyMoments={gameState.keyMoments}
        playerColor={playerColor}
        result={gameState.result === 'ongoing' ? 'draw' : gameState.result}
        openingName={detectedOpening?.name ?? null}
        playerName={playerName}
        playerRating={playerRating}
        opponentRating={targetStrength}
        onPlayAgain={() => {
          game.resetGame();
          moveCountRef.current = 0;
          setGameState({
            gameId: `game-${Date.now()}`,
            playerColor,
            targetStrength,
            moves: [],
            hintsUsed: 0,
            currentHintLevel: 0,
            takebacksUsed: 0,
            status: 'playing',
            result: 'ongoing',
            keyMoments: [],
          });
          setLatestEval(0);
          setLatestIsMate(false);
          setLatestMateIn(null);
          setViewedMoveIndex(null);
          resetHints();
          prevNudgeRef.current = null;
        }}
        onBackToCoach={() => void navigate('/coach')}
        onPracticeInChat={handlePracticeInChat}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden" data-testid="coach-game-page">
      {/* Left column: board + controls */}
      <div className="flex flex-col flex-1 md:flex-none md:w-3/5 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 md:p-4 border-b border-theme-border">
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => void navigate('/coach')} className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ArrowLeft size={20} className="text-theme-text" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-theme-text">
                vs Stockfish Bot
              </h2>
              <p className="text-xs text-theme-text-muted">
                ~{targetStrength} ELO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {/* Color selector */}
            <div className="flex items-center gap-0.5 rounded-lg border border-theme-border p-0.5" data-testid="color-selector">
              <button
                onClick={() => handleColorChange('white')}
                disabled={gameState.moves.length > 0}
                className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                  playerColor === 'white' ? 'ring-2 ring-theme-accent ring-inset' : ''
                }`}
                aria-label="Play as white"
                data-testid="color-white-btn"
              >
                <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white border border-neutral-300" />
              </button>
              <button
                onClick={() => handleColorChange('black')}
                disabled={gameState.moves.length > 0}
                className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                  playerColor === 'black' ? 'ring-2 ring-theme-accent ring-inset' : ''
                }`}
                aria-label="Play as black"
                data-testid="color-black-btn"
              >
                <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-neutral-800 border border-neutral-600" />
              </button>
            </div>
            <DifficultyToggle
              value={difficulty}
              onChange={setDifficulty}
              disabled={gameState.moves.length > 0}
            />
            <button
              onClick={toggleCoachVoice}
              className="flex-shrink-0 p-1.5 md:p-2 rounded-lg border transition-colors"
              style={{
                background: coachVoiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: coachVoiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
              }}
              aria-label={coachVoiceOn ? 'Mute voice' : 'Unmute voice'}
              data-testid="coach-speaker-toggle"
            >
              {coachVoiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        {/* Opponent info bar (top) */}
        <div className="px-2 pt-1">
          <PlayerInfoBar
            name={opponentName}
            rating={targetStrength}
            isBot
            capturedPieces={isPlayerWhite ? capturedPieces.black : capturedPieces.white}
            materialAdvantage={isPlayerWhite ? Math.max(0, -materialAdv) : Math.max(0, materialAdv)}
            isActive={!isPlayerTurn && !game.isGameOver}
          />
        </div>

        {/* Temporary position banner */}
        <AnimatePresence>
          {temporaryFen && !practicePosition && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-lg mx-2 mt-1 p-2.5 flex items-center justify-between overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))' }}
              data-testid="temp-position-banner"
            >
              <div className="flex items-center gap-2">
                <Eye size={14} style={{ color: 'var(--color-accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  {temporaryLabel}
                </span>
              </div>
              <button
                onClick={handleBackToGame}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="back-to-game-btn"
              >
                Back to Game
              </button>
            </motion.div>
          )}
          {practicePosition && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-lg mx-2 mt-1 p-2.5 flex items-center justify-between overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))' }}
              data-testid="practice-position-banner"
            >
              <div className="flex items-center gap-2">
                <Eye size={14} style={{ color: 'var(--color-success, var(--color-accent))' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  Practice: {practicePosition.label}
                </span>
              </div>
              <button
                onClick={handleBackToGame}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="exit-practice-btn"
              >
                Back to Game
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board */}
        <div className="px-2 py-1 flex justify-center flex-shrink-0">
          <div className="w-full md:max-w-[420px]">
            <ChessBoard
              key={`${gameState.gameId}-${playerColor}-${practicePosition?.fen ?? ''}-${practiceAttempts}`}
              initialFen={displayFen}
              orientation={playerColor}
              interactive={(gameState.status === 'playing' && !isCoachThinking && !temporaryFen && viewedMoveIndex === null) || !!practicePosition}
              onMove={handleBoardMoveRouted}
              showEvalBar={difficulty !== 'hard'}
              evaluation={latestEval}
              isMate={latestIsMate}
              mateIn={latestMateIn}
              showFlipButton={false}
              highlightSquares={coachLastMove}
              arrows={[...hintState.arrows, ...annotationArrows].length > 0 ? [...hintState.arrows, ...annotationArrows] : undefined}
              annotationHighlights={annotationHighlights.length > 0 ? annotationHighlights : undefined}
              ghostMove={hintState.ghostMove}
            />
          </div>
        </div>

        {/* Player info bar (bottom) */}
        <div className="px-2">
          <PlayerInfoBar
            name={playerName}
            rating={playerRating}
            capturedPieces={isPlayerWhite ? capturedPieces.white : capturedPieces.black}
            materialAdvantage={isPlayerWhite ? Math.max(0, materialAdv) : Math.max(0, -materialAdv)}
            isActive={isPlayerTurn && !game.isGameOver}
          />
        </div>

        {/* Controls */}
        {gameState.status === 'playing' && (
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
            <HintButton
              currentLevel={hintState.level}
              onRequestHint={handleHint}
              disabled={isCoachThinking || hintState.isAnalyzing}
            />

            {/* Move navigation */}
            <div className="flex items-center gap-0.5" data-testid="move-nav">
              <button
                onClick={goToFirstMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === -1}
                className="p-2 md:p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="First move"
                data-testid="nav-first"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={goToPrevMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === -1}
                className="p-2 md:p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Previous move"
                data-testid="nav-prev"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNextMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === null}
                className="p-2 md:p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Next move"
                data-testid="nav-next"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToLastMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === null}
                className="p-2 md:p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Last move"
                data-testid="nav-last"
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={handleTakeback}
                disabled={gameState.moves.length < 2}
                className="flex items-center gap-1 px-2 py-2 md:px-3 rounded-lg border border-theme-border text-sm text-theme-text-muted hover:text-theme-text disabled:opacity-30"
                data-testid="takeback-btn"
              >
                <Undo2 size={14} />
                <span className="hidden md:inline">Takeback</span>
              </button>
              <ResignButton onResign={handleResign} disabled={gameState.moves.length === 0} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: swipeable chat drawer + toggle button */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileChatOpen(true)}
            className="fixed z-30 flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-theme-accent text-white transition-transform hover:scale-105 active:scale-95"
            style={{
              right: '1rem',
              bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
            }}
            aria-label="Open chat"
            data-testid="mobile-chat-toggle"
          >
            <MessageCircle size={22} />
          </button>

          <MobileChatDrawer isOpen={mobileChatOpen} onClose={() => setMobileChatOpen(false)}>
            <GameChatPanel
              ref={gameChatRef}
              fen={game.fen}
              pgn={game.history.join(' ')}
              moveNumber={moveCountRef.current}
              playerColor={playerColor}
              turn={game.turn}
              isGameOver={game.isGameOver}
              gameResult={gameState.result}
              onBoardAnnotation={handleBoardAnnotation}
              initialPrompt={pendingChatPrompt}
              className="h-full"
            />
          </MobileChatDrawer>
        </>
      )}

      {/* Desktop: right column with move list + divider + chat */}
      {!isMobile && (
        <div
          ref={rightColumnRef}
          className="flex flex-col flex-1 border-l border-theme-border overflow-hidden"
        >
          <div
            className="min-h-0 overflow-hidden"
            style={{ height: `${100 - chatPercent}%` }}
          >
            <MoveListPanel
              moves={gameState.moves}
              openingName={detectedOpening?.name ?? null}
              currentMoveIndex={viewedMoveIndex !== null ? viewedMoveIndex : (gameState.moves.length > 0 ? gameState.moves.length - 1 : null)}
              className="h-full"
            />
          </div>

          <div
            className="flex-shrink-0 h-1.5 bg-theme-border hover:bg-theme-accent/50 cursor-row-resize flex items-center justify-center transition-colors"
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
            data-testid="panel-divider"
          >
            <div className="w-8 h-0.5 rounded-full bg-theme-text-muted/40" />
          </div>

          <div
            className="min-h-[120px] overflow-hidden"
            style={{ height: `${chatPercent}%` }}
          >
            <GameChatPanel
              ref={gameChatRef}
              fen={game.fen}
              pgn={game.history.join(' ')}
              moveNumber={moveCountRef.current}
              playerColor={playerColor}
              turn={game.turn}
              isGameOver={game.isGameOver}
              gameResult={gameState.result}
              onBoardAnnotation={handleBoardAnnotation}
              initialPrompt={pendingChatPrompt}
            />
          </div>
        </div>
      )}
    </div>
  );
}
