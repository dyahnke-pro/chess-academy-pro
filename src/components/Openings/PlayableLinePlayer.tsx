import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  SkipForward,
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Lightbulb,
} from 'lucide-react';
import { LessonScaffold } from './LessonScaffold';
import { voiceService } from '../../services/voiceService';
import { sanToSpeech } from '../../utils/sanToSpeech';
import { resolveCoachNarration } from '../../utils/coachNarration';
import { useAppStore } from '../../stores/appStore';
import { useDiscussionPractice } from '../../hooks/useDiscussionPractice';
import { classifyPhase } from '../../services/gamePhaseService';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useBoardGlow } from '../../hooks/useBoardGlow';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { BOARD_DEMO_ANIMATION_MS } from '../../hooks/useBoardTheme';
import type { PlayableMiddlegameLine, AnnotationArrow, AnnotationHighlight } from '../../types';
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard';

interface PlayableLinePlayerProps {
  line: PlayableMiddlegameLine;
  boardOrientation: 'white' | 'black';
  onComplete: () => void;
  onExit: () => void;
  /** How the line is taught:
   *  - 'watch'    — auto-play the line with voice (demo), then replay from
   *                 memory. The default.
   *  - 'learn'    — voice GUIDES you move-by-move: it speaks each move's
   *                 idea and shows the move + lead-the-eye arrows/highlights,
   *                 then you play it on the board.
   *  - 'practice' — same board, SILENT: you replay the line from memory with
   *                 no voice and no hint. (David 2026-05-21.) */
  mode?: PlayMode;
  /** When provided, the Learn/Practice completion screen shows a
   *  "Continue Playing" button that hands off to Play mode locked to
   *  this same line (David 2026-05-26). */
  onContinuePlaying?: () => void;
}

export type PlayMode = 'watch' | 'learn' | 'practice';

type Phase = 'demo' | 'memory';

function arrowsToBoard(
  arrows: AnnotationArrow[] | undefined,
): Array<{ startSquare: string; endSquare: string; color: string }> {
  if (!arrows || arrows.length === 0) return [];
  return arrows.map((a) => ({
    startSquare: a.from,
    endSquare: a.to,
    color: a.color ?? 'rgba(0, 128, 0, 0.8)',
  }));
}

