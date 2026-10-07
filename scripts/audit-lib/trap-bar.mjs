// THE TRAP BAR for audits (RULEBOOK F04, 2026-10-07) — the same rule as
// `isWeaponGem` in src/data/lessons/punishGems.ts: a gem is a TRAP only when the
// engine's eval at the quiet end of the forced playout wins at least a piece
// (TRAP_BAR_CP) or mates. Audits read gem JSON directly and cannot import the
// TS module, so this one copy exists — and `trapBarParity.test.ts` fails the
// build if it ever disagrees with the app.
export const TRAP_BAR_CP = 300;
export function isTrapGem(gem) {
  return gem?.tier === 'confirmed' && typeof gem.engineCp === 'number' && gem.engineCp >= TRAP_BAR_CP;
}
