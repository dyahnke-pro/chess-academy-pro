// surfaceContract — THE SURFACE TABLE (unified-coach N4, plan §3.5; David
// 2026-09-15: "One unified coach, whose abilities are the same no matter where
// in the app you are" + "maintaining the individuality … the retrospective
// narrations, the subtleties remain").
//
// Surfaces differ in exactly two things, declared ONCE here: the REGISTER the
// coach speaks in and what it WITHHOLDS. Nothing else about a surface may
// differ in what the coach knows or says — the selector, the fact-computers and
// the chokepoint are shared. A new `CoachSurface` fails to compile until it is
// declared here (`Record<CoachSurface, …>` is exhaustive), and the source-scan
// gate (`surfaceContract.scan.test.ts`) fails any surface file that hard-codes
// a register or calls a fact-computer for narration directly.
import type { CoachSurface } from './types';
import type { ThesisRegister } from '../services/teachingSelector';

export type SurfaceRegister = ThesisRegister;
export type Withholding = 'thesis-until-answer' | 'none';
/** When the surface may volunteer narration at all. Play is a pure playing
 *  surface: this narrator speaks only at phase transitions (CLAUDE.md, locked);
 *  the one other voice on Play — the slip detector's spoken blunder verdict
 *  (D4, 2026-09-22) — is non-blocking and rides its own path, never a card. */
export type SpeakPolicy = 'always' | 'transitions-only' | 'on-request';

export interface SurfaceContract {
  register: SurfaceRegister;
  withholds: Withholding;
  speaks: SpeakPolicy;
}

export const SURFACE_CONTRACT: Record<CoachSurface, SurfaceContract> = {
  // Post-game review: retrospective, and the thesis is WITHHELD until the
  // student answers "where did it turn?" (the honesty contract).
  review: { register: 'retrospective', withholds: 'thesis-until-answer', speaks: 'always' },
  // Learn / Watch / Learn-the-line: present-tense live teaching as the line unfolds.
  teach: { register: 'present', withholds: 'none', speaks: 'always' },
  // Play (`/coach/play`): the phase-transition narrator — present tense, and
  // ONLY at a transition or when the student asks.
  'phase-narration': { register: 'present', withholds: 'none', speaks: 'transitions-only' },
  hint: { register: 'present', withholds: 'none', speaks: 'on-request' },
  'move-selector': { register: 'present', withholds: 'none', speaks: 'on-request' },
  'home-chat': { register: 'present', withholds: 'none', speaks: 'on-request' },
  'game-chat': { register: 'present', withholds: 'none', speaks: 'on-request' },
  'standalone-chat': { register: 'present', withholds: 'none', speaks: 'on-request' },
  'smart-search': { register: 'present', withholds: 'none', speaks: 'on-request' },
  ping: { register: 'present', withholds: 'none', speaks: 'on-request' },
};

/** Runtime list of every surface — kept in lockstep with the union by the
 *  `satisfies` + the Record above (adding a surface without listing it here
 *  fails the scan gate's exhaustiveness check). */
export const COACH_SURFACES = Object.keys(SURFACE_CONTRACT) as CoachSurface[];

export function contractFor(surface: CoachSurface): SurfaceContract {
  return SURFACE_CONTRACT[surface];
}

/** The register a surface renders the selector's thesis in. Surfaces call
 *  THIS — never `renderThesis(thesis, '<literal>')`. */
export function registerFor(surface: CoachSurface): SurfaceRegister {
  return SURFACE_CONTRACT[surface].register;
}
