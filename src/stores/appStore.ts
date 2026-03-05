import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  UserProfile, SessionRecord, CoachPersonality, AppTheme, Achievement,
  CoachExpression, CoachGameState, ChatMessage,
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
  coachPersonality: CoachPersonality;

  // Gamification
  pendingAchievement: Achievement | null;

  // Engine
  engineEnabled: boolean;
  evalBarVisible: boolean;

  // Coach system
  coachExpression: CoachExpression;
  coachSpeaking: boolean;
  coachGameState: CoachGameState | null;
  chatMessages: ChatMessage[];

  // Coach overlay
  coachBubbleVisible: boolean;
  coachBubbleText: string;
  coachVoiceOn: boolean;
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
  setCoachPersonality: (personality: CoachPersonality) => void;
  setPendingAchievement: (achievement: Achievement | null) => void;
  toggleEngine: () => void;
  toggleEvalBar: () => void;
  setCoachExpression: (expression: CoachExpression) => void;
  setCoachSpeaking: (speaking: boolean) => void;
  setCoachGameState: (state: CoachGameState | null) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  toggleCoachBubble: () => void;
  setCoachBubbleText: (text: string) => void;
  toggleCoachVoice: () => void;
  reset: () => void;
}

const DEFAULT_STATE: AppState = {
  activeProfile: null,
  isLoading: true,
  currentSession: null,
  sessionTimerActive: false,
  sessionElapsedSeconds: 0,
  activeTheme: null,
  pendingAchievement: null,
  sidebarOpen: false,
  coachPersonality: 'danya',
  engineEnabled: true,
  evalBarVisible: true,
  coachExpression: 'neutral',
  coachSpeaking: false,
  coachGameState: null,
  chatMessages: [],
  coachBubbleVisible: true,
  coachBubbleText: '',
  coachVoiceOn: true,
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

    setCoachPersonality: (personality) => set({ coachPersonality: personality }),

    setPendingAchievement: (achievement) => set({ pendingAchievement: achievement }),

    toggleEngine: () => set((state) => ({ engineEnabled: !state.engineEnabled })),

    toggleEvalBar: () => set((state) => ({ evalBarVisible: !state.evalBarVisible })),

    setCoachExpression: (expression) => set({ coachExpression: expression }),

    setCoachSpeaking: (speaking) => set({ coachSpeaking: speaking }),

    setCoachGameState: (state) => set({ coachGameState: state }),

    setChatMessages: (messages) => set({ chatMessages: messages }),

    addChatMessage: (message) =>
      set((state) => ({ chatMessages: [...state.chatMessages, message] })),

    clearChatMessages: () => set({ chatMessages: [] }),

    toggleCoachBubble: () => set((state) => ({ coachBubbleVisible: !state.coachBubbleVisible })),

    setCoachBubbleText: (text) => set({ coachBubbleText: text }),

    toggleCoachVoice: () => set((state) => ({ coachVoiceOn: !state.coachVoiceOn })),

    reset: () => set(DEFAULT_STATE),
  })),
);
