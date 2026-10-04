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
import { getWeaknessLifecycle } from './weaknessLifecycle';

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
 *  - a live (active/queued) step whose weakness is no longer open is marked
 *    `mastered` — kept as history with a masteredAt stamp;
 *  - a MASTERED step whose weakness is open again (new instances in the spine)
 *    REOPENS: it leaves the history and comes back ESCALATED — ahead of every
 *    ordinary queued step, right behind the current active one. When the
 *    student's own lifecycle read says that hole is WORSENING (`worsening`, the
 *    clusterIds `weaknessLifecycle` marks trend 'worsening'), it takes the
 *    active slot outright. Mastery is a verdict on the record, never a
 *    permanent exemption (David 2026-10-04, learn-how-to-think rule 5);
 *  - live steps keep the spine's own order (recency+severity) and the arc is
 *    topped up from fresh open weaknesses not already on it;
 *  - mastered history of still-shut weaknesses is preserved.
 */
export function reconcileCurriculum(
  existing: CoachCurriculumRecord,
  weaknesses: UnifiedWeakness[],
  now: number,
  max = ARC_SIZE,
  worsening: ReadonlySet<string> = new Set(),
): CoachCurriculumRecord {
  const openByTag = new Map(weaknesses.filter(isOpen).map((w) => [w.tag, w] as const));
  const mastered: CurriculumItem[] = [];
  const reopened: CurriculumItem[] = [];
  const stillLive: CurriculumItem[] = [];

  for (const it of existing.items) {
    if (it.status === 'mastered') {
      if (openByTag.has(it.tag)) {
        // New evidence after mastery → back on the arc, escalated.
        reopened.push({
          ...it,
          status: 'queued',
          escalated: true,
          reopenCount: (it.reopenCount ?? 0) + 1,
          addedAt: now,
        });
      } else {
        mastered.push(it);
      }
      continue;
    }
    if (openByTag.has(it.tag)) {
      stillLive.push({ ...it, status: 'queued' }); // re-rank below
    } else {
      mastered.push({ ...it, status: 'mastered', masteredAt: now, escalated: false });
    }
  }

  const liveTags = new Set([...stillLive, ...reopened].map((it) => it.tag));
  const masteredTags = new Set(mastered.map((it) => it.tag));
  const spineRank = new Map(weaknesses.map((w, i) => [w.tag, i] as const));
  const bySpine = (a: CurriculumItem, b: CurriculumItem): number =>
    (spineRank.get(a.tag) ?? Number.MAX_SAFE_INTEGER) - (spineRank.get(b.tag) ?? Number.MAX_SAFE_INTEGER);

  // The step being drilled keeps its slot unless a WORSENING reopened hole
  // claims it; otherwise the order is escalated-first, then the spine's.
  const priorActiveTag = existing.items.find((it) => it.status === 'active')?.tag;
  const head = stillLive.find((it) => it.tag === priorActiveTag);
  const notHead = (it: CurriculumItem): boolean => it !== head;
  const worseningReopened = reopened.filter((it) => worsening.has(it.tag)).sort(bySpine);
  const otherReopened = reopened.filter((it) => !worsening.has(it.tag)).sort(bySpine);
  const escalatedLive = stillLive.filter((it) => it.escalated && notHead(it)).sort(bySpine);
  const plainLive = stillLive.filter((it) => !it.escalated && notHead(it)).sort(bySpine);

  const fresh = weaknesses
    .filter((w) => isOpen(w) && !liveTags.has(w.tag) && !masteredTags.has(w.tag))
    .map((w) => toItem(w, 'queued', now));

  const ordered = [
    ...worseningReopened,
    ...(head ? [head] : []),
    ...otherReopened,
    ...escalatedLive,
    ...plainLive,
    ...fresh,
  ];
  const live = ordered.slice(0, max);
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

/** clusterIds the student's lifecycle read marks WORSENING (the spine's
 *  analysis tags ARE these clusterIds — weaknessSpine aggregates by
 *  `bucketForMistake(p).clusterId`). Empty below the lifecycle's sample floor:
 *  a trend is never guessed. */
async function worseningClusters(): Promise<ReadonlySet<string>> {
  try {
    const lc = await getWeaknessLifecycle();
    if (!lc.sampleFloorMet) return new Set();
    return new Set([...lc.persistent, ...lc.emerging].filter((e) => e.trend === 'worsening').map((e) => e.clusterId));
  } catch {
    return new Set();
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
    ? reconcileCurriculum(existing, weaknesses, now, ARC_SIZE, await worseningClusters())
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
  if (!next) return `You are drilling ${active.label.toLowerCase()} until it's shut.`;
  return `The plan: close out ${active.label.toLowerCase()}, then move to ${next.label.toLowerCase()}.`;
}
