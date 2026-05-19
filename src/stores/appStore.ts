import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/schema';
import type {
  UserProfile, AppTheme,
  CoachGameState, ChatMessage, WeaknessProfile,
} from '../types';

/**
 * Write coachVoiceOn back to the profile's Dexie record when the
 * student toggles it. Fire-and-forget — we don't want to block the
 * UI update on a DB write, and a failure here is non-fatal (the
 * value stays correct in-memory for the session and next save will
 * sync it). No-op when there's no active profile yet (cold start
 * before hydration).
 */
function persistCoachVoiceOn(profile: UserProfile | null, on: boolean): void {
  if (!profile) return;
  // Mirror the in-memory flip so cached reads stay correct.
  profile.preferences.coachVoiceOn = on;
  void db.profiles.update(profile.id, {
    preferences: { ...profile.preferences, coachVoiceOn: on },
  }).catch((err: unknown) => {
    console.warn('[appStore] persistCoachVoiceOn failed:', err);
  });
}

/** Same fire-and-forget pattern for the puzzle tactic-name toggle.
 *  Mirrors the value to profile.preferences so it sticks across
 *  reloads (David's call 2026-05-19: "I want a little on off
 *  toggle next to the tactic name"). */
function persistPuzzleShowTacticName(profile: UserProfile | null, on: boolean): void {
  if (!profile) return;
  profile.preferences.puzzleShowTacticName = on;
  void db.profiles.update(profile.id, {
    preferences: { ...profile.preferences, puzzleShowTacticName: on },
  }).catch((err: unknown) => {
    console.warn('[appStore] persistPuzzleShowTacticName failed:', err);
  });
}

/** Puzzle timer toggle. OFF (default): silent background count-up
 *  logged to the puzzle record. ON: visible countdown chip from
 *  puzzleClockTargetSec → 0 (time pressure). Mirrored to
 *  profile.preferences so the choice sticks. */
function persistPuzzleTimerOn(profile: UserProfile | null, on: boolean): void {
  if (!profile) return;
  profile.preferences.puzzleTimerOn = on;
  void db.profiles.update(profile.id, {
    preferences: { ...profile.preferences, puzzleTimerOn: on },
  }).catch((err: unknown) => {
    console.warn('[appStore] persistPuzzleTimerOn failed:', err);
  });
}

/** Countdown target in seconds for the visible-clock mode. */
function persistPuzzleClockTargetSec(profile: UserProfile | null, sec: number): void {
  if (!profile) return;
  profile.preferences.puzzleClockTargetSec = sec;
  void db.profiles.update(profile.id, {
    preferences: { ...profile.preferences, puzzleClockTargetSec: sec },
  }).catch((err: unknown) => {
    console.warn('[appStore] persistPuzzleClockTargetSec failed:', err);
  });
}

interface AppState {
  // Auth / Profile
  activeProfile: UserProfile | null;
  isLoading: boolean;

  // UI state
  activeTheme: AppTheme | null;
  sidebarOpen: boolean;

  // Engine
  engineEnabled: boolean;
  evalBarVisible: boolean;

  // Coach system
  coachGameState: CoachGameState | null;
  chatMessages: ChatMessage[];
  weaknessProfile: WeaknessProfile | null;

  // Coach overlay
  coachBubbleVisible: boolean;
  coachBubbleText: string;
  coachVoiceOn: boolean;
  coachTipsOn: boolean;
  /** Show the named tactic above each mistake puzzle. Toggleable
   *  by the student via the eye-icon button next to the chip. */
  puzzleShowTacticName: boolean;
  /** ON: visible countdown chip (time pressure). OFF (default):
   *  hidden background timer that gets logged to the puzzle
   *  record for /weaknesses aggregation. */
  puzzleTimerOn: boolean;
  /** Target seconds for the visible countdown mode. */
  puzzleClockTargetSec: number;

  // Background analysis
  backgroundAnalysisRunning: boolean;
  backgroundAnalysisProgress: string | null; // e.g. "3/12 — Smith vs Jones"

