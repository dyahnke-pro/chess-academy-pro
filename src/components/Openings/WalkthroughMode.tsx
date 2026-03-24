import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import { ChessBoard } from '../Board/ChessBoard';
import { BoardControls } from '../Board/BoardControls';
import { AnnotationCard } from './AnnotationCard';
import { speechService } from '../../services/speechService';
import { kokoroService } from '../../services/kokoroService';
import { unlockAudioContext } from '../../services/audioContextManager';
import { stockfishEngine } from '../../services/stockfishEngine';
import { db } from '../../db/schema';
import { loadAnnotations, loadSubLineAnnotations } from '../../services/annotationService';
import { useBoardContext } from '../../hooks/useBoardContext';
import type { OpeningRecord, OpeningVariation, OpeningMoveAnnotation } from '../../types';
import { ArrowRight, Play, Pause } from 'lucide-react';

export interface WalkthroughModeProps {
  opening: OpeningRecord;
  variationIndex?: number;
  customLine?: OpeningVariation;
  subLineKey?: string; // e.g. 'variation-0', 'trap-1', 'warning-0'
  onExit: () => void;
}

interface MoveInfo {
  san: string;
  from: string;
  to: string;
}

type AutoPlaySpeed = 'slow' | 'normal' | 'fast';

// Words-per-minute reading speed for each auto-play speed
const READING_WPM: Record<AutoPlaySpeed, number> = {
  slow: 120,
  normal: 180,
  fast: 300,
};

// Minimum delay per move even if annotation is short/missing
const MIN_DELAY_MS: Record<AutoPlaySpeed, number> = {
  slow: 3000,
  normal: 1500,
  fast: 800,
};

function getAnnotationDelay(text: string | undefined, speed: AutoPlaySpeed): number {
  if (!text) return MIN_DELAY_MS[speed];
  const wordCount = text.split(/\s+/).length;
  const readingMs = (wordCount / READING_WPM[speed]) * 60 * 1000;
  // Add small buffer for the move animation
  return Math.max(MIN_DELAY_MS[speed], readingMs + 500);
}

