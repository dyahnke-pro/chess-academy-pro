// studentDossier — the coach's persistent, COMPUTED "notes" on a student (P7,
// David 2026-09-08: "strengthen memory by giving the spine persistent notes it
// can build on"). A single versioned record the coach reads to open a session
// and that BUILDS across sessions (each refresh diffs the last, so it can say
// "you just cleared X").
//
// 🔒 G0: these are NOT LLM-authored notes. Every line is COMPUTED from the
// student's real games — the weakness lifecycle (already computes
// persistent/emerging/fixed + trend) + the curriculum's mastered history. The
// model only PHRASES the dossier when spoken (voiceFacts / coachDrillSay). This
// EXTENDS the existing memory (plan Phase 6: "memory already exists, consume
// it"); the only net-new idea is STRENGTHS — the app computed nothing positive
// before (a coach's notebook says what you're GOOD at, not only your holes).
//
// The core derivation is PURE (deriveDossier); the I/O wrappers read the
// lifecycle + curriculum and cache one row in the `meta` KV store (no new Dexie
// store → no migration on live devices, same pattern as bookDeparturePrecompute).
import { db } from '../db/schema';
import { getWeaknessLifecycle, type WeaknessLifecycle, type WeaknessLifecycleEntry, type LifecycleTrend } from './weaknessLifecycle';
import { getCoachCurriculum } from './coachCurriculumService';
import type { MisconceptionBucket } from '../data/misconceptionTags';

/** A hole the coach is tracking, in the dossier's compact shape. */
export interface DossierHole {
  clusterId: string;
  label: string;
  bucket: MisconceptionBucket;
  trend: LifecycleTrend;
}

/** Something the student does WELL — computed, never asserted. */
export interface DossierStrength {
  label: string;
  /** `fixed` = a weakness that vanished from recent games (self-corrected);
   *  `mastered` = a pattern drilled shut through the curriculum. */
  kind: 'fixed' | 'mastered';
}

/** The coach's persistent notebook on one student. Computed; versioned; builds. */
export interface StudentDossier {
  generatedAt: number;
  /** False when there isn't enough history to trust any trend (never guess). */
  sampleFloorMet: boolean;
  /** Recurring across the whole span — the deep habits. */
  chronicHoles: DossierHole[];
  /** New / recent-only holes. */
  emergingHoles: DossierHole[];
  /** Holes still open but trending the right way (recent < older). */
  improving: DossierHole[];
  /** What the student does well. */
  strengths: DossierStrength[];
  /** The single most pressing hole's label, or null. */
  mostPressingLabel: string | null;
  /** Labels that were chronic in the PRIOR dossier and are now fixed — the
   *  "builds on it" delta the coach can celebrate ("you just cleared X"). */
  newlyCleared: string[];
}

const DOSSIER_KEY = 'coach-dossier.v1';
const MAX_HOLES = 3;
const MAX_STRENGTHS = 3;
const FRESH_MS = 6 * 60 * 60 * 1000; // re-derive at most every 6h in the SWR path

function toHole(e: WeaknessLifecycleEntry): DossierHole {
  return { clusterId: e.clusterId, label: e.label, bucket: e.bucket, trend: e.trend };
}

/**
 * Derive the dossier from the lifecycle + the curriculum's mastered labels,
 * diffing against the prior dossier for the "newly cleared" delta. PURE — no
 * Dexie, no clock beyond the `now` passed in.
 */
