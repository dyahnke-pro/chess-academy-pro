/**
 * HELD FROM RELEASE (David 2026-11-06: "I also want learn how to think, the
 * campaign, and the library tabs removed from next submission. Just remove the
 * UI. We will strengthen these before they get released").
 *
 * The code stays. While a surface is held, nothing in the app opens it: no
 * hub tile, no contents entry, no Up next bite, no first-run or lesson chip,
 * no chat door, no book link, and the coach never offers to take the student
 * there (the route list it reads leaves the held routes out). Its routes still
 * answer a typed URL, so the audits and David can keep working on it.
 *
 * 🔒 A `Record` over the surfaces: releasing one is one value flipped here,
 * and every door reads this table — never a copy of it. Gate:
 * `src/test/heldSurfaces.gate.test.ts`. Leaf: no imports.
 */
export type HeldSurface = 'campaign' | 'library' | 'howToThink';

export const HELD_FROM_RELEASE: Record<HeldSurface, boolean> = {
  campaign: true,
  library: true,
  howToThink: true,
};

/** True when the surface is out for everyone. */
export function isReleased(surface: HeldSurface): boolean {
  return !HELD_FROM_RELEASE[surface];
}

/** The routes each surface owns: a link to one of these is a door into it. */
export const SURFACE_ROUTES: Record<HeldSurface, readonly string[]> = {
  campaign: ['/coach/campaign'],
  library: ['/coach/library', '/coach/academy', '/academy'],
  howToThink: ['/coach/teach?lesson=think'],
};

/** Is `path` a door into a held surface? A route owns its sub-paths
 *  (`/coach/campaign/map`, `/coach/library?book=…`); a query route matches
 *  only with its query. */
export function isHeldRoute(path: string): boolean {
  return (Object.keys(SURFACE_ROUTES) as HeldSurface[]).some((s) => HELD_FROM_RELEASE[s]
    && SURFACE_ROUTES[s].some((r) => (r.includes('?')
      ? path === r || path.startsWith(`${r}&`)
      : path === r || path.startsWith(`${r}/`) || path.startsWith(`${r}?`))));
}
