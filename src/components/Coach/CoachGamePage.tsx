import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Volume2, VolumeX, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChessGame } from '../../hooks/useChessGame';
import { usePracticePosition } from '../../hooks/usePracticePosition';
import { ChessBoard } from '../Board/ChessBoard';
import { DifficultyToggle } from './DifficultyToggle';
import { HintButton } from './HintButton';
import { CoachGameReview } from './CoachGameReview';
import { GameChatPanel } from './GameChatPanel';
import type { GameChatPanelHandle } from './GameChatPanel';
import { PlayerInfoBar } from './PlayerInfoBar';
import { MoveListPanel } from './MoveListPanel';
import { ResignButton } from './ResignButton';
import { useAppStore } from '../../stores/appStore';
import { getAdaptiveMove, getRandomLegalMove, getTargetStrength } from '../../services/coachGameEngine';
import { getCoachCommentary } from '../../services/coachApi';
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
import type {
  CoachGameState, CoachGameMove, KeyMoment, DetectedOpening,
  CoachDifficulty, HintLevel, MoveClassification, MoveAnnotation,
  StockfishAnalysis, GameAnalysisSummary,
  GameResult, CoachContext, BoardArrow, BoardHighlight, BoardAnnotationCommand,
} from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

function classifyMove(
  playerEval: number | null,
  bestEval: number,
): MoveClassification {
  if (playerEval === null) return 'good';
  const delta = Math.abs(bestEval - playerEval);
  if (delta < 10) return 'brilliant';
  if (delta < 30) return 'great';
  if (delta < 60) return 'good';
  if (delta < 100) return 'inaccuracy';
  if (delta < 200) return 'mistake';
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
  const activeProfile = useAppStore((s) => s.activeProfile);

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

  const [coachLastMove, setCoachLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const moveCountRef = useRef(0);

  // Resizable split between move list and chat panel (percentage for chat)
  const [chatPercent, setChatPercent] = useState(60);
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
    handleBackToGame();
  }, [game, targetStrength, handleBackToGame]);

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
        white: playerColor === 'white' ? playerName : 'AI Coach',
        black: playerColor === 'black' ? playerName : 'AI Coach',
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
        applyCoachMove(result, analysis.evaluation);
        setLatestEval(analysis.evaluation);
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
    // Clear any coach annotations and reset move navigation when player moves
    handleBackToGame();
    setViewedMoveIndex(null);

    // Sync the page's game instance with the board's move so game.turn
    // flips to the coach's color and triggers the coach move useEffect.
    game.makeMove(moveResult.from, moveResult.to, moveResult.promotion);
    setCoachLastMove(null);
    moveCountRef.current += 1;

    // Analyze the player's move
    let analysis: StockfishAnalysis | null = null;
    let classification: MoveClassification = 'good';
    try {
      analysis = await stockfishEngine.analyzePosition(moveResult.fen, 12);
      classification = classifyMove(analysis.evaluation, analysis.topLines[0]?.evaluation ?? 0);
    } catch {
      // If analysis fails, default to 'good'
    }

    // Update eval bar
    if (analysis) {
      setLatestEval(analysis.evaluation);
      setLatestIsMate(analysis.isMate);
      setLatestMateIn(analysis.mateIn);
    }

    const vars = {
      playerMove: moveResult.san,
      bestMove: analysis?.bestMove ?? '?',
      evalDelta: analysis ? String(Math.abs(analysis.evaluation - (analysis.topLines[0]?.evaluation ?? 0))) : '0',
    };

    const commentary = getMoveCommentaryTemplate(classification, vars);

    setGameState((prev) => {
      const preMoveEval = prev.moves.length > 0 ? (prev.moves[prev.moves.length - 1].evaluation ?? null) : 0;
      const playerMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: moveResult.san,
        fen: moveResult.fen,
        isCoachMove: false,
        commentary,
        evaluation: analysis?.evaluation ?? null,
        classification,
        expanded: false,
        bestMove: analysis?.bestMove ?? null,
        bestMoveEval: analysis?.topLines[0]?.evaluation ?? null,
        preMoveEval,
      };
      return {
        ...prev,
        moves: [...prev.moves, playerMove],
        currentHintLevel: 0,
      };
    });
  }, [game, handleBackToGame]);

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

  // Hint request — level 1: vague direction, level 2: specific piece/area, level 3: the move
  const handleHint = useCallback(async () => {
    const nextLevel = Math.min(gameState.currentHintLevel + 1, 3) as HintLevel;

    setGameState((prev) => ({
      ...prev,
      currentHintLevel: nextLevel,
      hintsUsed: prev.hintsUsed + 1,
    }));

    // Get Stockfish analysis for context
    const analysis = await stockfishEngine.analyzePosition(game.fen, 12).catch(() => null);
    const bestMove = analysis?.bestMove ?? null;
    const hintScenario = `hint_level${nextLevel}` as 'hint_level1' | 'hint_level2' | 'hint_level3';
    let hintText: string;

    try {
      const context: CoachContext = {
        fen: game.fen,
        lastMoveSan: game.lastMove ? `${game.lastMove.from}${game.lastMove.to}` : null,
        moveNumber: moveCountRef.current,
        pgn: game.history.join(' '),
        openingName: null,
        stockfishAnalysis: analysis ?? null,
        playerMove: null,
        moveClassification: null,
        playerProfile: {
          rating: playerRating,

          weaknesses: [] as string[],
        },
      };

      hintText = await getCoachCommentary('hint', context);
    } catch {
      hintText = getScenarioTemplate(hintScenario, {
        bestMove: bestMove ?? undefined,
      });
    }

    coachSay(hintText);
  }, [gameState.currentHintLevel, game.fen, game.lastMove, game.history, playerRating, coachSay]);

  // Takeback — always allowed
  const handleTakeback = useCallback(() => {
    // Undo both player and coach moves
    game.undoMove(); // Undo coach's response
    game.undoMove(); // Undo player's move
    moveCountRef.current = Math.max(0, moveCountRef.current - 2);

    setGameState((prev) => ({
      ...prev,
      moves: prev.moves.slice(0, -2),
      takebacksUsed: prev.takebacksUsed + 1,
    }));

    const msg = getScenarioTemplate('takeback_allowed');
    coachSay(msg);
  }, [game, coachSay]);

  // Derive opponent/player info for PlayerInfoBar
  const isPlayerWhite = playerColor === 'white';
  const playerName = activeProfile?.name ?? 'Player';
  const opponentName = 'AI Coach';
  const isPlayerTurn = (isPlayerWhite && game.turn === 'w') || (!isPlayerWhite && game.turn === 'b');

  // Post-game review — same two-column layout as gameplay
  if (gameState.status === 'postgame') {
    return (
      <div className="flex flex-col md:flex-row h-dvh overflow-hidden" data-testid="coach-game-page">
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
          }}
          onBackToCoach={() => void navigate('/coach')}
          onPracticeInChat={handlePracticeInChat}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-dvh overflow-hidden" data-testid="coach-game-page">
      {/* Left column: board + controls */}
      <div className="flex flex-col flex-1 md:flex-none md:w-3/5 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <button onClick={() => void navigate('/coach')} className="p-1.5 rounded-lg hover:bg-theme-surface">
              <ArrowLeft size={20} className="text-theme-text" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-theme-text">
                vs AI Coach
              </h2>
              <p className="text-xs text-theme-text-muted">
                ~{targetStrength} ELO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Color selector */}
            <div className="flex items-center gap-0.5 rounded-lg border border-theme-border p-0.5" data-testid="color-selector">
              <button
                onClick={() => handleColorChange('white')}
                disabled={gameState.moves.length > 0}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                  playerColor === 'white' ? 'ring-2 ring-theme-accent ring-inset' : ''
                }`}
                aria-label="Play as white"
                data-testid="color-white-btn"
              >
                <div className="w-4 h-4 rounded-full bg-white border border-neutral-300" />
              </button>
              <button
                onClick={() => handleColorChange('black')}
                disabled={gameState.moves.length > 0}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                  playerColor === 'black' ? 'ring-2 ring-theme-accent ring-inset' : ''
                }`}
                aria-label="Play as black"
                data-testid="color-black-btn"
              >
                <div className="w-4 h-4 rounded-full bg-neutral-800 border border-neutral-600" />
              </button>
            </div>
            <DifficultyToggle
              value={difficulty}
              onChange={setDifficulty}
              disabled={gameState.moves.length > 0}
            />
            <button
              onClick={toggleCoachVoice}
              className="flex-shrink-0 p-2 rounded-lg border transition-colors"
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
          <div className="w-full max-w-[300px] sm:max-w-[360px] md:max-w-[420px]">
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
              arrows={annotationArrows.length > 0 ? annotationArrows : undefined}
              annotationHighlights={annotationHighlights.length > 0 ? annotationHighlights : undefined}
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
              currentLevel={gameState.currentHintLevel}
              onRequestHint={() => void handleHint()}
              disabled={isCoachThinking}
            />

            {/* Move navigation */}
            <div className="flex items-center gap-0.5" data-testid="move-nav">
              <button
                onClick={goToFirstMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === -1}
                className="p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="First move"
                data-testid="nav-first"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={goToPrevMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === -1}
                className="p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="Previous move"
                data-testid="nav-prev"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNextMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === null}
                className="p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="Next move"
                data-testid="nav-next"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToLastMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === null}
                className="p-1.5 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-surface disabled:opacity-30 transition-colors"
                aria-label="Last move"
                data-testid="nav-last"
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTakeback}
                disabled={gameState.moves.length < 2}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-theme-border text-sm text-theme-text-muted hover:text-theme-text disabled:opacity-30"
                data-testid="takeback-btn"
              >
                <Undo2 size={14} />
                Takeback
              </button>
              <ResignButton onResign={handleResign} disabled={gameState.moves.length === 0} />
            </div>
          </div>
        )}
      </div>

      {/* Right column: move list + resizable divider + chat panel */}
      <div
        ref={rightColumnRef}
        className="flex flex-col flex-shrink-0 h-[40vh] md:h-auto md:flex-1 md:border-l border-theme-border overflow-hidden"
      >
        {/* Move list panel (top portion) */}
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

        {/* Draggable divider */}
        <div
          className="flex-shrink-0 h-1.5 bg-theme-border hover:bg-theme-accent/50 cursor-row-resize flex items-center justify-center transition-colors"
          onPointerDown={handleDividerPointerDown}
          onPointerMove={handleDividerPointerMove}
          onPointerUp={handleDividerPointerUp}
          data-testid="panel-divider"
        >
          <div className="w-8 h-0.5 rounded-full bg-theme-text-muted/40" />
        </div>

        {/* Chat panel (bottom portion) */}
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
    </div>
  );
}
