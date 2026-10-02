import { useEffect, useRef } from 'react';
import { onWeaknessModelChanged } from '../services/weaknessModelEvents';
import { loadProvenTags } from '../services/studentRecord';

/**
 * Watch for a capability turning GREEN while the student plays (David
 * 2026-10-01: "add the tile to mid game"). The loop made visible: the moment
 * the coach learns you got better.
 *
 * ONE definition of proven — `capabilityProven`, the bar every consumer reads.
 * This only DIFFS it: a snapshot when the game starts, and a re-read each time
 * the student model changes (`recordCapabilityEvidence` emits). A tag proven
 * before the game began never fires; a tag that crosses during it fires once.
 */
export function useProvenWatcher(active: boolean, onProven: (tag: string) => void): void {
  const onProvenRef = useRef(onProven);
  onProvenRef.current = onProven;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let known: Set<string> | null = null;
    const read = loadProvenTags;
    void read().then((s) => { if (!cancelled) known = s; }).catch(() => { known = new Set(); });
    const off = onWeaknessModelChanged(() => {
      void read().then((now) => {
        if (cancelled || !known) return;
        for (const tag of now) {
          if (!known.has(tag)) onProvenRef.current(tag);
        }
        known = now;
      }).catch(() => undefined);
    });
    return () => { cancelled = true; off(); };
  }, [active]);
}
