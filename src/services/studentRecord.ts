// studentRecord — the ONE door to both halves of the student model: the holes
// they keep falling in (the weakness spine) and what they have PROVEN (the
// capability profile). They load together so no reader can raise a red hole
// and miss a green one, and every "is this proven?" reads the one bar,
// `capabilityProven`.

import { loadWeaknessSignals } from './weaknessSignalLoader';
import { getCapabilityProfile, type CapabilityProfile } from './capabilityEvidence';
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

/** The tags the student has PROVEN, by the one bar. One reader: this used to
 *  be a second copy of the loader's computation, and two copies of "what is
 *  green" drift (2026-10-13). */
export { loadProvenTags } from './weaknessSignalLoader';
