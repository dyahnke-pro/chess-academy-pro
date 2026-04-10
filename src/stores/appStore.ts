import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  UserProfile, SessionRecord, AppTheme,
  CoachGameState, ChatMessage, WeaknessProfile,
} from '../types';

interface AppState {
  // Auth / Profile
  activeProfile: UserProfile | null;
  isLoading: boolean;

  // Current session
  currentSession: SessionRecord | null;
  sessionTimerActive: boolean;
  sessionElapsedSeconds: number;

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

  // Background analysis
  backgroundAnalysisRunning: boolean;
  backgroundAnalysisProgress: string | null; // e.g. "3/12 — Smith vs Jones"

  // Global coach drawer
  coachDrawerOpen: boolean;
  coachDrawerInitialMessage: string | null;
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
}

interface AppActions {
  setActiveProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentSession: (session: SessionRecord | null) => void;
  startSessionTimer: () => void;
  stopSessionTimer: () => void;
  tickSessionTimer: () => void;
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
  toggleCoachTips: () => void;
  setBackgroundAnalysis: (running: boolean, progress?: string | null) => void;
  setCoachDrawerOpen: (open: boolean) => void;
  setCoachDrawerInitialMessage: (msg: string | null) => void;
  setCoachEdgeTabPercent: (percent: number) => void;
  setGlobalBoardContext: (ctx: AppState['globalBoardContext']) => void;
  setGlobalPracticePosition: (pos: AppState['globalPracticePosition']) => void;
  reset: () => void;
}

const DEFAULT_STATE: AppState = {
  activeProfile: null,
  isLoading: true,
  currentSession: null,
  sessionTimerActive: false,
  sessionElapsedSeconds: 0,
  activeTheme: null,
  sidebarOpen: false,
  engineEnabled: true,
  evalBarVisible: true,
  coachGameState: null,
  chatMessages: [],
  weaknessProfile: null,
  coachBubbleVisible: true,
  coachBubbleText: '',
  coachVoiceOn: false,
  coachTipsOn: false,
  backgroundAnalysisRunning: false,
  backgroundAnalysisProgress: null,
  coachDrawerOpen: false,
  coachDrawerInitialMessage: null,
  coachEdgeTabPercent: 50,
  globalBoardContext: null,
  globalPracticePosition: null,
};

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set) => ({
    ...DEFAULT_STATE,

    setActiveProfile: (profile) => set({ activeProfile: profile }),

    setLoading: (loading) => set({ isLoading: loading }),

    setCurrentSession: (session) => set({ currentSession: session }),

    startSessionTimer: () => set({ sessionTimerActive: true }),

    stopSessionTimer: () => set({ sessionTimerActive: false }),

    tickSessionTimer: () =>
      set((state) => ({
        sessionElapsedSeconds: state.sessionTimerActive
          ? state.sessionElapsedSeconds + 1
          : state.sessionElapsedSeconds,
      })),

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

    toggleCoachVoice: () => set((state) => ({ coachVoiceOn: !state.coachVoiceOn })),

    toggleCoachTips: () => set((state) => ({ coachTipsOn: !state.coachTipsOn })),

    setBackgroundAnalysis: (running, progress) =>
      set({ backgroundAnalysisRunning: running, backgroundAnalysisProgress: progress ?? null }),

    setCoachDrawerOpen: (open) => set({ coachDrawerOpen: open }),

    setCoachDrawerInitialMessage: (msg) => set({ coachDrawerInitialMessage: msg }),

    setCoachEdgeTabPercent: (percent) => set({ coachEdgeTabPercent: Math.max(10, Math.min(90, percent)) }),

    setGlobalBoardContext: (ctx) => set({ globalBoardContext: ctx }),

    setGlobalPracticePosition: (pos) => set({ globalPracticePosition: pos }),

    reset: () => set(DEFAULT_STATE),
  })),
);
