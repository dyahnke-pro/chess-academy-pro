import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { voiceService } from '../services/voiceService';
import { logAppAudit } from '../services/appAuditor';
import { useAppStore } from '../stores/appStore';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';
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
  /** Game id of the review being walked. Used to scope hint callouts
   *  to THIS game — without it, a hint requested on game A ply 12
   *  leaked as a callout on game B's ply 12 (ship-5). Optional only
   *  because legacy callers (the post-coach-game review path) don't
   *  always thread the id; when omitted, hint callouts are disabled. */
  gameId?: string;
  /** Optional callback whenever the selected ply changes (for the
   *  parent to sync the board FEN / arrows). Called with the new
   *  currentPly (0 = starting position). */
  onPlyChange?: (ply: number) => void;
  /** Deep-link landing ply (1-indexed) for `/coach/review/:id?move=N`.
   *  The walk normally boots at ply 0, and the narration-load effect
   *  snaps back to 0 — so a deep link set only via the legacy
   *  reviewState never reached the walk header (audit 2026-06-27:
   *  `?move=5` showed Ply 0). When set (>0), the walk lands here on
   *  first paint and survives the narration reset. Clamped to the game
   *  length. */
  initialPly?: number;
  /** AUTO-ADVANCE (David 2026-09-05: "have the walkthrough play itself … a
   *  nice slow steady pace that waits for the narrations to finish, maybe 0.5
   *  second pause once they finish, then auto progress to the next move").
   *  Called when the pause after a ply's narration elapses and auto-play is
   *  on. The parent routes it through its forward handler so every planned
   *  stop (find-the-shot, trap, turning point) still fires. When omitted the
   *  hook steps the ply itself. */
  onAutoAdvance?: () => ForwardOutcome;
}

/**
 * WHY A FORWARD REPORTS AN OUTCOME (2026-09-21).
 *
 * `handleWalkForward` used to return `void`, so every early return in it was
 * indistinguishable at this call site from "I advanced". The advance chain is
 * speak-resolves → scheduleAdvance → timer → onAutoAdvance, and the NEXT
 * advance is only ever scheduled when the ply CHANGES. So a forward that was
 * silently consumed stopped the walk permanently — while `isAutoPlaying`
 * stayed true and the button went on reading "playing". The user saw a review
 * that had died with no way to tell, and a prod audit sat parked at ply 67 of
 * 69 for 350 seconds with a perfectly readable ply counter.
 *
 * Two live paths did exactly that (a question-plan yield that handed the
 * forward to a card which had not opened yet, and a principle quiz whose guard
 * carried the comment "never opens" while a call site three hundred lines away
 * opened it). Enumerating the overlays that can do this was the first fix
 * considered and it is a WATCHER: the seventh overlay, written by someone who
 * reads neither list, reopens it. The doctrine is to remove the choice.
 *
 * So a stop must NAME itself, and `AUTO_ADVANCE_ON_STOP` is a `Record` over the
 * union: a new stop reason FAILS TO COMPILE until someone decides what
 * auto-play does about it. There is no default, which is the whole point.
 */
export type ForwardStop =
  /** The principle quiz owns the screen and is answered by the student. */
  | 'quiz-open'
  /** The critical-moment question card is up, awaiting an answer. */
  | 'critical-ask'
  /** A planned question card (turning point / find-the-shot) is up. */
  | 'planned-question'
  /** The find-the-shot card is up. */
  | 'find-the-shot'
  /** A legacy reading gate is open. Unreachable today — `setReadingGate` is
   *  only ever called with null — and kept so the guard declares itself
   *  rather than pretending to advance. */
  | 'reading-gate';

export type ForwardOutcome = { advanced: true } | { advanced: false; stop: ForwardStop };

/**
 * What auto-play does when a forward did NOT advance.
 *
 * `pause` is the honest answer for every card the STUDENT has to act on: the
 * walk genuinely is not going anywhere until they do, so say so and let the
 * button tell the truth. `reschedule` exists for stops that clear themselves;
 * nothing uses it today, and a reason that needs it should say why here.
 */
