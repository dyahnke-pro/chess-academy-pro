// ─── Subscription Types ─────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro';

export type SubscriptionPeriod = 'monthly' | 'annual';

export type SubscriptionStatus = 'none' | 'active' | 'trial' | 'expired' | 'grace_period';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null;
  trialEndsAt: string | null;
  originalTransactionId: string | null;
}

export interface SubscriptionUsage {
  coachMessagesToday: number;
  gameAnalysesToday: number;
  voiceUtterancesToday: number;
}

// ─── Feature Gating ─────────────────────────────────────────────────────────

export type ProFeatureId =
  | 'aiCoach'
  | 'weaknessDetection'
  | 'proRepertoires'
  | 'voiceCoaching'
  | 'cloudSync'
  | 'gameAnalysisAI';

// ─── Product IDs (App Store Connect) ────────────────────────────────────────

export const PRODUCT_ID_MONTHLY = 'com.chessacademy.pro.monthly';
export const PRODUCT_ID_ANNUAL = 'com.chessacademy.pro.annual';

// ─── Usage Limits ───────────────────────────────────────────────────────────

export const DAILY_COACH_MESSAGE_LIMIT = 100;
export const DAILY_COACH_MESSAGE_WARNING = 80;
export const DAILY_GAME_ANALYSIS_LIMIT = 10;
export const DAILY_VOICE_UTTERANCE_LIMIT = 50;

// ─── Proxy API ──────────────────────────────────────────────────────────────

export interface CoachProxyRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
  max_tokens?: number;
  receipt: string;
  device_id: string;
}

export interface CoachProxyError {
  error: string;
  limit?: number;
  resets_at?: string;
}