export function WalkthroughMode({
  opening,
  variationIndex,
  customLine,
  subLineKey,
  onExit,
}: WalkthroughModeProps): JSX.Element {
  const isVariation = variationIndex !== undefined && variationIndex >= 0;
  const variation = customLine ?? (isVariation ? opening.variations?.[variationIndex] : undefined);
  const activePgn = variation ? variation.pgn : opening.pgn;

  // Parse PGN into move list
  const expectedMoves = useMemo((): MoveInfo[] => {
    const tokens = activePgn.trim().split(/\s+/).filter(Boolean);
    const chess = new Chess();
    const moves: MoveInfo[] = [];
    for (const san of tokens) {
      try {
        const move = chess.move(san);
        moves.push({ san, from: move.from, to: move.to });
      } catch {
        break;
      }
    }
    return moves;
  }, [activePgn]);

  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [annotations, setAnnotations] = useState<OpeningMoveAnnotation[] | null>(null);

  // Ref for TTS boundary callback — updated per annotation
  const boundaryHandlerRef = useRef<((charIndex: number) => void) | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState<AutoPlaySpeed>('normal');

  // Stockfish eval state
  const [latestEval, setLatestEval] = useState<number | null>(null);
  const [latestIsMate, setLatestIsMate] = useState(false);
  const [latestMateIn, setLatestMateIn] = useState<number | null>(null);

  // Track last move highlight
  const lastMove = useMemo((): { from: string; to: string } | null => {
    if (currentMoveIndex === 0) return null;
    const prev = expectedMoves[currentMoveIndex - 1] as { from: string; to: string } | undefined;
    return prev ? { from: prev.from, to: prev.to } : null;
  }, [currentMoveIndex, expectedMoves]);

  // Compute FEN at a given move index
  const fenAtIndex = useCallback(
    (idx: number): string => {
      const chess = new Chess();
      for (let i = 0; i < idx && i < expectedMoves.length; i++) {
        try {
          chess.move(expectedMoves[i].san);
        } catch {
          break;
        }
      }
      return chess.fen();
    },
    [expectedMoves],
  );

  const currentFen = useMemo(() => fenAtIndex(currentMoveIndex), [fenAtIndex, currentMoveIndex]);

  // Publish board context for global coach drawer
  const turn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
  useBoardContext(currentFen, activePgn, Math.floor(currentMoveIndex / 2) + 1, opening.color, turn);

  // Load annotations — sub-line-specific if key provided, otherwise main line
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const effectiveKey = subLineKey ?? (isVariation ? `variation-${variationIndex}` : undefined);
      const data = effectiveKey
        ? await loadSubLineAnnotations(opening.id, effectiveKey)
        : await loadAnnotations(opening.id);
      if (!cancelled) {
        setAnnotations(data);
      }
    })();
    return () => { cancelled = true; };
  }, [opening.id, subLineKey, isVariation, variationIndex]);

  // Analyze position when it changes
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const analysis = await stockfishEngine.analyzePosition(currentFen, 12);
        if (!cancelled) {
          setLatestEval(analysis.evaluation);
          setLatestIsMate(analysis.isMate);
          setLatestMateIn(analysis.mateIn);
        }
      } catch {
        // Stockfish not ready yet
      }
    })();
    return () => { cancelled = true; };
  }, [currentFen]);

  // Current annotation for the move that was just played
  const currentAnnotation = useMemo((): OpeningMoveAnnotation | null => {
    if (!annotations) return null;
    if (currentMoveIndex === 0) return null;
    const idx = currentMoveIndex - 1;
    return annotations[idx] ?? null;
  }, [annotations, currentMoveIndex]);

  // ─── Real-time arrow/highlight reveal via TTS boundary events ────────────

  const [visibleArrowCount, setVisibleArrowCount] = useState(0);
  const [visibleHighlightCount, setVisibleHighlightCount] = useState(0);
  const fallbackTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boundaryActive = useRef(false);

  // Compute the character position in the annotation where each arrow/highlight
  // should appear. Items are spaced evenly across the text length.
  const computeCharTriggers = useCallback((
    annotationText: string,
    arrowCount: number,
    highlightCount: number,
  ): { arrowCharPos: number[]; highlightCharPos: number[] } => {
    const totalLen = annotationText.length;
    const totalItems = arrowCount + highlightCount;
    if (totalItems === 0) return { arrowCharPos: [], highlightCharPos: [] };

    const arrowCharPos: number[] = [];
    for (let i = 0; i < arrowCount; i++) {
      // First item triggers at position 0 (immediate), rest spaced evenly
      arrowCharPos.push(Math.floor((i / totalItems) * totalLen));
    }
    const highlightCharPos: number[] = [];
    for (let i = 0; i < highlightCount; i++) {
      highlightCharPos.push(Math.floor(((arrowCount + i) / totalItems) * totalLen));
    }
    return { arrowCharPos, highlightCharPos };
  }, []);

  // When annotation changes, set up boundary-driven reveals with timer fallback
  useEffect(() => {
    // Clear previous fallback timers
    for (const t of fallbackTimers.current) clearTimeout(t);
    fallbackTimers.current = [];
    boundaryActive.current = false;
    setVisibleArrowCount(0);
    setVisibleHighlightCount(0);

    if (!currentAnnotation) return;

    const arrows = currentAnnotation.arrows ?? [];
    const highlights = currentAnnotation.highlights ?? [];
    if (arrows.length === 0 && highlights.length === 0) return;

    const text = currentAnnotation.annotation;
    const { arrowCharPos, highlightCharPos } = computeCharTriggers(
      text, arrows.length, highlights.length,
    );

    // Track which items have been revealed (to avoid duplicates)
    const revealedArrows = new Set<number>();
    const revealedHighlights = new Set<number>();

    // TTS boundary handler — called as each word is spoken
    const onBoundary = (charIndex: number): void => {
      boundaryActive.current = true;

      // Reveal any arrows whose trigger position has been passed
      for (let i = 0; i < arrowCharPos.length; i++) {
        if (!revealedArrows.has(i) && charIndex >= arrowCharPos[i]) {
          revealedArrows.add(i);
          setVisibleArrowCount((prev) => Math.max(prev, i + 1));
        }
      }
      // Reveal any highlights whose trigger position has been passed
      for (let i = 0; i < highlightCharPos.length; i++) {
        if (!revealedHighlights.has(i) && charIndex >= highlightCharPos[i]) {
          revealedHighlights.add(i);
          setVisibleHighlightCount((prev) => Math.max(prev, i + 1));
        }
      }
    };

    // Store the boundary handler so the TTS effect can use it
    boundaryHandlerRef.current = onBoundary;

    // Fallback: if TTS boundary events don't fire (some browsers),
    // use timer-based stagger after a short delay
    const fallbackDelay = 800; // wait to see if boundary events start
    const fallbackTimer = setTimeout(() => {
      if (boundaryActive.current) return; // boundary events are working

      // Timer-based fallback: space evenly across reading time
      const wordCount = text.split(/\s+/).length;
      const wordsPerSec = READING_WPM[autoPlaySpeed] / 60;
      const readingTimeSec = wordCount / wordsPerSec;
      const totalItems = arrows.length + highlights.length;

      arrows.forEach((_, i) => {
        const delaySec = (i / totalItems) * readingTimeSec;
        if (delaySec <= 0) {
          setVisibleArrowCount((prev) => Math.max(prev, i + 1));
        } else {
          const timer = setTimeout(() => {
            setVisibleArrowCount((prev) => Math.max(prev, i + 1));
          }, delaySec * 1000);
          fallbackTimers.current.push(timer);
        }
      });

      highlights.forEach((_, i) => {
        const delaySec = ((arrows.length + i) / totalItems) * readingTimeSec;
        if (delaySec <= 0) {
          setVisibleHighlightCount((prev) => Math.max(prev, i + 1));
        } else {
          const timer = setTimeout(() => {
            setVisibleHighlightCount((prev) => Math.max(prev, i + 1));
          }, delaySec * 1000);
          fallbackTimers.current.push(timer);
        }
      });
    }, fallbackDelay);
    fallbackTimers.current.push(fallbackTimer);

    return () => {
      for (const t of fallbackTimers.current) clearTimeout(t);
      fallbackTimers.current = [];
      boundaryHandlerRef.current = null;
    };
  }, [currentAnnotation, computeCharTriggers, autoPlaySpeed]);

  // Convert visible arrows/highlights to board format
  const boardArrows = useMemo(() => {
    if (!currentAnnotation?.arrows || visibleArrowCount === 0) return undefined;
    return currentAnnotation.arrows.slice(0, visibleArrowCount).map((a) => ({
      startSquare: a.from,
      endSquare: a.to,
      color: a.color ?? 'rgba(0, 180, 80, 0.8)',
    }));
  }, [currentAnnotation, visibleArrowCount]);

  const boardHighlights = useMemo(() => {
    if (!currentAnnotation?.highlights || visibleHighlightCount === 0) return undefined;
    return currentAnnotation.highlights.slice(0, visibleHighlightCount).map((h) => ({
      square: h.square,
      color: h.color ?? 'rgba(255, 255, 0, 0.4)',
    }));
  }, [currentAnnotation, visibleHighlightCount]);

  // Current move number and color for display
  const displayMoveNumber = currentMoveIndex === 0
    ? 1
    : Math.floor((currentMoveIndex - 1) / 2) + 1;
  const displayIsWhite = currentMoveIndex === 0 || (currentMoveIndex - 1) % 2 === 0;

  // Auto-play timeout ref (dynamic per-move delay)
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule the next auto-play advance — TTS end event advances immediately,
  // with a timer fallback in case TTS doesn't fire (e.g. voice disabled)
  const scheduleNextMove = useCallback(() => {
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    ttsFinishedRef.current = null;

    setCurrentMoveIndex((prev) => {
      if (prev >= expectedMoves.length) {
        setIsAutoPlaying(false);
        return prev;
      }
      const nextIndex = prev + 1;

      const advanceToNext = (): void => {
        // Clear both triggers to prevent double-advance
        if (autoPlayRef.current) {
          clearTimeout(autoPlayRef.current);
          autoPlayRef.current = null;
        }
        ttsFinishedRef.current = null;

        if (nextIndex < expectedMoves.length) {
          // Small pause after TTS ends for the board move to register visually
          autoPlayRef.current = setTimeout(() => {
            scheduleNextMove();
          }, 600);
        } else {
          setIsAutoPlaying(false);
        }
      };

      // Register TTS end callback — advances as soon as narration finishes
      ttsFinishedRef.current = advanceToNext;

      // Fallback timer in case TTS doesn't fire onEnd (voice disabled, no annotation, etc.)
      const ann = annotations?.[prev] as OpeningMoveAnnotation | undefined;
      const spokenText = ann?.annotation;
      const delay = getAnnotationDelay(spokenText, autoPlaySpeed);
      // Add extra buffer so TTS end event has priority
      autoPlayRef.current = setTimeout(advanceToNext, delay + 1500);

      setBoardKey((k) => k + 1);
      return nextIndex;
    });
  }, [expectedMoves.length, annotations, autoPlaySpeed]);

  // Auto-play logic: kick off the chain when play starts
  useEffect(() => {
    if (isAutoPlaying) {
      // Small initial delay before first advance
      autoPlayRef.current = setTimeout(() => {
        scheduleNextMove();
      }, 500);
    }
    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [isAutoPlaying, scheduleNextMove]);

  // Stop auto-play when reaching the end
  useEffect(() => {
    if (currentMoveIndex >= expectedMoves.length) {
      setIsAutoPlaying(false);
    }
  }, [currentMoveIndex, expectedMoves.length]);

  // Map auto-play speed to TTS speech rate
  const TTS_RATE: Record<AutoPlaySpeed, number> = useMemo(() => ({
    slow: 0.75,
    normal: 0.95,
    fast: 1.4,
  }), []);

  // Track when TTS finishes speaking — used to advance auto-play immediately
  const ttsFinishedRef = useRef<(() => void) | null>(null);

  // TTS narration when move changes — tries Kokoro first, falls back to Web Speech
  useEffect(() => {
    if (currentMoveIndex === 0) return;
    if (!annotations) return;
    const ann = annotations[currentMoveIndex - 1] as OpeningMoveAnnotation | undefined;
    if (!ann) return;

    let cancelled = false;

    void (async () => {
      // Check voice preferences — bail out entirely if voice is disabled
      const profile = await db.profiles.get('main');
      const voiceEnabled = profile?.preferences.voiceEnabled ?? true;
      const kokoroEnabled = profile?.preferences.kokoroEnabled ?? false;
      const kokoroVoiceId = profile?.preferences.kokoroVoiceId ?? 'af_bella';

      if (cancelled) return;
      if (!voiceEnabled) return;

      if (kokoroEnabled) {
        // Wait for model if it is still loading in the background
        let kokoroReady = kokoroService.isReady();
        if (!kokoroReady) {
          kokoroReady = await kokoroService.waitUntilReady(15000);
        }

        if (cancelled) return;

        if (kokoroReady) {
          // Use Kokoro HD voice — no boundary events but great quality
          try {
            await kokoroService.speak(ann.annotation, kokoroVoiceId, TTS_RATE[autoPlaySpeed]);
            if (!cancelled) {
              // Reveal all arrows/highlights immediately after Kokoro finishes
              setVisibleArrowCount(ann.arrows?.length ?? 0);
              setVisibleHighlightCount(ann.highlights?.length ?? 0);
              ttsFinishedRef.current?.();
            }
            return;
          } catch {
            // Kokoro failed, fall through to Web Speech
          }
        }
      }

      // Web Speech API with boundary events for arrow syncing (fallback)
      if (!cancelled) {
        speechService.speak(ann.annotation, {
          rate: TTS_RATE[autoPlaySpeed],
          onBoundary: (charIndex) => boundaryHandlerRef.current?.(charIndex),
          onEnd: () => ttsFinishedRef.current?.(),
        });
      }
    })();

    return () => { cancelled = true; };
  }, [currentMoveIndex, annotations, autoPlaySpeed, TTS_RATE]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      speechService.stop();
      kokoroService.stop();
    };
  }, []);

  // Navigation handlers
  const goToMove = useCallback((idx: number) => {
    setIsAutoPlaying(false);
    speechService.stop();
    kokoroService.stop();
    setCurrentMoveIndex(idx);
    setBoardKey((k) => k + 1);
  }, []);

  const handleFirst = useCallback(() => goToMove(0), [goToMove]);
  const handlePrev = useCallback(() => {
    unlockAudioContext();
    speechService.stop();
    kokoroService.stop();
    setIsAutoPlaying(false);
    setCurrentMoveIndex((prev) => Math.max(0, prev - 1));
    setBoardKey((k) => k + 1);
  }, []);
  const handleNext = useCallback(() => {
    unlockAudioContext();
    setIsAutoPlaying(false);
    setCurrentMoveIndex((prev) => Math.min(expectedMoves.length, prev + 1));
    setBoardKey((k) => k + 1);
  }, [expectedMoves.length]);
  const handleLast = useCallback(() => goToMove(expectedMoves.length), [goToMove, expectedMoves.length]);

  const toggleAutoPlay = useCallback(() => {
    unlockAudioContext();
    setIsAutoPlaying((prev) => {
      if (!prev && currentMoveIndex >= expectedMoves.length) {
        // Reset to beginning if at end
        setCurrentMoveIndex(0);
        setBoardKey((k) => k + 1);
      }
      return !prev;
    });
  }, [currentMoveIndex, expectedMoves.length]);

  const cycleSpeed = useCallback(() => {
    setAutoPlaySpeed((prev) => {
      if (prev === 'slow') return 'normal';
      if (prev === 'normal') return 'fast';
      return 'slow';
    });
  }, []);

  const progress = expectedMoves.length > 0
    ? Math.round((currentMoveIndex / expectedMoves.length) * 100)
    : 0;

  const title = variation ? variation.name : opening.name;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" data-testid="walkthrough-mode">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg hover:bg-theme-surface"
            data-testid="walkthrough-back"
          >
            <ArrowRight size={16} className="text-theme-text rotate-180" />
          </button>
          <div>
            <p className="text-sm font-semibold text-theme-text">Walkthrough: {title}</p>
            <p className="text-xs text-theme-text-muted">{opening.eco} &middot; {opening.style}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-theme-text-muted uppercase font-medium">
            Move {currentMoveIndex} / {expectedMoves.length}
          </span>
        </div>
        <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-theme-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            data-testid="walkthrough-progress"
          />
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-start pt-2 px-2 py-2">
        <div className="w-full md:max-w-[420px]">
          <ChessBoard
            key={boardKey}
            initialFen={currentFen}
            orientation={opening.color}
            interactive={false}
            showFlipButton={true}
            showUndoButton={false}
            showResetButton={false}
            showEvalBar={true}
            evaluation={latestEval}
            isMate={latestIsMate}
            mateIn={latestMateIn}
            highlightSquares={lastMove}
            arrows={boardArrows}
            annotationHighlights={boardHighlights}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4">
        <BoardControls
          onFirst={handleFirst}
          onPrev={handlePrev}
          onNext={handleNext}
          onLast={handleLast}
          canGoPrev={currentMoveIndex > 0}
          canGoNext={currentMoveIndex < expectedMoves.length}
          extraLeft={
            <button
              onClick={toggleAutoPlay}
              className="p-2 rounded-lg border text-theme-text hover:bg-theme-surface transition-colors"
              style={{ borderColor: 'var(--color-border)' }}
              aria-label={isAutoPlaying ? 'Pause' : 'Play'}
              data-testid="walkthrough-play-pause"
            >
              {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          }
          extraRight={
            <button
              onClick={cycleSpeed}
              className="px-2 py-1.5 rounded-lg border text-xs font-medium text-theme-text-muted hover:bg-theme-surface transition-colors"
              style={{ borderColor: 'var(--color-border)' }}
              aria-label="Change speed"
              data-testid="walkthrough-speed"
            >
              {autoPlaySpeed === 'slow' ? '0.5x' : autoPlaySpeed === 'normal' ? '1x' : '2x'}
            </button>
          }
        />
      </div>

      {/* Annotation */}
      <div className="px-4 pb-safe-4 min-h-[100px]">
        {currentMoveIndex === 0 && opening.overview ? (
          <div
            className="rounded-2xl backdrop-blur-xl bg-theme-surface/90 border border-white/15 p-4 shadow-lg"
            data-testid="walkthrough-overview"
          >
            <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wide mb-2">
              Overview
            </p>
            <p className="text-sm text-theme-text leading-relaxed">{opening.overview}</p>
          </div>
        ) : (
          <AnnotationCard
            annotation={currentAnnotation}
            moveNumber={displayMoveNumber}
            isWhite={displayIsWhite}
            visible={currentMoveIndex > 0}
          />
        )}
      </div>
    </div>
  );
}
