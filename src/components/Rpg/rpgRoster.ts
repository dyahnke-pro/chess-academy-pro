import type { CharacterLayer } from './LpcCharacter';

// Maps a chess piece (type + color) to its RPG character look + combat style.
// Costume layers are LPC sheets composited bottom-to-top. Today every piece
// uses the base body tinted by team; richer per-type costumes (crown, robe,
// bow + quiver, helmet, peasant tunic, horse) drop in by adding layers here —
// the board logic keys off `attack`, not the art.

export type AttackStyle = 'melee' | 'leap' | 'ranged';

const WHITE_BODY = '/rpg/body-light.png';
const BLACK_BODY = '/rpg/body-dark.png';

// Team tints — warm gold for White, arcane purple for Black (echoing the app
// icon's gold + the board's neon glow).
const WHITE_TINT = 'brightness(1.06) drop-shadow(0 0 3px rgba(255,196,64,0.9))';
const BLACK_TINT = 'brightness(0.95) drop-shadow(0 0 3px rgba(168,85,247,0.95))';

export interface PieceVisual {
  layers: CharacterLayer[];
  attack: AttackStyle;
  /** Small base badge so the piece type is readable while the costume art is WIP. */
  glyph: string;
  label: string;
}

const ATTACK_BY_TYPE: Record<string, AttackStyle> = {
  p: 'melee', // peasant — walks up and stabs
  r: 'melee', // armored guard
  q: 'melee',
  k: 'melee',
  n: 'leap', // rider — leaps over pieces
  b: 'ranged', // archer — shoots, then advances
};

const GLYPH: Record<string, string> = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
};

const LABEL: Record<string, string> = {
  p: 'Peasant', r: 'Guard', n: 'Rider', b: 'Archer', q: 'Queen', k: 'King',
};

export function pieceVisual(type: string, color: 'w' | 'b'): PieceVisual {
  const sheet = color === 'w' ? WHITE_BODY : BLACK_BODY;
  const tint = color === 'w' ? WHITE_TINT : BLACK_TINT;
  return {
    layers: [{ sheet, tint }],
    attack: ATTACK_BY_TYPE[type] ?? 'melee',
    glyph: GLYPH[type] ?? '♟',
    label: LABEL[type] ?? 'Pawn',
  };
}

export function attackStyle(type: string): AttackStyle {
  return ATTACK_BY_TYPE[type] ?? 'melee';
}
