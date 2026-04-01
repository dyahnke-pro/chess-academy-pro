import { describe, it, expect, beforeEach } from 'vitest';
import { useSubscriptionStore } from './subscriptionStore';

describe('subscriptionStore', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().reset();
  });

  it('starts with free tier and no usage', () => {
    const state = useSubscriptionStore.getState();
    expect(state.tier).toBe('free');
    expect(state.status).toBe('none');
    expect(state.usage.coachMessagesToday).toBe(0);
    expect(state.usage.gameAnalysesToday).toBe(0);
    expect(state.usage.voiceUtterancesToday).toBe(0);
  });

  it('sets tier to pro', () => {
    useSubscriptionStore.getState().setTier('pro');
    expect(useSubscriptionStore.getState().tier).toBe('pro');
  });

  it('sets subscription status', () => {
    useSubscriptionStore.getState().setStatus('active');
    expect(useSubscriptionStore.getState().status).toBe('active');
  });

  it('sets expiry date', () => {
    useSubscriptionStore.getState().setExpiry('2026-05-01T00:00:00Z');
    expect(useSubscriptionStore.getState().expiresAt).toBe('2026-05-01T00:00:00Z');
  });

  it('sets trial end date', () => {
    useSubscriptionStore.getState().setTrialEnd('2026-04-08T00:00:00Z');
    expect(useSubscriptionStore.getState().trialEndsAt).toBe('2026-04-08T00:00:00Z');
  });

  describe('usage tracking', () => {
    it('increments coach messages', () => {
      useSubscriptionStore.getState().incrementCoachMessages();
      useSubscriptionStore.getState().incrementCoachMessages();
      expect(useSubscriptionStore.getState().usage.coachMessagesToday).toBe(2);
    });

    it('increments game analyses', () => {
      useSubscriptionStore.getState().incrementGameAnalyses();
      expect(useSubscriptionStore.getState().usage.gameAnalysesToday).toBe(1);
    });

    it('increments voice utterances', () => {
      useSubscriptionStore.getState().incrementVoiceUtterances();
      expect(useSubscriptionStore.getState().usage.voiceUtterancesToday).toBe(1);
    });

    it('resets daily usage', () => {
      useSubscriptionStore.getState().incrementCoachMessages();
      useSubscriptionStore.getState().incrementGameAnalyses();
      useSubscriptionStore.getState().incrementVoiceUtterances();
      useSubscriptionStore.getState().resetDailyUsage();

      const { usage } = useSubscriptionStore.getState();
      expect(usage.coachMessagesToday).toBe(0);
      expect(usage.gameAnalysesToday).toBe(0);
      expect(usage.voiceUtterancesToday).toBe(0);
    });
  });

  describe('rate limits', () => {
    it('detects coach message limit', () => {
      const store = useSubscriptionStore.getState();
      expect(store.isCoachLimitReached()).toBe(false);

      // Simulate reaching the limit
      for (let i = 0; i < 100; i++) {
        useSubscriptionStore.getState().incrementCoachMessages();
      }
      expect(useSubscriptionStore.getState().isCoachLimitReached()).toBe(true);
    });

    it('detects game analysis limit', () => {
      for (let i = 0; i < 10; i++) {
        useSubscriptionStore.getState().incrementGameAnalyses();
      }
      expect(useSubscriptionStore.getState().isGameAnalysisLimitReached()).toBe(true);
    });

    it('detects voice utterance limit', () => {
      for (let i = 0; i < 50; i++) {
        useSubscriptionStore.getState().incrementVoiceUtterances();
      }
      expect(useSubscriptionStore.getState().isVoiceLimitReached()).toBe(true);
    });
  });

  describe('feature access', () => {
    it('blocks pro features on free tier', () => {
      expect(useSubscriptionStore.getState().canUseFeature('aiCoach')).toBe(false);
      expect(useSubscriptionStore.getState().canUseFeature('weaknessDetection')).toBe(false);
    });

    it('allows pro features on pro tier', () => {
      useSubscriptionStore.getState().setTier('pro');
      expect(useSubscriptionStore.getState().canUseFeature('aiCoach')).toBe(true);
      expect(useSubscriptionStore.getState().canUseFeature('weaknessDetection')).toBe(true);
    });
  });

  it('resets to default state', () => {
    useSubscriptionStore.getState().setTier('pro');
    useSubscriptionStore.getState().setStatus('active');
    useSubscriptionStore.getState().incrementCoachMessages();
    useSubscriptionStore.getState().reset();

    const state = useSubscriptionStore.getState();
    expect(state.tier).toBe('free');
    expect(state.status).toBe('none');
    expect(state.usage.coachMessagesToday).toBe(0);
  });
});
