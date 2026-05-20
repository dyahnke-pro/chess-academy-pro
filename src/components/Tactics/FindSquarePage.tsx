import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff,
  Trophy, Volume2, VolumeX,
} from 'lucide-react';
import { ConsistentChessboard, type PiecePositionMap } from '../Chessboard/ConsistentChessboard';
import { voiceService } from '../../services/voiceService';
import {
  drawRandomSquare, recordAttempt, sequenceLengthForStreak, getBestStreak,
} from '../../services/findSquareService';
import { logAppAudit } from '../../services/appAuditor';

/**
 * FindSquarePage — board-vision drill.
 *
 * David's spec 2026-05-19:
 *   - Blank board, single pawn shows the student's color.
 *     White → a2-pawn, board normal. Black → h7-pawn, board flipped
 *     so the pawn is visually at the BOTTOM either way.
 *   - Random target square pops up. Student clicks it on the board.
 *   - Green flash on correct, red flash on wrong. Both logged.
 *   - Coord toggle (eye icon) ON THE PLAYING SURFACE, not in settings.
 *   - Voice toggle — coach speaks the target ("h-seven") instead of
 *     just displaying text.
 *   - Sequence mode — N squares per round in order. N starts at 2
 *     and grows with streak (3, 4, up to 5). Wrong → streak resets
 *     and N drops back to 2.
 *   - Streak indicator (current + best).
 *   - NO adaptive tier system. Random squares. Always all 64.
 *   - Per-attempt data logged for /weaknesses ("your slow squares
 *     are g5, b3, e6").
 */
