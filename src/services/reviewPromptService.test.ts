import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import {
  recordPositiveMoment,
  handleNegativeResponse,
  handlePositiveResponse,
  requestStoreReview,
  resetReviewPromptState,
  POSITIVE_MOMENTS_THRESHOLD,
} from './reviewPromptService';
import { useReviewPromptStore } from '../stores/reviewPromptStore';

vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));
const requestReview = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@capacitor-community/in-app-review', () => ({ InAppReview: { requestReview } }));

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

  it('reports true only on the call that opened the prompt, so a surface can hold its board', async () => {
    const results: boolean[] = [];
    for (let i = 0; i < POSITIVE_MOMENTS_THRESHOLD + 2; i++) results.push(await recordPositiveMoment('test'));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results[POSITIVE_MOMENTS_THRESHOLD - 1]).toBe(true);
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

describe('reviewPromptService — "Yes, I love it" asks Apple for the in-app review', () => {
  beforeEach(() => { requestReview.mockClear(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('in the iOS app, Yes requests the in-app review dialog', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    await handlePositiveResponse();
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('on the web app, Yes requests nothing (no native dialog)', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    await handlePositiveResponse();
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('Not really never asks for a review', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    await handleNegativeResponse();
    expect(requestReview).not.toHaveBeenCalled();
  });
});
