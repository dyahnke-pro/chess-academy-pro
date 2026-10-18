import { useEffect, useRef } from 'react';
import { watchProvenTags, watchSkillMeters, type SkillMeterMove } from '../services/learnRecordWatch';

/**
 * Watch the student's record while they play (one hook, one loop module):
 *  - a capability turning GREEN → `onProven` (the FIXED chip, David 2026-10-01);
 *  - a skill METER moved by this game's moves → `onMeters` (the coin and bar,
 *    David 2026-10-18).
 */
export function useLearnRecordWatch(
  active: boolean,
  handlers: { onProven: (tag: string) => void; onMeters: (moves: SkillMeterMove[]) => void },
): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!active) return;
    const offProven = watchProvenTags((tag) => ref.current.onProven(tag));
    const offMeters = watchSkillMeters((moves) => ref.current.onMeters(moves));
    return () => { offProven(); offMeters(); };
  }, [active]);
}
