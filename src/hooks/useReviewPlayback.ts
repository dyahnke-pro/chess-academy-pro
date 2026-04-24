import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { voiceService } from '../services/voiceService';
import { logAppAudit } from '../services/appAuditor';
import type { ReviewNarration, ReviewMoveSegment } from '../services/coachFeatureService';

export type ReviewNarrationState = 'idle' | 'speaking' | 'paused';

export interface UseReviewPlaybackArgs {
  /** Loaded narration bundle — may be null while still fetching. When
   *  it arrives, the hook speaks the intro and sets currentPly to 0. */
  narration: ReviewNarration | null;
  /** Authoritative total ply count for the game. Nav walks 0..totalPlies
   *  regardless of how many segments the LLM narrated — plies without
   *  a matching segment advance the board silently (narration === null).
   *  When omitted, falls back to segments.length, which can silently
   *  truncate nav if segment generation was partial (WO-REVIEW-02a-FIX). */
  totalPlies?: number;
  /** Optional callback whenever the selected ply changes (for the
   *  parent to sync the board FEN / arrows). Called with the new
   *  currentPly (0 = starting position). */
  onPlyChange?: (ply: number) => void;
}

export interface UseReviewPlaybackResult {
  /** 0 = starting position; N = after the Nth ply. */
  currentPly: number;
  narrationState: ReviewNarrationState;
  /** The segment corresponding to currentPly (or null at ply 0 / after
   *  the last move). Parent uses this to render the board + arrow. */
  currentSegment: ReviewMoveSegment | null;
  /** Visible subtitle: intro at ply 0, segment narration otherwise, or
   *  closing when reached. Null when idle with nothing to show. */
  currentText: string | null;
  goForward: () => void;
  goBack: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  /** Jump to an arbitrary ply. speaks=true plays the matching segment's
   *  narration (if any); speaks=false advances the board silently (used
   *  when back-navigation shouldn't re-speak). */
  jumpToPly: (ply: number, opts?: { speak?: boolean }) => void;
  togglePausePlay: () => void;
  /** Re-speak the current segment / intro from the top. */
  replay: () => void;
}

/**
 * Owns the walk-the-game review playback state. The parent renders
 * the board + nav controls + subtitle banner; this hook owns ply
 * index, current segment lookup, and voice supersession on every
 * navigation event so the coach's voice cuts cleanly when Dave taps
 * forward mid-sentence. WO-REVIEW-02.
 *
 * Voice discipline mirrors usePhaseNarration + usePositionNarration:
 * every nav action calls voiceService.stop() BEFORE dispatching the
 * next speak. No sentence streaming here — review segments are short
 * pre-generated strings, so a single speakForced() per segment is
 * enough.
 */
