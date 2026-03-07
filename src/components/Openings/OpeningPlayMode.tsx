import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, Volume2, VolumeX, Swords, RotateCcw, Lightbulb } from 'lucide-react';
import { useChessGame } from '../../hooks/useChessGame';
import { ChessBoard } from '../Board/ChessBoard';
import { ExplanationCard } from './ExplanationCard';
import { useAppStore } from '../../stores/appStore';
import { useSettings } from '../../hooks/useSettings';
import { getAdaptiveMove, getRandomLegalMove, getTargetStrength } from '../../services/coachGameEngine';
import { speechService } from '../../services/speechService';
import { usePieceSound } from '../../hooks/usePieceSound';
import type { OpeningRecord, OpeningPlayResult } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';
import type { MoveQuality } from '../Board/ChessBoard';

interface OpeningPlayModeProps {
  opening: OpeningRecord;
  onExit: () => void;
}

type PlayPhase = 'pregame' | 'opening' | 'middlegame' | 'postgame';

export function OpeningPlayMode({ opening, onExit }: OpeningPlayModeProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const { settings } = useSettings();
  const playerRating = activeProfile?.currentRating ?? 1420;
  const targetStrength = getTargetStrength(playerRating, 'medium');
  const playerColor = opening.color;

  const game = useChessGame(undefined, playerColor);

  const [playPhase, setPlayPhase] = useState<PlayPhase>('pregame');
  const [voiceOn, setVoiceOn] = useState(true);
  const [deviationCard, setDeviationCard] = useState<string | null>(null);
  const [result, setResult] = useState<OpeningPlayResult | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const [computerLastMove, setComputerLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hintSquares, setHintSquares] = useState<{ from: string; to: string } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [moveFlash, setMoveFlash] = useState<MoveQuality>(null);
  const isComputerThinking = useRef(false);
  const moveCountRef = useRef(0);
  const { playCelebration } = usePieceSound();

  // Parse expected opening moves
  const openingMoves = useMemo((): Array<{ san: string; from: string; to: string }> => {
    const tokens = opening.pgn.trim().split(/\s+/).filter(Boolean);
    const chess = new Chess();
    const moves: Array<{ san: string; from: string; to: string }> = [];
    for (const san of tokens) {
      try {
        const move = chess.move(san);
        moves.push({ san, from: move.from, to: move.to });
      } catch {
        break;
      }
    }
    return moves;
  }, [opening.pgn]);

  const openingPhaseLength = openingMoves.length;

  // Track deviations
  const [firstDeviation, setFirstDeviation] = useState<number | null>(null);
  const [correctMovesPlayed, setCorrectMovesPlayed] = useState(0);
  const deviatedRef = useRef(false);

  // Speak helper
  const say = useCallback((text: string): void => {
    if (voiceOn) {
      speechService.speak(text);
    }
  }, [voiceOn]);

  // ─── Hint handler ─────────────────────────────────────────────────────────
  const handleHint = useCallback(async (): Promise<void> => {
    if (hintLoading) return;

    const currentMoveIdx = moveCountRef.current;
    const inOpeningPhase = currentMoveIdx < openingPhaseLength && !deviatedRef.current;

    if (inOpeningPhase && currentMoveIdx < openingMoves.length) {
      // During opening: show expected move
      const expected = openingMoves[currentMoveIdx];
      setHintSquares({ from: expected.from, to: expected.to });
      setTimeout(() => setHintSquares(null), 2000);
    } else {
      // During middlegame: ask Stockfish
      setHintLoading(true);
      try {
        const { move } = await getAdaptiveMove(game.fen, playerRating + 200);
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        setHintSquares({ from, to });
        setTimeout(() => setHintSquares(null), 2000);
      } catch {
        // Silently fail
      } finally {
        setHintLoading(false);
      }
    }
  }, [hintLoading, openingPhaseLength, openingMoves, game.fen, playerRating]);

  // ─── Pregame intro ───────────────────────────────────────────────────────
  useEffect(() => {
    if (playPhase !== 'pregame') return;
    say(`Let's play the ${opening.name}. Remember your key ideas and play confidently.`);
    const timer = setTimeout(() => {
      setPlayPhase('opening');
    }, 2500);
    return () => clearTimeout(timer);
  }, [playPhase, opening.name, say]);

  // ─── Check for game over ─────────────────────────────────────────────────
  useEffect(() => {
    if (!game.isGameOver || playPhase === 'postgame' || playPhase === 'pregame') return;

    const openingPlayerMoves = Math.ceil(openingPhaseLength / 2);
    const correctMoves = Math.min(correctMovesPlayed, openingPlayerMoves);

    const playResult: OpeningPlayResult = {
      openingId: opening.id,
      openingMovesTotal: openingPlayerMoves,
      openingMovesCorrect: correctMoves,
      firstDeviationMove: firstDeviation,
      correctMoveAtDeviation: firstDeviation !== null && firstDeviation < openingMoves.length
        ? openingMoves[firstDeviation].san
        : null,
      finalEval: null,
      recommendation: correctMoves >= openingPlayerMoves
        ? 'You played the opening perfectly! Focus on the middlegame now.'
        : firstDeviation !== null
          ? `You deviated at move ${Math.ceil((firstDeviation + 1) / 2)}. Review the line from that point.`
          : 'Good game! Keep drilling the opening to make it automatic.',
    };

    setResult(playResult);
    setPlayPhase('postgame');

    const won = game.isCheckmate && (
      (playerColor === 'white' && game.turn === 'b') ||
      (playerColor === 'black' && game.turn === 'w')
    );
    if (won) {
      playCelebration();
      say(`Great win! You played ${correctMoves} out of ${openingPlayerMoves} opening moves correctly.`);
    } else {
      say(`Game over. You got ${correctMoves} out of ${openingPlayerMoves} opening moves right.`);
    }
  }, [game.isGameOver, game.isCheckmate, game.turn, playPhase, playerColor, correctMovesPlayed, firstDeviation, openingMoves, openingPhaseLength, opening.id, playCelebration, say]);

  // ─── Computer moves ─────────────────────────────────────────────────────
  useEffect(() => {
    const isComputerTurn =
      (playPhase === 'opening' || playPhase === 'middlegame') &&
      !game.isGameOver &&
      ((playerColor === 'white' && game.turn === 'b') ||
       (playerColor === 'black' && game.turn === 'w'));

    if (!isComputerTurn || isComputerThinking.current) return;
    isComputerThinking.current = true;

    const abortController = new AbortController();
    const isCancelled = (): boolean => abortController.signal.aborted;

    const tryMakeMove = (moveUci: string): MoveResult | null => {
      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      return game.makeMove(from, to, promotion);
    };

    const makeComputerMove = async (): Promise<void> => {
      if (isCancelled()) return;

      const currentMoveIdx = moveCountRef.current;
      const inOpeningPhase = currentMoveIdx < openingPhaseLength && !deviatedRef.current;

      if (inOpeningPhase && currentMoveIdx < openingMoves.length) {
        // Play the repertoire move
        const expected = openingMoves[currentMoveIdx];
        const moveResult = game.makeMove(expected.from, expected.to);
        if (moveResult) {
          setComputerLastMove({ from: expected.from, to: expected.to });
          moveCountRef.current += 1;
          setBoardKey((k) => k + 1);
          // Check if opening phase just ended
          if (moveCountRef.current >= openingPhaseLength) {
            setPlayPhase('middlegame');
          }
        }
      } else {
        // Stockfish opponent
        try {
          const { move } = await getAdaptiveMove(game.fen, targetStrength);
          if (isCancelled()) return;

          let result = tryMakeMove(move);
          if (!result) {
            const randomMove = getRandomLegalMove(game.fen);
            if (randomMove) result = tryMakeMove(randomMove);
          }
          if (result) {
            setComputerLastMove({ from: result.from, to: result.to });
            moveCountRef.current += 1;
            setBoardKey((k) => k + 1);
          }
        } catch {
          if (isCancelled()) return;
          const randomMove = getRandomLegalMove(game.fen);
          if (randomMove) {
            const result = tryMakeMove(randomMove);
            if (result) {
              setComputerLastMove({ from: result.from, to: result.to });
              moveCountRef.current += 1;
              setBoardKey((k) => k + 1);
            }
          }
        }
      }

      isComputerThinking.current = false;
    };

    const timer = setTimeout(() => void makeComputerMove(), 600);
    return () => {
      abortController.abort();
      clearTimeout(timer);
    };
  }, [game.turn, game.fen, game.isGameOver, playPhase, playerColor, targetStrength, openingMoves, openingPhaseLength, game]);

  // ─── Handle player move ──────────────────────────────────────────────────
  const handlePlayerMove = useCallback((moveResult: MoveResult): void => {
    const currentMoveIdx = moveCountRef.current;
    moveCountRef.current += 1;
    setComputerLastMove(null);
    setHintSquares(null);

    // Sync move to parent game state so turn flips and computer move effect triggers
    game.makeMove(moveResult.from, moveResult.to, moveResult.promotion);

    const inOpeningPhase = currentMoveIdx < openingPhaseLength && !deviatedRef.current;

    if (inOpeningPhase && currentMoveIdx < openingMoves.length) {
      const expected = openingMoves[currentMoveIdx];
      if (moveResult.from === expected.from && moveResult.to === expected.to) {
        // Correct opening move
        setCorrectMovesPlayed((prev) => prev + 1);
        if (settings.moveQualityFlash) {
          setMoveFlash('good');
          setTimeout(() => setMoveFlash(null), 600);
        }
      } else {
        // Deviation!
        if (settings.moveQualityFlash) {
          setMoveFlash('inaccuracy');
          setTimeout(() => setMoveFlash(null), 600);
        }
        if (firstDeviation === null) {
          setFirstDeviation(currentMoveIdx);
          deviatedRef.current = true;
          setDeviationCard('You stepped out of your preparation — this is uncharted territory.');
          setTimeout(() => setDeviationCard(null), 4000);
        }
        setPlayPhase('middlegame');
      }

      // Check if opening phase just completed
      if (moveCountRef.current >= openingPhaseLength) {
        setPlayPhase('middlegame');
      }
    }
  }, [openingMoves, openingPhaseLength, firstDeviation, game, settings.moveQualityFlash]);

  // ─── Postgame report ─────────────────────────────────────────────────────
  if (playPhase === 'postgame' && result) {
    return (
      <div className="flex flex-col flex-1 p-4 md:p-6 items-center justify-center" data-testid="play-postgame">
        <div className="w-full max-w-sm space-y-6">
          <h2 className="text-xl font-bold text-theme-text text-center">Opening Report</h2>

          <div className="bg-theme-surface rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-text-muted">Opening moves correct</span>
              <span className="text-sm font-bold text-theme-text" data-testid="report-correct">
                {result.openingMovesCorrect} / {result.openingMovesTotal}
              </span>
            </div>

            {result.firstDeviationMove !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-theme-text-muted">First deviation</span>
                <span className="text-sm font-bold text-amber-500" data-testid="report-deviation">
                  Move {Math.ceil((result.firstDeviationMove + 1) / 2)}
                </span>
              </div>
            )}

            {result.correctMoveAtDeviation && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-theme-text-muted">Correct move was</span>
                <span className="text-sm font-bold text-theme-accent" data-testid="report-correct-move">
                  {result.correctMoveAtDeviation}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-theme-border">
              <p className="text-sm text-theme-text leading-relaxed" data-testid="report-recommendation">
                {result.recommendation}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                game.resetGame();
                moveCountRef.current = 0;
                setCorrectMovesPlayed(0);
                setFirstDeviation(null);
                deviatedRef.current = false;
                setResult(null);
                setDeviationCard(null);
                setComputerLastMove(null);
                setHintSquares(null);
                setMoveFlash(null);
                setPlayPhase('pregame');
                setBoardKey((k) => k + 1);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
              data-testid="play-again"
            >
              <RotateCcw size={16} />
              Play Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
              data-testid="play-exit"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Game screen ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="opening-play-mode">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-1.5 rounded-lg hover:bg-theme-surface">
            <ArrowLeft size={18} className="text-theme-text" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Swords size={14} className="text-theme-accent" />
              <p className="text-sm font-semibold text-theme-text">{opening.name}</p>
            </div>
            <p className="text-xs text-theme-text-muted">
              {playPhase === 'pregame' && 'Starting...'}
              {playPhase === 'opening' && `Opening phase: move ${Math.ceil(moveCountRef.current / 2)} / ${Math.ceil(openingPhaseLength / 2)}`}
              {playPhase === 'middlegame' && `~${targetStrength} ELO opponent`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {settings.showHints && (playPhase === 'opening' || playPhase === 'middlegame') && !game.isGameOver && (
            <button
              onClick={() => void handleHint()}
              disabled={hintLoading}
              className="p-2 rounded-lg hover:bg-theme-surface text-theme-text-muted disabled:opacity-40"
              aria-label="Get hint"
              data-testid="hint-button"
            >
              <Lightbulb size={18} className={hintLoading ? 'animate-pulse' : ''} />
            </button>
          )}
          <button
            onClick={() => setVoiceOn(!voiceOn)}
            className="p-2 rounded-lg hover:bg-theme-surface text-theme-text-muted"
            aria-label={voiceOn ? 'Mute voice' : 'Enable voice'}
            data-testid="voice-toggle"
          >
            {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Opening phase indicator */}
      {playPhase === 'opening' && (
        <div className="px-4 pt-2">
          <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-theme-accent transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (moveCountRef.current / openingPhaseLength) * 100)}%` }}
              data-testid="opening-progress"
            />
          </div>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2">
        <div className="w-full max-w-[360px]">
          <ChessBoard
            key={boardKey}
            initialFen={game.fen}
            orientation={playerColor}
            interactive={
              (playPhase === 'opening' || playPhase === 'middlegame') &&
              !game.isGameOver &&
              !isComputerThinking.current
            }
            onMove={handlePlayerMove}
            showEvalBar={false}
            showFlipButton={false}
            highlightSquares={hintSquares ?? computerLastMove}
            showLastMoveHighlight={settings.highlightLastMove}
            moveQualityFlash={moveFlash}
          />
        </div>
      </div>

      {/* Deviation card */}
      <div className="px-4 pb-4">
        <ExplanationCard
          text={deviationCard ?? ''}
          visible={deviationCard !== null}
          onDismiss={() => setDeviationCard(null)}
          variant="warning"
        />
      </div>
    </div>
  );
}
