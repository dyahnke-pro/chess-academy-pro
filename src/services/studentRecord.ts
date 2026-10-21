// studentRecord — the ONE door to both halves of the student model: the holes
// they keep falling in (the weakness spine) and what they have PROVEN (the
// capability profile). They load together so no reader can raise a red hole
// and miss a green one, and every "is this proven?" reads the one bar,
// `capabilityProven`.

// The HEAT MAP rides on the same record (OS-4, 2026-10-19): Learn's record
// terms read each skill's red/grey/green, and a second record shape for that
// was the rot rule — one thing, two types. The tiles are the heat map tab's
// own verdict (`heatMap`: the hold rate over the evidence rows and the slips).

import { loadWeaknessSignals } from './weaknessSignalLoader';
import { profileOfSnapshot, summariseEvidence, type CapabilityEvidenceRecord, type CapabilityProfile } from './capabilityEvidence';
import { evidenceMirror, slipMirror } from './recordMirror';
import { heatMap, type HeatTile } from './heatMap';
import type { WeaknessSignal } from './weaknessSignal';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';

/** The student's whole record. Every field REQUIRED, so a new builder has to
 *  answer for each half. */
export interface StudentRecord {
  /** The holes they keep falling in (the weakness spine). */
  weaknesses: readonly WeaknessSignal[];
  /** What they have PROVEN. Null = not loaded (reads as grey everywhere). */
  capabilities: CapabilityProfile | null;
  /** One tile per skill — red / grey / green, the heat map tab's verdict.
   *  A skill with no tile is grey. */
  heat: ReadonlyMap<MisconceptionTagId, HeatTile>;
}

/** A fresh install: nothing recorded, every skill grey. */
export const EMPTY_STUDENT_RECORD: StudentRecord = { weaknesses: [], capabilities: null, heat: new Map() };

/** The ONE builder for rows in hand (tests, offline measures). The live
 *  loaders go through `studentRecordOfSnapshot`, which builds the same record
 *  through the same `recordOf`. */
export function studentRecordFrom(
  weaknesses: readonly WeaknessSignal[],
  evidence: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
  now: number = Date.now(),
): StudentRecord {
  return recordOf(weaknesses, summariseEvidence(evidence, slips), evidence, slips, now);
}

/** The tiles read the ROWS (the hold rate over both halves), off the one
 *  summary the record carries — never a second walk of the same rows. */
function recordOf(
  weaknesses: readonly WeaknessSignal[],
  capabilities: CapabilityProfile,
  evidence: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
  now: number,
): StudentRecord {
  const heat = new Map<MisconceptionTagId, HeatTile>();
  for (const t of heatMap(evidence, slips, { now, profile: capabilities })) heat.set(t.tag, t);
  return { weaknesses, capabilities, heat };
}

/** The last record built from the mirror's snapshots. Snapshots are frozen
 *  and a write publishes new ones, so the three identities are the whole key:
 *  the fade levels, the record hook and the need loader that all reload after
 *  one move get ONE build, not one each (2026-10-21). */
let lastBuilt: {
  weaknesses: readonly WeaknessSignal[];
  evidence: readonly CapabilityEvidenceRecord[];
  slips: readonly MisconceptionTagRecord[];
  record: StudentRecord;
} | null = null;

/** The record of the mirror's snapshots (`recordMirror`) — what every live
 *  loader calls. The summary is shared with the capability profile memo
 *  (`profileOfSnapshot`). */
export function studentRecordOfSnapshot(
  weaknesses: readonly WeaknessSignal[],
  evidence: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
): StudentRecord {
  const hit = lastBuilt;
  if (hit && hit.weaknesses === weaknesses && hit.evidence === evidence && hit.slips === slips) return hit.record;
  const record = recordOf(weaknesses, profileOfSnapshot(evidence, slips, 'use'), evidence, slips, Date.now());
  lastBuilt = { weaknesses, evidence, slips, record };
  return record;
}

/** Every half, loaded together. A failed half reads as empty (a cold student
 *  is taught, never silenced). The rows come from the mirror: read once per
 *  session and patched by the tables' own writes, never re-read per call. */
export async function loadStudentRecord(): Promise<StudentRecord> {
  const [weaknesses, evidence, slips] = await Promise.all([
    loadWeaknessSignals().catch(() => []),
    // Inside the promise: a store that cannot be opened (or is missing)
    // reads as empty instead of throwing out of the one door.
    Promise.resolve().then(() => evidenceMirror.rows()).catch((): readonly CapabilityEvidenceRecord[] => NO_EVIDENCE),
    Promise.resolve().then(() => slipMirror.rows()).catch((): readonly MisconceptionTagRecord[] => NO_SLIPS),
  ]);
  return studentRecordOfSnapshot(weaknesses, evidence, slips);
}
const NO_EVIDENCE: readonly CapabilityEvidenceRecord[] = Object.freeze([]);
const NO_SLIPS: readonly MisconceptionTagRecord[] = Object.freeze([]);

/** The tags the student has PROVEN, by the one bar. One reader: this used to
 *  be a second copy of the loader's computation, and two copies of "what is
 *  green" drift (2026-10-13). */
export { loadProvenTags } from './weaknessSignalLoader';
