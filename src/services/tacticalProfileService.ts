import { TACTIC_LABELS } from './tacticClassifierService';
import type { TacticType } from '../types';

/**
 * Returns a human-readable label for a tactic type.
 */
export function tacticTypeLabel(type: TacticType): string {
  return TACTIC_LABELS[type];
}

/**
 * Returns an icon/emoji for a tactic type.
 */
export function tacticTypeIcon(type: TacticType): string {
  const icons: Record<TacticType, string> = {
    fork: '\u2694\uFE0F',
    pin: '\uD83D\uDCCC',
    skewer: '\uD83D\uDDE1\uFE0F',
    discovered_attack: '\uD83D\uDCA5',
    back_rank: '\uD83C\uDFF0',
    hanging_piece: '\u26A0\uFE0F',
    promotion: '\uD83D\uDC51',
    deflection: '\u21AA\uFE0F',
    overloaded_piece: '\u2696\uFE0F',
    trapped_piece: '\uD83E\uDEA4',
    clearance: '\uD83D\uDEA7',
    interference: '\uD83D\uDEAB',
    zwischenzug: '\u26A1',
    x_ray: '\uD83D\uDD2C',
    double_check: '\u2757\u2757',
    removing_the_guard: '\uD83D\uDEE1\uFE0F',
    checkmate: '\u265A',
    tactical_sequence: '\uD83C\uDFAF',
  };
  return icons[type];
}