export function deriveDossier(
  lc: WeaknessLifecycle,
  masteredLabels: readonly string[],
  prior: StudentDossier | null,
  now: number,
): StudentDossier {
  if (!lc.sampleFloorMet) {
    return {
      generatedAt: now, sampleFloorMet: false,
      chronicHoles: [], emergingHoles: [], improving: [], strengths: [],
      mostPressingLabel: null, newlyCleared: [],
    };
  }

  const chronicHoles = lc.persistent.slice(0, MAX_HOLES).map(toHole);
  const emergingHoles = lc.emerging.slice(0, MAX_HOLES).map(toHole);
  const improving = [...lc.persistent, ...lc.emerging]
    .filter((e) => e.trend === 'improving')
    .slice(0, MAX_HOLES)
    .map(toHole);

  // Strengths: self-fixed weaknesses (gone from recent play) + patterns drilled
  // shut through the curriculum. Both concrete and computed; deduped by label.
  const strengths: DossierStrength[] = [];
  const seen = new Set<string>();
  for (const e of lc.fixed) {
    if (seen.has(e.label)) continue;
    seen.add(e.label);
    strengths.push({ label: e.label, kind: 'fixed' });
    if (strengths.length >= MAX_STRENGTHS) break;
  }
  for (const label of masteredLabels) {
    if (strengths.length >= MAX_STRENGTHS) break;
    if (seen.has(label)) continue;
    seen.add(label);
    strengths.push({ label, kind: 'mastered' });
  }

  // "Builds on it": a label that was chronic last time and is now in `fixed`.
  const priorChronic = new Set((prior?.chronicHoles ?? []).map((h) => h.label));
  const fixedNow = new Set(lc.fixed.map((e) => e.label));
  const newlyCleared = [...priorChronic].filter((l) => fixedNow.has(l));

  return {
    generatedAt: now,
    sampleFloorMet: true,
    chronicHoles,
    emergingHoles,
    improving,
    strengths,
    mostPressingLabel: lc.mostPressing?.label ?? null,
    newlyCleared,
  };
}

async function readCached(): Promise<StudentDossier | null> {
  try {
    const row = await db.meta.get(DOSSIER_KEY);
    if (!row || typeof row.value !== 'string') return null;
    return JSON.parse(row.value) as StudentDossier;
  } catch {
    return null;
  }
}

async function writeCached(d: StudentDossier): Promise<void> {
  try { await db.meta.put({ key: DOSSIER_KEY, value: JSON.stringify(d) }); } catch { /* read-only fallback */ }
}

/** Recompute the dossier from the live spine/curriculum and persist it (diffing
 *  the prior for `newlyCleared`). Returns the fresh dossier. */
export async function refreshStudentDossier(now: number = Date.now()): Promise<StudentDossier> {
  const prior = await readCached();
  let lc: WeaknessLifecycle;
  try { lc = await getWeaknessLifecycle(); } catch {
    // No lifecycle → an honest empty dossier (never invent one).
    const empty = deriveDossier(
      { fixed: [], persistent: [], emerging: [], mostPressing: null, spanDays: 0, gamesConsidered: 0, sampleFloorMet: false } as WeaknessLifecycle,
      [], prior, now,
    );
    await writeCached(empty);
    return empty;
  }
  let masteredLabels: string[] = [];
  try {
    const cur = await getCoachCurriculum(now);
    masteredLabels = (cur?.items ?? []).filter((it) => it.status === 'mastered').map((it) => it.label);
  } catch { masteredLabels = []; }
  const next = deriveDossier(lc, masteredLabels, prior, now);
  await writeCached(next);
  return next;
}

/**
 * Read the dossier, stale-while-revalidate: return the cached row immediately
 * and refresh in the background when it's stale; compute synchronously on a cold
 * cache. Returns null only when there's genuinely nothing computable yet.
 */
export async function getStudentDossier(now: number = Date.now()): Promise<StudentDossier | null> {
  const cached = await readCached();
  if (cached) {
    if (now - cached.generatedAt > FRESH_MS) void refreshStudentDossier(now);
    return cached;
  }
  return refreshStudentDossier(now);
}

/**
 * The code-authored line the coach opens a session with — "here's where you
 * stand." G0: no LLM; every clause is a computed dossier fact. '' when there's
 * not enough history (the caller then just shows the picker). Order: a win to
 * lead on (newly cleared > a strength), what's improving, then the one pattern
 * still costing the most.
 */
export function dossierOpeningLine(d: StudentDossier | null): string {
  if (!d || !d.sampleFloorMet) return '';
  const parts: string[] = [];
  if (d.newlyCleared.length > 0) {
    parts.push(`Since we last worked, you've cleared ${d.newlyCleared[0].toLowerCase()} — it's gone from your recent games.`);
  } else if (d.strengths.length > 0) {
    const s = d.strengths[0];
    parts.push(s.kind === 'fixed'
      ? `${cap(s.label)} used to trip you up and it's gone from your recent games — that's real progress.`
      : `You've drilled ${s.label.toLowerCase()} shut — lean on that.`);
  }
  if (d.improving.length > 0) {
    parts.push(`${cap(d.improving[0].label)} is trending the right way.`);
  }
  if (d.mostPressingLabel) {
    parts.push(`The pattern still costing you the most is ${d.mostPressingLabel.toLowerCase()}.`);
  }
  return parts.join(' ').trim();
}

function cap(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
