import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SquareHandlerArgs } from 'react-chessboard';
import { KidChessboard } from '../Chessboard/KidChessboard';
import { StarDisplay } from './StarDisplay';
import { voiceService } from '../../services/voiceService';
import {
  initArmyState,
  armyHeroMoves,
  applyArmyMove,
  armyPosition,
  type ArmyLevel,
  type ArmyState,
} from '../../services/pieceArmyEngine';
import { KNIGHT_ARMY_LEVELS, BISHOP_ARMY_LEVELS } from '../../data/armyLevels';

interface Props {
  levels: ArmyLevel[];
  /** "Two Knights" / "Two Bishops". */
  pairName: string;
  /** Hub route to return to. */
  hubRoute: string;
  rootTestId: string;
}

export function PairArmyGame({ levels, pairName, hubRoute, rootTestId }: Props): JSX.Element {
  const navigate = useNavigate();
  const [levelIndex, setLevelIndex] = useState(0);
  const level = levels[levelIndex];
  const [state, setState] = useState<ArmyState>(() => initArmyState(level));
  const [selected, setSelected] = useState<number | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);

  const kidSpeak = useCallback((text: string): void => {
    if (voiceOn) void voiceService.speak(text);
  }, [voiceOn]);

  // Intro per level.
  useEffect(() => {
    kidSpeak(`${pairName} versus the pawn army! Tap one of your pieces, then tap where to go. Capture every pawn before one reaches the top.`);
  }, [levelIndex, pairName, kidSpeak]);

  useEffect(() => () => { voiceService.stop(); }, []);

  const heroSquares = useMemo(
    () => new Map(state.heroes.map((h, i) => [h.square, i])),
    [state.heroes],
  );
  const selectedMoves = useMemo(
    () => (selected !== null && state.status === 'playing' ? armyHeroMoves(state, selected) : []),
    [selected, state],
  );
  const position = useMemo(() => armyPosition(state), [state]);

  const squareStyles = useMemo(() => {
    const s: Record<string, React.CSSProperties> = {};
    // Pawns about to promote (rank 7) glow brighter — the danger.
    for (const p of state.pawns) {
      const rank = parseInt(p[1], 10);
      s[p] = { background: rank >= 7 ? 'rgba(239, 68, 68, 0.55)' : 'rgba(239, 68, 68, 0.22)' };
    }
    if (selected !== null) {
      s[state.heroes[selected].square] = { background: 'rgba(250, 204, 21, 0.45)' };
      for (const m of selectedMoves) {
        s[m] = state.pawns.includes(m)
          ? { background: 'rgba(34, 197, 94, 0.5)' }
          : { background: 'radial-gradient(circle, rgba(59,130,246,0.5) 25%, transparent 27%)' };
      }
    }
    return s;
  }, [state, selected, selectedMoves]);

  const handleSquareClick = useCallback(({ square }: SquareHandlerArgs): void => {
    if (state.status !== 'playing') return;
    const heroAt = heroSquares.get(square);
    if (heroAt !== undefined) { setSelected(heroAt); return; }
    if (selected === null) return;
    if (!armyHeroMoves(state, selected).includes(square)) return;
    const next = applyArmyMove(state, selected, square);
    setState(next);
    setSelected(null);
    if (next.status === 'won') {
      kidSpeak('You caught them all!');
    } else if (next.status === 'lost') {
      kidSpeak('A pawn slipped through. Try again — keep them surrounded.');
    }
  }, [state, selected, heroSquares, kidSpeak]);

  const reset = useCallback((): void => {
    setState(initArmyState(level));
    setSelected(null);
  }, [level]);

  const handleNext = useCallback((): void => {
    if (levelIndex + 1 < levels.length) {
      setLevelIndex((i) => i + 1);
      setState(initArmyState(levels[levelIndex + 1]));
      setSelected(null);
    } else {
      void navigate(hubRoute);
    }
  }, [levelIndex, levels, hubRoute, navigate]);

  const toggleVoice = useCallback((): void => {
    voiceService.stop();
    setVoiceOn((v) => !v);
  }, []);

  const pawnsLeft = state.pawns.length;

  return (
    <div
      className="flex flex-col items-center gap-4 p-4"
      style={{ color: 'var(--color-text)' }}
      data-testid={rootTestId}
    >
      <div className="flex items-center justify-between w-full max-w-md">
        <button
          onClick={() => void navigate(hubRoute)}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="army-back"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-center">{pairName} vs. Army · {level.name}</h2>
        <div className="flex gap-1">
          <button onClick={reset} className="p-2 rounded-lg hover:opacity-80" style={{ background: 'var(--color-surface)' }} data-testid="army-reset" aria-label="Reset level">
            <RotateCcw size={18} />
          </button>
          <button
            onClick={toggleVoice}
            className="p-2 rounded-lg border"
            style={{
              background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
            }}
            aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
          >
            {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      <p className="text-sm text-center max-w-md" style={{ color: 'var(--color-text-muted)' }}>
        {state.status === 'playing'
          ? <>Tap a piece, then tap where to go. Pawns left: <span data-testid="army-pawns-left">{pawnsLeft}</span></>
          : null}
      </p>

      <div className="w-full md:max-w-[420px] mx-auto">
        <KidChessboard
          fen={position}
          boardOrientation="white"
          squareStyles={squareStyles}
          onSquareClick={state.status === 'playing' ? handleSquareClick : undefined}
          interactive={false}
        />
      </div>

      <AnimatePresence>
        {state.status !== 'playing' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center gap-3 text-center"
            data-testid="army-result"
          >
            <span className="text-4xl">{state.status === 'won' ? '🎉' : '😢'}</span>
            <p className="text-xl font-bold">
              {state.status === 'won' ? 'Army defeated!' : 'A pawn got through!'}
            </p>
            {state.status === 'won' && <StarDisplay earned={3} total={3} size="md" />}
            <div className="flex gap-3 mt-1">
              <button
                onClick={reset}
                className="px-6 py-2 rounded-xl font-bold"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                data-testid="army-retry"
              >
                Retry
              </button>
              {state.status === 'won' && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-xl font-bold"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="army-next"
                >
                  {levelIndex + 1 < levels.length ? 'Next Level' : 'Done'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function KnightArmyRoute(): JSX.Element {
  return (
    <PairArmyGame
      levels={KNIGHT_ARMY_LEVELS}
      pairName="Two Knights"
      hubRoute="/kid/knight-games"
      rootTestId="knight-army-game"
    />
  );
}

export function BishopArmyRoute(): JSX.Element {
  return (
    <PairArmyGame
      levels={BISHOP_ARMY_LEVELS}
      pairName="Two Bishops"
      hubRoute="/kid/bishop-games"
      rootTestId="bishop-army-game"
    />
  );
}
