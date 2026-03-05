import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Undo2, ChevronDown, ChevronUp } from 'lucide-react';
import { useChessGame } from '../../hooks/useChessGame';
import { ChessBoard } from '../Board/ChessBoard';
import { CoachOverlay } from './CoachOverlay';
import { DifficultyToggle } from './DifficultyToggle';
import { HintButton } from './HintButton';
import { CoachGameReview } from './CoachGameReview';
import { ChatInput } from './ChatInput';
import { useAppStore } from '../../stores/appStore';
import { getAdaptiveMove, getRandomLegalMove, getTargetStrength } from '../../services/coachGameEngine';
import { getCoachCommentary } from '../../services/coachApi';
import { getScenarioTemplate, getMoveCommentaryTemplate } from '../../services/coachTemplates';
import { voiceService } from '../../services/voiceService';
import { stockfishEngine } from '../../services/stockfishEngine';
import { db } from '../../db/schema';
import { checkAndAwardAchievements } from '../../services/gamificationService';
import type {
  CoachGameState, CoachGameMove, KeyMoment, CoachPersonality,
  CoachDifficulty, HintLevel, MoveClassification, StockfishAnalysis,
  GameResult,
} from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

const PERSONALITY_NAMES: Record<CoachPersonality, string> = {
  danya: 'Danya',
  kasparov: 'Kasparov',
  fischer: 'Fischer',
};

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

  return swings.slice(0, 3).map((s) => {
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

export function CoachGamePage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setCoachExpression = useAppStore((s) => s.setCoachExpression);
  const setCoachSpeaking = useAppStore((s) => s.setCoachSpeaking);

  const setCoachBubbleText = useAppStore((s) => s.setCoachBubbleText);
  const coachVoiceOn = useAppStore((s) => s.coachVoiceOn);
  const setPendingAchievement = useAppStore((s) => s.setPendingAchievement);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const personality = activeProfile?.coachPersonality ?? 'danya';
  const playerRating = activeProfile?.currentRating ?? 1420;

  const [difficulty, setDifficulty] = useState<CoachDifficulty>('medium');
  const targetStrength = getTargetStrength(playerRating, difficulty);

  // Player plays white by default
  const [playerColor] = useState<'white' | 'black'>('white');
  const game = useChessGame(undefined, playerColor);

  const [gameState, setGameState] = useState<CoachGameState>({
    gameId: `game-${Date.now()}`,
    playerColor,
    coachPersonality: personality,
    targetStrength,
    moves: [],
    hintsUsed: 0,
    currentHintLevel: 0,
    takebacksUsed: 0,
    status: 'pregame',
    result: 'ongoing',
    keyMoments: [],
  });

  const [commentaries, setCommentaries] = useState<{ moveNumber: number; text: string; expanded: boolean }[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  const isCoachThinking = useRef(false);
  const moveCountRef = useRef(0);

  // Unified speak + bubble helper: always shows bubble, only speaks if voice is on
  const coachSay = useCallback((text: string): void => {
    setCoachBubbleText(text);
    if (coachVoiceOn) {
      void voiceService.speak(text, personality);
      setCoachSpeaking(true);
      setTimeout(() => setCoachSpeaking(false), 3000);
    }
  }, [coachVoiceOn, personality, setCoachBubbleText, setCoachSpeaking]);

  // Pregame intro
  useEffect(() => {
    if (gameState.status === 'pregame') {
      const greeting = getScenarioTemplate(personality, 'game_opening', {
        playerName: activeProfile?.name,
      });
      coachSay(greeting);
      setCoachExpression('encouraging');

      setCommentaries([{ moveNumber: 0, text: greeting, expanded: true }]);

      setTimeout(() => {
        setGameState((prev) => ({ ...prev, status: 'playing' }));
        setCoachExpression('neutral');
      }, 3000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for game over
  useEffect(() => {
    if (game.isGameOver && gameState.status === 'playing') {
      const result = game.isCheckmate
        ? (game.turn === 'w' && playerColor === 'white' ? 'loss' : 'win') as const
        : 'draw' as const;

      const keyMoments = findKeyMoments(gameState.moves);

      setGameState((prev) => ({
        ...prev,
        status: 'postgame',
        result,
        keyMoments,
      }));

      // Post-game commentary
      const scenario = result === 'win' ? 'post_game_win' : result === 'loss' ? 'post_game_loss' : 'post_game_draw';
      const template = getScenarioTemplate(personality, scenario);
      setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: template, expanded: true }]);
      coachSay(template);

      // Generate recommendation
      setRecommendation(
        result === 'win'
          ? 'Focus on finishing games cleanly — look for faster checkmate patterns.'
          : result === 'loss'
            ? 'Review the key moments above. Work on recognizing tactical patterns earlier.'
            : 'Solid play! Try to find winning chances in drawn positions.',
      );

      // Save game to DB and check achievements
      const pgnResult: GameResult = result === 'win' ? '1-0' : result === 'loss' ? '0-1' : '1/2-1/2';
      const tags: string[] = [difficulty === 'hard' ? 'Hard' : '', gameState.hintsUsed === 0 ? 'NoHints' : ''].filter(Boolean);
      const gameRecord = {
        id: gameState.gameId,
        pgn: game.history.join(' '),
        white: activeProfile?.name ?? 'Player',
        black: `Coach ${PERSONALITY_NAMES[personality]}`,
        result: pgnResult,
        date: new Date().toISOString().split('T')[0],
        event: `Coach Game ${tags.join(' ')}`.trim(),
        eco: null,
        whiteElo: playerRating,
        blackElo: targetStrength,
        source: 'coach' as const,
        annotations: null,
        coachAnalysis: null,
        isMasterGame: false,
        openingId: null,
      };

      void db.games.add(gameRecord).then(() => {
        if (!activeProfile) return;
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
  }, [game.isGameOver, game.isCheckmate, game.turn, gameState.status, gameState.moves, playerColor, personality, difficulty, gameState.hintsUsed, gameState.gameId, game.history, activeProfile, playerRating, targetStrength, setPendingAchievement, setActiveProfile, coachSay]);

  // Coach makes a move when it's their turn
  useEffect(() => {
    const isCoachTurn =
      gameState.status === 'playing' &&
      !game.isGameOver &&
      ((playerColor === 'white' && game.turn === 'b') ||
       (playerColor === 'black' && game.turn === 'w'));

    if (!isCoachTurn || isCoachThinking.current) return;

    isCoachThinking.current = true;
    setCoachExpression('thinking');
    const abortController = new AbortController();
    const isCancelled = (): boolean => abortController.signal.aborted;

    const applyCoachMove = (
      result: MoveResult,
      evaluation: number,
    ): void => {
      moveCountRef.current += 1;
      const thinkingTemplate = getScenarioTemplate(personality, 'game_thinking');

      const coachMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: result.san,
        fen: result.fen,
        isCoachMove: true,
        commentary: thinkingTemplate,
        evaluation,
        classification: null,
        expanded: false,
      };

      setGameState((prev) => ({
        ...prev,
        moves: [...prev.moves, coachMove],
      }));
      setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: thinkingTemplate, expanded: false }]);
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

        console.log('[CoachGame] Coach played:', result.san);
        applyCoachMove(result, analysis.evaluation);
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
        isCoachThinking.current = false;
        if (!isCancelled()) {
          setCoachExpression('neutral');
        }
      }
    };

    // Small delay to feel natural
    const timer = setTimeout(() => void makeCoachMove(), 800);

    return () => {
      abortController.abort();
      clearTimeout(timer);
    };
  }, [game.turn, game.fen, game.isGameOver, gameState.status, playerColor, targetStrength, personality, game, setCoachExpression]);

  // Handle player move
  const handlePlayerMove = useCallback(async (moveResult: MoveResult) => {
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

    const vars = {
      playerMove: moveResult.san,
      bestMove: analysis?.bestMove ?? '?',
      evalDelta: analysis ? String(Math.abs(analysis.evaluation - (analysis.topLines[0]?.evaluation ?? 0))) : '0',
    };

    const commentary = getMoveCommentaryTemplate(personality, classification, vars);

    const playerMove: CoachGameMove = {
      moveNumber: moveCountRef.current,
      san: moveResult.san,
      fen: moveResult.fen,
      isCoachMove: false,
      commentary,
      evaluation: analysis?.evaluation ?? null,
      classification,
      expanded: false,
    };

    setGameState((prev) => ({
      ...prev,
      moves: [...prev.moves, playerMove],
      currentHintLevel: 0, // Reset hint level after each move
    }));
    setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: commentary, expanded: false }]);

    // Set expression based on classification
    if (classification === 'brilliant' || classification === 'great') {
      setCoachExpression('excited');
    } else if (classification === 'blunder' || classification === 'mistake') {
      setCoachExpression('disappointed');
    } else {
      setCoachExpression('encouraging');
    }

    coachSay(commentary);
    setTimeout(() => setCoachExpression('neutral'), 3000);
  }, [personality, setCoachExpression, coachSay]);

  // Hint request
  const handleHint = useCallback(async () => {
    const nextLevel = Math.min(gameState.currentHintLevel + 1, 3) as HintLevel;

    setGameState((prev) => ({
      ...prev,
      currentHintLevel: nextLevel,
      hintsUsed: prev.hintsUsed + 1,
    }));

    // Try API for hint, fall back to template
    const hintScenario = `hint_level${nextLevel}` as 'hint_level1' | 'hint_level2' | 'hint_level3';
    let hintText: string;

    try {
      const context = {
        fen: game.fen,
        lastMoveSan: game.lastMove ? `${game.lastMove.from}${game.lastMove.to}` : null,
        moveNumber: moveCountRef.current,
        pgn: game.history.join(' '),
        openingName: null,
        stockfishAnalysis: null,
        playerMove: null,
        moveClassification: null,
        playerProfile: {
          rating: playerRating,
          style: personality,
          weaknesses: [],
        },
      };

      hintText = await getCoachCommentary('hint', context, personality);
    } catch {
      const analysis = await stockfishEngine.analyzePosition(game.fen, 10).catch(() => null);
      hintText = getScenarioTemplate(personality, hintScenario, {
        bestMove: analysis?.bestMove,
      });
    }

    setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: `💡 ${hintText}`, expanded: true }]);
    coachSay(hintText);
  }, [gameState.currentHintLevel, game.fen, game.lastMove, game.history, playerRating, personality, coachSay]);

  // Takeback
  const handleTakeback = useCallback(() => {
    const takebackPolicy: Record<CoachPersonality, 'allow' | 'reluctant' | 'refuse'> = {
      danya: 'allow',
      kasparov: 'reluctant',
      fischer: 'refuse',
    };

    const policy = takebackPolicy[personality];

    if (policy === 'refuse') {
      const msg = getScenarioTemplate(personality, 'takeback_refused');
      setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: msg, expanded: true }]);
      coachSay(msg);
      return;
    }

    if (policy === 'reluctant' && gameState.takebacksUsed >= 1) {
      const msg = getScenarioTemplate(personality, 'takeback_refused');
      setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: msg, expanded: true }]);
      coachSay(msg);
      return;
    }

    // Undo both player and coach moves
    game.undoMove(); // Undo coach's response
    game.undoMove(); // Undo player's move
    moveCountRef.current = Math.max(0, moveCountRef.current - 2);

    setGameState((prev) => ({
      ...prev,
      moves: prev.moves.slice(0, -2),
      takebacksUsed: prev.takebacksUsed + 1,
    }));

    const scenario = policy === 'reluctant' ? 'takeback_reluctant' : 'takeback_allowed';
    const msg = getScenarioTemplate(personality, scenario);
    setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: msg, expanded: true }]);
    coachSay(msg);
  }, [personality, gameState.takebacksUsed, game, coachSay]);

  // Chat overlay message
  const handleChatSend = useCallback(async (text: string) => {
    setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: `You: ${text}`, expanded: true }]);

    const context = {
      fen: game.fen,
      lastMoveSan: null,
      moveNumber: moveCountRef.current,
      pgn: game.history.join(' '),
      openingName: null,
      stockfishAnalysis: null,
      playerMove: null,
      moveClassification: null,
      playerProfile: {
        rating: playerRating,
        style: personality,
        weaknesses: [],
      },
    };

    const response = await getCoachCommentary('game_commentary', context, personality);
    setCommentaries((prev) => [...prev, { moveNumber: moveCountRef.current, text: response, expanded: true }]);
    coachSay(response);
    setShowChat(false);
  }, [game.fen, game.history, playerRating, personality, coachSay]);

  // Post-game review
  if (gameState.status === 'postgame') {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 p-4 border-b border-theme-border">
          <button onClick={() => void navigate('/coach')} className="p-1.5 rounded-lg hover:bg-theme-surface">
            <ArrowLeft size={20} className="text-theme-text" />
          </button>
          <h2 className="text-lg font-bold text-theme-text">Game Review</h2>
        </div>
        <CoachGameReview
          keyMoments={gameState.keyMoments}
          personality={personality}
          recommendation={recommendation}
          onPlayAgain={() => {
            game.resetGame();
            moveCountRef.current = 0;
            setGameState({
              gameId: `game-${Date.now()}`,
              playerColor,
              coachPersonality: personality,
              targetStrength,
              moves: [],
              hintsUsed: 0,
              currentHintLevel: 0,
              takebacksUsed: 0,
              status: 'pregame',
              result: 'ongoing',
              keyMoments: [],
            });
            setCommentaries([]);
          }}
          onBackToCoach={() => void navigate('/coach')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full" data-testid="coach-game-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <button onClick={() => void navigate('/coach')} className="p-1.5 rounded-lg hover:bg-theme-surface">
            <ArrowLeft size={20} className="text-theme-text" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-theme-text">
              vs Coach {PERSONALITY_NAMES[personality]}
            </h2>
            <p className="text-xs text-theme-text-muted">
              ~{targetStrength} ELO
            </p>
          </div>
        </div>
        <CoachOverlay />
      </div>

      {/* Difficulty selector */}
      <div className="flex justify-center py-2 border-b border-theme-border">
        <DifficultyToggle
          value={difficulty}
          onChange={setDifficulty}
          disabled={gameState.status === 'playing' && gameState.moves.length > 0}
        />
      </div>

      {/* Board */}
      <div className="p-4">
        <ChessBoard
          initialFen={game.fen}
          orientation={playerColor}
          interactive={gameState.status === 'playing' && !isCoachThinking.current}
          onMove={(moveResult) => void handlePlayerMove(moveResult)}
          showEvalBar={false}
        />
      </div>

      {/* Controls */}
      {gameState.status === 'playing' && (
        <div className="flex items-center justify-between px-4 pb-2">
          <HintButton
            currentLevel={gameState.currentHintLevel}
            onRequestHint={() => void handleHint()}
            disabled={isCoachThinking.current}
          />

          <div className="flex gap-2">
            <button
              onClick={handleTakeback}
              disabled={gameState.moves.length < 2}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-theme-border text-sm text-theme-text-muted hover:text-theme-text disabled:opacity-30"
              data-testid="takeback-btn"
            >
              <Undo2 size={14} />
              Takeback
            </button>

            <button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-theme-border text-sm text-theme-text-muted hover:text-theme-text"
              data-testid="game-chat-btn"
            >
              <MessageCircle size={14} />
              Chat
            </button>
          </div>
        </div>
      )}

      {/* Chat overlay */}
      {showChat && (
        <div className="px-4 pb-2">
          <ChatInput
            onSend={(text) => void handleChatSend(text)}
            placeholder="Ask about the position..."
          />
        </div>
      )}

      {/* Commentary feed */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 max-h-[200px]">
        {commentaries.slice().reverse().map((c, i) => (
          <div key={i} className="border-b border-theme-border/50 py-2">
            <button
              onClick={() => {
                setCommentaries((prev) => prev.map((item, idx) =>
                  idx === commentaries.length - 1 - i ? { ...item, expanded: !item.expanded } : item
                ));
              }}
              className="flex items-center gap-1 w-full text-left"
            >
              <span className="text-xs text-theme-text-muted">#{c.moveNumber}</span>
              {c.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {c.expanded && (
              <p className="text-sm text-theme-text mt-1">{c.text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
