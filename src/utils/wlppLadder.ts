import type { OpeningRecord } from '../types';

// The WLPP unlock ladder (TODO 3b). Each rung unlocks the next:
//   Watch → Learn → Practice → Play → (Weapons).
// Forward-lock only: completed rungs stay re-openable; later rungs are locked
// until the prior is done. A per-line "unlock all" escape frees every rung.
// The main line is tracked under MAIN_LINE_INDEX.

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

/** Is a rung unlocked (playable)? Watch is always open; each later rung needs
 *  the prior one complete. The "unlock all" escape opens everything. */
export function isRungUnlocked(opening: OpeningRecord, line: number, rung: Rung): boolean {
  if (isLineUnlockedAll(opening, line)) return true;
  const i = RUNGS.indexOf(rung);
  if (i === 0) return true;
  return isRungComplete(opening, line, RUNGS[i - 1]);
}

/** Are the line's WEAPONS (gems + traps) unlocked? Gated on completing Play
 *  (David: "lock the gems until play has been completed"), or unlock-all. */
export function areWeaponsUnlocked(opening: OpeningRecord, line: number): boolean {
  return isLineUnlockedAll(opening, line) || isRungComplete(opening, line, 'play');
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
