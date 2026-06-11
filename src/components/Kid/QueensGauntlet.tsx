import { useState, useCallback, useMemo, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { SquareHandlerArgs } from 'react-chessboard';
import { KidChessboard } from '../Chessboard/KidChessboard';
import { voiceService } from '../../services/voiceService';
import {
  initGauntletState,
  heroCaptureTargets,
  applyGauntletCapture,
  enemyGuardedSquares,
  gauntletPosition,
  type GauntletState,
} from '../../services/gauntletEngine';
import { QUEEN_GAUNTLET_LEVELS } from '../../data/gauntletLevels';

interface QueensGauntletProps {
  onBack: () => void;
  /** Optional — fires (level, won) on each finished level. */
  onComplete?: (level: number, won: boolean) => void;
  /** Honors the hub's voice toggle. Defaults to on. */
  voiceOn?: boolean;
}

const LEVELS = QUEEN_GAUNTLET_LEVELS;

export function QueensGauntlet({ onBack, onComplete, voiceOn: voiceOnProp = true }: QueensGauntletProps): JSX.Element {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];
  const [state, setState] = useState<GauntletState>(() => initGauntletState(level));
  const [voiceOn, setVoiceOn] = useState(voiceOnProp);

  const kidSpeak = useCallback((text: string): void => {
    if (!voiceOn) return;
    void voiceService.speak(text);
  }, [voiceOn]);

  // Per-level spoken intro — what to do (the game used to be silent).
  useEffect(() => {
    kidSpeak(
      `Queen's Gauntlet, level ${level.id}. Capture every enemy, but never land on a square another enemy still guards. Take the safe one first!`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex]);

  useEffect(() => () => { voiceService.stop(); }, []);

  const position = useMemo(() => gauntletPosition(state), [state]);
  const captureTargets = useMemo(() => heroCaptureTargets(state), [state]);
  const guarded = useMemo(
    () => (level.showGuarded ? enemyGuardedSquares(state.enemies, state.hero.square) : new Set<string>()),
    [state, level.showGuarded],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    // Red = squares a remaining enemy still guards (danger — training levels).
    for (const sq of guarded) {
      styles[sq] = { background: 'rgba(239, 68, 68, 0.32)' };
    }
    // Green ring = an enemy you can safely or riskily capture this turn.
    for (const sq of captureTargets) {
      styles[sq] = {
        ...styles[sq],
        background: 'radial-gradient(circle, rgba(34, 197, 94, 0.55) 30%, rgba(34,197,94,0.15) 32%)',
      };
    }
    return styles;
  }, [guarded, captureTargets]);

  const handleSquareClick = useCallback(({ square }: SquareHandlerArgs): void => {
    if (state.status !== 'playing') return;
    if (!captureTargets.includes(square)) return;
    const next = applyGauntletCapture(state, square);
    setState(next);
    if (next.status === 'won') {
      kidSpeak('The whole army is cleared! The queen carved a path right through them.');
      onComplete?.(level.id, true);
    } else if (next.status === 'lost') {
      kidSpeak('The queen was captured! That piece was still guarded. Try taking a safe one first.');
      onComplete?.(level.id, false);
    }
  }, [state, captureTargets, kidSpeak, onComplete, level.id]);

  const handleRetry = useCallback((): void => {
    setState(initGauntletState(level));
    kidSpeak('New plan! Find the piece nobody is guarding.');
  }, [level, kidSpeak]);

  const handleNextLevel = useCallback((): void => {
    const next = levelIndex + 1;
    if (next < LEVELS.length) {
      setLevelIndex(next);
      setState(initGauntletState(LEVELS[next]));
    } else {
      onBack();
    }
  }, [levelIndex, onBack]);

  const handleVoiceToggle = useCallback((): void => {
    if (voiceOn) voiceService.stop();
    setVoiceOn((v) => !v);
  }, [voiceOn]);

  const remaining = state.enemies.length;

  return (
    <div
      className="flex flex-col items-center gap-4 p-4"
      style={{ color: 'var(--color-text)' }}
      data-testid="queens-gauntlet"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="gauntlet-back"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold">Queen&apos;s Gauntlet — Level {level.id}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetry}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            data-testid="gauntlet-reset"
            aria-label="Reset level"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleVoiceToggle}
            className="p-2 rounded-lg border transition-colors"
            style={{
              background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
            }}
            aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
            data-testid="gauntlet-voice"
          >
            {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm px-4 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
        {state.status === 'playing' && (
          <>
            Tap an enemy to capture it — but don&apos;t land where another enemy is still guarding!
            <span className="block text-xs mt-1">
              Enemies left: {remaining} · Moves: {state.moveCount}
            </span>
          </>
        )}
      </div>

      {/* Board */}
      <div className="w-full md:max-w-[420px]">
        <KidChessboard
          fen={position}
          boardOrientation="white"
          interactive={state.status === 'playing'}
          onSquareClick={handleSquareClick}
          squareStyles={squareStyles}
        />
      </div>

      {/* Win / Loss overlay */}
      <AnimatePresence>
        {state.status !== 'playing' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center gap-3 text-center"
            data-testid="gauntlet-result"
          >
            <span className="text-4xl">{state.status === 'won' ? '🎉' : '😢'}</span>
            <p className="text-xl font-bold">
              {state.status === 'won' ? 'Army cleared!' : 'The queen was captured!'}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {state.status === 'won'
                ? `Cleared in ${state.moveCount} moves.`
                : 'That piece was still guarded — take a safe one first.'}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleRetry}
                className="px-6 py-2 rounded-xl font-bold"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                data-testid="gauntlet-retry"
              >
                {state.status === 'won' ? 'Replay' : 'Try Again'}
              </button>
              {state.status === 'won' && (
                <button
                  onClick={handleNextLevel}
                  className="px-6 py-2 rounded-xl font-bold"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="gauntlet-next"
                >
                  {levelIndex + 1 < LEVELS.length ? 'Next Level' : 'Done'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
