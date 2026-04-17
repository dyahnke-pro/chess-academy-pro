import { describe, it, expect } from 'vitest';
import {
  resolvePricingTier,
  getPricingOffer,
  getOfferForTier,
  buildShareIntents,
  isBetaPhaseActive,
  remainingFreeMonths,
  projectedNextBillingDate,
  BETA_PHASE_END_DATE,
} from './pricingService';
import { buildUserProfile } from '../test/factories';

describe('isBetaPhaseActive', () => {
  it('returns true before the cutoff', () => {
    expect(isBetaPhaseActive(new Date('2026-04-17T00:00:00Z'))).toBe(true);
  });

  it('returns false well after the cutoff', () => {
    expect(isBetaPhaseActive(new Date('2030-01-01T00:00:00Z'))).toBe(false);
  });

  it('treats the cutoff day itself as still beta', () => {
    expect(isBetaPhaseActive(new Date(`${BETA_PHASE_END_DATE}T12:00:00Z`))).toBe(true);
  });
});

describe('resolvePricingTier', () => {
  it('returns the stored tier verbatim when set', () => {
    const profile = buildUserProfile();
    profile.preferences.pricingTier = 'standard';
    expect(resolvePricingTier(profile)).toBe('standard');
  });

  it('defaults unset profiles to beta during beta phase', () => {
    const profile = buildUserProfile();
    delete profile.preferences.pricingTier;
    expect(resolvePricingTier(profile, new Date('2026-04-17T00:00:00Z'))).toBe('beta');
  });

  it('defaults unset profiles to standard post-beta', () => {
    const profile = buildUserProfile();
    delete profile.preferences.pricingTier;
    expect(resolvePricingTier(profile, new Date('2030-01-01T00:00:00Z'))).toBe('standard');
  });
});

describe('getPricingOffer', () => {
  it('beta tier is $2.99/mo locked for life', () => {
    const profile = buildUserProfile();
    profile.preferences.pricingTier = 'beta';
    const offer = getPricingOffer(profile);
    expect(offer.priceMonthly).toBe(2.99);
    expect(offer.lockedForLife).toBe(true);
  });

  it('standard tier is $7.99/mo, not locked', () => {
    const profile = buildUserProfile();
    profile.preferences.pricingTier = 'standard';
    const offer = getPricingOffer(profile);
    expect(offer.priceMonthly).toBe(7.99);
    expect(offer.lockedForLife).toBe(false);
  });
});

describe('getOfferForTier', () => {
  it('returns offers for all tiers', () => {
    expect(getOfferForTier('beta').priceMonthly).toBe(2.99);
    expect(getOfferForTier('standard').priceMonthly).toBe(7.99);
    expect(getOfferForTier('free-trial').free).toBe(true);
  });
});

describe('remainingFreeMonths', () => {
  it('returns 0 when no profile', () => {
    expect(remainingFreeMonths(null)).toBe(0);
    expect(remainingFreeMonths(undefined)).toBe(0);
  });

  it('returns 0 when earned and used are both zero or unset', () => {
    const profile = buildUserProfile();
    expect(remainingFreeMonths(profile)).toBe(0);
  });

  it('returns earned - used when both are set', () => {
    const profile = buildUserProfile();
    profile.preferences.freeMonthsEarned = 5;
    profile.preferences.freeMonthsUsed = 2;
    expect(remainingFreeMonths(profile)).toBe(3);
  });

  it('clamps to 0 when used exceeds earned (data bug)', () => {
    const profile = buildUserProfile();
    profile.preferences.freeMonthsEarned = 1;
    profile.preferences.freeMonthsUsed = 5;
    expect(remainingFreeMonths(profile)).toBe(0);
  });

  it('handles earned alone (used unset)', () => {
    const profile = buildUserProfile();
    profile.preferences.freeMonthsEarned = 3;
    expect(remainingFreeMonths(profile)).toBe(3);
  });
});

describe('projectedNextBillingDate', () => {
  it('returns null when no profile', () => {
    expect(projectedNextBillingDate(null)).toBeNull();
  });

  it('pushes by N months when N free months remain', () => {
    const profile = buildUserProfile();
    profile.preferences.freeMonthsEarned = 3;
    profile.preferences.freeMonthsUsed = 0;
    const now = new Date('2026-04-17T00:00:00Z');
    const projected = projectedNextBillingDate(profile, now);
    expect(projected).not.toBeNull();
    // Expect it pushed ~3 months
    const diffMs = projected!.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(80);
    expect(diffDays).toBeLessThan(100);
  });

  it('returns "now" when no free months remain', () => {
    const profile = buildUserProfile();
    const now = new Date('2026-04-17T00:00:00Z');
    const projected = projectedNextBillingDate(profile, now);
    expect(projected?.getTime()).toBe(now.getTime());
  });
});

describe('buildShareIntents', () => {
  it('returns X, Reddit, and copy intents', () => {
    const intents = buildShareIntents('https://chessacademy.pro/landing');
    expect(intents.map((i) => i.platform)).toEqual(['x', 'reddit', 'copy']);
  });

  it('X intent contains tweet URL with encoded URL', () => {
    const intents = buildShareIntents('https://chessacademy.pro/landing');
    const x = intents.find((i) => i.platform === 'x');
    expect(x?.url).toContain('x.com/intent/tweet');
    expect(x?.url).toContain(encodeURIComponent('https://chessacademy.pro/landing'));
  });

  it('Reddit intent contains reddit.com/submit with encoded URL', () => {
    const intents = buildShareIntents('https://chessacademy.pro/landing');
    const reddit = intents.find((i) => i.platform === 'reddit');
    expect(reddit?.url).toContain('reddit.com/submit');
  });
});
