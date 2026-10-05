import { andList } from './andList';

/**
 * ONE ROUTE PHRASER (narration unification step 5). Six producers used to say a
 * piece's journey six ways ("via e3", "by way of e3 and f5", "by way of e3,
 * f5") and two readers parsed the prose back with regexes to recover the piece
 * and its waypoints. Every route sentence is rendered here from data; a reader
 * that needs the piece or the path reads the DATA (`RouteSpec`), never the words.
 */
export interface RouteSpec {
  /** The piece as a word: "knight", "bishop". */
  name: string;
  /** Start square first, destination last. */
  path: readonly string[];
  /** What it takes on arrival, when the destination holds an enemy piece. */
  takes?: string;
}

/** The squares between start and the FIRST arrival at the destination, each
 *  once (review walk 2026-10-04, G2 18…Ng4: "by way of f6, g4 and f2" — the
 *  knight reached g4, went on to f2 and came back). */
export function routeWaypoints(path: readonly string[], opts: { cutAtFirstArrival?: boolean } = {}): string[] {
  if (path.length < 3) return [];
  const start = path[0];
  const dest = path[path.length - 1];
  const end = opts.cutAtFirstArrival === false ? path.length - 1 : path.indexOf(dest, 1);
  return [...new Set(path.slice(1, end))].filter((sq) => sq !== start && sq !== dest);
}

/** ", by way of e3 and f5" — or "" when the piece goes straight there. */
export function routeVia(via: readonly string[]): string {
  return via.length === 0 ? '' : `, by way of ${andList(via)}`;
}

/** Noun form: "getting the knight to e5, by way of d2 and f3[, to take the pawn there]". */
export function routeNoun(r: RouteSpec): string {
  const dest = r.path[r.path.length - 1];
  const base = `getting the ${r.name} to ${dest}${routeVia(routeWaypoints(r.path))}`;
  return r.takes ? `${base}, to take the ${r.takes} there` : base;
}

/** Verb form, named by its square so two pieces of one kind never blur:
 *  "walk the bishop on f4 round to c7, by way of e5[, and take the pawn there]". */
export function routeVerb(r: RouteSpec): string {
  const dest = r.path[r.path.length - 1];
  // The line reader hands over a path already cut where it arrives; every
  // square it walks through is named (lookaheadPlan.waypointsOf).
  const base = `walk the ${r.name} on ${r.path[0]} round to ${dest}${routeVia(routeWaypoints(r.path, { cutAtFirstArrival: false }))}`;
  return r.takes ? `${base}, and take the ${r.takes} there` : base;
}
