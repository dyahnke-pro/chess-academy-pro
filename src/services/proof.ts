// proof — WHAT A COMPUTER FOUND, SAID WITH WHAT IT CONCLUDED (David 2026-10-07:
// "Anything that gets proven is stated out loud?" → "Yes … a decent starting
// spot").
//
// THE RULE: if a conclusion is spoken, the proof the computer found is spoken
// with it. A proof nobody needs stays quiet — the ranking computer decides
// WHAT is said; this decides that a said thing never goes out bare.
//
// The guards that keep it from backfiring (each named in CLAUDE.md):
//   • TWO SIZES. `short` is the key move or the count; `full` is the whole
//     line. Brief register and a skill the student has proven take `short`.
//   • EXACT vs ENGINE. An exact proof (a count, legality, a forced check
//     sequence) may be said in full; an engine proof is said only through its
//     forcing part — a depth-limited line is never recited as fact.
//   • THE BOARD'S HALF rides with it: the line is drawn move by move and the
//     squares are marked, coupled here, never scraped from the words.
//   • WITHHOLDING: a proof that names the move a question asks for waits with
//     the answer (the caller's surface rule decides; this type only carries it).
import { Chess } from 'chess.js';
import type { SpokenLine } from './voicePackage';

export type ProofKind = 'line' | 'squares' | 'count';

export interface Proof {
  kind: ProofKind;
  /** True when the proof is certain on the board (chess.js legality, a count,
   *  a forced sequence); false when it rests on an engine line. */
  exact: boolean;
  /** The key move or the count — one clause. */
  short: string;
  /** The whole proof — the line played out, every square named. */
  full: string;
  /** The moves it names, from the board they start on (drawn as arrows). */
  line?: SpokenLine;
  /** The squares it names (marked on the board). */
  squares?: readonly string[];
}

export type ProofSize = 'short' | 'full';

/** The conclusion with its proof, at the size the caller earned. An engine
 *  proof is never said at full size. */
export function withProof(conclusion: string, proof: Proof | null, size: ProofSize = 'full'): string {
  if (!proof) return conclusion;
  const body = size === 'full' && proof.exact ? proof.full : proof.short;
  if (!body) return conclusion;
  const head = /[.!?]$/.test(conclusion) ? conclusion : `${conclusion}.`;
  return `${head} ${body.charAt(0).toUpperCase()}${body.slice(1)}${/[.!?]$/.test(body) ? '' : '.'}`;
}

/** THE PROOF OF A LINE THE SENTENCE ALREADY NAMES (every lane that speaks a
 *  line hands it in as `VoiceFact.lines`). An engine line, so said short — its
 *  first moves — and drawn in full; the Why button plays it on request. */
export function lineProof(line: SpokenLine, exact = false): Proof | null {
  const sans = line.sans.filter(Boolean);
  if (sans.length === 0) return null;
  const rest = sans.slice(1);
  const full = rest.length ? `After ${sans[0]}, it goes ${rest.join(', then ')}` : `The move is ${sans[0]}`;
  const short = rest.length ? `After ${sans[0]}, it goes ${rest.slice(0, 2).join(', then ')}${rest.length > 2 ? ', and on' : ''}` : full;
  return { kind: 'line', exact, short, full, line };
}

/** The same proof from an engine line in UCI (a verdict's punishing line). */
export function lineProofFromUci(fen: string, uci: readonly string[]): Proof | null {
  const sans: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      sans.push(m.san);
    }
  } catch { /* the line ends where it stops being legal */ }
  return lineProof({ fen, sans });
}

/** WHY A SPOKEN FACT HAS NO SEPARATE PROOF — answered at every producer, so a
 *  bare conclusion cannot compile (David 2026-10-07: "Root cause").
 *   name        — a name from the DB (an opening, a structure); nothing to prove
 *   description — what is on the board, with its squares marked
 *   method      — a habit or rule to apply, not a claim about this board
 *   stated      — the sentence itself states its evidence (a count, the square,
 *                 the move and what it does) — Why has nothing more to add
 *   withheld    — the answer is a question's, revealed after the student tries */
export type NoProofReason = 'name' | 'description' | 'method' | 'stated' | 'withheld';
export interface NoProof { none: NoProofReason }
export type FactProof = Proof | NoProof;
export const NO_PROOF: Record<NoProofReason, NoProof> = {
  name: { none: 'name' }, description: { none: 'description' }, method: { none: 'method' }, stated: { none: 'stated' }, withheld: { none: 'withheld' },
};
export function isProof(p: FactProof | null | undefined): p is Proof {
  return !!p && !('none' in p);
}
