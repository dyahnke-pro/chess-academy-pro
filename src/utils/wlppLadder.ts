import type { OpeningRecord } from '../types';

// The WLPP rungs: Watch → Learn → Practice → Play → (Weapons).
// The forward-lock ladder is RETIRED (David 2026-09-02): every rung, variation
// and weapon is unlocked up front so a student can go straight to Play.
// Completion is still tracked per line — it drives checkmarks, progress, the
// "next rung" nudge, and `hasDrilledOpening` (the freemium claim signal) — it
// just no longer GATES access. The main line is tracked under MAIN_LINE_INDEX.

export const MAIN_LINE_INDEX = -1;

export type Rung = 'watch' | 'learn' | 'practice' | 'play';
export const RUNGS: Rung[] = ['watch', 'learn', 'practice', 'play'];

export const RUNG_LABEL: Record<Rung, string> = {
  watch: 'Watch',
  learn: 'Learn',
  practice: 'Practice',
  play: 'Play',
};

function has(arr: number[] | undefined, idx: number): boolean {
  return !!arr && arr.includes(idx);
}

/** Has this line completed a given rung? */
export function isRungComplete(opening: OpeningRecord, line: number, rung: Rung): boolean {
  switch (rung) {
    case 'watch': return has(opening.linesDiscovered, line);
    case 'learn': return has(opening.linesLearned, line);
    case 'practice': return has(opening.linesPerfected, line);
    case 'play': return has(opening.linesPlayed, line);
  }
}

/** Did the user choose "I already know this" for this line? */
export function isLineUnlockedAll(opening: OpeningRecord, line: number): boolean {
  return has(opening.linesUnlockedAll, line);
}

/** Has this WEAPON (named trap / punish gem / warning, keyed by its string id)
 *  completed a given rung? Weapons track completion in `weaponRungs` rather than
 *  the numeric per-line arrays, since they aren't variation indices. */
export function isWeaponRungComplete(opening: OpeningRecord, weaponKey: string, rung: Rung): boolean {
  return !!opening.weaponRungs?.[weaponKey]?.includes(rung);
}

/** Is a rung unlocked (playable)? ALWAYS — the whole course is open up front.
 *  David 2026-09-02 ("too many clicks to get to playing"): unlock every rung
 *  immediately so a user can jump straight to Play without climbing
 *  Watch→Learn→Practice first. The forward-lock ladder is retired; completion is
 *  still tracked (isRungComplete) to light checkmarks/progress, but it no longer
 *  GATES access. `opening`/`line`/`rung` stay in the signature so the ~2 call
 *  sites are untouched. */
export function isRungUnlocked(_opening: OpeningRecord, _line: number, _rung: Rung): boolean {
  return true;
}

/** Are the line's WEAPONS (gems + traps) unlocked? ALWAYS — same directive as
 *  isRungUnlocked. Weapons no longer wait for Play to be completed; the whole
 *  course (rungs, variations, weapons) is accessible on open. */
export function areWeaponsUnlocked(_opening: OpeningRecord, _line: number): boolean {
  return true;
}

/** Has the student COMMITTED to this opening? This is the predicate the
 *  freemium one-free-opening claim fires on (David 2026-09-02).
 *
 *  Two ways to commit:
 *   1. Completing an active drill on a LINE — Learn, Practice or Play, on the
 *      main line or any variation. A completed line WATCH does NOT count:
 *      watching is the shop window, free to sample across every opening.
 *   2. Completing ANY rung of a WEAPON (punish gem / named trap) — including its
 *      Watch. The gems tab is the specialized payoff content, not the front
 *      door: opening the weapons section and finishing a gem is a deliberate
 *      "I'm working this opening" (David 2026-09-02: "completion of the gem tab
 *      should also count as chosen opening"). That asymmetry with the main-line
 *      Watch is intentional. */
export function hasDrilledOpening(opening: OpeningRecord): boolean {
  const any = (a: number[] | undefined): boolean => Array.isArray(a) && a.length > 0;
  if (any(opening.linesLearned) || any(opening.linesPerfected) || any(opening.linesPlayed)) {
    return true;
  }
  return Object.values(opening.weaponRungs ?? {}).some((rungs) => (rungs ?? []).length > 0);
}

/** The next rung the user should do (first incomplete one), or null if the
 *  whole ladder is done. */
export function nextRung(opening: OpeningRecord, line: number): Rung | null {
  return RUNGS.find((r) => !isRungComplete(opening, line, r)) ?? null;
}

/** Messaging for a locked rung: "Complete Watch to unlock Learn". */
export function lockHint(rung: Rung): string {
  const i = RUNGS.indexOf(rung);
  if (i <= 0) return '';
  return `Complete ${RUNG_LABEL[RUNGS[i - 1]]} to unlock ${RUNG_LABEL[rung]}`;
}

/** Messaging for the weapons lock. */
export const WEAPONS_LOCK_HINT = 'Complete Play to unlock this line’s weapons';

// ─── "I already know this" expert passes ────────────────────────────────────
// A scarce, lifetime budget: ONE pass per color (one White opening + one Black
// opening). Spending a pass unlocks the WHOLE opening (every line). The point
// is that the ladder can't be defeated by clicking "I'm an expert" everywhere
// — you get exactly two skips, and you spend them deliberately.

export type WeaponUnlockColor = 'white' | 'black';
export type WeaponUnlockPasses = Partial<Record<WeaponUnlockColor, string>>;

export type UnlockBudgetState =
  | { allowed: true; reason: 'available' | 'already-here' }
  | { allowed: false; reason: 'spent-elsewhere'; spentOn: string };

/** Can the user spend their <color> expert pass on this opening?
 *  - available     → pass unused, spending it here is allowed.
 *  - already-here  → this opening already consumed the pass (idempotent).
 *  - spent-elsewhere → the pass went to a DIFFERENT opening of this color; blocked. */
export function unlockBudgetFor(
  passes: WeaponUnlockPasses | undefined,
  openingId: string,
  color: WeaponUnlockColor,
): UnlockBudgetState {
  const spentOn = passes?.[color];
  if (!spentOn) return { allowed: true, reason: 'available' };
  if (spentOn === openingId) return { allowed: true, reason: 'already-here' };
  return { allowed: false, reason: 'spent-elsewhere', spentOn };
}
