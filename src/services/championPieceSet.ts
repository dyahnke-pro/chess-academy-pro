// "Gold (Champion)" piece set — drop-in loader for real rendered piece art.
//
// HOW TO ADD THE REAL SCULPTED PIECES (the gold-knight icon look):
//   1. Render 12 board pieces — flat, SIDE-PROFILE silhouettes on a
//      TRANSPARENT background, square aspect, consistent height/baseline so
//      they sit right on a square (NOT the 3/4 cosmic hero crops — those are
//      too bulky to read at ~40px on a phone board).
//   2. Name them exactly: wK wQ wR wB wN wP / bK bQ bR bB bN bP (+ the ext
//      below) and commit them to  public/pieces/champion-board/ .
//   3. Flip CHAMPION_USE_CUSTOM_IMAGES to true (or just tell Claude to).
//      That's the only code change — every board picks them up on reload.
//
// Until step 3, the "Gold (Champion)" set renders the gold-tinted cburnett
// fallback so the option still looks right out of the box. Even with custom
// images enabled, any individual piece that 404s falls back to that tinted
// glyph, so a partial set never shows broken images.
//
// Heroic menu/splash art (per David's "both" call) lives separately in
// public/pieces/champion-hero/ and is wired into menu surfaces in a follow-up
// — it is intentionally NOT used for on-board pieces.

/** Public path (served from /public) for the flat on-board piece renders. */
export const CHAMPION_BOARD_DIR = '/pieces/champion-board';
/** Public path for the heroic menu/splash art (future menu wiring). */
export const CHAMPION_HERO_DIR = '/pieces/champion-hero';
/** Image extension for the rendered pieces. Change if you export webp/svg. */
export const CHAMPION_IMAGE_EXT = 'png';

/**
 * Flip to `true` once the rendered board pieces are committed to
 * public/pieces/champion-board/. While `false`, the gold set uses the
 * gold-tinted cburnett fallback (no 404 requests are made for the missing
 * art). This is the single switch that turns David's renders on.
 */
export const CHAMPION_USE_CUSTOM_IMAGES: boolean = false;

/** The 12 piece keys react-chessboard uses, in render order. */
export const CHAMPION_PIECE_KEYS = [
  'wK', 'wQ', 'wR', 'wB', 'wN', 'wP',
  'bK', 'bQ', 'bR', 'bB', 'bN', 'bP',
] as const;

/** URL for a flat on-board champion piece render, e.g. /pieces/champion-board/wN.png */
export function championBoardPieceUrl(pieceKey: string): string {
  return `${CHAMPION_BOARD_DIR}/${pieceKey}.${CHAMPION_IMAGE_EXT}`;
}

/** URL for a heroic champion piece render (menu art), e.g. /pieces/champion-hero/wN.png */
export function championHeroPieceUrl(pieceKey: string): string {
  return `${CHAMPION_HERO_DIR}/${pieceKey}.${CHAMPION_IMAGE_EXT}`;
}
