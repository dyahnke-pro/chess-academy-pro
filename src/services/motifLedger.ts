// motifLedger — TRANSFER inside one game (WO-TEACH-02 S6, David 2026-09-24).
//
// A strong coach links the idea on the board to the last time it appeared:
// "same idea as move 12". The ledger records, per game, the MOVE NUMBER a
// tactic motif was first taught AND which instance it was (its squares).
// Keyed on the detector's own type (never scraped from prose), recorded only
// where the caller has decided the line is SPOKEN. A leaf: both surfaces own
// their ledger (review per walk, Learn per game in learnMemory).
//
// Two rules from the 2026-09-24 Learn tape, where the coach said "You saw this
// same idea on move 3." ON move 3, with the tactic sentence itself gone:
//  1. The SAME instance still standing (the pin that was there last move) is
//     not a transfer — it is the same idea, not the same KIND of idea.
//  2. The reference is part of its sentence, never a sentence of its own. A
//     trailing sentence is orphaned the moment the stream's say-once drops the
//     head as a repeat; an inline phrase goes with its sentence or not at all.

import { rotateStem } from '../utils/rotateStem';

export interface MotifEntry {
  move: number;
  /** The first instance's squares, joined — what makes it THIS pin. */
  instance: string;
}

export type MotifLedger = Map<string, MotifEntry>;

/** An inline phrase (", the same idea as move N") for a NEW instance of a
 *  motif first taught at an EARLIER move, else ''. Insert it before the
 *  sentence's closing punctuation (`withTransfer`). */
export function transferClause(
  motif: string,
  instance: string,
  moveNumber: number,
  ledger: ReadonlyMap<string, MotifEntry>,
): string {
  const first = ledger.get(motif);
  if (first === undefined || first.move >= moveNumber || first.instance === instance) return '';
  // Rotated on the move number (stable, resume-safe); the move it refers
  // back to never varies.
  return rotateStem([
    ` — the same idea as move ${first.move}`,
    ` — you saw this idea on move ${first.move}`,
    ` — it's the idea from move ${first.move} again`,
  ], moveNumber);
}

/** Put the transfer phrase inside the FIRST sentence of `text`, before its
 *  closing punctuation. `text` unchanged when there is no phrase. */
export function withTransfer(text: string, phrase: string): string {
  if (!phrase) return text;
  const m = /[.!?](\s|$)/.exec(text);
  if (!m) return `${text}${phrase}.`;
  return `${text.slice(0, m.index)}${phrase}${text.slice(m.index)}`;
}

/** The student's own move number, read off the board AFTER the opponent's
 *  reply — whose fullmove counter has already moved on to the next move
 *  (clean-pass walk 2026-10-04, G1: the pin of 20.Qa4 was filed as "move
 *  21", so 21.exf6+ said "you saw this idea on move 21" about itself). */
export function studentMoveAfterReply(fenAfterReply: string): number {
  const full = Number.parseInt(fenAfterReply.split(' ')[5] ?? '0', 10) || 0;
  return Math.max(0, full - 1);
}

/** Record the first move (and instance) a motif was taught. Later calls keep
 *  the first. */
export function recordMotif(motif: string, instance: string, moveNumber: number, ledger: MotifLedger): void {
  if (!ledger.has(motif)) ledger.set(motif, { move: moveNumber, instance });
}

/** The motif and instance a facet identity carries, or null when the identity
 *  is not a tactic motif. Only a `motif:` identity transfers — a principle's
 *  `rule-stem:<ply>:<id>` was once read as a motif named "stem", so every
 *  repeated principle said "the same idea as move 3" (review walks 2026-09-27). */
export function transferMotifOf(identity: string): { motif: string; instance: string } | null {
  if (!identity.startsWith('motif:')) return null;
  const [motif, instance = ''] = identity.slice('motif:'.length).split(':');
  return motif ? { motif, instance } : null;
}
