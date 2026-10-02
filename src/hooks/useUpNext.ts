import { useEffect, useState } from 'react';
import { loadUpNext, onUpNextChanged, type UpNextState } from '../services/upNextLoader';
import { loadHomeSuggestion, type FamilyCandidate } from '../services/homeSuggestion';

/** The day's Up-next state (today's ring + the current pick), refreshed the
 *  moment any bite finishes so the pick ROTATES without a reload. */
export function useUpNext(): UpNextState | null {
  const [state, setState] = useState<UpNextState | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void loadUpNext().then((s) => { if (!cancelled) setState(s); }).catch(() => undefined);
    };
    load();
    const off = onUpNextChanged(load);
    return () => { cancelled = true; off(); };
  }, []);
  return state;
}

/** Home's rotating suggestion for this app open (`homeSuggestion`), refreshed
 *  as bites finish — the family holds for the open, its pick moves on. */
export function useHomeSuggestion(): FamilyCandidate | null {
  const [s, setS] = useState<FamilyCandidate | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void loadHomeSuggestion().then((c) => { if (!cancelled) setS(c); }).catch(() => undefined);
    };
    load();
    const off = onUpNextChanged(load);
    return () => { cancelled = true; off(); };
  }, []);
  return s;
}
