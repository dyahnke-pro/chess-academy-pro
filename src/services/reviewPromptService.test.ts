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
    expect(() => requestStoreReview()).not.toThrow();
  });
});

describe('reviewPromptService — "Yes, I love it" opens the App Store review page', () => {
  const realLocation = window.location;
  let href = '';
  beforeEach(() => {
    href = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { set href(v: string) { href = v; }, get href() { return href; } },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    vi.restoreAllMocks();
  });

  it('on iOS, Yes opens the write-review page in the App Store app', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    await handlePositiveResponse();
    expect(href).toBe('itms-apps://apps.apple.com/app/id6776418777?action=write-review');
  });

  it('on the web app, Yes navigates nowhere (no store listing)', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web');
    await handlePositiveResponse();
    expect(href).toBe('');
  });

  it('Not really never sends anyone to the review page', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    await handleNegativeResponse();
    expect(href).toBe('');
  });
});
