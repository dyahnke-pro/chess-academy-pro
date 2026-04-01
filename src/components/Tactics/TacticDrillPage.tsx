import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Play, SkipForward } from 'lucide-react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { buildTacticDrillQueue } from '../../services/tacticDrillService';
import { gradeMistakePuzzle } from '../../services/mistakePuzzleService';
import { updatePuzzleRating } from '../../services/puzzleService';
import { tacticTypeLabel, tacticTypeIcon } from '../../services/tacticalProfileService';
import { voiceService } from '../../services/voiceService';
import {
  drillIntro,
  drillTransition,
  drillCorrect,
  drillIncorrect,
} from '../../services/tacticNarrationService';
import { useAppStore } from '../../stores/appStore';
import { MistakePuzzleBoard } from '../Puzzles/MistakePuzzleBoard';
import { db } from '../../db/schema';
import type { TacticDrillItem } from '../../services/tacticDrillService';
import type { TacticType } from '../../types';

type Phase = 'loading' | 'context' | 'solving' | 'summary';

// ─── Full Game Context ────────────────────────────────────────────────────
// Layer 2 replays the entire game from move 1 up to the tactic position.
// This preserves the opening narrative and builds real context.
// Narration is selective (notable moves only) to keep pace brisk.

interface ContextMove {
  san: string;
  fen: string;
  moveNumber: number;
  isWhite: boolean;
}

function buildContextMoves(gamePgn: string | undefined, mistakeFen: string): ContextMove[] {
  if (!gamePgn) return [];

  try {
    const chess = new Chess();
    chess.loadPgn(gamePgn);
    const history = chess.history();
    chess.reset();

    const positions: ContextMove[] = [];
    for (let i = 0; i < history.length; i++) {
      chess.move(history[i]);
      positions.push({
        san: history[i],
        fen: chess.fen(),
        moveNumber: Math.floor(i / 2) + 1,
        isWhite: i % 2 === 0,
      });
      if (chess.fen() === mistakeFen) break;
    }

    return positions;
  } catch {
    return [];
  }
}

