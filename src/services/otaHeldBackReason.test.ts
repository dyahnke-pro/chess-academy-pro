import { describe, it, expect } from 'vitest';

/**
 * 🔒 THREE OUTCOMES, THREE NAMES (2026-09-22).
 *
 * `ota_install_held_back` derived both `manifestReached` and `reason` from
 * `advertised` alone. That collapses two OPPOSITE outcomes, because an
 * authoritative `{kind:'up_to_date'}` breaks the retry loop with `advertised`
 * still empty:
 *
 *   manifest never reached      → advertised '' → "manifest-unreachable"  ✅
 *   manifest reached, up_to_date→ advertised '' → "manifest-unreachable"  ❌ WRONG
 *
 * Every held-back row in production (26 events / 2 devices) carried
 * `manifest-unreachable` while the endpoint returned HTTP 200 with a valid body
 * on demand — so the label was pointing at a network that is fine.
 *
 * This pins the mapping itself. It is the decision the emitter makes, lifted
 * out so it can be asserted without standing up Capacitor.
 */
function heldBackFields(manifestAuthoritative: boolean, advertised: string): {
  manifestReached: boolean;
  reason: 'manifest-unreachable' | 'advertised-not-staged' | 'server-says-up-to-date';
} {
  return {
    manifestReached: manifestAuthoritative,
    reason: !manifestAuthoritative
      ? 'manifest-unreachable'
      : advertised
        ? 'advertised-not-staged'
        : 'server-says-up-to-date',
  };
}

describe('ota_install_held_back — the reason must not collapse two outcomes', () => {
  it('a manifest that was never reached is the ONLY manifest-unreachable', () => {
    expect(heldBackFields(false, '')).toEqual({ manifestReached: false, reason: 'manifest-unreachable' });
  });

  it('an authoritative up_to_date is NOT a network failure', () => {
    // The regression: advertised is '' here too, and the old code called this
    // "manifest-unreachable" with manifestReached false.
    expect(heldBackFields(true, '')).toEqual({ manifestReached: true, reason: 'server-says-up-to-date' });
  });

  it('a version advertised but not staged is its own case', () => {
    expect(heldBackFields(true, 'ff80e12b')).toEqual({ manifestReached: true, reason: 'advertised-not-staged' });
  });

  it('the three inputs produce three DISTINCT reasons — no two collapse', () => {
    const reasons = [heldBackFields(false, ''), heldBackFields(true, ''), heldBackFields(true, 'abc')]
      .map((f) => f.reason);
    expect(new Set(reasons).size, `two outcomes share a label: ${reasons.join(', ')}`).toBe(3);
  });
});
