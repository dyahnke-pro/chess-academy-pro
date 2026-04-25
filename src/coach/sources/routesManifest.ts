/**
 * Routes manifest source — reads `src/data/appRoutesManifest.ts` and
 * hands the entries to the envelope assembler. Trivial wrapper today;
 * exists as a separate source so future changes (hot reload from
 * Supabase, server-rendered manifests, A/B variants) can swap the
 * loader without touching the envelope contract.
 */
import { APP_ROUTES_MANIFEST } from '../../data/appRoutesManifest';
import type { RouteManifestEntry } from '../types';

export function loadRoutesManifest(): RouteManifestEntry[] {
  return APP_ROUTES_MANIFEST;
}

/** Find a route by predicate (used by `navigate_to_route` tool to
 *  validate that a target path actually exists in the manifest). */
export function findRoute(predicate: (r: RouteManifestEntry) => boolean): RouteManifestEntry | undefined {
  return APP_ROUTES_MANIFEST.find(predicate);
}
