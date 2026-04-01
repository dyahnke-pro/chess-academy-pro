import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionUsage,
  ProFeatureId,
} from '../types/subscription';
import {
  DAILY_COACH_MESSAGE_LIMIT,
  DAILY_GAME_ANALYSIS_LIMIT,
  DAILY_VOICE_UTTERANCE_LIMIT,
} from '../types/subscription';
import { isFeatureAvailable } from '../services/featureGates';

// ─── State ──────────────────────────────────────────────────────────────────

interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null;
  trialEndsAt: string | null;
  usage: SubscriptionUsage;
  loading: boolean;
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface SubscriptionActions {
  setTier: (tier: SubscriptionTier) => void;
  setStatus: (status: SubscriptionStatus) => void;
  setExpiry: (expiresAt: string | null) => void;
  setTrialEnd: (trialEndsAt: string | null) => void;
  setLoading: (loading: boolean) => void;
  incrementCoachMessages: () => void;
  incrementGameAnalyses: () => void;
  incrementVoiceUtterances: () => void;
  resetDailyUsage: () => void;
  canUseFeature: (feature: ProFeatureId) => boolean;
  isCoachLimitReached: () => boolean;
  isGameAnalysisLimitReached: () => boolean;
  isVoiceLimitReached: () => boolean;
  reset: () => void;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_USAGE: SubscriptionUsage = {
  coachMessagesToday: 0,
  gameAnalysesToday: 0,
  voiceUtterancesToday: 0,
};

const DEFAULT_STATE: SubscriptionState = {
  tier: 'free',
  status: 'none',
  expiresAt: null,
  trialEndsAt: null,
  usage: DEFAULT_USAGE,
  loading: false,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useSubscriptionStore = create<SubscriptionState & SubscriptionActions>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    setTier: (tier) => set({ tier }),

    setStatus: (status) => set({ status }),

    setExpiry: (expiresAt) => set({ expiresAt }),

    setTrialEnd: (trialEndsAt) => set({ trialEndsAt }),

    setLoading: (loading) => set({ loading }),

    incrementCoachMessages: () =>
      set((state) => ({
        usage: {
          ...state.usage,
          coachMessagesToday: state.usage.coachMessagesToday + 1,
        },
      })),

    incrementGameAnalyses: () =>
      set((state) => ({
        usage: {
          ...state.usage,
          gameAnalysesToday: state.usage.gameAnalysesToday + 1,
        },
      })),

    incrementVoiceUtterances: () =>
      set((state) => ({
        usage: {
          ...state.usage,
          voiceUtterancesToday: state.usage.voiceUtterancesToday + 1,
        },
      })),

    resetDailyUsage: () => set({ usage: DEFAULT_USAGE }),

    canUseFeature: (feature) => isFeatureAvailable(feature, get().tier),

    isCoachLimitReached: () =>
      get().usage.coachMessagesToday >= DAILY_COACH_MESSAGE_LIMIT,

    isGameAnalysisLimitReached: () =>
      get().usage.gameAnalysesToday >= DAILY_GAME_ANALYSIS_LIMIT,

    isVoiceLimitReached: () =>
      get().usage.voiceUtterancesToday >= DAILY_VOICE_UTTERANCE_LIMIT,

    reset: () => set(DEFAULT_STATE),
  })),
);