export function PlayableLinePlayer({
  line,
  boardOrientation,
  onComplete,
  onExit,
  mode = 'watch',
  onContinuePlaying,
}: PlayableLinePlayerProps): JSX.Element {
  const { playMoveSound, playCelebration, playEncouragement } = usePieceSound();

  // 'learn' and 'practice' are board-play modes — they skip the auto-demo
  // and go straight to playing the line. 'learn' adds voice + move hints.
  const guided = mode === 'learn';
  // The student plays only THEIR side; the opponent's moves auto-play.
  const studentChar = boardOrientation === 'white' ? 'w' : 'b';

  // Phase state. Watch starts by demonstrating; the play modes start on the
  // board.
  const [phase, setPhase] = useState<Phase>(mode === 'watch' ? 'demo' : 'memory');

  // Demonstration phase state
  const [demoMoveIndex, setDemoMoveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memory phase state
  const [memoryMoveIndex, setMemoryMoveIndex] = useState(0);
  // Practice-mode hint: reveal the current move's arrow on demand (silent —
  // no voice). Resets when the move advances so each move is a fresh recall.
  const [showHint, setShowHint] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [shakeBoard, setShakeBoard] = useState(false);
  const [memoryComplete, setMemoryComplete] = useState(false);

  // onComplete MUST fire exactly once when the line finishes — whether the
  // student plays the final move OR the opponent's reply is the last (auto-
  // played) move. The student-move path used to be the only one that called
  // it, so a line ending on the opponent's move (e.g. a White line closing on
  // Black's ...a6) reached the "Line Mastered!" screen but never persisted the
  // rung → Practice/Play never unlocked. Routed through a ref so the parent's
  // inline onComplete doesn't churn the opponent auto-play effect.
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const finishLine = useCallback((): void => {
    if (completedRef.current) return;
    completedRef.current = true;
    setMemoryComplete(true);
    // The celebration sound + completion UI IS the feedback. No spoken
    // acknowledgment ("Excellent!" etc. are banned) and Practice stays silent.
    playCelebration();
    onCompleteRef.current();
  }, [playCelebration]);

  // Chess instance for memory phase move validation + position tracking
  const chessRef = useRef<Chess>(new Chess(line.fen));
  const [memoryFen, setMemoryFen] = useState(line.fen);

  // Silent Discussion-Practice faucet — Practice mode feeds the shared
  // misconception bucket when the student plays a genuine eval-worsening
  // slip off the line (David 2026-05-21: "Practice should get wired in").
  // Silent by contract (no panel, no voice). The eval-delta gate means a
  // good-but-off-line move doesn't capture — only real errors do. Fires at
  // most once per move index so retries don't double-count.
  const discussion = useDiscussionPractice(mode === 'practice', { silent: true, surface: 'opening-practice' });
  const faucetFiredRef = useRef<Set<number>>(new Set());

  // Selected square + legal moves for click-to-move in memory phase
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  // Compute demonstration FEN at a given move index
  const demoFenAtIndex = useCallback(
    (idx: number): string => {
      const chess = new Chess(line.fen);
      for (let i = 0; i <= idx && i < line.moves.length; i++) {
        try {
          chess.move(line.moves[i]);
        } catch {
          break;
        }
      }
      return chess.fen();
    },
    [line.fen, line.moves],
  );

  const demoFen = useMemo((): string => {
    if (demoMoveIndex < 0) return line.fen;
    return demoFenAtIndex(demoMoveIndex);
  }, [demoMoveIndex, demoFenAtIndex, line.fen]);

  const currentDemoArrows = useMemo((): Array<{ startSquare: string; endSquare: string; color: string }> => {
    // Intro beat: the plan's idea arrows (breaks + future-open lines) on the
    // static critical position, before any move.
    if (demoMoveIndex < 0) return arrowsToBoard(line.intro?.arrows);
    if (demoMoveIndex >= line.arrows.length) return [];
    return arrowsToBoard(line.arrows[demoMoveIndex]);
  }, [demoMoveIndex, line.arrows, line.intro]);

  // Lead-the-eye highlights — light up exactly the squares the current
  // annotation names so the student looks where the words point instead
  // of hunting for the piece. Authored per-move alongside the arrows.
  const currentDemoHighlights = useMemo((): Record<string, React.CSSProperties> => {
    // Intro beat → the plan's key squares (targets + outpost/maneuver
    // destinations); else the current move's lead-the-eye highlights.
    const source: AnnotationHighlight[] | undefined =
      demoMoveIndex < 0
        ? line.intro?.highlights
        : line.highlights && demoMoveIndex < line.highlights.length
          ? line.highlights[demoMoveIndex]
          : undefined;
    if (!source) return {};
    const styles: Record<string, React.CSSProperties> = {};
    for (const h of source) {
      const color = h.color ?? 'rgba(255, 235, 59, 0.5)';
      styles[h.square] = {
        background: color,
        boxShadow: `inset 0 0 0 2px ${color}`,
      };
    }
    return styles;
  }, [demoMoveIndex, line.highlights, line.intro]);

  const currentAnnotation = useMemo((): string => {
    if (phase === 'demo') {
      if (demoMoveIndex < 0) return line.intro?.say ?? '';
      if (demoMoveIndex >= line.annotations.length) return '';
      return line.annotations[demoMoveIndex];
    }
    return '';
  }, [phase, demoMoveIndex, line.annotations]);

  // Pre-warm voice + prefetch ONLY what this mode will actually speak, so the
  // wire matches the WLPP contract (David 2026-05-23): Watch narrates the
  // authored annotations; Learn dictates the MOVES (sanToSpeech); Practice is
  // SILENT — prefetch nothing, or it pings /api/tts for audio it never plays.
  useEffect(() => {
    void voiceService.warmup();
    if (mode === 'watch') {
      const prose = [line.intro?.say, ...line.annotations].filter((s): s is string => Boolean(s));
      if (prose.length > 0) void voiceService.prefetchAudio(prose);
    } else if (mode === 'learn') {
      void voiceService.prefetchAudio(line.moves.map((m) => sanToSpeech(m)));
    }
    // mode === 'practice' → silent: no prefetch.
  }, [mode, line.annotations, line.moves, line.intro]);

  // ─── Demonstration Phase: VOICE-GATED auto-play ──────────────────────────
  // Speak the move's annotation, then advance only when the voice promise
  // RESOLVES — never on a fixed timer that races the narration (CLAUDE.md:
  // voice-promise resolution is the single source of truth for advance; no
  // fallback timers racing voiceService.speak()). This is the same beat-
  // narration principle the masterclass lessons use, so the narration is
  // actually heard and the board never races ahead of it. The same effect
  // narrates a manually-stepped move (speaks, but does not auto-advance).
  useEffect(() => {
    if (phase !== 'demo') return;
    let cancelled = false;
    const clearTimer = (): void => {
      if (autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
    const advance = (): void => {
      if (cancelled || !isPlaying) return;
      const next = demoMoveIndex + 1;
      if (next >= line.moves.length) setIsPlaying(false);
      else setDemoMoveIndex(next);
    };

    // Intro beat before the first move — narrate the plan's IDEA on the static
    // board (arrows/highlights lead the eye to the breaks, future-open lines,
    // and the squares pieces want to reach), then advance when the voice
    // RESOLVES (no fixed-timer race). Silent fallback when no intro authored.
    if (demoMoveIndex < 0) {
      const introSay = line.intro?.say;
      if (!introSay) {
        if (isPlaying) autoPlayTimerRef.current = setTimeout(advance, 800);
        return () => { cancelled = true; clearTimer(); };
      }
      void voiceService.speak(introSay).catch(() => { /* keep playing */ }).finally(() => {
        if (cancelled || !isPlaying) return;
        autoPlayTimerRef.current = setTimeout(advance, 600);
      });
      return () => { cancelled = true; clearTimer(); };
    }
    if (demoMoveIndex >= line.moves.length) return;

    const annotation = demoMoveIndex < line.annotations.length
      ? (line.annotations[demoMoveIndex] ?? '')
      : '';
    const spoken = annotation
      ? voiceService.speak(annotation).catch(() => { /* keep playing */ })
      : Promise.resolve();
    void spoken.finally(() => {
      if (cancelled || !isPlaying) return;
      // A short beat after the narration finishes, then the next move.
      autoPlayTimerRef.current = setTimeout(advance, annotation ? 450 : 900);
    });

    return () => { cancelled = true; clearTimer(); };
  }, [phase, isPlaying, demoMoveIndex, line.moves.length, line.annotations, line.intro]);

  // Play piece sound during demo
  useEffect(() => {
    if (phase !== 'demo') return;
    if (demoMoveIndex < 0 || demoMoveIndex >= line.moves.length) return;
    playMoveSound(line.moves[demoMoveIndex]);
  }, [phase, demoMoveIndex, line.moves, playMoveSound]);

  // ─── Learn mode: voice GUIDES the next move ──────────────────────────────
  // Before the student plays each move, the voice speaks that move's idea
  // (the same annotation the Watch demo narrates) — "what move to play, and
  // why." The board shows the move's lead-the-eye arrows + highlights so the
  // ear and the eye agree. Practice mode stays silent (no effect fires).
  useEffect(() => {
    if (phase !== 'memory' || memoryComplete) return;
    if (memoryMoveIndex >= line.moves.length) return;
    if (showWrongFlash || showCorrectFlash) return;
    // Learn = the hand-written truncated CUE for this move when present
    // (reinforces the Watch lesson as you play it — David 2026-05-24); else
    // Practice is silent (no effect fires).
    if (guided) {
      voiceService.stop();
      // Learn narration follows the user's narration setting (David 2026-05-24):
      // FULL → the beat's full explanation; LIMITED (brief) → the short cue;
      // neither present → dictate the move. Silent is gated inside voiceService.
      const verbosity = resolveCoachNarration(useAppStore.getState().activeProfile?.preferences);
      const cue = line.learnCues?.[memoryMoveIndex]?.trim();
      const full = line.annotations?.[memoryMoveIndex]?.trim();
      const spoken = verbosity === 'full' && full
        ? full
        : cue
          ? cue
          : sanToSpeech(line.moves[memoryMoveIndex]);
      void voiceService.speak(spoken).catch(() => { /* keep going */ });
    }
    // Your move → wait for input. Opponent's move → auto-play it fast, so you
    // only play your own side and the line rips along.
    if (chessRef.current.turn() === studentChar) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      try {
        const mv = chessRef.current.move(line.moves[memoryMoveIndex]);
        setMemoryFen(chessRef.current.fen());
        playMoveSound(mv.san);
        const next = memoryMoveIndex + 1;
        setMemoryMoveIndex(next);
        if (next >= line.moves.length) finishLine();
      } catch { /* line desync — stop auto-advancing */ }
    }, guided ? 650 : 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [guided, phase, memoryMoveIndex, memoryComplete, line.moves, showWrongFlash, showCorrectFlash, studentChar, finishLine]);

  const togglePlayPause = useCallback((): void => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Manual move stepping in the demo (Watch) phase — forward & back buttons so
  // the student can walk the line at their own pace, not just auto-play (David
  // 2026-05-29). Stepping pauses auto-play; the voice-gated effect re-narrates
  // the move it lands on (it speaks on every index change, only the auto-
  // advance is gated on isPlaying — so a manual step narrates without racing).
  const stepDemo = useCallback((delta: number): void => {
    setIsPlaying(false);
    if (autoPlayTimerRef.current !== null) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setDemoMoveIndex((i) => Math.max(-1, Math.min(line.moves.length - 1, i + delta)));
  }, [line.moves.length]);

  const skipToMemory = useCallback((): void => {
    voiceService.stop();
    if (autoPlayTimerRef.current !== null) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setIsPlaying(false);
    setPhase('memory');
    // Reset board to starting position
    chessRef.current = new Chess(line.fen);
    setMemoryFen(line.fen);
    setMemoryMoveIndex(0);
    setSelectedSquare(null);
    setLegalMoves([]);
    completedRef.current = false;
  }, [line.fen]);

  // ─── Memory Phase: Move handling ─────────────────────────────────────────

  // Parse expected moves into from/to/san
  const expectedMoves = useMemo((): Array<{ from: string; to: string; san: string }> => {
    const chess = new Chess(line.fen);
    const result: Array<{ from: string; to: string; san: string }> = [];
    for (const san of line.moves) {
      try {
        const move = chess.move(san);
        result.push({ from: move.from, to: move.to, san: move.san });
      } catch {
        break;
      }
    }
    return result;
  }, [line.fen, line.moves]);

  const clearSelection = useCallback((): void => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const handleMemoryMoveResult = useCallback(
    (from: string, to: string): void => {
      if (phase !== 'memory') return;
      if (memoryMoveIndex >= expectedMoves.length) return;
      if (showWrongFlash || showCorrectFlash) return;

      const expected = expectedMoves[memoryMoveIndex];

      if (from === expected.from && to === expected.to) {
        // Correct move - apply it to chess instance
        try {
          const moveResult = chessRef.current.move({ from: from as Square, to: to as Square, promotion: 'q' });
          setMemoryFen(chessRef.current.fen());
          playMoveSound(moveResult.san);
        } catch {
          // Fallback: try with expected SAN
          try {
            chessRef.current.move(expected.san);
            setMemoryFen(chessRef.current.fen());
            playMoveSound(expected.san);
          } catch {
            return;
          }
        }

        setShowCorrectFlash(true);
        clearSelection();

        const nextIndex = memoryMoveIndex + 1;

        setTimeout(() => {
          setShowCorrectFlash(false);

          if (nextIndex >= expectedMoves.length) {
            // All moves completed
            setMemoryMoveIndex(nextIndex);
            finishLine();
            return;
          }

          setMemoryMoveIndex(nextIndex);
        }, 400);
      } else {
        // Wrong move - do not apply to chess, show error
        // Silent faucet: if the off-line move is a genuine eval-worsening
        // slip (not just a different good move), feed the bucket. Once per
        // move index so retries don't double-count. Best-effort — never
        // blocks the drill.
        if (mode === 'practice' && !faucetFiredRef.current.has(memoryMoveIndex)) {
          faucetFiredRef.current.add(memoryMoveIndex);
          const fenBefore = chessRef.current.fen();
          const sideToMove = chessRef.current.turn();
          try {
            const temp = new Chess(fenBefore);
            const attempted = temp.move({ from: from as Square, to: to as Square, promotion: 'q' });
            void discussion.evaluatePlayerMove({
              fenBefore,
              fenAfter: temp.fen(),
              playedSan: attempted.san,
              playerColor: sideToMove === 'w' ? 'white' : 'black',
              inBook: false,
              learned: true,
              gamePhase: classifyPhase(temp.fen(), chessRef.current.history().length + 1),
              openingName: line.title,
            });
          } catch { /* illegal attempt — nothing to capture */ }
        }
        setShowWrongFlash(true);
        setShakeBoard(true);
        playEncouragement();
        clearSelection();

        setTimeout(() => {
          setShowWrongFlash(false);
          setShakeBoard(false);
        }, 1200);
      }
    },
    [phase, memoryMoveIndex, expectedMoves, showWrongFlash, showCorrectFlash, playMoveSound, playEncouragement, clearSelection, finishLine, mode, discussion, line.title],
  );

  // Audit-only deterministic move hook — gated behind the `auditMoveHook`
  // localStorage flag, so it is a NO-OP for every real user (no behaviour
  // change, nothing exposed unless the flag is set). The full-play audit
  // (scripts/audit-fullplay-prod.mjs) sets the flag and calls window.__playMove
  // to submit a memory-phase move deterministically, instead of fighting
  // react-chessboard's headless pointer events. Covers Learn/Practice for the
  // main line AND the gems (they reuse this player).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { if (localStorage.getItem('auditMoveHook') !== '1') return; } catch { return; }
    const w = window as Window & { __playMove?: (from: string, to: string) => void };
    w.__playMove = (from: string, to: string): void => { handleMemoryMoveResult(from, to); };
    return () => { delete (window as Window & { __playMove?: (from: string, to: string) => void }).__playMove; };
  }, [handleMemoryMoveResult]);

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (phase !== 'memory' || !targetSquare) {
        clearSelection();
        return false;
      }
      handleMemoryMoveResult(sourceSquare, targetSquare);
      return false; // We manage position ourselves
    },
    [phase, handleMemoryMoveResult, clearSelection],
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs): void => {
      if (phase !== 'memory') return;
      if (showWrongFlash || showCorrectFlash) return;

      // Clicking selected square deselects
      if (selectedSquare === square) {
        clearSelection();
        return;
      }

      // If a legal move destination is clicked, execute
      if (selectedSquare !== null && legalMoves.includes(square)) {
        handleMemoryMoveResult(selectedSquare, square);
        return;
      }

      // Select a new square
      const moves = chessRef.current.moves({ square: square as Square, verbose: true });
      const destinations = [...new Set(moves.map((m) => m.to))];
      if (destinations.length > 0) {
        setSelectedSquare(square);
        setLegalMoves(destinations);
      } else {
        clearSelection();
      }
    },
    [phase, selectedSquare, legalMoves, showWrongFlash, showCorrectFlash, handleMemoryMoveResult, clearSelection],
  );

  // Board square overlays for memory phase selection / legal-move hints.
  // The base glow is applied automatically by ConsistentChessboard — we only
  // contribute the selection and legal-move highlights here.
  const { mergeGlow } = useBoardGlow();
  const memorySquareStyles = useMemo((): Record<string, React.CSSProperties> => {
    if (phase !== 'memory') return {};
    const styles: Record<string, React.CSSProperties> = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        background: 'rgba(0, 229, 255, 0.35)',
        boxShadow: mergeGlow('inset 0 0 8px rgba(0, 229, 255, 0.4)'),
      };
    }

    for (const sq of legalMoves) {
      const piece = chessRef.current.get(sq as Square);
      styles[sq] = piece
        ? {
            background:
              'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0, 229, 255, 0.3) 60%, rgba(0, 229, 255, 0.3) 80%, rgba(0,0,0,0) 80%)',
            cursor: 'pointer',
          }
        : {
            background: 'radial-gradient(circle, rgba(0, 229, 255, 0.3) 25%, transparent 25%)',
            cursor: 'pointer',
          };
    }

    // Learn mode: paint the move's lead-the-eye highlights underneath so the
    // eye lands where the voice is pointing. Selection/legal-move hints win.
    if (guided && line.highlights) {
      const lead = line.highlights[memoryMoveIndex] ?? [];
      for (const h of lead) {
        if (styles[h.square]) continue;
        const color = h.color ?? 'rgba(255, 235, 59, 0.5)';
        styles[h.square] = { background: color, boxShadow: `inset 0 0 0 2px ${color}` };
      }
    }

    return styles;
  }, [phase, selectedSquare, legalMoves, mergeGlow, guided, line.highlights, memoryMoveIndex]);

  // Reset the practice hint each time the move advances — fresh recall.
  useEffect(() => { setShowHint(false); }, [memoryMoveIndex]);

  // Learn mode shows the move's arrows live (voice-guided). Practice shows
  // nothing until the student taps Hint, which reveals just the move arrow.
  const memoryHintArrows = useMemo((): Array<{ startSquare: string; endSquare: string; color: string }> => {
    if (phase !== 'memory' || memoryComplete) return [];
    if (guided && memoryMoveIndex < line.arrows.length) {
      return arrowsToBoard(line.arrows[memoryMoveIndex]);
    }
    if (showHint && memoryMoveIndex < expectedMoves.length) {
      const mv = expectedMoves[memoryMoveIndex];
      return [{ startSquare: mv.from, endSquare: mv.to, color: 'rgba(255, 165, 0, 0.85)' }];
    }
    return [];
  }, [guided, phase, memoryComplete, memoryMoveIndex, line.arrows, showHint, expectedMoves]);

  const handleRetryMemory = useCallback((): void => {
    chessRef.current = new Chess(line.fen);
    setMemoryFen(line.fen);
    setMemoryMoveIndex(0);
    setShowCorrectFlash(false);
    setShowWrongFlash(false);
    setShakeBoard(false);
    setMemoryComplete(false);
    completedRef.current = false;
    clearSelection();
    voiceService.stop();
  }, [line.fen, clearSelection]);

  const handleReplayDemo = useCallback((): void => {
    voiceService.stop();
    setPhase('demo');
    setDemoMoveIndex(-1);
    setIsPlaying(true);
    setMemoryComplete(false);
    completedRef.current = false;
  }, []);

  // ─── Memory Complete Screen ──────────────────────────────────────────────

  if (memoryComplete) {
    return (
      <div className="flex flex-col flex-1 p-4 items-center justify-center" data-testid="line-player-complete">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-theme-text">Line Mastered!</h2>
            <p className="text-sm text-theme-text-muted mt-1">{line.title}</p>
          </div>

          {onContinuePlaying && (
            <button
              onClick={onContinuePlaying}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
              data-testid="line-continue-playing"
            >
              <Play size={16} />
              Continue Playing
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRetryMemory}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-white font-semibold hover:opacity-90 transition-opacity"
              data-testid="line-retry"
            >
              <RotateCcw size={16} />
              Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold hover:bg-theme-border transition-colors"
              data-testid="line-exit"
            >
              <ArrowLeft size={16} />
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Demonstration Phase Render ──────────────────────────────────────────

  if (phase === 'demo') {
    return (
      <LessonScaffold
        testId="line-player-demo"
        backTestId="line-player-back"
        narrationTestId="demo-annotation"
        title={line.title}
        subtitle="Watch & Learn"
        onExit={onExit}
        headerAction={
          <button
            onClick={skipToMemory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
            data-testid="skip-to-memory"
          >
            <SkipForward size={14} />
            Practice
          </button>
        }
        progress={{ current: Math.max(0, demoMoveIndex + 1), total: line.moves.length }}
        board={
          <ConsistentChessboard
            fen={demoFen}
            boardOrientation={boardOrientation}
            arrows={currentDemoArrows}
            squareStyles={currentDemoHighlights}
            animationDurationInMs={BOARD_DEMO_ANIMATION_MS}
            enableMoveSound={false}
          />
        }
        narration={currentAnnotation}
        controls={{
          onPrev: () => stepDemo(-1),
          onTogglePlay: togglePlayPause,
          onNext: () => stepDemo(1),
          isPlaying,
          canPrev: demoMoveIndex >= 0,
          canNext: demoMoveIndex < line.moves.length - 1,
          playTestId: 'demo-play-pause',
        }}
      />
    );
  }

  // ─── Memory Phase Render ─────────────────────────────────────────────────

  return (
    <LessonScaffold
      testId="line-player-memory"
      backTestId="line-player-back"
      title={line.title}
      subtitle={
        mode === 'learn'
          ? 'Learn — listen, then play the move'
          : mode === 'practice'
            ? 'Practice — play the line from memory'
            : 'Your Turn — Replay from Memory'
      }
      onExit={onExit}
      headerAction={
        <>
          {mode === 'watch' && (
            <button
              onClick={handleReplayDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-border text-theme-text-muted text-xs font-medium transition-colors"
              data-testid="replay-demo"
            >
              <RotateCcw size={14} />
              Watch Again
            </button>
          )}
          {mode === 'practice' && !memoryComplete && (
            <button
              onClick={() => setShowHint(true)}
              disabled={showHint || showCorrectFlash || showWrongFlash}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-border text-theme-text-muted text-xs font-medium transition-colors disabled:opacity-40"
              data-testid="practice-hint"
            >
              <Lightbulb size={14} />
              Hint
            </button>
          )}
        </>
      }
      progress={{ current: memoryMoveIndex, total: expectedMoves.length, tone: 'green' }}
      board={
        <ConsistentChessboard
          fen={memoryFen}
          boardOrientation={boardOrientation}
          interactive={!showWrongFlash && !showCorrectFlash}
          squareStyles={memorySquareStyles}
          arrows={memoryHintArrows}
          onPieceDrop={handlePieceDrop}
          onSquareClick={handleSquareClick}
          enableMoveSound={false}
          className={shakeBoard ? 'animate-[boardFlashError_400ms]' : ''}
          overlay={
            <>
              <AnimatePresence>
                {showCorrectFlash && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    data-testid="correct-flash"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
                      <CheckCircle size={28} className="text-green-500" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {showWrongFlash && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    data-testid="wrong-flash"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center">
                      <XCircle size={28} className="text-red-500" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          }
        />
      }
      narrationRaw={
        <>
          {showWrongFlash && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-red-500/10 border border-red-500/30 p-3"
              data-testid="wrong-hint"
            >
              <p className="text-sm text-red-400 font-medium">
                Not quite — try to remember the correct move.
              </p>
            </motion.div>
          )}
          {!showWrongFlash && !showCorrectFlash && memoryMoveIndex < expectedMoves.length && (
            <div className="rounded-2xl bg-theme-surface/90 border border-white/15 p-3">
              <p className="text-sm text-theme-text-muted">
                {mode === 'learn'
                  ? `Listen, then play the highlighted move — ${memoryMoveIndex + 1} of ${expectedMoves.length}.`
                  : `Play move ${memoryMoveIndex + 1} of ${expectedMoves.length} from memory.`}
              </p>
            </div>
          )}
        </>
      }
    />
  );
}
