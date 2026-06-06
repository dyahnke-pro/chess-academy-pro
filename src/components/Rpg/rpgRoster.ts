import type { CharacterLayer } from './LpcCharacter';

// Maps a chess piece (type + color) to its themed RPG character — composited
// from Universal LPC costume sheets (CC-BY-SA 3.0 / GPLv3, see
// public/rpg/CREDITS.md). Layers paint bottom-to-top. Team is read by body
// skin + a gold (White) / arcane-purple (Black) glow.
//
//   King   — golden helm, plate armor, scepter
//   Queen  — gold tiara, flowing robe, long hair
//   Rook   — metal helm, heavy plate, spear (the castle guard)
//   Knight — chain coif + mail, blade (the rider) — leaps over pieces
//   Bishop — hooded archer with bow + quiver — shoots, then advances
//   Pawn   — leather cap, tunic, spear (the peasant levy)

export type AttackStyle = 'melee' | 'leap' | 'ranged' | 'charge';

const ROOT = '/rpg';
const KIT = '/rpg/kit';

function bodySheet(type: string, color: 'w' | 'b'): string {
  if (type === 'q') return color === 'w' ? `${ROOT}/body-female-light.png` : `${KIT}/body-female-dark.png`;
  return color === 'w' ? `${ROOT}/body-light.png` : `${ROOT}/body-dark.png`;
}

function costume(type: string, color: 'w' | 'b'): string[] {
  const b = bodySheet(type, color);
  switch (type) {
    case 'k':
      return [b, `${KIT}/legs-gold.png`, `${KIT}/torso-plate.png`, `${KIT}/helm-gold.png`, `${KIT}/wand.png`];
    case 'q':
      return [b, color === 'w' ? `${KIT}/robe-white.png` : `${KIT}/robe-purple.png`, `${KIT}/hair-long.png`, `${KIT}/tiara-gold.png`];
    case 'r':
      return [b, `${KIT}/legs-metal.png`, `${KIT}/torso-plate.png`, `${KIT}/helm-metal.png`, `${KIT}/spear.png`];
    case 'n':
      return [b, `${KIT}/legs-metal.png`, `${KIT}/torso-chain.png`, `${KIT}/hat-chain.png`, `${KIT}/dagger.png`];
    case 'b':
      return [`${KIT}/quiver.png`, b, `${KIT}/legs-teal.png`, `${KIT}/torso-leather.png`, `${KIT}/hood-cloth.png`, `${KIT}/arrow.png`, `${KIT}/bow.png`];
    case 'p':
      return [b, `${KIT}/legs-teal.png`, `${KIT}/shirt-brown.png`, `${KIT}/cap-leather.png`, `${KIT}/spear.png`];
    default:
      return [b];
  }
}

const TEAM_GLOW: Record<'w' | 'b', string> = {
  w: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5)) drop-shadow(0 0 3px rgba(255,196,64,0.85))',
  b: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5)) drop-shadow(0 0 4px rgba(168,85,247,0.95))',
};

const ATTACK_BY_TYPE: Record<string, AttackStyle> = {
  p: 'melee', q: 'melee', k: 'melee',
  r: 'charge', // armored guard — fast charge + head-butt, fire trail
  n: 'leap', // rider — leaps over pieces
  b: 'ranged', // archer — shoots, then advances
};

const GLYPH: Record<string, string> = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };

export interface PieceVisual {
  layers: CharacterLayer[];
  glow: string;
  attack: AttackStyle;
  glyph: string;
}

export function pieceVisual(type: string, color: 'w' | 'b'): PieceVisual {
  return {
    layers: costume(type, color).map((sheet) => ({ sheet })),
    glow: TEAM_GLOW[color],
    attack: ATTACK_BY_TYPE[type] ?? 'melee',
    glyph: GLYPH[type] ?? '♟',
  };
}

export function attackStyle(type: string): AttackStyle {
  return ATTACK_BY_TYPE[type] ?? 'melee';
}