  // Global coach drawer
  coachDrawerOpen: boolean;
  coachDrawerInitialMessage: string | null;
  /** Modality of the pending initial message — tells the drawer's
   *  chat panel whether to render the first exchange as a spoken
   *  "Speaking…" chip (voice) or a normal text bubble (text). */
  coachDrawerInitialMessageModality: 'voice' | 'text';
  coachEdgeTabPercent: number; // 0–100, vertical position on right edge
  globalBoardContext: {
    fen: string;
    pgn: string;
    moveNumber: number;
    playerColor: string;
    turn: string;
    lastMove: { from: string; to: string; san: string } | null;
    history: string[];
    timestamp: number;
  } | null;
  globalPracticePosition: { fen: string; label: string } | null;
  /**
   * Last board the user looked at anywhere in the app. Unlike
   * `globalBoardContext`, this survives the source screen unmounting, so
   * the coach chat / explain-position flow can reach for "the position
   * I was just looking at" after the user navigates away.
   *
   * Consumers should treat snapshots older than
   * `LAST_BOARD_SNAPSHOT_TTL_MS` as stale and fall back to asking the
   * user for a position.
   */
  lastBoardSnapshot: {
    fen: string;
    /** Where the FEN came from — "analysis", "game-review", "puzzle", etc. */
    source: string;
    /** Optional human label used by UI ("Game vs. Smith, move 14"). */
    label?: string;
    timestamp: number;
  } | null;
}

/** Snapshots older than this are considered stale (15 min). */
export const LAST_BOARD_SNAPSHOT_TTL_MS = 15 * 60 * 1000;

interface AppActions {
  setActiveProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveTheme: (theme: AppTheme) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleEngine: () => void;
  toggleEvalBar: () => void;
  setCoachGameState: (state: CoachGameState | null) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setWeaknessProfile: (profile: WeaknessProfile | null) => void;
  toggleCoachBubble: () => void;
  setCoachBubbleText: (text: string) => void;
  toggleCoachVoice: () => void;
  setCoachVoiceOn: (on: boolean) => void;
  toggleCoachTips: () => void;
  togglePuzzleShowTacticName: () => void;
  setPuzzleShowTacticName: (on: boolean) => void;
  togglePuzzleTimer: () => void;
  setPuzzleTimerOn: (on: boolean) => void;
  setPuzzleClockTargetSec: (sec: number) => void;
  setBackgroundAnalysis: (running: boolean, progress?: string | null) => void;
  setCoachDrawerOpen: (open: boolean) => void;
  setCoachDrawerInitialMessage: (msg: string | null, modality?: 'voice' | 'text') => void;
  setCoachEdgeTabPercent: (percent: number) => void;
  setGlobalBoardContext: (ctx: AppState['globalBoardContext']) => void;
  setGlobalPracticePosition: (pos: AppState['globalPracticePosition']) => void;
  /**
   * Capture the "current position" for cross-screen reuse. Called from
   * every board-containing screen via `useBoardContext`. Persists until
   * overwritten — survives screen unmount.
   */
  setLastBoardSnapshot: (snapshot: { fen: string; source: string; label?: string }) => void;
  clearLastBoardSnapshot: () => void;
  reset: () => void;
}