export function FindSquarePage(): JSX.Element {
  const navigate = useNavigate();

  // ── Color / orientation ──────────────────────────────────────────
  // White pawn lives on a2, board faces white. Black pawn lives on
  // h7, board is FLIPPED so the pawn is still visually at the bottom
  // of the screen.
  const [color, setColor] = useState<'white' | 'black'>('white');
  const orientation = color;
  const pawnSquare = color === 'white' ? 'a2' : 'h7';
  const board: PiecePositionMap = useMemo(() => ({
    [pawnSquare]: { pieceType: color === 'white' ? 'wP' : 'bP' },
  }), [pawnSquare, color]);

  // ── Mode toggles ─────────────────────────────────────────────────
  const [coordsShown, setCoordsShown] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [sequenceMode, setSequenceMode] = useState(false);

  // ── Streak + best ────────────────────────────────────────────────
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  useEffect(() => {
    void getBestStreak().then(setBestStreak).catch(() => undefined);
  }, []);

  // ── Round state ──────────────────────────────────────────────────
  /** All squares in the current round, in order. For single mode the
   *  array length is 1. For sequence mode it's 2..5. */
  const [targets, setTargets] = useState<string[]>([]);
  /** 0-based index of the square the student is currently trying to
   *  click within `targets`. */
  const [targetIndex, setTargetIndex] = useState(0);
  /** Flash overlay on the last clicked square. Cleared after ~600ms. */
  const [flash, setFlash] = useState<{ square: string; correct: boolean } | null>(null);

  // ── Click timing ─────────────────────────────────────────────────
  const promptShownAtRef = useRef<number>(0);

  // ── Round lifecycle ──────────────────────────────────────────────
  const startNewRound = useCallback((streakAtStart: number) => {
    const length = sequenceMode ? sequenceLengthForStreak(streakAtStart) : 1;
    const used = new Set<string>([pawnSquare]);
    const next: string[] = [];
    for (let i = 0; i < length; i += 1) {
      const sq = drawRandomSquare({ exclude: used });
      next.push(sq);
      used.add(sq);
    }
    setTargets(next);
    setTargetIndex(0);
    promptShownAtRef.current = performance.now();
    void logAppAudit({
      kind: 'find-square-round-start',
      category: 'subsystem',
      source: 'FindSquarePage.startNewRound',
      summary: `color=${color} mode=${sequenceMode ? 'sequence' : 'single'} length=${length} targets=${next.join(',')}`,
    });
    if (voiceMode) {
      // First target: speak it. Subsequent targets in a sequence are
      // queued on each correct click; see handleSquareClick below.
      void voiceService.speak(spokenForm(next[0]));
    }
  }, [sequenceMode, pawnSquare, color, voiceMode]);

  // Kick off the first round on mount (and whenever color/mode flips).
  useEffect(() => {
    startNewRound(streak);
    // Intentionally NOT depending on `streak` — we want a fresh round
    // only when the student changes color / mode, not on every grade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, sequenceMode]);

  // ── Click handler ────────────────────────────────────────────────
  const currentTarget = targets[targetIndex] ?? null;

  const handleSquareClick = useCallback((args: { square: string }) => {
    if (!currentTarget) return;
    const clicked = args.square;
    const correct = clicked === currentTarget;
    const durationMs = Math.round(performance.now() - promptShownAtRef.current);

    setFlash({ square: clicked, correct });
    setTimeout(() => setFlash(null), 600);

    void recordAttempt({
      color,
      target: currentTarget,
      clicked,
      correct,
      durationMs,
      coordsShown,
      voiceMode,
      mode: sequenceMode ? 'sequence' : 'single',
      sequenceLength: targets.length,
      sequenceIndex: targetIndex,
      streakBefore: streak,
    });

    if (correct) {
      // Last square in the sequence? Round complete → bump streak,
      // start a new round.
      if (targetIndex + 1 >= targets.length) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        // Tiny delay so the green flash registers before the next
        // round overwrites the targets.
        setTimeout(() => startNewRound(nextStreak), 600);
      } else {
        // Move to next square in the sequence.
        const nextIdx = targetIndex + 1;
        setTargetIndex(nextIdx);
        promptShownAtRef.current = performance.now();
        if (voiceMode) void voiceService.speak(spokenForm(targets[nextIdx]));
      }
    } else {
      // Wrong → reset streak, restart round with sequence length
      // dropped back to 2 (or 1 in single mode).
      setStreak(0);
      setTimeout(() => startNewRound(0), 700);
    }
  }, [currentTarget, color, coordsShown, voiceMode, sequenceMode, targets, targetIndex, streak, startNewRound]);

  // ── Square-styles overlay ────────────────────────────────────────
  // Pulse green on correct, red on wrong, briefly.
  const squareStyles = useMemo(() => {
    if (!flash) return undefined;
    return {
      [flash.square]: flash.correct
        ? { background: 'rgba(34, 197, 94, 0.55)', boxShadow: 'inset 0 0 16px rgba(34, 197, 94, 0.7)' }
        : { background: 'rgba(239, 68, 68, 0.55)', boxShadow: 'inset 0 0 16px rgba(239, 68, 68, 0.7)' },
    };
  }, [flash]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      data-testid="find-square-page"
    >
      <div className="flex items-center gap-2 max-w-lg mx-auto w-full">
        <button
          onClick={() => { void navigate('/tactics'); }}
          aria-label="Back to tactics"
          className="p-2 rounded-lg hover:bg-theme-border/50 transition-colors"
          data-testid="find-square-back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center">Find the Square</h1>
        <div className="w-9" />
      </div>

      {/* Color picker — tap the pawn icon to swap. The pawn shown is
          the one the student plays. */}
      <div className="flex items-center justify-center gap-3 max-w-lg mx-auto w-full">
        <button
          type="button"
          onClick={() => setColor('white')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            color === 'white'
              ? 'bg-theme-accent/15 border-theme-accent text-theme-accent'
              : 'border-theme-border text-theme-text-muted hover:border-theme-text-muted'
          }`}
          data-testid="find-square-color-white"
          aria-pressed={color === 'white'}
        >
          ♙ White (a2)
        </button>
        <button
          type="button"
          onClick={() => setColor('black')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            color === 'black'
              ? 'bg-theme-accent/15 border-theme-accent text-theme-accent'
              : 'border-theme-border text-theme-text-muted hover:border-theme-text-muted'
          }`}
          data-testid="find-square-color-black"
          aria-pressed={color === 'black'}
        >
          ♟ Black (h7)
        </button>
      </div>

      {/* Target prompt + on-surface toggles */}
      <div className="flex items-center gap-2 max-w-lg mx-auto w-full">
        <div
          className="flex-1 px-4 py-3 rounded-xl bg-theme-surface border-2 border-theme-accent/30 text-center"
          data-testid="find-square-prompt"
        >
          <div className="text-xs text-theme-text-muted uppercase tracking-wider">Find the square</div>
          <div className="text-3xl font-bold text-theme-accent tabular-nums" data-testid="find-square-target">
            {currentTarget ?? '—'}
          </div>
          {targets.length > 1 && (
            <div className="text-[11px] text-theme-text-muted mt-1" data-testid="find-square-sequence-progress">
              {targetIndex + 1} / {targets.length}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCoordsShown((v) => !v)}
          className="h-full p-3 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-text-muted"
          aria-pressed={coordsShown}
          aria-label="Toggle coordinates"
          data-testid="find-square-coords-toggle"
          data-checked={coordsShown ? 'true' : 'false'}
          title={coordsShown ? 'Hide coordinates' : 'Show coordinates'}
        >
          {coordsShown ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button
          type="button"
          onClick={() => setVoiceMode((v) => !v)}
          className="h-full p-3 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-text-muted"
          aria-pressed={voiceMode}
          aria-label="Toggle voice"
          data-testid="find-square-voice-toggle"
          data-checked={voiceMode ? 'true' : 'false'}
          title={voiceMode ? 'Mute voice' : 'Speak target'}
        >
          {voiceMode ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Board */}
      <div className="max-w-lg mx-auto w-full">
        <ConsistentChessboard
          fen={board}
          boardOrientation={orientation}
          showLastMoveHighlight={false}
          showCheckHighlight={false}
          showCoordinates={coordsShown}
          onSquareClick={handleSquareClick}
          squareStyles={squareStyles}
        />
      </div>

      {/* Streak + sequence-mode toggle */}
      <div className="flex items-center gap-3 max-w-lg mx-auto w-full">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-theme-surface border border-theme-border"
          data-testid="find-square-streak"
        >
          <Trophy size={16} className={streak > 0 ? 'text-amber-400' : 'text-theme-text-muted'} />
          <span className="text-sm">
            Streak <span className="font-semibold text-theme-text tabular-nums" data-testid="find-square-streak-current">{streak}</span>
          </span>
          <span className="text-xs text-theme-text-muted ml-auto">
            best <span className="font-medium text-theme-text tabular-nums" data-testid="find-square-streak-best">{bestStreak}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setSequenceMode((v) => !v);
            setStreak(0); // mode flip resets the streak to avoid cross-mode comparison
          }}
          className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
            sequenceMode
              ? 'bg-theme-accent/15 border-theme-accent text-theme-accent'
              : 'border-theme-border text-theme-text-muted hover:border-theme-text-muted'
          }`}
          aria-pressed={sequenceMode}
          data-testid="find-square-sequence-toggle"
        >
          {sequenceMode ? <ChevronUp size={14} className="inline mr-1" /> : <ChevronDown size={14} className="inline mr-1" />}
          Sequence
        </button>
      </div>
    </div>
  );
}

/** Convert "h7" → "H 7" for voiceService.speak. Polly says letters
 *  more naturally when there's a space; otherwise it tries to
 *  pronounce "h7" as a single word. */
function spokenForm(square: string): string {
  const file = square[0]?.toUpperCase() ?? '';
  const rank = square[1] ?? '';
  return `${file} ${rank}`;
}
