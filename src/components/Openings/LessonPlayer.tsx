import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chess } from 'chess.js';
import { ConsistentChessboard, type BoardArrow } from '../Chessboard/ConsistentChessboard';
import { LessonScaffold } from './LessonScaffold';
import { useStrictNarration } from '../../hooks/useStrictNarration';
import { voiceService } from '../../services/voiceService';
import { useSettings } from '../../hooks/useSettings';
import { buildNarrationSegments } from '../../services/narrationSegments';
import type { LessonScript, LessonBeat } from '../../types';

interface LessonPlayerProps {
  script: LessonScript;
  onExit: () => void;
  /** Fired once when the student reaches the final beat (lesson watched
   *  through). The host uses it to mark the line "Learned". */
  onComplete?: () => void;
  /** When set, a CTA appears once the lesson reaches its final beat that steps
   *  to the NEXT rung — Watch → Learn (David 2026-05-23: tee up the next rung,
   *  don't skip straight to Play). The host wires it to the Learn flow. */
  onContinueToNext?: () => void;
}

function fenForMoves(moves: string[]): string {
  const c = new Chess();
  for (const m of moves) {
    try { c.move(m); } catch { break; }
  }
  return c.fen();
}

/** The from/to squares of `move` played after `prefix`. */
function moveSquares(prefix: string[], move: string): { from: string; to: string } | null {
  const c = new Chess();
  for (const m of prefix) { try { c.move(m); } catch { return null; } }
  try { const mv = c.move(move); return { from: mv.from, to: mv.to }; } catch { return null; }
}

/**
 * LessonPlayer — story-first master class. The narration is the spine;
 * the board follows. Each beat shows its own position (so beats can
 * rewind or branch), draws piece arrows + square highlights, and speaks
 * via the voice-gated useStrictNarration runtime. Used by the openings
 * walkthrough surface whenever a LessonScript exists for the opening.
 */