const DEFAULT_STATE: AppState = {
  activeProfile: null,
  isLoading: true,
  activeTheme: null,
  sidebarOpen: false,
  engineEnabled: true,
  evalBarVisible: true,
  coachGameState: null,
  chatMessages: [],
  weaknessProfile: null,
  coachBubbleVisible: true,
  coachBubbleText: '',
  coachVoiceOn: true,
  coachTipsOn: false,
  puzzleShowTacticName: true,
  // Default OFF: hidden background timer, logged to weakness. Visible
  // countdown is opt-in for students who want time pressure.
  puzzleTimerOn: false,
  puzzleClockTargetSec: 60,
  backgroundAnalysisRunning: false,
  backgroundAnalysisProgress: null,
  coachDrawerOpen: false,
  coachDrawerInitialMessage: null,
  coachDrawerInitialMessageModality: 'text',
  coachEdgeTabPercent: 50,
  globalBoardContext: null,
  globalPracticePosition: null,
  lastBoardSnapshot: null,
};

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set) => ({
    ...DEFAULT_STATE,

    setActiveProfile: (profile) => {
      // Hydrate coachVoiceOn from the profile's persisted preference
      // when available. Previously coachVoiceOn reset to the in-memory
      // default on every reload, silently overriding the user's last
      // explicit choice — same silent-override pattern as the tempo
      // bug. Falls back to the current default (true) when the field
      // isn't present on the profile yet.
      const persisted = profile?.preferences.coachVoiceOn;
      const nextVoiceOn = typeof persisted === 'boolean' ? persisted : true;
      const persistedTacticName = profile?.preferences.puzzleShowTacticName;
      const nextPuzzleShowTacticName = typeof persistedTacticName === 'boolean' ? persistedTacticName : true;
      const persistedTimer = profile?.preferences.puzzleTimerOn;
      // Default flipped to false 2026-05-19 per David's clock design:
      // hidden background timer is the default; visible countdown is
      // opt-in for time pressure.
      const nextPuzzleTimerOn = typeof persistedTimer === 'boolean' ? persistedTimer : false;
      const persistedClockTarget = profile?.preferences.puzzleClockTargetSec;
      const nextClockTarget = typeof persistedClockTarget === 'number' && persistedClockTarget > 0
        ? persistedClockTarget
        : 60;
      set({
        activeProfile: profile,
        coachVoiceOn: nextVoiceOn,
        puzzleShowTacticName: nextPuzzleShowTacticName,
        puzzleTimerOn: nextPuzzleTimerOn,
        puzzleClockTargetSec: nextClockTarget,
      });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    setActiveTheme: (theme) => set({ activeTheme: theme }),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    toggleEngine: () => set((state) => ({ engineEnabled: !state.engineEnabled })),

    toggleEvalBar: () => set((state) => ({ evalBarVisible: !state.evalBarVisible })),

    setCoachGameState: (state) => set({ coachGameState: state }),

    setChatMessages: (messages) => set({ chatMessages: messages }),

    addChatMessage: (message) =>
      set((state) => ({ chatMessages: [...state.chatMessages, message] })),

    clearChatMessages: () => set({ chatMessages: [] }),

    setWeaknessProfile: (profile) => set({ weaknessProfile: profile }),

    toggleCoachBubble: () => set((state) => ({ coachBubbleVisible: !state.coachBubbleVisible })),

    setCoachBubbleText: (text) => set({ coachBubbleText: text }),

    toggleCoachVoice: () => set((state) => {
      const next = !state.coachVoiceOn;
      persistCoachVoiceOn(state.activeProfile, next);
      return { coachVoiceOn: next };
    }),

    setCoachVoiceOn: (on) => set((state) => {
      persistCoachVoiceOn(state.activeProfile, on);
      return { coachVoiceOn: on };
    }),

    toggleCoachTips: () => set((state) => ({ coachTipsOn: !state.coachTipsOn })),

    togglePuzzleShowTacticName: () => set((state) => {
      const next = !state.puzzleShowTacticName;
      persistPuzzleShowTacticName(state.activeProfile, next);
      return { puzzleShowTacticName: next };
    }),

    setPuzzleShowTacticName: (on) => set((state) => {
      persistPuzzleShowTacticName(state.activeProfile, on);
      return { puzzleShowTacticName: on };
    }),

    togglePuzzleTimer: () => set((state) => {
      const next = !state.puzzleTimerOn;
      persistPuzzleTimerOn(state.activeProfile, next);
      return { puzzleTimerOn: next };
    }),

    setPuzzleTimerOn: (on) => set((state) => {
      persistPuzzleTimerOn(state.activeProfile, on);
      return { puzzleTimerOn: on };
    }),

    setPuzzleClockTargetSec: (sec) => set((state) => {
      // Clamp to sensible 10–600s window; out-of-range inputs would
      // produce a useless clock (1s = always expired, 9999s = always
      // green) and confuse the timer chip.
      const clamped = Math.min(600, Math.max(10, Math.round(sec)));
      persistPuzzleClockTargetSec(state.activeProfile, clamped);
      return { puzzleClockTargetSec: clamped };
    }),

    setBackgroundAnalysis: (running, progress) =>
      set({ backgroundAnalysisRunning: running, backgroundAnalysisProgress: progress ?? null }),

    setCoachDrawerOpen: (open) => set({ coachDrawerOpen: open }),

    setCoachDrawerInitialMessage: (msg, modality = 'text') =>
      set({ coachDrawerInitialMessage: msg, coachDrawerInitialMessageModality: modality }),

    setCoachEdgeTabPercent: (percent) => set({ coachEdgeTabPercent: Math.max(10, Math.min(90, percent)) }),

    setGlobalBoardContext: (ctx) => set({ globalBoardContext: ctx }),

    setGlobalPracticePosition: (pos) => set({ globalPracticePosition: pos }),

    setLastBoardSnapshot: ({ fen, source, label }) =>
      set({ lastBoardSnapshot: { fen, source, label, timestamp: Date.now() } }),

    clearLastBoardSnapshot: () => set({ lastBoardSnapshot: null }),

    reset: () => set(DEFAULT_STATE),
  })),
);

/**
 * Read the last board snapshot, returning `null` if it is older than
 * `LAST_BOARD_SNAPSHOT_TTL_MS`. Use this from screens that want to
 * reach for "the position the user was just looking at" — e.g. the
 * coach chat's explain-position flow.
 */
export function selectFreshBoardSnapshot(
  state: AppState,
  nowMs: number = Date.now(),
): AppState['lastBoardSnapshot'] {
  const snapshot = state.lastBoardSnapshot;
  if (!snapshot) return null;
  if (nowMs - snapshot.timestamp > LAST_BOARD_SNAPSHOT_TTL_MS) return null;
  return snapshot;
}
