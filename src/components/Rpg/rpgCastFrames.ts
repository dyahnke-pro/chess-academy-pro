// Multi-frame animation registry for the RPG cast. As action-frame sheets are
// generated per piece, the role is added here and the board plays its frames
// (e.g. the king's Ready → Wind-Up → Mid-Swing → Follow-Through staff attack).
//
// Frames live at public/rpg/cast/frames/<role>-<face>-<idx>-<light|dark>.png,
// sliced from rpg-cast-src/frames/<role>-attack-sheet.png (4 cols = the attack
// phases; row 0 = front, row 1 = back).

import { castImage, roleOf } from './rpgCast';

/** Roles with a front/back 4-phase attack sheet (Ready → Wind-Up → Impact →
 *  Follow-Through). Others fall back to the static token + procedural motion. */
const FRAMED = new Set(['king', 'queen', 'rook', 'knight', 'bishop']);

/** Roles that idle on their static token but play a 4-frame flourish on attack.
 *  The pawn (hooded rogue) holds its stance, then dagger-spins through four
 *  rotation poses (front → right → back → left, swoosh trails baked in). */
const SPIN = new Set(['pawn']);

export type SpriteAction = 'idle' | 'walk' | 'attack';
export type Facing = 'front' | 'back';

export function hasFrames(role: string): boolean {
  return FRAMED.has(role) || SPIN.has(role);
}

function frameUrl(role: string, color: 'w' | 'b', face: Facing, idx: number): string {
  return `/rpg/cast/frames/${role}-${face}-${idx}-${color === 'w' ? 'light' : 'dark'}.png`;
}

function spinUrl(role: string, color: 'w' | 'b', idx: number): string {
  return `/rpg/cast/frames/${role}-spin-${idx}-${color === 'w' ? 'light' : 'dark'}.png`;
}

/** The ordered frame URLs for a piece in a given action, or null if it has no
 *  frame set. Idle/walk hold the Ready Stance; attack plays all four phases.
 *  Spin roles idle on their static token and only animate on attack. */
export function spriteFrames(type: string, color: 'w' | 'b', face: Facing, action: SpriteAction): string[] | null {
  const role = roleOf(type);
  if (SPIN.has(role)) {
    if (action === 'attack') return [0, 1, 2, 3].map((i) => spinUrl(role, color, i));
    // Idle: a clean hooded rogue (just a black hood — no face). Front stance when
    // facing the viewer (opponent army), the back when facing away (your army).
    if (face === 'front') return [`/rpg/cast/${role}-front-${color === 'w' ? 'light' : 'dark'}.png`];
    return [castImage(type, color)];
  }
  if (!FRAMED.has(role)) return null;
  if (action === 'attack') return [0, 1, 2, 3].map((i) => frameUrl(role, color, face, i));
  return [frameUrl(role, color, face, 0)]; // idle / walk → ready stance
}
