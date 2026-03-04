import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UserProfile, SessionRecord, CoachPersonality, AppTheme } from '../types';

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
  coachMessageVisible: boolean;
  coachMessage: string;
  coachPersonality: CoachPersonality;

  // Engine
  engineEnabled: boolean;
  evalBarVisible: boolean;
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
  showCoachMessage: (message: string) => void;
  hideCoachMessage: () => void;
  setCoachPersonality: (personality: CoachPersonality) => void;
  toggleEngine: () => void;
  toggleEvalBar: () => void;
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
  coachMessageVisible: false,
  coachMessage: '',
  coachPersonality: 'danya',
  engineEnabled: true,
  evalBarVisible: true,
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

    showCoachMessage: (message) =>
      set({ coachMessage: message, coachMessageVisible: true }),

    hideCoachMessage: () => set({ coachMessageVisible: false }),

    setCoachPersonality: (personality) => set({ coachPersonality: personality }),

    toggleEngine: () => set((state) => ({ engineEnabled: !state.engineEnabled })),

    toggleEvalBar: () => set((state) => ({ evalBarVisible: !state.evalBarVisible })),

    reset: () => set(DEFAULT_STATE),
  })),
);
