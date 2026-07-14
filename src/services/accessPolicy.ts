/**
 * accessPolicy — the pure allow/wall/meter decision for the metered soft gate.
 * --------------------------------------------------------------------------
 * ONE pure function maps (current route, Pro state, free-tier ledger) → a
 * decision the route-aware `AccessGate` renders. No React, no Dexie, no side
 * effects — trivially unit-testable (the whole matrix is covered in
 * accessPolicy.test.ts). See docs/plans/2026-07-14-freemium-soft-gate.md.
 *
 * The gate is DORMANT unless `gateEnabled` (the VITE_PAYWALL_ENABLED build flag)
 * AND the user is not Pro — in every other case this returns `allow` for the
 * whole app, so today's behavior is unchanged until the flag flips.
 */
import type { FreeTierRecord } from '../db/schema';
import { canViewOpening, hasPuzzlesLeft, kidWindowActive } from './freeTierService';

/** Which premium surface a wall/meter is for — drives the paywall's contextual
 *  copy and analytics. */
export type GatedFeature =
  | 'opening' // a walled opening (2nd opening / pro-rep / gambit / SRS)
  | 'puzzles' // puzzle-solving beyond the free bucket
  | 'coach' // any /coach/* surface
  | 'academy' // /academy/*
  | 'kid' // /kid/* after the 7-day window
  | 'app'; // catch-all

export type AccessDecision =
  | { decision: 'allow' }
  | { decision: 'meter'; feature: 'puzzles' } // mount, board self-walls when spent
  | { decision: 'wall'; feature: GatedFeature };

export interface AccessInput {
  pathname: string;
  isPro: boolean;
  gateEnabled: boolean;
  freeTier: Pick<FreeTierRecord, 'puzzlesSolved' | 'freeOpeningId' | 'kidFirstAccessAt'>;
  /** Injectable clock for the kid-window check (tests). */
  now?: number;
}

/** Route prefixes that are ALWAYS free for a non-Pro user (the shell + the
 *  free-tier surfaces that aren't individually metered). */
const FREE_PREFIXES: readonly string[] = [
  '/settings',
  '/games', // upload/import + the game database
  '/weaknesses', // weakness ANALYSIS (drilling spends the puzzle bucket elsewhere)
  '/neon-mock',
  '/debug',
];

function startsWith(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/** Parse `/openings/:id` (but NOT `/openings`, `/openings/srs`, or
 *  `/openings/pro/...`). Returns the opening id or null. */
function masterclassOpeningId(pathname: string): string | null {
  if (!startsWith(pathname, '/openings')) return null;
  const rest = pathname.slice('/openings'.length).replace(/^\//, '');
  if (rest === '' || rest === 'srs') return null; // explorer / SRS
  if (rest.startsWith('pro/')) return null; // pro-rep — walled
  // First segment is the opening id (ignore any trailing sub-route).
  const id = rest.split('/')[0];
  return id || null;
}

/**
 * Resolve the access decision for the current route. Pure.
 */
export function resolveAccess(input: AccessInput): AccessDecision {
  const { pathname, isPro, gateEnabled, freeTier, now } = input;

  // Gate dormant, or user is Pro → the whole app is open.
  if (!gateEnabled || isPro) return { decision: 'allow' };

  // ---- non-Pro, gate live: the metered free tier ----

  // Shell + always-free surfaces. Root '/' is the dashboard/home.
  if (pathname === '/') return { decision: 'allow' };
  for (const p of FREE_PREFIXES) {
    if (startsWith(pathname, p)) return { decision: 'allow' };
  }

  // Kid section — free for the 7-day window, then walled.
  if (startsWith(pathname, '/kid')) {
    return kidWindowActive(freeTier, now) ? { decision: 'allow' } : { decision: 'wall', feature: 'kid' };
  }

  // Openings.
  if (startsWith(pathname, '/openings')) {
    // Explorer list is browsable free.
    if (pathname === '/openings') return { decision: 'allow' };
    const openingId = masterclassOpeningId(pathname);
    if (openingId && canViewOpening(openingId, freeTier)) return { decision: 'allow' };
    // pro-rep, SRS, gambit, or a SECOND opening → walled.
    return { decision: 'wall', feature: 'opening' };
  }

  // Tactics / puzzles — meter against the free bucket. Mount so the board can
  // show the "puzzles left" state and self-wall on the last one; but if the
  // bucket is already spent, wall the whole solving surface up front.
  if (startsWith(pathname, '/tactics')) {
    return hasPuzzlesLeft(freeTier)
      ? { decision: 'meter', feature: 'puzzles' }
      : { decision: 'wall', feature: 'puzzles' };
  }

  // Coach + Academy — Pro only.
  if (startsWith(pathname, '/coach')) return { decision: 'wall', feature: 'coach' };
  if (startsWith(pathname, '/academy')) return { decision: 'wall', feature: 'academy' };

  // Anything else → walled by default (fail closed on unknown premium routes).
  return { decision: 'wall', feature: 'app' };
}
