// useStudentRecord — BOTH halves of the student model in one handle: the holes
// they keep falling in (the weakness spine) and what they have PROVEN (the
// capability profile). A surface that loads one without the other can raise a
// red hole and never notice a green one, so they load together, the same way
// `loadStudentNeedBase` keeps them together. A REF, so a narration callback
// reads the latest at fire time; empty until loaded, which reads as a cold
// student (teach), never as silence. Refreshes when the model changes.

import { useEffect, useRef } from 'react';
import { loadWeaknessSignals } from '../services/weaknessSignalLoader';
import { onWeaknessModelChanged } from '../services/weaknessModelEvents';
import { getCapabilityProfile, type CapabilityProfile } from '../services/capabilityEvidence';
import type { StudentRecord } from '../services/puzzleMethod';

export function useStudentRecord(): React.RefObject<StudentRecord> {
  const ref = useRef<StudentRecord>({ weaknesses: [], capabilities: null });
  useEffect(() => {
    let alive = true;
    const load = (): void => {
      void Promise.all([
        loadWeaknessSignals().catch(() => []),
        getCapabilityProfile().catch((): CapabilityProfile => new Map()),
      ]).then(([weaknesses, capabilities]) => { if (alive) ref.current = { weaknesses, capabilities }; });
    };
    load();
    const off = onWeaknessModelChanged(load);
    return () => { alive = false; off(); };
  }, []);
  return ref;
}
