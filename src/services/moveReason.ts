// moveReason — WHY a move was good or bad, classified from board signals (G0).
//
// The POST-MOVE GRADE (David 2026-08-27: "safe to always narrate when there is
// something to say") — the reactive half of the student's-move model. Because it
// fires AFTER the move, it can't spoil, so it speaks on every move that has
// something worth saying, by NAME of the thing ("you walked into the fork", "that
// hung the bishop", "clean — develops and hits e5"), never centipawns.
//
// Runtime port of the validated offline classifier in
// `scripts/voiced-authoring/position-facts.mjs` (`classifyReason`, Phase 3 of the
// PositionFacts calculator). Validated there on Kramnik / MVL / Nepo: Kramnik
// `Kxg7`→only-move, `Qd2(45)`→defends-threat, `Qd2(57)`→imprecise-defence,
// `Rfe1`/`Nfd7`→lost-the-thread; Nepo `f4`→walked-into-tactic, `cxb4`/`f3`→
// hung-piece.
//
// It DECIDES nothing (G0): it reads signals already computed (SEE, the standing
// threat, the forcing win missed, the only-move gap) and names the class. The DNA
// register phrases the clause; the computer picks the class. Doc:
// docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0c.
import { Chess } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';

/** The move-quality label a caller derives from cpLoss (the standard bands). */
export type MoveLabel = 'book' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/** Fault reasons (bad moves) + merit reasons (good moves) + mate. */
export type MoveReason =
  | 'mate'
  // faults
  | 'hung-piece' | 'ignored-threat' | 'walked-into-tactic' | 'missed-forcing-win' | 'lost-the-thread'
  | 'imprecise-defence' | 'second-best'
  // merits
  | 'only-move' | 'defends-threat' | 'wins-material' | 'best' | 'solid';

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MATE_CP = 100000;

export interface MoveReasonInputs {
  label: MoveLabel;
  /** Did the student play the engine's best move. */
  isBest: boolean;
  /** cpLoss of the played move (mover POV, >0 = worse). */
  cpLossCp: number;
  /** MultiPV best-minus-second gap at the pre-move position (cp, mover POV). */
  gap12: number;
  /** Standing must-defend material the mover faced BEFORE the move (points). */
  threatNetBefore: number;
  /** Material the mover left hanging AFTER the move (SEE net, points). */
  hangAfter: number;
  /** The best line's forcing material win the mover MISSED (points). 0 if none. */
  forceNetBest: number;
  /** Did the played move capture. */
  capture: boolean;
  /** SEE of the played capture (points won, ≤0 = a bad/hanging capture). */
  seeNow: number;
  /** The opponent's punishing line material after the move (points). 0 if none
   *  computed — degrades `walked-into-tactic` to `lost-the-thread` honestly. */
  refuteNet: number;
}

/**
 * The reason class. Faithful to the offline `classifyReason` — same order, same
 * thresholds, so runtime and the authoring tool agree.
 */
export function classifyMoveReason(i: MoveReasonInputs): MoveReason {
  if (Math.abs(i.cpLossCp) >= MATE_CP) return 'mate';
  const bad = i.label === 'mistake' || i.label === 'blunder';
  if (bad) {
    if (i.hangAfter >= 3) return 'hung-piece';            // left material en prise NOW (SEE)
    if (i.threatNetBefore >= 3) return 'ignored-threat';  // a standing must-defend went unmet
    if (i.refuteNet >= 2) return 'walked-into-tactic';    // the refutation wins material a few ply in
    if (i.forceNetBest >= 2) return 'missed-forcing-win'; // a concrete win was on, and this wasn't it
    return 'lost-the-thread';                             // positional slip, no tactic found
  }
  if (i.label === 'inaccuracy') return i.threatNetBefore >= 3 ? 'imprecise-defence' : 'second-best';
  // good / best / book
  if (i.isBest && i.gap12 >= 150) return 'only-move';
  if (i.threatNetBefore >= 3) return 'defends-threat';
  if (i.capture && i.seeNow >= 2) return 'wins-material';
  if (i.isBest) return 'best';
  return 'solid';
}

/** Whether a reason is a fault (a mistake worth drilling) vs a merit. Faults
 *  auto-log to the weakness spine (the loop-closer, David 2026-08-27 idea #3). */
export function isFaultReason(r: MoveReason): boolean {
  return r === 'hung-piece' || r === 'ignored-threat' || r === 'walked-into-tactic'
    || r === 'missed-forcing-win' || r === 'lost-the-thread' || r === 'imprecise-defence'
    || r === 'second-best';
}

/** A weakness-spine tag for a fault reason (so a live grade becomes a drill).
 *  Null for merits (nothing to drill). */
export function reasonWeaknessTag(r: MoveReason): string | null {
  return isFaultReason(r) ? `reason:${r}` : null;
}

/** Whether this grade is worth speaking at all — "something to say" (David
 *  2026-08-27). The two ROUTINE outcomes (`solid`, a plain `best` in a calm
 *  spot) say nothing; a fault, an only-move found, a threat met, a real material
 *  win, or mate does. (`book` is an input label, never a classifier output.) */
export function gradeWorthSpeaking(r: MoveReason): boolean {
  return r !== 'solid' && r !== 'best';
}

/** Compute the SEE net of material the MOVER left hanging after their move — the
 *  `hangAfter` signal, from the after-position (board-only, no engine). */
export function hangingNetForMover(fenAfter: string, moverColor: 'w' | 'b'): number {
  let net = 0;
  try {
    for (const h of findHangingPieces(new Chess(fenAfter))) {
      if (h.color === moverColor) net += VAL[h.piece.toLowerCase()] ?? 0;
    }
  } catch { return 0; }
  return net;
}

/**
 * The post-move grade as a board-true DNA clause — spoken by NAME of the thing,
 * severity implicit in the reason (a blunder's `hung-piece`/`walked-into-tactic`
 * reads sharp; a merit reads light). `named` supplies a named pattern ("the
 * fork", "the pin") so the clause names the PATTERN, not the SAN (Narration Voice
 * Rule). `piece`/`square` name the hung piece when known. Terse — never padded.
 */
export function moveReasonClause(r: MoveReason, ctx?: { named?: string; hung?: { piece: string; square: string } }): string {
  const pattern = ctx?.named;
  const hung = ctx?.hung ? `${PNAME[ctx.hung.piece.toLowerCase()] ?? 'piece'} on ${ctx.hung.square}` : 'piece';
  switch (r) {
    case 'mate': return `there's a forced mate on the board.`;
    case 'hung-piece': return `careful — that hung the ${hung}.`;
    case 'ignored-threat': return `that left a standing threat unmet — it had to be answered first.`;
    case 'walked-into-tactic': return pattern ? `that walked into ${pattern}.` : `that walked into a tactic — the punishment wins material a few moves in.`;
    case 'missed-forcing-win': return `there was a concrete win here, and that wasn't it.`;
    case 'lost-the-thread': return `no tactic — but the plan drifted there.`;
    case 'imprecise-defence': return `it holds, but not the cleanest way.`;
    case 'second-best': return `playable — not quite the most precise.`;
    case 'only-move': return `nice — that was the only move that holds.`;
    case 'defends-threat': return `good — that meets the threat cleanly.`;
    case 'wins-material': return `that wins material.`;
    case 'best': return `clean — the strongest move.`;
    case 'solid': return `solid, nothing lost.`;
  }
}
