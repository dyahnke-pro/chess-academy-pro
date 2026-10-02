// studentRecord — the ONE door to both halves of the student model: the holes
// they keep falling in (the weakness spine) and what they have PROVEN (the
// capability profile). They load together so no reader can raise a red hole
// and miss a green one, and every "is this proven?" reads the one bar,
// `capabilityProven`.

import { loadWeaknessSignals } from './weaknessSignalLoader';
import { getCapabilityProfile, capabilityProven, type CapabilityProfile } from './capabilityEvidence';
import type { StudentRecord } from './puzzleMethod';

export type { StudentRecord } from './puzzleMethod';

/** Both halves, loaded together. A failed half reads as empty (a cold student
 *  is taught, never silenced). */
export async function loadStudentRecord(): Promise<StudentRecord> {
  const [weaknesses, capabilities] = await Promise.all([
    loadWeaknessSignals().catch(() => []),
    getCapabilityProfile().catch((): CapabilityProfile => new Map()),
  ]);
  return { weaknesses, capabilities };
}

/** The tags the student has PROVEN, by the one bar. */
export async function loadProvenTags(): Promise<Set<string>> {
  const profile = await getCapabilityProfile();
  const proven = new Set<string>();
  for (const [tag, entry] of profile) if (capabilityProven(entry)) proven.add(tag);
  return proven;
}