const AUTO_ADVANCE_ON_STOP: Record<ForwardStop, 'reschedule' | 'pause'> = {
  'quiz-open': 'pause',
  'critical-ask': 'pause',
  'planned-question': 'pause',
  'find-the-shot': 'pause',
  'reading-gate': 'pause',
};

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
  /** Advance one ply. `manual: true` is a user tap — it PAUSES auto-play
   *  (only Play restarts it). The default keeps auto-play running: it is the
   *  walk's own forward (a card resolving, the auto-advance tick). */
  goForward: (opts?: { manual?: boolean }) => void;
  goBack: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  /** Jump to an arbitrary ply. speaks=true plays the matching segment's
   *  narration (if any); speaks=false advances the board silently (used
   *  when back-navigation shouldn't re-speak). A jump is a user
   *  intervention and pauses auto-play unless `keepAuto` is set (the
   *  next-key-moment skip keeps playing from where it lands). */
  jumpToPly: (ply: number, opts?: { speak?: boolean; keepAuto?: boolean }) => void;
  togglePausePlay: () => void;
  /** Auto-play is on: after each ply's narration + a short pause the walk
   *  advances itself. */
  isAutoPlaying: boolean;
  /** Start (or resume) auto-play. Re-speaks the current ply if it is not
   *  already speaking, then continues. The ONLY way auto-play restarts after
   *  a user intervention (David 2026-09-05). */
  play: () => void;
  /** Stop auto-play (and the voice). Fired by Pause, and by every user
   *  intervention: Back, a manual Forward, a jump, a piece moved on the
   *  board. */
  pause: (reason?: string) => void;
  /** Re-speak the current segment / intro from the top. */
  replay: () => void;
  /** WO-HINT-REDESIGN-01: plies (1-indexed) that had hint requests in
   *  this game. Parent feeds these into `KeyMomentNav` so the prev /
   *  next nav buttons stop on hint moments alongside blunders /
   *  brilliancies. */
  hintPlies: number[];
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
/** Pause after a ply's narration finishes before the walk advances. */
export const AUTO_ADVANCE_PAUSE_MS = 500;
/** Longer hold after a FLAGGED ply so the eye lands on the arrow first. */
export const AUTO_ADVANCE_PAUSE_FLAGGED_MS = 1500;
/** Hold on a silent ply (nothing to narrate) — matches the useStrictNarration floor. */
export const AUTO_ADVANCE_SILENT_HOLD_MS = 800;
/** With voice OFF the hold is reading time: words at this pace, floored. */
const AUTO_READING_WPM = 180;
const AUTO_READING_MIN_MS = 1500;

