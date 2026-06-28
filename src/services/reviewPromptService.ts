import { Capacitor } from '@capacitor/core';
import { db } from '../db/schema';
import { useReviewPromptStore } from '../stores/reviewPromptStore';
import { logAppAudit } from './appAuditor';

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

/** Positive moments required before the soft prompt appears. Low so it lands
 *  early — before a user has time to hit the rough edges (David's call). */
export const POSITIVE_MOMENTS_THRESHOLD = 3;

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
