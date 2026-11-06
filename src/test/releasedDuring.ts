import { afterEach, beforeEach } from 'vitest';
import { HELD_FROM_RELEASE, type HeldSurface } from '../data/heldSurfaces';

/** Runs the surrounding describe with `surfaces` released: a test of how a
 *  held surface works once it ships (`heldSurfaces.ts`). The table is put
 *  back after each test, so nothing else sees the release. */
export function releasedDuring(...surfaces: HeldSurface[]): void {
  let saved: Record<HeldSurface, boolean> = { ...HELD_FROM_RELEASE };
  beforeEach(() => {
    saved = { ...HELD_FROM_RELEASE };
    for (const s of surfaces) HELD_FROM_RELEASE[s] = false;
  });
  afterEach(() => { Object.assign(HELD_FROM_RELEASE, saved); });
}
