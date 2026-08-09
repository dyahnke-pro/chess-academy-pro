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
import { hasPuzzlesLeft, kidWindowActive, hasCoachAccessLeft } from './freeTierService';

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
  | { decision: 'meter'; feature: 'puzzles' | 'coach' } // mount, surface self-walls when spent
  | { decision: 'wall'; feature: GatedFeature };

export interface AccessInput {
  pathname: string;
  isPro: boolean;
  gateEnabled: boolean;
  freeTier: Pick<
    FreeTierRecord,
    'puzzlesSolved' | 'freeOpeningId' | 'kidFirstAccessAt' | 'coachLessonsUsed' | 'coachChatTurnsUsed'
  >;
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

  // Openings — every page (explorer, masterclass, pro-rep, SRS, Gambits-tab,
  // raw ECO) is browsable free. Nothing walls on mere navigation; the ONLY
  // real gate left is the one-free-masterclass-opening claim, enforced
  // IN-PAGE at the first WLPP deep-dive tap (OpeningDetailPage /
  // canViewOpening — a genuine metered parameter, not a route wall). David
  // 2026-08-09: "unlock all other functions... nothing triggers until other
  // parameters are met." Previously pro-rep/SRS/Gambits-tab/raw-ECO pages
  // were walled at the route before a user could even browse them.
  if (startsWith(pathname, '/openings')) return { decision: 'allow' };

  // Tactics / puzzles — meter against the free bucket. Mount so the board can
  // show the "puzzles left" state and self-wall on the last one; but if the
  // bucket is already spent, wall the whole solving surface up front.
  if (startsWith(pathname, '/tactics')) {
    return hasPuzzlesLeft(freeTier)
      ? { decision: 'meter', feature: 'puzzles' }
      : { decision: 'wall', feature: 'puzzles' };
  }

  // Coach — metered free tier (7 lessons + 50 chat turns, lifetime, no trial
  // start — David 2026-08-06: "give them a little more... I'm giving value").
  // Two independent buckets; the surface self-walls once BOTH are spent (a
  // lesson start / chat turn consumed there flips the store, and this route
  // re-evaluates to `wall` on the next render — see useCoachFreeMeter).
  if (startsWith(pathname, '/coach')) {
    return hasCoachAccessLeft(freeTier)
      ? { decision: 'meter', feature: 'coach' }
      : { decision: 'wall', feature: 'coach' };
  }
  // Academy — course access itself is fully open (resolveCourseAccess, David
  // 2026-06-17: "PAYWALLS REMOVED — everything unlocked for everyone"). Walling
  // the ROUTE here contradicted that and popped the paywall before a user ever
  // saw a course (David 2026-08-09: "keep that paywall hidden until it
  // absolutely needs to pop up").
  if (startsWith(pathname, '/academy')) return { decision: 'allow' };

  // Anything else → walled by default (fail closed on unknown premium routes).
  return { decision: 'wall', feature: 'app' };
}
