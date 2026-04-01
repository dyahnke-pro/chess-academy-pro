import { describe, it, expect } from 'vitest';
import { isFeatureAvailable, isProFeature, getRouteFeatureRequirement } from './featureGates';
import type { ProFeatureId } from '../types/subscription';

describe('featureGates', () => {
  describe('isFeatureAvailable', () => {
    const proFeatures: ProFeatureId[] = [
      'aiCoach',
      'weaknessDetection',
      'proRepertoires',
      'voiceCoaching',
      'cloudSync',
      'gameAnalysisAI',
    ];

    it('grants all features to pro users', () => {
      for (const feature of proFeatures) {
        expect(isFeatureAvailable(feature, 'pro')).toBe(true);
      }
    });

    it('blocks pro-only features for free users', () => {
      for (const feature of proFeatures) {
        expect(isFeatureAvailable(feature, 'free')).toBe(false);
      }
    });
  });

  describe('isProFeature', () => {
    it('returns true for pro features', () => {
      expect(isProFeature('aiCoach')).toBe(true);
      expect(isProFeature('weaknessDetection')).toBe(true);
    });
  });

  describe('getRouteFeatureRequirement', () => {
    it('returns aiCoach for coach routes', () => {
      expect(getRouteFeatureRequirement('/coach')).toBe('aiCoach');
      expect(getRouteFeatureRequirement('/coach/play')).toBe('aiCoach');
      expect(getRouteFeatureRequirement('/coach/chat')).toBe('aiCoach');
      expect(getRouteFeatureRequirement('/coach/analyse')).toBe('aiCoach');
      expect(getRouteFeatureRequirement('/coach/plan')).toBe('aiCoach');
    });

    it('returns weaknessDetection for weakness route', () => {
      expect(getRouteFeatureRequirement('/weaknesses')).toBe('weaknessDetection');
    });

    it('returns null for ungated routes', () => {
      expect(getRouteFeatureRequirement('/')).toBeNull();
      expect(getRouteFeatureRequirement('/openings')).toBeNull();
      expect(getRouteFeatureRequirement('/settings')).toBeNull();
      expect(getRouteFeatureRequirement('/stats')).toBeNull();
    });
  });
});
