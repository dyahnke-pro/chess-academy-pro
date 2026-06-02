import { Chess } from 'chess.js';

/**
 * Recover the coach's intended move when, on a step-by-step teach turn,
 * the brain NARRATED a move ("I'll mirror with d5") but never called the
 * play_move tool — leaving the board frozen (David 2026-06-02: "coach
 * didn't move a piece!!"). We pick the FIRST legal SAN for the side to
 * move that the response text actually names.
 *
 * Boundary-safe: "b4" cannot match inside "Bb4", and the SAN's regex-
 * special characters (+ # = and the castling hyphens) are escaped. Only
 * ever returns a move that is BOTH legal in `fen` AND literally named in
 * `text`, so it can never fabricate a move. Returns null when the text
 * names no legal move (caller leaves the board unchanged).
 */
export function recoverCoachMoveFromText(fen: string, text: string): string | null {
  let legalSans: string[];
  try {
    legalSans = new Chess(fen).moves();
  } catch {
    return null;
  }
  let chosen: string | null = null;
  let bestIdx = Infinity;
  for (const san of legalSans) {
    const esc = san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${esc}(?:[^A-Za-z0-9=]|$)`);
    const idx = text.search(re);
    if (idx >= 0 && idx < bestIdx) {
      bestIdx = idx;
      chosen = san;
    }
  }
  return chosen;
}
