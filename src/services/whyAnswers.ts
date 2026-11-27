/**
 * WHY? ANSWERS THE LAST THING THE COACH SAID (David, the board bar decisions,
 * 2026-11-24: "Why? answers the last thing the coach said. After a hint it
 * names the move with its reason, and that counts as shown.").
 *
 * The bar's Why used to answer the latest PROOF the coach had spoken, however
 * many lines ago — so after a later line with no proof, or after a hint, it
 * explained something else. One slot now holds what was said last, and Why
 * answers exactly that or nothing.
 */
import { isProof, type FactProof, type Proof } from './proof';

export type LastSaid =
  /** A conclusion with its proof: Why says the proof. */
  | { kind: 'proof'; proof: Proof }
  /** A hint on this board: Why names the hinted move with its reason, and the
   *  move played from this board is then told (prompted). */
  | { kind: 'hint'; fen: string; uci: string }
  /** The last thing said carries nothing Why can answer. */
  | null;

/** What a spoken turn leaves for Why: its last proof-bearing fact, or nothing
 *  — a turn without a proof replaces an older one, since it was said last. */
export function lastSaidOfTurn(kept: readonly { proof?: FactProof }[]): LastSaid {
  for (let i = kept.length - 1; i >= 0; i -= 1) {
    const p = kept[i].proof;
    if (isProof(p)) return { kind: 'proof', proof: p };
  }
  return null;
}

const position = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** What Why answers on the board in front of the student, or null (greyed).
 *  A hint is answered only on the board it was given on. */
export function whyAnswer(last: LastSaid, liveFen: string): Exclude<LastSaid, null> | null {
  if (!last) return null;
  if (last.kind === 'hint') return position(last.fen) === position(liveFen) ? last : null;
  return last;
}
