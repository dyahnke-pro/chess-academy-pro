// ─── Feature Gating Service ─────────────────────────────────────────────────
//
// Controls which features are available based on subscription tier.
// Free tier: Stockfish, puzzles, basic openings, board customization, stats.
// Pro tier: AI coach, weakness detection, pro repertoires, voice, cloud sync.

import type { ProFeatureId, SubscriptionTier } from '../types/subscription';

const PRO_ONLY_FEATURES: ReadonlySet<ProFeatureId> = new Set([
  'aiCoach',
  'weaknessDetection',
  'proRepertoires',
  'voiceCoaching',
  'cloudSync',
  'gameAnalysisAI',
]);

export function isFeatureAvailable(
  feature: ProFeatureId,
  tier: SubscriptionTier,
): boolean {
  if (tier === 'pro') return true;
  return !PRO_ONLY_FEATURES.has(feature);
}

export function isProFeature(feature: ProFeatureId): boolean {
  return PRO_ONLY_FEATURES.has(feature);
}

// ─── Route → Feature Mapping ────────────────────────────────────────────────
//
// Used by the router to gate entire pages behind Pro.

const ROUTE_FEATURE_MAP: Record<string, ProFeatureId> = {
  '/coach': 'aiCoach',
  '/coach/play': 'aiCoach',
  '/coach/chat': 'aiCoach',
  '/coach/analyse': 'aiCoach',
  '/coach/plan': 'aiCoach',
  '/weaknesses': 'weaknessDetection',
};

export function getRouteFeatureRequirement(pathname: string): ProFeatureId | null {
  return ROUTE_FEATURE_MAP[pathname] ?? null;
}
