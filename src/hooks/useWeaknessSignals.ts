// useWeaknessSignals — the surface-side handle on the student model (Phase 1 of
// the unified coach). Loads the precomputed WeaknessSignal[] once (memoized in
// the loader) and exposes it as a REF so async narration callbacks read the
// latest set at fire-time without forcing a re-render on the board. Coaching
// surfaces (learn/play/openings) call this; kid surfaces NEVER do.

import { useEffect, useRef } from 'react';
import { loadWeaknessSignals } from '../services/weaknessSignalLoader';
import type { WeaknessSignal } from '../services/weaknessSignal';

/**
 * Returns a ref whose `.current` is the student's weakness signals ([] until
 * loaded). Read `ref.current` inside the on-demand/async narration path — by the
 * time the coach speaks, the profile is loaded; a stale [] just means "no boost"
 * (the selector wire is inert), never a crash.
 */
export function useWeaknessSignals(): React.MutableRefObject<readonly WeaknessSignal[]> {
  const ref = useRef<readonly WeaknessSignal[]>([]);
  useEffect(() => {
    let alive = true;
    void loadWeaknessSignals().then((s) => { if (alive) ref.current = s; });
    return () => { alive = false; };
  }, []);
  return ref;
}
