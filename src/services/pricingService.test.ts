import { describe, it, expect } from 'vitest';
import {
  resolvePricingTier,
  getPricingOffer,
  getOfferForTier,
  buildShareIntents,
  isBetaPhaseActive,
  BETA_PHASE_END_DATE,
} from './pricingService';
import { buildUserProfile } from '../test/factories';

describe('isBetaPhaseActive', () => {
  it('returns true before the cutoff', () => {
    const beforeCutoff = new Date('2026-04-17T00:00:00Z');
    expect(isBetaPhaseActive(beforeCutoff)).toBe(true);
  });

  it('returns false well after the cutoff', () => {
    const wayAfter = new Date('2030-01-01T00:00:00Z');
    expect(isBetaPhaseActive(wayAfter)).toBe(false);
  });

  it('treats the cutoff day itself as still beta', () => {
    const cutoffDay = new Date(`${BETA_PHASE_END_DATE}T12:00:00Z`);
    expect(isBetaPhaseActive(cutoffDay)).toBe(true);
  });
});

describe('resolvePricingTier', () => {
  it('returns the stored tier verbatim when set', () => {
    const profile = buildUserProfile();
    profile.preferences.pricingTier = 'free-social';
    expect(resolvePricingTier(profile)).toBe('free-social');
  });

  it('defaults unset profiles to beta during beta phase', () => {
    const profile = buildUserProfile();
    delete profile.preferences.pricingTier;
    const beforeCutoff = new Date('2026-04-17T00:00:00Z');
    expect(resolvePricingTier(profile, beforeCutoff)).toBe('beta');
  });

  it('defaults unset profiles to standard post-beta', () => {
    const profile = buildUserProfile();
    delete profile.preferences.pricingTier;
    const wayAfter = new Date('2030-01-01T00:00:00Z');
    expect(resolvePricingTier(profile, wayAfter)).toBe('standard');
  });

  it('returns standard when no profile is provided post-beta', () => {
    const wayAfter = new Date('2030-01-01T00:00:00Z');
    expect(resolvePricingTier(null, wayAfter)).toBe('standard');
    expect(resolvePricingTier(undefined, wayAfter)).toBe('standard');
  });
});

describe('getPricingOffer', () => {
  it('beta tier is $2.99/mo locked for life', () => {
    const profile = buildUserProfile();
    profile.preferences.pricingTier = 'beta';
    const offer = getPricingOffer(profile);
    expect(offer.priceMonthly).toBe(2.99);
    expect(offer.lockedForLife).toBe(true);
    expect(offer.free).toBe(false);
    expect(offer.label).toMatch(/beta/i);
  });

  it('free-social tier is $0 and free: true', () => {
    const profile = buildUserProfile();
    profile.preferences.pricingTier = 'free-social';
    const offer = getPricingOffer(profile);
    expect(offer.priceMonthly).toBe(0);
    expect(offer.priceYearly).toBe(0);
    expect(offer.free).toBe(true);
    expect(offer.lockedForLife).toBe(true);
  });

  it('standard tier is $7.99/mo, not locked', () => {
    const profile = buildUserProfile();
    profile.preferences.pricingTier = 'standard';
    const offer = getPricingOffer(profile);
    expect(offer.priceMonthly).toBe(7.99);
    expect(offer.lockedForLife).toBe(false);
    expect(offer.free).toBe(false);
  });
});

describe('getOfferForTier', () => {
  it('returns the offer for each tier without needing a profile', () => {
    expect(getOfferForTier('beta').priceMonthly).toBe(2.99);
    expect(getOfferForTier('standard').priceMonthly).toBe(7.99);
    expect(getOfferForTier('free-social').priceMonthly).toBe(0);
    expect(getOfferForTier('free-trial').free).toBe(true);
  });
});

describe('buildShareIntents', () => {
  it('returns X, Reddit, and copy intents with the URL embedded', () => {
    const intents = buildShareIntents('https://chessacademy.pro/landing');
    expect(intents).toHaveLength(3);
    const platforms = intents.map((i) => i.platform);
    expect(platforms).toEqual(['x', 'reddit', 'copy']);

    const x = intents.find((i) => i.platform === 'x');
    expect(x?.url).toContain('x.com/intent/tweet');
    expect(x?.url).toContain(encodeURIComponent('https://chessacademy.pro/landing'));

    const reddit = intents.find((i) => i.platform === 'reddit');
    expect(reddit?.url).toContain('reddit.com/submit');
    expect(reddit?.url).toContain(encodeURIComponent('https://chessacademy.pro/landing'));
  });

  it('embeds a marketing-ready post body', () => {
    const intents = buildShareIntents('https://chessacademy.pro/landing');
    const x = intents.find((i) => i.platform === 'x');
    // Decode to check the composed text is reasonable
    const decoded = decodeURIComponent(x?.url ?? '');
    expect(decoded).toMatch(/Chess Academy Pro/);
  });
});
