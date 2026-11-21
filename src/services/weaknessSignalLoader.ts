import { type FadeLevel } from './fadeText';
// weaknessSignalLoader — the impure adapter that reads the durable weakness
// model from Dexie and produces the precomputed WeaknessSignal[] the narration
// selector consumes (Phase 1 of the unified coach).
//
// Kept SEPARATE from weaknessSignal.ts so that leaf stays pure (types + matchers
// + boost, unit-tested without a DB). This module is the ONE place a surface
// calls to get the student model, once per game/session — never per ply (the
// profile is a couple of Dexie aggregates; recomputing it every move would put
// async DB work on the narration hot path, and mid-game it should stay scoped to
// the teaching at hand, David 2026-09-08).

import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { getWeaknessLifecycle } from './weaknessLifecycle';
import { buildWeaknessSignals, type WeaknessSignal } from './weaknessSignal';
import { onWeaknessModelChanged } from './weaknessModelEvents';
import { capabilityProven, getCapabilityProfile, type CapabilityProfile } from './capabilityEvidence';
import { beginnerPrior, beginnerVerdict, type BeginnerVerdict } from './beginnerRegister';
import { useAppStore } from '../stores/appStore';
import { loadInaccuracyVoice } from './inaccuracyVoice';

/** The tags the positive record has PROVEN — the ONE definition
 *  (`capabilityProven`), read here so the pure leaf never touches Dexie.
 *  A failed read is an empty set: nothing green, nothing lowered. */
async function provenTagSet(): Promise<Set<string>> {
  try {
    const profile = await getCapabilityProfile();
    const out = new Set<string>();
    for (const [tag, entry] of profile) if (capabilityProven(entry)) out.add(tag);
    return out;
  } catch {
    return new Set();
  }
}

// A short-lived module memo so the several narration hooks that each want the
// profile share ONE Dexie read per game instead of hammering it per mount/ply.
// The TTL is the "precompute once per game" contract (David 2026-09-08:
// stay scoped to the teaching at hand — a hole created mid-game influences
// narration next game, not this one). 5 min comfortably spans a game's
// narration needs without a per-ply DB hit.
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; sigs: WeaknessSignal[] } | null = null;
let inflight: Promise<WeaknessSignal[]> | null = null;

/**
 * Load + join the student's weakness profile and lifecycle into narration-ready
 * signals, memoized per game. Resilient: any Dexie failure (a real risk on iOS
 * WebKit under memory pressure — see getUnifiedWeaknessProfile's own transaction
 * notes) degrades to an EMPTY profile, which makes the whole selector wire inert
 * (today's behavior) rather than throwing on a coaching surface. NEVER call on a
 * kid surface.
 */
/** The last signals read (`loadWeaknessSignals`), for a line made at once (a
 *  correction's habit): null until the record has been read once. */
export function weaknessSignalsNow(): readonly WeaknessSignal[] | null { return cache?.sigs ?? null; }

export async function loadWeaknessSignals(): Promise<WeaknessSignal[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.sigs;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      // The negative half and the positive half are loaded TOGETHER — the
      // green join (C6) happens where both are in hand, never in the leaf.
      const [profile, lifecycle, proven] = await Promise.all([
        getUnifiedWeaknessProfile(),
        getWeaknessLifecycle().catch(() => null),
        provenTagSet(),
      ]);
      const sigs = buildWeaknessSignals(profile, lifecycle, proven);
      cache = { at: Date.now(), sigs };
      return sigs;
    } catch {
      return [];
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** The PROVEN tags on their own — the fade's input (short phrasing when a
 *  skill is green). Separate from the signals because a student can be green
 *  on a skill they never got wrong, which has no weakness signal to ride on.
 *  Memoized on the same TTL; a failed read is an empty set (nothing fades). */
let provenCache: { at: number; tags: Set<string> } | null = null;
export async function loadProvenTags(): Promise<Set<string>> {
  if (provenCache && Date.now() - provenCache.at < TTL_MS) return provenCache.tags;
  const tags = await provenTagSet();
  provenCache = { at: Date.now(), tags };
  return tags;
}

/** THE FADE LEVEL per skill, from the student's own record: `short` when
 *  proven, `lighter` when answered right since the last miss (a held streak)
 *  but not yet proven. Absent = full teaching (grey or red). */
export async function loadFadeLevels(): Promise<Map<string, FadeLevel>> {
  // The inaccuracy tally is the other half of "how much does the record let
  // the coach say": read with the fade, when the surface opens and when the
  // record settles — never first on a slip, which left it unread all game.
  void loadInaccuracyVoice();
  try {
    // THE WHOLE RECORD (§C1): the heat tiles, slips and capabilities together.
    const { loadStudentRecord } = await import('./studentRecord');
    const { recordLevels } = await import('./recordShortening');
    const { layerStandings } = await import('./teachingLayers');
    const r = await loadStudentRecord();
    // Skills AND layers: the one shortener's levels (`recordShortening`).
    return recordLevels(r.heat, layerStandings(r.weaknesses, r.capabilities));
  } catch {
    return new Map();
  }
}

/** Drop the memo — call after the weakness model changes (new mistake captured /
 *  drill completed) so the next load reflects it. */
export function invalidateWeaknessSignals(): void {
  cache = null;
  provenCache = null;
}

// THE WRITERS TELL US (WO-LOOP-01, 2026-09-20). `invalidateWeaknessSignals` had
// zero callers, so a slip the sweep recorded did not reach the next narration
// for five minutes. The writers emit on the leaf event; this is the one reader.
onWeaknessModelChanged(invalidateWeaknessSignals);

/** THE BEGINNER REGISTER for this student, read off their record
 *  (`beginnerRegister.beginnerVerdict`). One loader, memoized, dropped when the
 *  record changes — every surface that speaks in the register reads it here. */
let beginnerCache: { prior: boolean; verdict: BeginnerVerdict } | null = null;
let beginnerInflight: Promise<BeginnerVerdict> | null = null;

/** The register's cold-start prior for the active profile. */
export function beginnerPriorNow(): boolean {
  return beginnerPrior(useAppStore.getState().activeProfile);
}

/** The last verdict read, or the prior when none has been read yet. */
export function beginnerRegisterNow(): boolean {
  const prior = beginnerPriorNow();
  return beginnerCache && beginnerCache.prior === prior ? beginnerCache.verdict.beginner : prior;
}

export async function loadBeginnerRegister(): Promise<BeginnerVerdict> {
  const prior = beginnerPriorNow();
  if (beginnerCache && beginnerCache.prior === prior) return beginnerCache.verdict;
  if (beginnerInflight) return beginnerInflight;
  beginnerInflight = (async () => {
    try {
      const profile = await getCapabilityProfile('use').catch((): CapabilityProfile => new Map());
      const verdict = beginnerVerdict(new Map([...profile.entries()].map(([tag, e]) => [tag, e.hold] as const)), prior);
      beginnerCache = { prior, verdict };
      return verdict;
    } finally {
      beginnerInflight = null;
    }
  })();
  return beginnerInflight;
}

onWeaknessModelChanged(() => { beginnerCache = null; });

