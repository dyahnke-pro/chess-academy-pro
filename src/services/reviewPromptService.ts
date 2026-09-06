import { Capacitor } from '@capacitor/core';
import { db } from '../db/schema';
import { useReviewPromptStore } from '../stores/reviewPromptStore';
import { logAppAudit } from './appAuditor';
import { reportQualifyingUse, grantReviewReward } from './referralService';

/**
 * reviewPromptService — the brain behind the two-step App Store review prompt.
 *
 * STRATEGY (David 2026-06-28): never throw the store-review dialog at a user
 * cold. Instead, after a few GENUINE positive moments (a win — puzzle solved,
 * lesson mastered, game reviewed), show a soft in-app "Enjoying the app?" gate:
 *   - happy  → fire the native store-review dialog (public 5-stars)
 *   - unhappy → route to private feedback (the bug reaches David, NOT the rating)
 * This protects the public rating from users who hit a lurking bug, and only
 * asks people who've actually felt the value.
 *
 * The native dialog is RATE-LIMITED by Apple/Google (they decide whether to
 * actually show it, ~3×/year), so we only ever *request* it — never force it —
 * and we only request it once per device unless reset.
 */
const META_KEY = 'review-prompt.v1';

/** Positive moments required before the soft prompt appears.
 *
 *  🚨 WAS 3, AND AT 3 IT NEVER FIRED ONCE. Measured 2026-09-03 across 90 days of
 *  real App Store users: the `review-prompt-shown` audit had ZERO occurrences,
 *  against a control showing 15 other audit kinds with thousands of events. The
 *  cause was arithmetic, not plumbing — of 67 native devices, 64 had never
 *  finished a single WLPP rung and not one device had ever finished two. A gate
 *  needing three wins sat above a population whose maximum was one.
 *
 *  So it is 1: the first genuine win asks. Three things make that safe rather
 *  than pushy — the ask is the SOFT in-app gate, not the store dialog (an
 *  unhappy user is routed to private feedback and never reaches the public
 *  rating); Apple rate-limits the native dialog regardless (~3×/year); and we
 *  ask once per device and never nag again.
 *
 *  Be clear-eyed about the ceiling: at 1, this would have prompted THREE users
 *  in 90 days. The binding constraint is that almost nobody finishes anything —
 *  32 of 39 users had a single ~4-minute session, and 26 of the 32 who opened
 *  the game importer never completed an import. Lowering this threshold
 *  harvests a nearly empty funnel; it does not fill it. */
export const POSITIVE_MOMENTS_THRESHOLD = 1;

export interface ReviewPromptState {
  /** Count of positive moments recorded so far. */
  moments: number;
  /** True once the soft prompt has been shown (so we don't nag). */
  asked: boolean;
  /** True once the user chose "yes" and we requested the store dialog. */
  rated: boolean;
  /** Epoch ms the prompt was last shown. */
  lastAskedAt: number | null;
}

const DEFAULT_STATE: ReviewPromptState = { moments: 0, asked: false, rated: false, lastAskedAt: null };

async function loadState(): Promise<ReviewPromptState> {
  try {
    const rec = await db.meta.get(META_KEY);
    if (!rec?.value) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(rec.value) as Partial<ReviewPromptState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(state: ReviewPromptState): Promise<void> {
  try {
    await db.meta.put({ key: META_KEY, value: JSON.stringify(state) });
  } catch {
    // Persistence is best-effort; a failed write just means we may re-ask.
  }
}

/**
 * Record a genuine positive moment (a win). Call this from win surfaces —
 * puzzle solved, lesson mastered, game review finished. When enough have
 * accumulated and we haven't asked yet, it arms the soft prompt.
 */
export async function recordPositiveMoment(source: string): Promise<void> {
  // A genuine win is the "actually used the app" signal that qualifies a
  // referral (David 2026-09-06: reward unlocks on real use, not on install).
  // Idempotent + co-located with the existing win instrumentation. Runs
  // regardless of the review-prompt state below.
  void reportQualifyingUse();

  const state = await loadState();
  if (state.asked || state.rated) return; // ask once; don't nag

  state.moments += 1;
  if (state.moments < POSITIVE_MOMENTS_THRESHOLD) {
    await saveState(state);
    return;
  }

  // Threshold reached — arm the prompt now.
  state.asked = true;
  state.lastAskedAt = Date.now();
  await saveState(state);
  useReviewPromptStore.getState().open();
  void logAppAudit({
    kind: 'review-prompt-shown',
    category: 'app',
    source: `reviewPromptService.recordPositiveMoment:${source}`,
    summary: `armed after ${state.moments} positive moments`,
  });
}

/** User said "yes, love it" — request the native store-review dialog. */
export async function handlePositiveResponse(): Promise<void> {
  const state = await loadState();
  state.rated = true;
  await saveState(state);
  void logAppAudit({ kind: 'review-prompt-positive', category: 'app', source: 'reviewPromptService', summary: 'requested store review' });
  // Reward the happy-path tap-through with a free opening (David 2026-09-06).
  // Apple never tells us the star count, so we reward the intent — server
  // guards it to once per device.
  void grantReviewReward();
  await requestStoreReview();
}

/** User said "not really" — we route to feedback in the UI; record it here. */
export async function handleNegativeResponse(): Promise<void> {
  const state = await loadState();
  state.asked = true;
  await saveState(state);
  void logAppAudit({ kind: 'review-prompt-negative', category: 'app', source: 'reviewPromptService', summary: 'routed to feedback' });
}

/** Fire the native store-review dialog (no-op on web — there's no native UI). */
export async function requestStoreReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  } catch (err) {
    void logAppAudit({
      kind: 'review-prompt-positive',
      category: 'app',
      source: 'reviewPromptService.requestStoreReview',
      summary: `native review failed: ${err instanceof Error ? err.message : 'unknown'}`,
    });
  }
}

/** Test/debug helper — clears the stored state so the prompt can re-arm. */
export async function resetReviewPromptState(): Promise<void> {
  await saveState({ ...DEFAULT_STATE });
}
