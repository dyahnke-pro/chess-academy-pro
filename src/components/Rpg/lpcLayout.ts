// Geometry of the classic "Universal LPC Spritesheet" (jrconway3 layout).
// Each character sheet is 832×1344 — a 13-column × 21-row grid of 64px frames.
// Row groups carry 4 directions each (up, left, down, right) except the final
// single-direction hurt/death row. Frame counts per action are fixed by the
// LPC standard. Art is CC-BY-SA 3.0 / GPLv3 — see public/rpg/CREDITS.md.

export const FRAME = 64;
export const SHEET_COLS = 13;
export const SHEET_ROWS = 21;
export const SHEET_W = SHEET_COLS * FRAME; // 832
export const SHEET_H = SHEET_ROWS * FRAME; // 1344

export type LpcAction = 'spellcast' | 'thrust' | 'walk' | 'slash' | 'shoot' | 'hurt';
export type LpcDirection = 'up' | 'left' | 'down' | 'right';

interface ActionSpec {
  /** First row of the action's 4-direction group (or the single row when not directional). */
  baseRow: number;
  /** Number of animation frames (columns) for this action. */
  frames: number;
  /** Whether the action has one row per direction. Hurt/death is a single row. */
  directional: boolean;
}

export const LPC_ACTIONS: Record<LpcAction, ActionSpec> = {
  spellcast: { baseRow: 0, frames: 7, directional: true },
  thrust: { baseRow: 4, frames: 8, directional: true },
  walk: { baseRow: 8, frames: 9, directional: true },
  slash: { baseRow: 12, frames: 6, directional: true },
  shoot: { baseRow: 16, frames: 13, directional: true },
  hurt: { baseRow: 20, frames: 6, directional: false },
};

const DIR_INDEX: Record<LpcDirection, number> = { up: 0, left: 1, down: 2, right: 3 };

/** The sheet row for an action + direction. */
export function lpcRow(action: LpcAction, direction: LpcDirection): number {
  const spec = LPC_ACTIONS[action];
  return spec.directional ? spec.baseRow + DIR_INDEX[direction] : spec.baseRow;
}

export function lpcFrameCount(action: LpcAction): number {
  return LPC_ACTIONS[action].frames;
}
