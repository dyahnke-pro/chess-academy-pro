/**
 * referralService — the client half of the free-opening reward loop (David
 * 2026-09-06). Talks to /api/referrals (Redis) and mirrors earned credits into
 * the local free-tier ledger (freeTierService.syncOpeningCredits).
 *
 * Confirmation model (no login, only device_id): a referral is NEVER trusted
 * from the recruiter's word — the reward for BOTH sides unlocks only after the
 * NEW user's first genuine win calls `reportQualifyingUse()`. See
 * docs/plans/2026-09-06-referral-rewards.md.
 *
 * Reward has real value only on native (App Store paywall); on the permanently-
 * unlocked web app the credits are a harmless no-op. G0-clean: pure product
 * bookkeeping, the LLM decides nothing.
 */
import { getDeviceId } from './deviceIdentity';
import { syncOpeningCredits } from './freeTierService';
import { captureEvent } from './analytics';
import { db } from './../db/schema';

const API = '/api/referrals';
const QUALIFY_REPORTED_KEY = 'referral.qualifyReported';

/** Notify the free-tier store mirror that the ledger changed (a reward writes
 *  Dexie directly, bypassing the store's own actions). */
function notifyLedgerChanged(): void {
  try { window.dispatchEvent(new CustomEvent('free-tier-updated')); } catch { /* no window (tests/node) */ }
}

export interface ReferralStatus {
  /** This device's shareable code. */
  code: string;
  /** Earned free-opening credits (server truth). */
  credits: number;
  /** How many people this device has recruited who qualified. */
  recruits: number;
  /** This device's own claim state (did it enter someone's code?). */
  claimed: { qualified: boolean; ts: number } | null;
}

/** Fetch this device's referral status AND mirror credits into the ledger.
 *  Never throws — returns null when the API is unreachable/unconfigured. */
export async function getStatus(): Promise<ReferralStatus | null> {
  try {
    const device = await getDeviceId();
    const res = await fetch(`${API}?device=${encodeURIComponent(device)}&cb=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: unknown; credits?: unknown; recruits?: unknown;
      claimed?: { qualified?: unknown; ts?: unknown } | null;
    };
    if (typeof data.code !== 'string') return null;
    const claimed = data.claimed && typeof data.claimed === 'object';
    const status: ReferralStatus = {
      code: data.code,
      credits: Math.max(0, Number(data.credits) || 0),
      recruits: Math.max(0, Number(data.recruits) || 0),
      claimed: claimed ? { qualified: data.claimed?.qualified === true, ts: Number(data.claimed?.ts) || 0 } : null,
    };
    await syncOpeningCredits(status.credits);
    notifyLedgerChanged();
    return status;
  } catch { return null; }
}

/** Pull the latest credits and mirror them into the ledger. Cheap; call on app
 *  open + when the bell opens so a credit earned on another device lands here. */
export async function ensureSyncedCredits(): Promise<void> {
  await getStatus();
}

export type ClaimOutcome = 'ok' | 'already-claimed' | 'unknown-code' | 'own-code' | 'error';

/** The user entered a friend's code. Records the pending referral server-side.
 *  The reward unlocks later (for both) once THIS device qualifies on real use. */
export async function claimCode(code: string): Promise<ClaimOutcome> {
  const c = code.trim().toUpperCase();
  if (!c) return 'error';
  try {
    const device = await getDeviceId();
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'claim', device, code: c }),
    });
    if (!res.ok) return 'error';
    const data = (await res.json()) as { ok?: boolean; reason?: string };
    if (data.ok) {
      // A user may have played (and set the once-flag) BEFORE entering a code.
      // Clear it so their next genuine win re-reports and qualifies this new
      // referral. The server qualify is idempotent, so this is always safe.
      try { await db.meta.delete(QUALIFY_REPORTED_KEY); } catch { /* best-effort */ }
      captureEvent('referral_code_claimed', { ok: true });
      return 'ok';
    }
    const reason = (data.reason ?? 'error') as ClaimOutcome;
    captureEvent('referral_code_claimed', { ok: false, reason });
    return reason === 'already-claimed' || reason === 'unknown-code' || reason === 'own-code' ? reason : 'error';
  } catch { return 'error'; }
}

/** Called at the new user's first genuine win. Idempotent (a local once-flag +
 *  the server's own idempotency), so it's safe to call from every win site. On
 *  the FIRST qualify it credits both this device and the referrer. */
export async function reportQualifyingUse(): Promise<void> {
  try {
    const already = await db.meta.get(QUALIFY_REPORTED_KEY);
    if (already?.value === '1') return;
  } catch { /* fall through — the server is idempotent anyway */ }
  try {
    const device = await getDeviceId();
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'qualify', device }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { ok?: boolean; granted?: boolean; credits?: number };
    try { await db.meta.put({ key: QUALIFY_REPORTED_KEY, value: '1' }); } catch { /* best-effort */ }
    if (data.granted) {
      captureEvent('referral_qualified', { as: 'recruit' });
      captureEvent('referral_reward_granted', { source: 'referral', credits: Number(data.credits) || 0 });
      await syncOpeningCredits(Number(data.credits) || 0);
      notifyLedgerChanged();
    }
  } catch { /* offline — the once-flag isn't set, so a later win retries */ }
}

/** Grant the one-time review reward (user tapped through the happy-path review
 *  prompt). Server-guarded to fire once per device. */
export async function grantReviewReward(): Promise<void> {
  try {
    const device = await getDeviceId();
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reviewReward', device }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { ok?: boolean; granted?: boolean; credits?: number };
    if (data.granted) {
      captureEvent('referral_reward_granted', { source: 'review', credits: Number(data.credits) || 0 });
      await syncOpeningCredits(Number(data.credits) || 0);
      notifyLedgerChanged();
    }
  } catch { /* best-effort */ }
}
