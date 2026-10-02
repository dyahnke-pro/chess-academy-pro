import { useEffect, useState } from 'react';
import { loadUpNext, type UpNextState } from '../services/upNextLoader';
import { onRepCompleted } from '../services/repCompletion';

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
    const off = onRepCompleted(() => load());
    return () => { cancelled = true; off(); };
  }, []);
  return state;
}