export function LessonPlayer({ script, onExit, onComplete, onContinueToNext }: LessonPlayerProps): JSX.Element {
  const { settings } = useSettings();
  const voiceEnabled = settings.voiceEnabled;

  const beats = script.beats;
  const fens = useMemo(() => beats.map((b) => fenForMoves(b.moves)), [beats]);

  const [beatIndex, setBeatIndex] = useState(0);
  // Bumped on every applyStep so the animation effect re-runs even when the
  // beat index is UNCHANGED (pause→resume re-applies the same step). Without
  // this, applyStep arms a fresh animPromiseRef that the animation effect
  // never resolves — Promise.all in `speak` hangs forever and auto-advance
  // dies after the first resume (David 2026-05-25 autoplay-after-pause bug).
  const [applyNonce, setApplyNonce] = useState(0);
  // The board is animated independently of the beat index: we play a
  // beat's moves one at a time (see the effect below), so `displayFen`
  // lags `beatIndex` while the sequence runs.
  const [displayFen, setDisplayFen] = useState(fens[0]);
  const [trailArrows, setTrailArrows] = useState<BoardArrow[]>([]);
  const [settled, setSettled] = useState(true);

  const prevIdxRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  // Animation-complete promise. applyStep (which runs synchronously inside
  // playStep, before speak) arms a fresh one; the animation effect resolves
  // it when the moves finish. The speak wrapper awaits it so auto-advance
  // waits for BOTH the voice and the board animation — never advancing
  // mid-sequence.
  const animResolveRef = useRef<(() => void) | null>(null);
  const animPromiseRef = useRef<Promise<void>>(Promise.resolve());

  // Lead-the-eye TIMED SQUARE REVEAL (David 2026-05-21): the voice speaks the
  // whole beat as ONE smooth utterance (no sentence-chopping — that sounded
  // choppy), and each beat marker is revealed on a TIMER paced to where its
  // square's sentence sits in the narration. So the square lights ~as the
  // coach says its name, while the audio stays seamless. `revealedSquares`
  // accumulates; the board shows a marker only once revealed AND settled.
  const [revealedSquares, setRevealedSquares] = useState<Set<string>>(new Set());
  const playTokenRef = useRef(0);
  const beatRef = useRef<LessonBeat | undefined>(beats[0]);
  const voiceEnabledRef = useRef(voiceEnabled);
  const revealTimersRef = useRef<number[]>([]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  const beatSquares = useCallback((b: LessonBeat | undefined): string[] => {
    if (!b) return [];
    return [
      ...(b.arrows ?? []).flatMap((a) => [a.from, a.to]),
      ...(b.highlights ?? []).map((h) => h.square),
    ];
  }, []);

  const clearRevealTimers = useCallback(() => {
    revealTimersRef.current.forEach((t) => clearTimeout(t));
    revealTimersRef.current = [];
  }, []);

  const applyStep = useCallback((i: number) => {
    animPromiseRef.current = new Promise<void>((res) => { animResolveRef.current = res; });
    // Bump the play token so any pending reveal timers from the prior beat bail.
    playTokenRef.current += 1;
    clearRevealTimers();
    const b = beats[i];
    beatRef.current = b;
    // Voice off → no narration to pace the reveal, so show every marker now.
    setRevealedSquares(voiceEnabledRef.current ? new Set() : new Set(beatSquares(b)));
    setBeatIndex(i);
    setApplyNonce((n) => n + 1);
  }, [beats, beatSquares, clearRevealTimers]);
  const getNarration = useCallback((i: number) => beats[i]?.say ?? '', [beats]);

  const { isAutoPlaying, next, prev, goToStep, toggleAutoPlay } = useStrictNarration({
    stepCount: beats.length,
    applyStep,
    getNarration,
    postNarrationDelayMs: 700,
    voiceEnabled,
    // Speak the beat as ONE smooth utterance (long-form, not brief-capped),
    // and schedule each marker's reveal on a timer estimated from where its
    // square's sentence falls in the text — the board paints the square ~as
    // the coach says it, without chopping the voice. Advance waits for BOTH
    // the full narration AND the board animation.
    speak: (t: string) => {
      const myToken = playTokenRef.current;
      const segments = buildNarrationSegments(t, beatSquares(beatRef.current));
      // Rough speech-duration estimate (~55ms/char, floor 1.2s) — we only
      // need the RELATIVE pacing of the reveals across the utterance, not a
      // precise sync (voice isn't driving it; this is a cosmetic timer).
      const totalChars = segments.reduce((n, s) => n + s.text.length, 0) || 1;
      const estMs = Math.max(totalChars * 55, 1200);
      let accChars = 0;
      for (const seg of segments) {
        const at = (accChars / totalChars) * estMs;
        accChars += seg.text.length;
        if (seg.revealSquares.length === 0) continue;
        const squares = seg.revealSquares;
        const timer = window.setTimeout(() => {
          if (playTokenRef.current !== myToken) return;
          setRevealedSquares((prev) => new Set([...prev, ...squares]));
        }, at);
        revealTimersRef.current.push(timer);
      }
      return Promise.all([voiceService.speakLecture(t), animPromiseRef.current]).then(() => undefined);
    },
    // The story plays itself — beats auto-advance as each line finishes.
    initialAutoPlay: true,
  });

  const idx = beatIndex;
  const beat = beats[idx];

  // Clear any pending reveal timers on unmount.
  useEffect(() => () => clearRevealTimers(), [clearRevealTimers]);

  // Fire onComplete once when the student reaches the final beat.
  const completedRef = useRef(false);
  useEffect(() => {
    if (!completedRef.current && idx >= beats.length - 1) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [idx, beats.length, onComplete]);

  // Audit-only deterministic completion hook — gated behind the `auditMoveHook`
  // flag (mirrors PlayableLinePlayer's window.__playMove). The full-play audit
  // (scripts/audit-fullplay-prod.mjs) calls window.__lessonToEnd() to drive the
  // lesson to its final beat, firing onComplete → markRungComplete, WITHOUT
  // depending on headless TTS resolving the voice-gated auto-advance (which
  // flakes to 0 voice events in headless and stalls the progression). No effect
  // in the real app — the flag is never set there.
  useEffect(() => {
    try { if (localStorage.getItem('auditMoveHook') !== '1') return; } catch { return; }
    const w = window as unknown as { __lessonToEnd?: () => void };
    w.__lessonToEnd = () => { goToStep(beats.length - 1); };
    return () => { (window as unknown as { __lessonToEnd?: () => void }).__lessonToEnd = undefined; };
  }, [goToStep, beats.length]);

  // Play this beat's moves ONE AT A TIME from the longest common prefix
  // with the previously-shown line — a linear path the eye can follow,
  // never a multi-move jump. Each move adds a trail arrow that stays on
  // the board so the viewer can trace the sequence back. Authored vision
  // arrows + highlights reveal once the moves settle.
  useEffect(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    const prevIdx = prevIdxRef.current;
    prevIdxRef.current = idx;
    const prevMoves = beats[prevIdx]?.moves ?? [];
    const curMoves = beat.moves;

    let cp = 0;
    while (cp < prevMoves.length && cp < curMoves.length && prevMoves[cp] === curMoves[cp]) cp += 1;

    const forwardMoves = curMoves.length - cp;
    if (forwardMoves <= 0) {
      // Same line or a pure rewind — nothing to play out; snap.
      setDisplayFen(fens[idx]);
      setTrailArrows([]);
      setSettled(true);
      animResolveRef.current?.();
      return;
    }

    setSettled(false);
    setTrailArrows([]);
    setDisplayFen(fenForMoves(curMoves.slice(0, cp))); // start at the fork
    const STEP_MS = 1300;
    const TRAIL = 'rgba(255,170,60,0.6)';
    const accumulated: BoardArrow[] = [];
    let delay = 300; // brief look at the fork before the first move
    for (let k = cp + 1; k <= curMoves.length; k += 1) {
      const fen = fenForMoves(curMoves.slice(0, k));
      const sq = moveSquares(curMoves.slice(0, k - 1), curMoves[k - 1]);
      const isLast = k === curMoves.length;
      const t = window.setTimeout(() => {
        setDisplayFen(fen);
        if (sq) { accumulated.push({ startSquare: sq.from, endSquare: sq.to, color: TRAIL }); setTrailArrows([...accumulated]); }
        if (isLast) { setSettled(true); animResolveRef.current?.(); }
      }, delay);
      timersRef.current.push(t);
      delay += STEP_MS;
    }
    return () => { timersRef.current.forEach((t) => clearTimeout(t)); };
    // applyNonce is included so a pause→resume that re-applies the SAME beat
    // index still re-runs this effect (otherwise the snap branch never fires
    // and the freshly-armed animPromiseRef is never resolved).
  }, [idx, beat, beats, fens, applyNonce]);

  // Trail arrows stay on the board; authored vision arrows + highlights add
  // once the moves have settled AND the sentence naming their square has been
  // spoken (revealedSquares) — so the eye lands on each square as the coach
  // says its name, not all at once.
  const boardArrows: BoardArrow[] = [
    ...trailArrows,
    ...(settled
      ? (beat.arrows ?? [])
          .filter((a) => revealedSquares.has(a.to) || revealedSquares.has(a.from))
          .map((a) => ({
            startSquare: a.from,
            endSquare: a.to,
            color: a.color ?? 'rgba(40,185,95,0.92)',
          }))
      : []),
  ];

  const squareStyles: Record<string, CSSProperties> = {};
  if (settled) {
    for (const h of beat.highlights ?? []) {
      if (!revealedSquares.has(h.square)) continue;
      squareStyles[h.square] = { background: h.color ?? 'rgba(255,214,0,0.88)' };
    }
  }

  const orientation = beat.orientation ?? script.orientation;
  const atStart = idx <= 0;
  const atEnd = idx >= beats.length - 1;

  return (
    <LessonScaffold
      testId="lesson-player"
      titleTestId="lesson-title"
      title={script.title}
      subtitle={`${script.minutes} min · Master Class`}
      onExit={onExit}
      progress={{ current: idx + 1, total: beats.length, label: 'Beat' }}
      board={
        <ConsistentChessboard
          fen={displayFen}
          boardOrientation={orientation}
          arrows={boardArrows}
          squareStyles={squareStyles}
          animationDurationInMs={350}
        />
      }
      narration={beat.say}
      controls={{
        onPrev: prev,
        onTogglePlay: toggleAutoPlay,
        onNext: atEnd ? () => goToStep(0) : next,
        isPlaying: isAutoPlaying,
        canPrev: !atStart,
        canNext: true,
        playLabel: 'Play lesson',
      }}
      footer={
        atEnd && onContinueToNext ? (
          <button
            type="button"
            onClick={onContinueToNext}
            data-testid="lesson-continue-next"
            className="w-full py-3 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-200 font-semibold"
          >
            Now Learn it →
          </button>
        ) : undefined
      }
    />
  );
}
