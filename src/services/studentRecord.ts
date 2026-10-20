// studentRecord — the ONE door to both halves of the student model: the holes
// they keep falling in (the weakness spine) and what they have PROVEN (the
// capability profile). They load together so no reader can raise a red hole
// and miss a green one, and every "is this proven?" reads the one bar,
// `capabilityProven`.

// The HEAT MAP rides on the same record (OS-4, 2026-10-19): Learn's record
// terms read each skill's red/grey/green, and a second record shape for that
// was the rot rule — one thing, two types. The tiles are the heat map tab's
// own verdict (`heatMap`: the hold rate over the evidence rows and the slips).

import { db } from '../db/schema';
import { loadWeaknessSignals } from './weaknessSignalLoader';
import { summariseEvidence, type CapabilityEvidenceRecord, type CapabilityProfile } from './capabilityEvidence';
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

/** The ONE builder — `loadStudentRecord` calls it, tests call it with rows. */
export function studentRecordFrom(
  weaknesses: readonly WeaknessSignal[],
  evidence: readonly CapabilityEvidenceRecord[],
  slips: readonly MisconceptionTagRecord[],
  now: number = Date.now(),
): StudentRecord {
  const heat = new Map<MisconceptionTagId, HeatTile>();
  // The tiles read the ROWS (the hold rate over both halves), not a summary.
  for (const t of heatMap(evidence, slips, { now })) heat.set(t.tag, t);
  return { weaknesses, capabilities: summariseEvidence(evidence, slips), heat };
}

/** Every half, loaded together. A failed half reads as empty (a cold student
 *  is taught, never silenced). */
export async function loadStudentRecord(): Promise<StudentRecord> {
  const [weaknesses, evidence, slips] = await Promise.all([
    loadWeaknessSignals().catch(() => []),
    Promise.resolve().then(() => db.capabilityEvidence.toArray()).catch((): CapabilityEvidenceRecord[] => []),
    // Read inside the promise: a store that cannot be opened (or is missing)
    // reads as empty instead of throwing out of the one door.
    Promise.resolve().then(() => db.misconceptionTags.toArray()).catch((): MisconceptionTagRecord[] => []),
  ]);
  return studentRecordFrom(weaknesses, evidence, slips);
}

/** The tags the student has PROVEN, by the one bar. One reader: this used to
 *  be a second copy of the loader's computation, and two copies of "what is
 *  green" drift (2026-10-13). */
export { loadProvenTags } from './weaknessSignalLoader';