export function useReviewPlayback(args: UseReviewPlaybackArgs): UseReviewPlaybackResult {
  const { narration, totalPlies, onPlyChange } = args;
  const [currentPly, setCurrentPly] = useState(0);
  const [narrationState, setNarrationState] = useState<ReviewNarrationState>('idle');
  const introSpokenRef = useRef(false);
  const activeTokenRef = useRef(0);

  const segments = useMemo(() => narration?.segments ?? [], [narration]);
  // lastPly is the authoritative nav ceiling. Prefer the caller-supplied
  // totalPlies (= full game length), falling back to segments' trailing
  // ply only when no count was provided. This decouples nav from the
  // LLM's segment completeness — silent plies still walk the board.
  const lastPly = totalPlies ?? (segments.length > 0 ? segments[segments.length - 1].ply : 0);

  // Reset when a new narration bundle loads (e.g. user reopens review).
  useEffect(() => {
    if (!narration) return;
    introSpokenRef.current = false;
    activeTokenRef.current += 1;
    voiceService.stop();
    setCurrentPly(0);
    setNarrationState('idle');
  }, [narration]);

  // Unmount: make sure we don't leave audio playing.
  useEffect(() => {
    return () => {
      activeTokenRef.current += 1;
      voiceService.stop();
    };
  }, []);

  const currentSegment = useMemo<ReviewMoveSegment | null>(() => {
    if (currentPly <= 0) return null;
    // Find by ply rather than array index. Returns null when the nav
    // walks past the segments the LLM produced — the parent falls back
    // to the game's move history for the board FEN.
    return segments.find((s) => s.ply === currentPly) ?? null;
  }, [currentPly, segments]);

  const currentText = useMemo<string | null>(() => {
    if (!narration) return null;
    if (currentPly === 0) return narration.intro;
    if (currentPly > lastPly && narration.closing) return narration.closing;
    return currentSegment?.narration ?? null;
  }, [narration, currentPly, lastPly, currentSegment]);

  // Dispatch speech for the current ply's text. Supersedes any prior
  // utterance via token-counter cancellation + voiceService.stop().
  const speakCurrent = useCallback((text: string | null): void => {
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    if (!text || !text.trim()) {
      setNarrationState('idle');
      return;
    }
    setNarrationState('speaking');
    void logAppAudit({
      kind: 'review-narration-spoken',
      category: 'subsystem',
      source: 'useReviewPlayback',
      summary: `ply ${currentPly}: ${text.slice(0, 40)}`,
      details: JSON.stringify({ ply: currentPly, length: text.length }),
    });
    voiceService.speakForced(text).then(
      () => {
        if (token === activeTokenRef.current) setNarrationState('idle');
      },
      () => {
        if (token === activeTokenRef.current) setNarrationState('idle');
      },
    );
  }, [currentPly]);

  // Speak the intro once the narration arrives. Subsequent ply changes
  // fire from the nav actions below — we don't re-speak on every ply
  // change (silent moves should stay silent).
  useEffect(() => {
    if (!narration || introSpokenRef.current) return;
    introSpokenRef.current = true;
    void logAppAudit({
      kind: 'review-opened',
      category: 'subsystem',
      source: 'useReviewPlayback',
      summary: `segments=${narration.segments.length}`,
    });
    speakCurrent(narration.intro);
  }, [narration, speakCurrent]);

  const commitPly = useCallback((ply: number, opts: { speak: boolean }): void => {
    const bounded = Math.max(0, Math.min(ply, lastPly + 1));
    setCurrentPly(bounded);
    onPlyChange?.(bounded);
    void logAppAudit({
      kind: 'review-nav',
      category: 'subsystem',
      source: 'useReviewPlayback',
      summary: `target ply ${bounded}`,
      details: JSON.stringify({ ply: bounded, speak: opts.speak }),
    });
    if (!opts.speak) {
      activeTokenRef.current += 1;
      voiceService.stop();
      setNarrationState('idle');
      return;
    }
    // Determine what text to speak for the new ply. When totalPlies
    // exceeds segments.length (truncated LLM output), plies without a
    // matching segment advance silently — speakCurrent(null) idles.
    let text: string | null = null;
    if (bounded === 0) {
      text = narration?.intro ?? null;
    } else if (bounded > lastPly) {
      text = narration?.closing ?? null;
    } else {
      const seg = segments.find((s) => s.ply === bounded);
      text = seg?.narration ?? null;
    }
    speakCurrent(text);
  }, [lastPly, narration, onPlyChange, segments, speakCurrent]);

  const goForward = useCallback(() => {
    commitPly(currentPly + 1, { speak: true });
  }, [commitPly, currentPly]);

  const goBack = useCallback(() => {
    commitPly(currentPly - 1, { speak: false });
  }, [commitPly, currentPly]);

  const goToStart = useCallback(() => {
    commitPly(0, { speak: true });
  }, [commitPly]);

  const goToEnd = useCallback(() => {
    commitPly(lastPly, { speak: true });
  }, [commitPly, lastPly]);

  const jumpToPly = useCallback((ply: number, opts?: { speak?: boolean }) => {
    const speak = opts?.speak ?? true;
    commitPly(ply, { speak });
  }, [commitPly]);

  const togglePausePlay = useCallback(() => {
    if (narrationState === 'speaking') {
      // Stop current utterance. Switch to paused state so user sees
      // intent. Resuming re-speaks the current ply's text from the top
      // (voice pipeline has no native pause-resume).
      activeTokenRef.current += 1;
      voiceService.stop();
      setNarrationState('paused');
    } else {
      // Resume from current ply: re-speak whatever text matches.
      speakCurrent(currentText);
    }
  }, [narrationState, speakCurrent, currentText]);

  const replay = useCallback(() => {
    speakCurrent(currentText);
  }, [speakCurrent, currentText]);

  return {
    currentPly,
    narrationState,
    currentSegment,
    currentText,
    goForward,
    goBack,
    goToStart,
    goToEnd,
    jumpToPly,
    togglePausePlay,
    replay,
  };
}
