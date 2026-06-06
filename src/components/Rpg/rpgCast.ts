// Modern character-token art for the RPG chess board. Each piece maps to a
// full-body render sliced from the Ragnarok cast sheet (see scripts/slice-cast.py),
// background-stripped, with the enemy army derived by recolor.

const ROLE: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook', // Armored
  n: 'knight', // mounted Wolf Knight
  b: 'bishop', // green Ranger (archer)
  p: 'pawn', // hooded Rogue
};

/** Image path for a piece's token. White = light (heroic), Black = dark (recolored). */
export function castImage(type: string, color: 'w' | 'b'): string {
  return `/rpg/cast/${ROLE[type] ?? 'pawn'}-${color === 'w' ? 'light' : 'dark'}.png`;
}

/** Small type glyph (king/rook can look alike at board size). */
export const CAST_GLYPH: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

/** Per-army glow + drop shadow applied to the token image. */
export const CAST_TEAM_GLOW: Record<'w' | 'b', string> = {
  w: 'drop-shadow(0 0 4px rgba(255,196,64,0.7)) drop-shadow(0 2px 2px rgba(0,0,0,0.55))',
  b: 'drop-shadow(0 0 5px rgba(168,85,247,0.85)) drop-shadow(0 2px 2px rgba(0,0,0,0.55))',
};
