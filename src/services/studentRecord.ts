// studentRecord — the ONE door to both halves of the student model: the holes
// they keep falling in (the weakness spine) and what they have PROVEN (the
// capability profile). They load together so no reader can raise a red hole
// and miss a green one, and every "is this proven?" reads the one bar,
// `capabilityProven`.

// The HEAT MAP rides on the same record (OS-4, 2026-10-19): Learn's record
// terms read each skill's red/grey/green, and a second record shape for that
// was the rot rule — one thing, two types. The tiles are the heat map tab's
// own verdict (`heatMap` over the same slips and capabilities).

import { db } from '../db/schema';
import { loadWeaknessSignals } from './weaknessSignalLoader';
import { getCapabilityProfile, type CapabilityProfile, type CapabilityProfileEntry } from './capabilityEvidence';
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
  capabilities: CapabilityProfile | null,
  slips: readonly MisconceptionTagRecord[],
  now: number = Date.now(),
): StudentRecord {
  const heat = new Map<MisconceptionTagId, HeatTile>();
  const profile: CapabilityProfile = capabilities ?? new Map<MisconceptionTagId, CapabilityProfileEntry>();
  for (const t of heatMap(profile, slips, now)) heat.set(t.tag, t);
  return { weaknesses, capabilities, heat };
}

/** Every half, loaded together. A failed half reads as empty (a cold student
 *  is taught, never silenced). */
export async function loadStudentRecord(): Promise<StudentRecord> {
  const [weaknesses, capabilities, slips] = await Promise.all([
    loadWeaknessSignals().catch(() => []),
    getCapabilityProfile().catch((): CapabilityProfile => new Map()),
    db.misconceptionTags.toArray().catch((): MisconceptionTagRecord[] => []),
  ]);
  return studentRecordFrom(weaknesses, capabilities, slips);
}

/** The tags the student has PROVEN, by the one bar. One reader: this used to
 *  be a second copy of the loader's computation, and two copies of "what is
 *  green" drift (2026-10-13). */
export { loadProvenTags } from './weaknessSignalLoader';