export function TacticDrillPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const filterTypes = (location.state as { filterTypes?: TacticType[] } | null)?.filterTypes;

  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<TacticDrillItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [failed, setFailed] = useState(0);
  const [contextMoves, setContextMoves] = useState<ContextMove[]>([]);
  const [contextStep, setContextStep] = useState(0);
  const [contextPlaying, setContextPlaying] = useState(false);
  const [subtitle, setSubtitle] = useState('');

  // Warmup voice on mount, stop on unmount
  useEffect(() => {
    void voiceService.warmup();
    return () => { voiceService.stop(); };
  }, []);

  useEffect(() => {
    void loadQueue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQueue(): Promise<void> {
    setPhase('loading');
    const items = await buildTacticDrillQueue(20, filterTypes);
    if (items.length === 0) {
      setPhase('summary');
      return;
    }
    setQueue(items);
    setCurrentIndex(0);
    setSolved(0);
    setFailed(0);
    await prepareContext(items[0]);
  }

  async function prepareContext(item: TacticDrillItem | undefined): Promise<void> {
    if (!item) {
      setPhase('solving');
      return;
    }

    // Load the source game to get buildup moves
    const game = item.originalMistake.sourceGameId
      ? await db.games.get(item.originalMistake.sourceGameId)
      : null;

    const moves = buildContextMoves(game?.pgn, item.originalMistake.fen);

    if (moves.length > 0) {
      setContextMoves(moves);
      setContextStep(0);
      setContextPlaying(false);
      setPhase('context');
    } else {
      setPhase('solving');
    }
  }

  // Async context playback — waits for each narration to finish before advancing
  const contextCancelledRef = useRef(false);
  const isCancelled = useCallback((): boolean => contextCancelledRef.current, []);

  const playContextSequence = useCallback(async (moves: ContextMove[], item: TacticDrillItem): Promise<void> => {
    contextCancelledRef.current = false;

    // Adaptive three-zone pacing based on cognitive science:
    // Speeds scale with player rating (chunking ability improves with skill).
    // De Groot: masters chunk in ~500ms, intermediates ~800-1200ms, beginners ~1500-2000ms
    // Chase & Simon: chunk size grows with rating → faster board model updates
    //
    // Rating bands:        <1000    1200     1500     1800+
    // Opening zone:        1000ms   800ms    600ms    500ms
    // Standard play:       1500ms   1200ms   900ms    700ms
    // Critical zone:       2500ms   2000ms   1600ms   1200ms
    //
    // +200ms on captures (board texture change needs extra processing)
    const rating = activeProfile?.currentRating ?? 1200;

    // Linear interpolation: clamp rating to [800, 2000] then scale
    const t = Math.min(1, Math.max(0, (rating - 800) / 1200)); // 0 at 800, 1 at 2000
    const OPENING_SPEED = Math.round(1100 - t * 600);   // 1100→500
    const STANDARD_SPEED = Math.round(1600 - t * 900);  // 1600→700
    const CRITICAL_SPEED = Math.round(2700 - t * 1500); // 2700→1200
    const CAPTURE_BONUS = 200;
    const OPENING_ZONE = 12;
    const CRITICAL_ZONE = 5;

    for (let i = 0; i < moves.length; i++) {
      if (isCancelled()) return;
      setContextStep(i + 1);

      const remaining = moves.length - 1 - i;
      const isCapture = moves[i].san.includes('x');
      let delay: number;

      if (remaining < CRITICAL_ZONE) {
        delay = CRITICAL_SPEED;
      } else if (i < OPENING_ZONE) {
        delay = OPENING_SPEED;
      } else {
        delay = STANDARD_SPEED;
      }

      if (isCapture) delay += CAPTURE_BONUS;

      await new Promise<void>((r) => { setTimeout(r, delay); });
      if (isCancelled()) return;
    }

    // Brief pause to let the position sink in, then speak the transition
    if (isCancelled()) return;
    await new Promise<void>((r) => { setTimeout(r, 800); });
    if (isCancelled()) return;
    const transition = drillTransition(item.tacticType);
    setSubtitle(transition);
    await voiceService.speak(transition);

    if (!isCancelled()) {
      setPhase('solving');
    }
  }, [isCancelled, activeProfile?.currentRating]);

  const handleStartContext = useCallback((): void => {
    setContextPlaying(true);
    const item = queue.at(currentIndex);
    if (!item) return;

    // Narrate intro, then play context sequence
    const intro = drillIntro(
      item.tacticType,
      item.originalMistake.opponentName,
      item.originalMistake.openingName,
    );
    setSubtitle(intro);

    void (async (): Promise<void> => {
      await voiceService.speak(intro);
      if (!isCancelled()) {
        await playContextSequence(contextMoves, item);
      }
    })();
  }, [queue, currentIndex, contextMoves, playContextSequence, isCancelled]);

  const handleSkipContext = useCallback((): void => {
    contextCancelledRef.current = true;
    voiceService.stop();
    setSubtitle('');
    setPhase('solving');
  }, []);

  const handleComplete = useCallback(async (correct: boolean): Promise<void> => {
    const item = queue.at(currentIndex);
    if (!item) return;

    // Narrate result
    if (correct) {
      setSolved((s) => s + 1);
      const msg = drillCorrect(item.tacticType);
      setSubtitle(msg);
      void voiceService.speak(msg);
    } else {
      setFailed((f) => f + 1);
      const msg = drillIncorrect(item.tacticType);
      setSubtitle(msg);
      void voiceService.speak(msg);
    }

    // Grade
    const grade = correct ? 'good' : 'again';
    await gradeMistakePuzzle(item.originalMistake.id, grade, correct);

    // Update puzzle rating
    if (activeProfile) {
      const newRating = updatePuzzleRating(activeProfile.puzzleRating, item.puzzle.rating, correct);
      setActiveProfile({ ...activeProfile, puzzleRating: newRating });
    }

    // Next puzzle or summary
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setPhase('summary');
    } else {
      setCurrentIndex(nextIndex);
      await prepareContext(queue[nextIndex]);
    }
  }, [queue, currentIndex, activeProfile, setActiveProfile]);

  const currentItem = queue.at(currentIndex);
  const total = solved + failed;

  // Current context FEN for the board preview
  const contextFen = contextStep > 0 && contextStep <= contextMoves.length
    ? contextMoves[contextStep - 1].fen
    : contextMoves.length > 0
      ? new Chess().fen() // starting position if not started
      : '';

  return (
    <div className="max-w-2xl mx-auto w-full p-4 pb-20 md:pb-6 flex flex-col gap-4 min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => void navigate('/tactics')} className="p-2 rounded-lg hover:opacity-80" data-testid="back-btn">
          <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
        </button>
        <Swords size={24} style={{ color: 'var(--color-warning)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Tactic Drills</h1>
        {filterTypes && filterTypes.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', color: 'var(--color-warning)' }}>
            {filterTypes.map((t) => tacticTypeLabel(t)).join(', ')}
          </span>
        )}
      </div>

      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center justify-center flex-1" data-testid="loading">
          <p style={{ color: 'var(--color-text-muted)' }}>Building your tactic drill queue...</p>
        </div>
      )}

      {/* Context Phase — show the buildup */}
      {phase === 'context' && currentItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-4"
        >
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div className="h-full rounded-full transition-all" style={{ background: 'var(--color-accent)', width: `${Math.round((currentIndex / queue.length) * 100)}%` }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{currentIndex + 1}/{queue.length}</span>
          </div>

          {/* Tactic badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm">{tacticTypeIcon(currentItem.tacticType)}</span>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', color: 'var(--color-warning)' }}>
              {tacticTypeLabel(currentItem.tacticType)}
            </span>
            {currentItem.originalMistake.openingName && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{currentItem.originalMistake.openingName}</span>
            )}
          </div>

          {/* Context header */}
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {contextPlaying ? 'Watch the buildup...' : 'The moves leading to your missed tactic'}
            </p>
            {currentItem.originalMistake.opponentName && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                vs {currentItem.originalMistake.opponentName}
                {currentItem.originalMistake.gameDate && ` \u2022 ${currentItem.originalMistake.gameDate}`}
              </p>
            )}
          </div>

          {/* Board showing context */}
          <div className="aspect-square max-w-md mx-auto w-full">
            <Chessboard
              options={{
                position: contextFen,
                boardOrientation: currentItem.originalMistake.playerColor === 'black' ? 'black' : 'white',
                allowDragging: false,
                animationDurationInMs: 300,
                darkSquareStyle: { backgroundColor: '#779952' },
                lightSquareStyle: { backgroundColor: '#edeed1' },
              }}
            />
          </div>

          {/* Voice subtitle */}
          {subtitle && (
            <motion.div
              key={subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs py-1.5 px-3 rounded-lg"
              style={{ color: 'var(--color-warning)', background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)' }}
              data-testid="narration-subtitle"
            >
              {subtitle}
            </motion.div>
          )}

          {/* Context move list */}
          {contextPlaying && contextStep > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {contextMoves.slice(0, contextStep).map((m, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
                >
                  {m.isWhite ? `${m.moveNumber}.` : ''}{m.san}
                </span>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!contextPlaying ? (
              <>
                <button
                  onClick={handleStartContext}
                  className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="play-context"
                >
                  <Play size={16} />
                  Watch Buildup
                </button>
                <button
                  onClick={handleSkipContext}
                  className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  data-testid="skip-context"
                >
                  <SkipForward size={16} />
                  Skip to Puzzle
                </button>
              </>
            ) : (
              <button
                onClick={handleSkipContext}
                className="px-4 py-2 rounded-lg text-xs border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                Skip
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Solving Phase */}
      {phase === 'solving' && currentItem && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.puzzle.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div className="h-full rounded-full transition-all" style={{ background: 'var(--color-accent)', width: `${Math.round((currentIndex / queue.length) * 100)}%` }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{currentIndex + 1}/{queue.length}</span>
            </div>

            {/* Tactic badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm">{tacticTypeIcon(currentItem.tacticType)}</span>
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', color: 'var(--color-warning)' }}>
                {tacticTypeLabel(currentItem.tacticType)}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Find the {tacticTypeLabel(currentItem.tacticType).toLowerCase()}
              </span>
            </div>

            {/* Board */}
            <MistakePuzzleBoard
              puzzle={currentItem.originalMistake}
              onComplete={(correct) => void handleComplete(correct)}
              skipReplayContext
            />

            {/* Session stats */}
            <div className="flex justify-center gap-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: 'var(--color-success)' }}>{solved} solved</span>
              <span style={{ color: 'var(--color-error)' }}>{failed} missed</span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Summary */}
      {phase === 'summary' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center flex-1 gap-6"
          data-testid="session-summary"
        >
          <Swords size={40} style={{ color: 'var(--color-warning)' }} />
          <div className="text-center">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Drill Complete</h2>
            {total > 0 ? (
              <p className="text-lg mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {solved}/{total} tactics found ({Math.round((solved / total) * 100)}%)
              </p>
            ) : (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                No tactic drills available yet. Import and analyze games to generate tactical positions.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void loadQueue()}
              className="px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="play-again"
            >
              Drill Again
            </button>
            <button
              onClick={() => void navigate('/tactics')}
              className="px-6 py-3 rounded-xl font-semibold text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Back to Tactics
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
