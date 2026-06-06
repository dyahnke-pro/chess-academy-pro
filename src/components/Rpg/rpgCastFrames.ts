// Multi-frame animation registry for the RPG cast. As action-frame sheets are
// generated per piece, the role is added here and the board plays its frames
// (e.g. the king's Ready → Wind-Up → Mid-Swing → Follow-Through staff attack).
//
// Frames live at public/rpg/cast/frames/<role>-<face>-<idx>-<light|dark>.png,
// sliced from rpg-cast-src/frames/<role>-attack-sheet.png (4 cols = the attack
// phases; row 0 = front, row 1 = back).

import { roleOf } from './rpgCast';

/** Roles that have a generated frame set (others fall back to the static token). */
const FRAMED = new Set(['king', 'queen', 'rook']);

export type SpriteAction = 'idle' | 'walk' | 'attack';
export type Facing = 'front' | 'back';

export function hasFrames(role: string): boolean {
  return FRAMED.has(role);
}

function frameUrl(role: string, color: 'w' | 'b', face: Facing, idx: number): string {
  return `/rpg/cast/frames/${role}-${face}-${idx}-${color === 'w' ? 'light' : 'dark'}.png`;
}

/** The ordered frame URLs for a piece in a given action, or null if it has no
 *  frame set. Idle/walk hold the Ready Stance; attack plays all four phases. */
export function spriteFrames(type: string, color: 'w' | 'b', face: Facing, action: SpriteAction): string[] | null {
  const role = roleOf(type);
  if (!hasFrames(role)) return null;
  if (action === 'attack') return [0, 1, 2, 3].map((i) => frameUrl(role, color, face, i));
  return [frameUrl(role, color, face, 0)]; // idle / walk → ready stance
}