export function useReviewPlayback(args: UseReviewPlaybackArgs): UseReviewPlaybackResult {
  const { narration, totalPlies, gameId, onPlyChange, initialPly, onAutoAdvance } = args;
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  /** Live mirror of isAutoPlaying for the speak-resolution callback. */
  const autoRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoAdvanceRef = useRef(onAutoAdvance);
  useEffect(() => { onAutoAdvanceRef.current = onAutoAdvance; }, [onAutoAdvance]);
  const clearAdvanceTimer = useCallback((): void => {
    if (advanceTimerRef.current !== null) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
  }, []);
  const [currentPly, setCurrentPly] = useState(0);
  // Live mirror of currentPly for callbacks whose dep list intentionally
  // EXCLUDES currentPly (commitPly stays stable so goForward/goBack don't churn
  // the render). Reading the state closure there captured the value at memo time
  // (0), so the `review-playback-step` audit logged `fromPly:0 delta=N` on EVERY
  // step — which silently defeated the skip-bug fingerprint this trail exists to
  // catch (a delta != 1 from goForward). The ref always holds the live ply.
  const currentPlyRef = useRef(0);
  useEffect(() => { currentPlyRef.current = currentPly; }, [currentPly]);
  const [narrationState, setNarrationState] = useState<ReviewNarrationState>('idle');
  const introSpokenRef = useRef(false);
  // Did the CURRENT ply's narration finish speaking? Set false when a new
  // utterance starts, true when it resolves (or when the ply is silent / voice
  // is off). Lets Play RESUME correctly: a ply already narrated advances to the
  // next instead of restating itself (David 2026-09-14: "it restates the
  // narration it just said first before advancing"); a ply paused mid-sentence
  // is re-spoken so the interrupted line finishes.
  const plyFullySpokenRef = useRef(false);
  // A pause happened, so the NEXT play() is a resume (not a fresh Start). Only a
  // resume advances past an already-finished ply; the initial Start still speaks
  // the current ply (so ply 0 / the intro is shown, not skipped).
  const resumingAfterPauseRef = useRef(false);
  const activeTokenRef = useRef(0);
  /** Deep-link landing applied once — so user navigation afterward is
   *  never overridden, and a same-component narration reopen snaps to 0. */
  const appliedInitialRef = useRef(false);
  /** True once we've processed the first narration bundle. Lets the reset
   *  effect tell a FIRST load (keep the deep-linked ply) from a genuine
   *  reopen (snap to 0). */
  const narrationSeenRef = useRef(false);

  const segments = useMemo(() => narration?.segments ?? [], [narration]);
  // lastPly is the authoritative nav ceiling. Prefer the caller-supplied
  // totalPlies (= full game length), falling back to segments' trailing
  // ply only when no count was provided. This decouples nav from the
  // LLM's segment completeness — silent plies still walk the board.
  const lastPly = totalPlies ?? (segments.length > 0 ? segments[segments.length - 1].ply : 0);

  // Deep-link landing (?move=N): apply the requested ply ONCE, as soon as the
  // ply count is known — independent of narration. This is the single source
  // of truth for the deep link; the narration-reset effect below defers to it.
  // (The earlier two-effect version FOUGHT itself: a no-narration effect
  // applied+marked the ply while narration was still null, then the reset
  // effect saw `applied=true` and snapped back to 0 — audit 2026-06-27 showed
  // Ply 0 on prod even though the unit test, which renders with narration
  // already present, passed.)
  useEffect(() => {
    if (appliedInitialRef.current) return;
    if (initialPly === undefined || initialPly <= 0) return;
    if (lastPly < 1) return; // moves/plies not known yet — wait
    appliedInitialRef.current = true;
    setCurrentPly(Math.min(initialPly, lastPly));
  }, [initialPly, lastPly]);

  // Reset when a DIFFERENT game's narration loads (a genuine reopen).
  //
  // 🔒 A same-game narration REGENERATION must NOT reset (David 2026-09-14:
  // "coach said the same thing twice — once during 'sharpening analysis', again
  // directly after entering"). A background deepen re-runs generateReviewNarration
  // for the SAME game, producing a new `narration` object; the old
  // reset-on-every-narration effect then re-fired the intro AND snapped the walk
  // back to ply 0 mid-stride. Gate the reset on the GAME actually changing
  // (`gameId`), so a deepen keeps the intro silent and the student where they
  // are. When no gameId is supplied (legacy callers), fall back to
  // reset-on-narration-identity so a real reopen still resets.
  const lastResetGameIdRef = useRef<string | undefined>(undefined);
  const sawFirstNarrationRef = useRef(false);
  useEffect(() => {
    if (!narration) return;
    const sameGame = gameId !== undefined
      ? (sawFirstNarrationRef.current && lastResetGameIdRef.current === gameId)
      : false; // no id → can't dedupe a regen; treat each bundle as a (re)open
    lastResetGameIdRef.current = gameId;
    sawFirstNarrationRef.current = true;
    if (sameGame) return; // deepen/regeneration of the current game — leave it be
    introSpokenRef.current = false;
    activeTokenRef.current += 1;
    voiceService.stop();
    setNarrationState('idle');
    // The FIRST narration load on a deep-linked mount must NOT snap to 0 —
    // the apply-once effect above landed (or will land) the requested ply.
    // Only a genuine REOPEN (a second narration bundle) resets to the start.
    const firstLoad = !narrationSeenRef.current;
    narrationSeenRef.current = true;
    if (firstLoad && appliedInitialRef.current) return; // keep the deep-linked ply
    setCurrentPly(0);
  }, [narration, gameId]);

  // Unmount: make sure we don't leave audio playing.
  useEffect(() => {
    return () => {
      activeTokenRef.current += 1;
      voiceService.stop();
      if (advanceTimerRef.current !== null) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const currentSegment = useMemo<ReviewMoveSegment | null>(() => {
    if (currentPly <= 0) return null;
    // Find by ply rather than array index. Returns null when the nav
    // walks past the segments the LLM produced — the parent falls back
    // to the game's move history for the board FEN.
    return segments.find((s) => s.ply === currentPly) ?? null;
  }, [currentPly, segments]);

  // WO-HINT-REDESIGN-01: hint records from the unified coach memory
  // store. Re-derived per render so a hint logged mid-review (rare,
  // but possible during analysis-phase exploration) shows up.
  const hintRequests = useCoachMemoryStore((s) => s.hintRequests);

  /** Look up a hint record for the given ply within the CURRENT game.
   *  ship-5: scoped by `gameId` so a hint requested on game A doesn't
   *  prepend a stale callout to game B's ply N. When the caller didn't
   *  supply a gameId, hint callouts are disabled rather than risking
   *  cross-game leakage. */
  const hintRecordForPly = useCallback(
    (ply: number) => {
      if (!gameId) return null;
      return hintRequests.find((r) => r.ply === ply && r.gameId === gameId) ?? null;
    },
    [hintRequests, gameId],
  );

  const currentText = useMemo<string | null>(() => {
    if (!narration) return null;
    if (currentPly === 0) return narration.intro;
    if (currentPly > lastPly && narration.closing) return narration.closing;
    const baseText = currentSegment?.narration ?? null;
    // WO-HINT-REDESIGN-01: prepend a deterministic hint callout when
    // the current ply had a hint request. v1 uses a template; the
    // REVIEW_HINT_CALLOUT_ADDITION prompt is reserved for a future
    // LLM-driven version that customizes per-ply context.
    const hint = hintRecordForPly(currentPly);
    if (hint) {
      const tierWord = hint.tierStoppedAt === 1 ? 'a Tier 1 nudge' : hint.tierStoppedAt === 2 ? 'Tier 2 — the piece named' : 'the full answer';
      const callout = `You asked for help here — you needed ${tierWord}. The move was ${hint.bestMoveSan}.`;
      return baseText ? `${callout} ${baseText}` : callout;
    }
    return baseText;
  }, [narration, currentPly, lastPly, currentSegment, hintRecordForPly]);

  // Dispatch speech for the given ply's text. Supersedes any prior
  // utterance via token-counter cancellation + voiceService.stop().
  // Audit-driven (review walk #3): the ply is passed in explicitly
  // rather than read from `currentPly` closure. commitPly fires this
  // immediately after `setCurrentPly(bounded)` schedules the state
  // update; the closure's `currentPly` would still hold the OLD value
  // and the audit would log `ply N-1` for narration that's actually
  // for ply N. Production audit (build 6459def+) showed
  // `review-playback-step 6→7` paired with
  // `review-narration-spoken ply 6: d3 — solid…` — the text was
  // ply 7's d3 narration but the audit summary said ply 6.
  /**
   * Act on what the parent's forward actually DID.
   *
   * A stop is a real transition: auto-play goes OFF and the button says
   * `paused`, because the alternative — the state this replaced — was a walk
   * that could never advance again while the UI insisted it was playing. A
   * user could not tell a dead review from a slow one, and neither could an
   * audit polling `data-state`.
   */
  const handleOutcome = useCallback((outcome: ForwardOutcome | undefined, atPly: number): void => {
    // A MISSING OUTCOME PAUSES. It does not throw, and it does NOT assume the
    // forward advanced.
    //
    // Not a throw, because a throw inside the advance chain would kill the walk
    // HARDER than the silent-consumption bug this mechanism exists to fix — on
    // every game, rather than only the ones with an overlay. Never make the
    // failure mode worse than the thing you are fixing.
    //
    // But not `advanced` either, and the first cut of this guard had it that
    // way. "Assume it advanced" IS the assumption that caused the bug, so
    // defaulting to it re-enters the exact class at the one point the type
    // cannot reach. The costs are not symmetric: a spurious PAUSE is visible,
    // recoverable in one tap, and noticed the first time anyone runs it, while
    // a spurious ADVANCE is the invisible deadlock — a forward consumed,
    // nothing scheduled, the walk dead with the button still reading
    // "playing". The premise of this whole mechanism is that unknown states
    // degrade to visible-paused; the default has to honour it.
    //
    // It should also never fire: `handleWalkForwardRef` is typed
    // `() => ForwardOutcome`, so the hot path cannot produce undefined. This is
    // for genuinely untyped edges, and it is RECORDED so that it cannot become
    // the next thing reporting green for free.
    if (!outcome) {
      void logAppAudit({
        kind: 'review-playback-step',
        category: 'subsystem',
        source: 'useReviewPlayback.forwardOutcomeMissing',
        summary: `forward returned no outcome at ply ${atPly} — pausing rather than assuming it advanced`,
        details: JSON.stringify({ ply: atPly }),
      });
      autoRef.current = false;
      setIsAutoPlaying(false);
      return;
    }
    if (outcome.advanced) return;
    const action = AUTO_ADVANCE_ON_STOP[outcome.stop];
    void logAppAudit({
      kind: 'review-playback-step',
      category: 'subsystem',
      source: 'useReviewPlayback.forwardStopped',
      summary: `forward did not advance at ply ${atPly}: ${outcome.stop} -> ${action}`,
      details: JSON.stringify({ ply: atPly, stop: outcome.stop, action }),
    });
    if (action === 'pause') {
      autoRef.current = false;
      setIsAutoPlaying(false);
      return;
    }
    // 'reschedule' — the stop clears itself; try again after a beat rather
    // than declaring the walk over.
    scheduleAdvanceRef.current(atPly, 1200, activeTokenRef.current);
  }, []);
  const scheduleAdvanceRef = useRef<(ply: number, delayMs: number, token: number) => void>(() => undefined);

  /** Schedule the auto-advance for `ply` once its narration is done. The
   *  timer is token-guarded: any navigation (which bumps the token) or a
   *  pause cancels it, so an advance can never fire under a user who moved. */
  const scheduleAdvance = useCallback((ply: number, delayMs: number, token: number): void => {
    clearAdvanceTimer();
    if (!autoRef.current) return;
    if (ply > lastPly) { // the closing — the walk is over, nothing to advance to
      autoRef.current = false;
      setIsAutoPlaying(false);
      return;
    }
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      if (!autoRef.current || token !== activeTokenRef.current) return;
      if (currentPlyRef.current !== ply) return; // the user moved meanwhile
      void logAppAudit({
        kind: 'review-playback-step',
        category: 'subsystem',
        source: 'useReviewPlayback.autoAdvance',
        summary: `auto-advance from ply ${ply} after ${delayMs}ms`,
        details: JSON.stringify({ fromPly: ply, delayMs }),
      });
      if (onAutoAdvanceRef.current) handleOutcome(onAutoAdvanceRef.current(), ply);
      else advanceRef.current(ply + 1);
    }, delayMs);
  }, [clearAdvanceTimer, lastPly]);
  scheduleAdvanceRef.current = scheduleAdvance;
  /** The hook's own step, used when no parent forward handler is wired. */
  const advanceRef = useRef<(ply: number) => void>(() => undefined);

  /** How long to hold after `ply` before auto-advancing: longer on a flagged
   *  ply so the arrow is seen, a reading-time hold when the voice is off. */
  const holdAfter = useCallback((ply: number, text: string | null, spoken: boolean): number => {
    const seg = segments.find((s) => s.ply === ply);
    const flagged = seg?.classification === 'inaccuracy' || seg?.classification === 'mistake'
      || seg?.classification === 'blunder' || seg?.classification === 'miss';
    if (!text || !text.trim()) return AUTO_ADVANCE_SILENT_HOLD_MS;
    if (!spoken) {
      const words = text.trim().split(/\s+/).length;
      return Math.max(AUTO_READING_MIN_MS, Math.round((words / AUTO_READING_WPM) * 60_000));
    }
    return flagged ? AUTO_ADVANCE_PAUSE_FLAGGED_MS : AUTO_ADVANCE_PAUSE_MS;
  }, [segments]);

  const speakCurrent = useCallback((ply: number, text: string | null): void => {
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    clearAdvanceTimer();
    plyFullySpokenRef.current = false; // a fresh utterance for this ply begins
    if (!text || !text.trim()) {
      setNarrationState('idle');
      plyFullySpokenRef.current = true; // nothing to say = nothing left to finish
      scheduleAdvance(ply, holdAfter(ply, text, false), token);
      return;
    }
    // Settings → Coach → "Review Voice Narration" governs EVERY spoken line
    // of the review, and the per-ply walk speech lives HERE — not in
    // CoachGameReview's reviewSay guard. The 2026-08-13 live drive caught this
    // path speaking with the toggle off (the unit gate only scanned the
    // component file). Read live so a mid-review Settings change takes effect
    // on the next ply. The written banner is untouched — voice only.
    const voiceOn = useAppStore.getState().activeProfile?.preferences.coachReviewVoice ?? true;
    if (!voiceOn) {
      setNarrationState('idle');
      plyFullySpokenRef.current = true; // voice off = nothing left to finish
      scheduleAdvance(ply, holdAfter(ply, text, false), token);
      return;
    }
    setNarrationState('speaking');
    void logAppAudit({
      kind: 'review-narration-spoken',
      category: 'subsystem',
      source: 'useReviewPlayback',
      summary: `ply ${ply}: ${text.slice(0, 40)}`,
      details: JSON.stringify({ ply, length: text.length }),
    });
    voiceService.speakForced(text).then(
      () => {
        if (token !== activeTokenRef.current) return;
        setNarrationState('idle');
        plyFullySpokenRef.current = true; // this ply's narration finished
        // VOICE-PROMISE RESOLUTION IS THE ONLY ADVANCE TRIGGER (the app's
        // strict-narration contract): the pause starts when the speech ends.
        scheduleAdvance(ply, holdAfter(ply, text, true), token);
      },
      () => {
        if (token !== activeTokenRef.current) return;
        setNarrationState('idle');
        plyFullySpokenRef.current = true; // treat a failed utterance as finished
        scheduleAdvance(ply, holdAfter(ply, text, true), token);
      },
    );
  }, [clearAdvanceTimer, holdAfter, scheduleAdvance]);

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
    // Intro fires at ply 0 — the framing before any move plays.
    speakCurrent(0, narration.intro);
  }, [narration, speakCurrent]);

  const commitPly = useCallback((ply: number, opts: { speak: boolean; navSource?: string }): void => {
    const bounded = Math.max(0, Math.min(ply, lastPly + 1));
    const fromPly = currentPlyRef.current;
    // A new ply is not yet narrated. speakCurrent (speak:true) flips this true on
    // resolve; a silent nav (speak:false, e.g. goBack) leaves it false so a
    // subsequent resume SPEAKS the ply landed on rather than skipping it.
    plyFullySpokenRef.current = false;
    // Mirror synchronously — two taps inside one render tick must step twice,
    // and the auto-advance timer compares against the LIVE ply.
    currentPlyRef.current = bounded;
    setCurrentPly(bounded);
    onPlyChange?.(bounded);
    // (`review-nav` used to fire here too, saying "target ply N" — every field
    //  of which the step event below already carries, alongside the delta, the
    //  nav source and the target SAN. Two events for one key press, and the
    //  narrower one first.
    //
    //  🔒 THE BOOKKEEPING ATE THE EVIDENCE. David's audit log of 2026-08-11 was
    //  300 findings of which ~208 were review playback — four events per arrow
    //  key — so the GAME he had just played had been evicted from the rolling
    //  buffer before he could copy it, and he reported "no forks noted" about a
    //  game whose fork offers were simply no longer in the window. A diagnostic
    //  that crowds out the thing being diagnosed is worse than no diagnostic.)
    // Step trail — captures the actual delta and nav source so a
    // "review skipped a ply" report has concrete from→to evidence.
    // Look for entries where (bounded - fromPly) is not 1 from a
    // goForward call; that's the fingerprint of the skip bug.
    const segAtTarget = segments.find((s) => s.ply === bounded);
    void logAppAudit({
      kind: 'review-playback-step',
      category: 'subsystem',
      source: 'useReviewPlayback',
      summary: `${fromPly}→${bounded} delta=${bounded - fromPly} via=${opts.navSource ?? 'unknown'} speak=${opts.speak}`,
      details: JSON.stringify({
        fromPly,
        toPly: bounded,
        delta: bounded - fromPly,
        navSource: opts.navSource ?? 'unknown',
        speak: opts.speak,
        targetSan: segAtTarget?.san ?? null,
        lastPly,
      }),
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
    speakCurrent(bounded, text);
  }, [lastPly, narration, onPlyChange, segments, speakCurrent]);

  const pause = useCallback((reason = 'pause'): void => {
    const wasOn = autoRef.current;
    autoRef.current = false;
    resumingAfterPauseRef.current = true; // the next play() is a resume, not a Start
    clearAdvanceTimer();
    setIsAutoPlaying(false);
    if (wasOn) {
      void logAppAudit({
        kind: 'review-playback-step',
        category: 'subsystem',
        source: 'useReviewPlayback.pause',
        summary: `auto-play paused (${reason}) at ply ${currentPlyRef.current}`,
        details: JSON.stringify({ reason, ply: currentPlyRef.current }),
      });
    }
    if (reason === 'pause') {
      // The Pause button also stops the voice mid-sentence; a navigation
      // pause lets commitPly own the voice.
      activeTokenRef.current += 1;
      voiceService.stop();
      setNarrationState('paused');
    }
  }, [clearAdvanceTimer]);

  const goForward = useCallback((opts?: { manual?: boolean }) => {
    if (opts?.manual) pause('forward-tap');
    commitPly(currentPlyRef.current + 1, { speak: true, navSource: opts?.manual ? 'goForward' : 'goForward-auto' });
  }, [commitPly, pause]);
  useEffect(() => { advanceRef.current = (ply: number) => commitPly(ply, { speak: true, navSource: 'auto' }); }, [commitPly]);

  const goBack = useCallback(() => {
    pause('back');
    commitPly(currentPly - 1, { speak: false, navSource: 'goBack' });
  }, [commitPly, currentPly, pause]);

  const goToStart = useCallback(() => {
    pause('start');
    commitPly(0, { speak: true, navSource: 'goToStart' });
  }, [commitPly, pause]);

  const goToEnd = useCallback(() => {
    pause('end');
    commitPly(lastPly, { speak: true, navSource: 'goToEnd' });
  }, [commitPly, lastPly, pause]);

  const jumpToPly = useCallback((ply: number, opts?: { speak?: boolean; keepAuto?: boolean }) => {
    const speak = opts?.speak ?? true;
    if (!opts?.keepAuto) pause('jump');
    commitPly(ply, { speak, navSource: 'jumpToPly' });
  }, [commitPly, pause]);

  const play = useCallback((): void => {
    if (autoRef.current) return;
    autoRef.current = true;
    setIsAutoPlaying(true);
    void logAppAudit({
      kind: 'review-playback-step',
      category: 'subsystem',
      source: 'useReviewPlayback.play',
      summary: `auto-play started at ply ${currentPlyRef.current}`,
      details: JSON.stringify({ ply: currentPlyRef.current }),
    });
    // Mid-sentence when paused → the in-flight resolution handler resumes the
    // chain (autoRef is now true), so don't start a second utterance.
    if (narrationState === 'speaking') { resumingAfterPauseRef.current = false; return; }
    const resuming = resumingAfterPauseRef.current;
    resumingAfterPauseRef.current = false;
    // RESUMING after a pause, on a ply that already finished narrating → ADVANCE
    // rather than restate it (David 2026-09-14: "it restates the narration it
    // just said first before advancing"). A fresh Start, or a ply interrupted
    // mid-sentence, still SPEAKS the current ply (so ply 0 / the intro shows).
    if (resuming && plyFullySpokenRef.current) {
      if (onAutoAdvanceRef.current) handleOutcome(onAutoAdvanceRef.current(), currentPlyRef.current);
      else advanceRef.current(currentPlyRef.current + 1);
    } else {
      speakCurrent(currentPlyRef.current, currentText);
    }
  }, [narrationState, speakCurrent, currentText]);

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
      // currentPly is the rendered ply (no setState pending), so the
      // closure value is correct here.
      speakCurrent(currentPly, currentText);
    }
  }, [narrationState, speakCurrent, currentText, currentPly]);

  const replay = useCallback(() => {
    speakCurrent(currentPly, currentText);
  }, [speakCurrent, currentText, currentPly]);

  const hintPlies = useMemo(
    () => {
      if (!gameId) return [];
      return hintRequests
        .filter((r) => r.gameId === gameId && r.ply > 0)
        .map((r) => r.ply);
    },
    [hintRequests, gameId],
  );

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
    hintPlies,
    isAutoPlaying,
    play,
    pause,
  };
}
