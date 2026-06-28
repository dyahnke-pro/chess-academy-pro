import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordPositiveMoment,
  handleNegativeResponse,
  requestStoreReview,
  resetReviewPromptState,
  POSITIVE_MOMENTS_THRESHOLD,
} from './reviewPromptService';
import { useReviewPromptStore } from '../stores/reviewPromptStore';

vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

describe('reviewPromptService — two-step gate logic', () => {
  beforeEach(async () => {
    await resetReviewPromptState();
    useReviewPromptStore.setState({ isOpen: false });
  });

  it('does not arm the prompt before the threshold', async () => {
    for (let i = 0; i < POSITIVE_MOMENTS_THRESHOLD - 1; i++) {
      await recordPositiveMoment('test');
    }
    expect(useReviewPromptStore.getState().isOpen).toBe(false);
  });

  it('arms the prompt exactly when the threshold is reached', async () => {
    for (let i = 0; i < POSITIVE_MOMENTS_THRESHOLD; i++) {
      await recordPositiveMoment('test');
    }
    expect(useReviewPromptStore.getState().isOpen).toBe(true);
  });

  it('does not re-arm after it has already been shown', async () => {
    for (let i = 0; i < POSITIVE_MOMENTS_THRESHOLD; i++) await recordPositiveMoment('test');
    useReviewPromptStore.setState({ isOpen: false }); // user dismissed
    // Further wins must NOT re-open it (ask once).
    for (let i = 0; i < POSITIVE_MOMENTS_THRESHOLD; i++) await recordPositiveMoment('test');
    expect(useReviewPromptStore.getState().isOpen).toBe(false);
  });

  it('negative response marks asked so we stop nagging', async () => {
    await handleNegativeResponse();
    await recordPositiveMoment('test');
    await recordPositiveMoment('test');
    await recordPositiveMoment('test');
    expect(useReviewPromptStore.getState().isOpen).toBe(false);
  });

  it('requestStoreReview no-ops safely on web (no native UI)', async () => {
    await expect(requestStoreReview()).resolves.toBeUndefined();
  });
});
