import { Chess } from 'chess.js';

// First-person "this is the move I'm making" cues the coach uses to
// announce ITS reply ("I'll play d5", "My move: e6", "I'll mirror with
// d5", "meet it with Nc3"). The recovered move must be the one the coach
// SAID it would play — not a square it merely mentioned while describing
// the opponent's plan (the 2026-06-02 bug: it narrated "I'll play 5...0-0"
// but the recovery grabbed "b5" from "the knight reroutes toward b5 or c2").
const INTENT_CUE_RE = new RegExp(
  [
    "i['’]?ll\\s+play",
    "i\\s+play",
    "i['’]?ll\\s+go",
    "i['’]?ll\\s+castle",
    "i['’]?ll\\s+mirror\\s+with",
    "i['’]?ll\\s+answer(?:\\s+with)?",
    "i\\s+answer",
    "i['’]?ll\\s+respond(?:\\s+with)?",
    "i['’]?ll\\s+reply(?:\\s+with)?",
    "i['’]?ll\\s+continue\\s+with",
    "i['’]?ll\\s+recapture(?:\\s+with)?",
    "i['’]?ll\\s+take",
    "my\\s+move",
    "meet\\s+(?:it|that|this)\\s+with",
  ].join('|'),
  'i',
);

function firstLegalSanIn(window: string, legalSans: string[]): string | null {
  let chosen: string | null = null;
  let bestIdx = Infinity;
  for (const san of legalSans) {
    const esc = san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Boundary-safe so "b5" can't match inside "Bb4" / "b56".
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${esc}(?:[^A-Za-z0-9=]|$)`);
    const idx = window.search(re);
    if (idx >= 0 && idx < bestIdx) {
      bestIdx = idx;
      chosen = san;
    }
  }
  return chosen;
}

/**
 * Recover the coach's intended move when, on a step-by-step teach turn,
 * the brain NARRATED a move ("I'll mirror with d5") but never called the
 * play_move tool — leaving the board frozen (David 2026-06-02: "coach
 * didn't move a piece!!").
 *
 * Strategy, highest precision first:
 *   1. Anchor on the coach's intent cue ("I'll play …", "My move: …")
 *      and take the FIRST legal SAN AFTER it — that's the move it said
 *      it would make, not a square it mentioned describing the opponent.
 *   2. Fall back to the first legal SAN anywhere in the text (covers
 *      "Nf6 — that's my move" where the SAN precedes the cue).
 *
 * Boundary-safe ("b5" can't match inside "Bb4"); castling written with
 * zeros ("0-0") is normalised to the chess.js form ("O-O"). Only ever
 * returns a move that is BOTH legal in `fen` AND literally named in
 * `text`, so it can never fabricate a move. Returns null when the text
 * names no legal move.
 */
export function recoverCoachMoveFromText(fen: string, text: string): string | null {
  let legalSans: string[];
  try {
    legalSans = new Chess(fen).moves();
  } catch {
    return null;
  }
  const scan = text.replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');
  const cue = scan.match(INTENT_CUE_RE);
  if (cue && cue.index !== undefined) {
    const afterCue = firstLegalSanIn(scan.slice(cue.index), legalSans);
    if (afterCue) return afterCue;
  }
  return firstLegalSanIn(scan, legalSans);
}
