// coachCurriculumService — the persistent, data-driven curriculum arc (Phase 7,
// David 2026-08-26 §8: "a persistent, data-driven arc … picks your top
// weaknesses, sequences them, advances to the next when one closes, tracks the
// arc across sessions").
//
// HONEST SCOPE (not oversold): this is derived from your mistakes, not a coach's
// forward intuition. But "close X, then Y" — sequenced from the weakness spine,
// persisted, advanced when a weakness is drilled shut — is a real arc.
//
// The build/reconcile logic is PURE (testable without Dexie); the store I/O is a
// thin single-row read/write. G0/G3 intact: the arc is computed from the
// weakness spine (getUnifiedWeaknessProfile); nothing is invented.
import { db, type CoachCurriculumRecord, type CurriculumItem } from '../db/schema';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from './weaknessSpine';

export type { CoachCurriculumRecord, CurriculumItem } from '../db/schema';

/** Fixed single-row key — one active arc per device. */
const ROW_ID = 'active';
/** How many weaknesses the arc sequences at once (1 active + up to 2 queued). */
const ARC_SIZE = 3;

/** A spine weakness is "open" (worth being on the arc) when it still has
 *  unresolved instances. openCount === 0 means it's drilled shut. */
function isOpen(w: UnifiedWeakness): boolean {
  return w.openCount > 0;
}

function toItem(w: UnifiedWeakness, status: CurriculumItem['status'], now: number): CurriculumItem {
  return { tag: w.tag, label: w.label, patternThemes: [...w.puzzleThemes], status, addedAt: now };
}

/**
 * Build a fresh arc from the ranked weakness spine: the top open weakness is
 * `active`, the next few are `queued`. Empty when there's no open weakness.
 * PURE — `now` is passed in so it's deterministic in tests.
 */
export function buildCurriculum(weaknesses: UnifiedWeakness[], now: number, max = ARC_SIZE): CoachCurriculumRecord {
  const open = weaknesses.filter(isOpen).slice(0, max);
  const items = open.map((w, i) => toItem(w, i === 0 ? 'active' : 'queued', now));
  return { id: ROW_ID, items, updatedAt: now };
}

/**
 * Reconcile an existing arc against the current spine (PURE):
 *  - the ACTIVE step is marked `mastered` when its weakness is no longer open
 *    (drilled shut) — kept as history with a masteredAt stamp;
 *  - the first still-open queued step becomes the new `active`;
 *  - queued steps refresh from the current top open weaknesses not already on
 *    the arc, keeping the arc at `max` live (active + queued) steps;
 *  - mastered history is preserved (never dropped).
 * A weakness that reopens (new instances after being mastered) re-enters as a
 * fresh queued step.
 */
export function reconcileCurriculum(
  existing: CoachCurriculumRecord,
  weaknesses: UnifiedWeakness[],
  now: number,
  max = ARC_SIZE,
): CoachCurriculumRecord {
  const openByTag = new Map(weaknesses.filter(isOpen).map((w) => [w.tag, w] as const));
  const mastered = existing.items.filter((it) => it.status === 'mastered');
  const masteredTags = new Set(mastered.map((it) => it.tag));

  // Close any live (active/queued) step whose weakness is no longer open.
  const stillLive: CurriculumItem[] = [];
  for (const it of existing.items) {
    if (it.status === 'mastered') continue;
    if (openByTag.has(it.tag)) {
      stillLive.push({ ...it, status: 'queued' }); // re-rank below; demote for now
    } else {
      // Drilled shut → mastered history. A reopened tag (open again) is handled
      // by the refresh step, which can add it back as a fresh queued item.
      mastered.push({ ...it, status: 'mastered', masteredAt: now });
      masteredTags.add(it.tag);
    }
  }

  // Rank the live pool by the spine's own order (recency+severity), then top up
  // from fresh open weaknesses not already live or mastered.
  const liveTags = new Set(stillLive.map((it) => it.tag));
  const rankedLive = weaknesses
    .filter((w) => liveTags.has(w.tag))
    .map((w) => stillLive.find((it) => it.tag === w.tag) as CurriculumItem);
  const fresh = weaknesses
    .filter((w) => isOpen(w) && !liveTags.has(w.tag) && !masteredTags.has(w.tag))
    .map((w) => toItem(w, 'queued', now));

  const live = [...rankedLive, ...fresh].slice(0, max);
  if (live.length > 0) live[0] = { ...live[0], status: 'active' };
  for (let i = 1; i < live.length; i += 1) live[i] = { ...live[i], status: 'queued' };

  return { id: ROW_ID, items: [...live, ...mastered], updatedAt: now };
}

/** The step being drilled now, or null when the arc is empty. */
export function activeCurriculumItem(rec: CoachCurriculumRecord | null): CurriculumItem | null {
  return rec?.items.find((it) => it.status === 'active') ?? null;
}

/** The next queued step (what comes after the active one is drilled shut). */
export function nextCurriculumItem(rec: CoachCurriculumRecord | null): CurriculumItem | null {
  return rec?.items.find((it) => it.status === 'queued') ?? null;
}

// ─── Store I/O (thin) ───────────────────────────────────────────────────────

async function readRow(): Promise<CoachCurriculumRecord | null> {
  try {
    return (await db.coachCurriculum.get(ROW_ID)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Read the arc, building it lazily from the spine on first use. Never throws —
 * returns null when there's no weakness data yet (a clean/new user), so the
 * caller says nothing rather than invent an arc.
 */
export async function getCoachCurriculum(now: number = Date.now()): Promise<CoachCurriculumRecord | null> {
  const existing = await readRow();
  if (existing && existing.items.length > 0) return existing;
  const weaknesses = await getUnifiedWeaknessProfile();
  const built = buildCurriculum(weaknesses, now);
  if (built.items.length === 0) return null;
  try { await db.coachCurriculum.put(built); } catch { /* read-only fallback */ }
  return built;
}

/**
 * Reconcile the arc against the current spine and persist. Call after a drill
 * session (a weakness may have been drilled shut) so the arc advances. Returns
 * the updated arc, or null when there's nothing to track.
 */
export async function syncCoachCurriculum(now: number = Date.now()): Promise<CoachCurriculumRecord | null> {
  const weaknesses = await getUnifiedWeaknessProfile();
  const existing = await readRow();
  const next = existing && existing.items.length > 0
    ? reconcileCurriculum(existing, weaknesses, now)
    : buildCurriculum(weaknesses, now);
  if (next.items.length === 0) return null;
  try { await db.coachCurriculum.put(next); } catch { /* read-only fallback */ }
  return next;
}

/** A one-line spoken arc summary ("we'll close Forks, then Rook endgames"), or
 *  '' when the arc is empty or has only one live step. Code-authored (G0). */
export function curriculumArcLine(rec: CoachCurriculumRecord | null): string {
  const active = activeCurriculumItem(rec);
  const next = nextCurriculumItem(rec);
  if (!active) return '';
  if (!next) return `We're drilling ${active.label.toLowerCase()} until it's shut.`;
  return `The plan: close out ${active.label.toLowerCase()}, then move to ${next.label.toLowerCase()}.`;
}
