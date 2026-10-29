/**
 * A gem's LABEL on the opening page — the one sentence that names a trap card.
 *
 * Gems are taught on the opening pages only (David 2026-10-29: "it's not good
 * to teach them in learn because that's free and I want a reason for ppl to
 * buy the openings"); the free coach's chat trap menu that also used these
 * labels is gone.
 *
 * Nothing here generates chess. Every field is read off a mined, engine-graded
 * gem (G0/G3); this module only formats.
 */
import type { PunishGem } from './punishGems';
import { numberedMove } from '../../utils/numberedMove';

/**
 * "Opponent plays {slip} — punish with {punish}", with the slip's move number.
 *
 * The move number is load-bearing: two Vienna traps are punished after Qf6 and
 * two after Nge7, so the slip and punish alone would print the same label
 * twice. It is also what the student needs to spot the moment over the board.
 *
 *   "Opponent plays 6…Ng4 — punish with Ng5"
 *   "Opponent plays 5.Bg5 — punish with Nxe4"
 */
export function gemChipLabel(gem: PunishGem): string {
  const plies = gem.lineMoves.trim().split(/\s+/).filter(Boolean).length;
  return `Opponent plays ${numberedMove(plies, gem.inaccuracy)} — punish with ${gem.punish}`;
}
