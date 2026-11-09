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

/** Fault reasons (bad moves) + merit reasons (good moves). */
export type MoveReason =
  // faults
  | 'allows-mate'
  | 'hung-piece' | 'ignored-threat' | 'walked-into-tactic' | 'missed-forcing-win' | 'lost-the-thread'
  | 'imprecise-defence' | 'second-best'
  // merits
  | 'only-move' | 'clear-best' | 'defends-threat' | 'wins-material' | 'best' | 'solid';

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
/** Best move by at least this much over the second best is a real decision. */
const CLEAR_BEST_GAP_CP = 80;

export interface MoveReasonInputs {
  label: MoveLabel;
  /** Did the student play the engine's best move. */
  isBest: boolean;
  /** The played move's line is a forced mate AGAINST the mover and the best
   *  line's is not — read off the engine's mate fields. REQUIRED: a cost
   *  threshold stood in for it and missed mate-in-one whenever the best line
   *  was itself behind (Fool's mate graded "the plan drifted"). */
  allowsMate: boolean;
  /** MultiPV best-minus-second gap at the pre-move position (cp, mover POV). */
  gap12: number;
  /** The runner-up proves this the only move (`provesOnlyMove`) — the one
   *  test Review's Great reads. REQUIRED so the bar is never re-derived here. */
  onlyMove: boolean;
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
 * thresholds on the board signals, so runtime and the authoring tool agree. The
 * one difference is the mate rule: here it reads the engine's mate fields; the
 * offline tool still flags any mate swing for the author to look at.
 */
export function classifyMoveReason(i: MoveReasonInputs): MoveReason {
  // The worst fault there is. It was named 'mate' and read as a merit: Learn
  // paid a gem, and earned praise, for walking into a forced mate.
  if (i.allowsMate) return 'allows-mate';
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
  if (i.isBest && i.onlyMove) return 'only-move';
  // A CAPTURE THAT WINS AT LEAST WHAT THE THREAT COST IS A WIN, not a
  // defence (prod Learn audit 2026-11-09: …Rxd1+ took their queen for a rook
  // and was praised "Good defence … keeps your knight on g4 safe").
  if (i.capture && i.seeNow >= 2 && i.seeNow >= i.threatNetBefore) return 'wins-material';
  if (i.threatNetBefore >= 3) return 'defends-threat';
  if (i.capture && i.seeNow >= 2) return 'wins-material';
  // A REAL DECISION, FOUND (WO-2 good-move verdicts, 2026-09-29): the best move
  // by a clear margin over the next, short of the only-move bar. A plain `best`
  // in a calm spot — where several moves are about as good — stays silent.
  if (i.isBest && i.gap12 >= CLEAR_BEST_GAP_CP) return 'clear-best';
  if (i.isBest) return 'best';
  return 'solid';
}

/** Whether a reason is a fault (a mistake worth drilling) vs a merit. A Learn
 *  game's faults reach the record through its annotations
 *  (`learnGameRecord`), attributed like an import. */
export type FaultReason = 'allows-mate' | 'hung-piece' | 'ignored-threat' | 'walked-into-tactic'
  | 'missed-forcing-win' | 'lost-the-thread' | 'imprecise-defence' | 'second-best';
export type MeritReason = Exclude<MoveReason, FaultReason>;
export function isFaultReason(r: MoveReason): r is FaultReason {
  return r === 'allows-mate' || r === 'hung-piece' || r === 'ignored-threat' || r === 'walked-into-tactic'
    || r === 'missed-forcing-win' || r === 'lost-the-thread' || r === 'imprecise-defence'
    || r === 'second-best';
}


/** Whether this grade is worth speaking at all — "something to say" (David
 *  2026-08-27). The two ROUTINE outcomes (`solid`, a plain `best` in a calm
 *  spot) say nothing; a fault, an only-move found, a threat met, a real material
 *  win, or mate does. (`book` is an input label, never a classifier output.) */
export function gradeWorthSpeaking(r: MoveReason): boolean {
  // A GRADE SPEAKS ONLY WHEN IT NAMES A CAUSE (David 2026-09-30: describing
  // with no why is "what we do not want"). The merits — "nice — that was the
  // only move that holds", "good — that meets the threat cleanly", "that wins
  // material" — and the soft faults ("playable — not quite the most precise",
  // "no tactic — but the plan drifted there") are verdicts with no reason:
  // measured on three of his games they were 14% of everything said, "the
  // only move that holds" seven times in one game, and "that wins material"
  // on three recaptures. The teaching lanes now say WHY a good move is good
  // (what it stops or prepares, move order, the attack), so a bare merit adds
  // nothing but a label. Silence here is computed, not a cap.
  // The two merits that name a real DECISION (only-move, clear-best) may speak —
  // and only joined to the move's computed point; the caller enforces that
  // (WO-2 #986). Every other merit is a bare label.
  return r === 'allows-mate' || r === 'hung-piece' || r === 'ignored-threat'
    || r === 'walked-into-tactic' || r === 'missed-forcing-win'
    || r === 'only-move' || r === 'clear-best';
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
 * The verdict clause for a MERIT, spoken after the move ("Bxe4: the only move
 * that holds here."). A FAULT has no clause here: why a move was an error is
 * the one error computer's to say (`errorWhy`, WO-DEPTH-01 2026-11-08 — "that
 * hung the knight on e5" here and "That left your knight on e5 …" from
 * `errorWhy` were two verdicts for one move). The type takes merits only, so a
 * fault can never be worded twice. Terse — never padded.
 */
export function moveReasonClause(r: MeritReason): string {
  // NO PRAISE WORDS (Narration Voice Rule 5; hand walk 2026-09-30 heard "nice —"
  // twice on routine recaptures). The verdict states what the move did.
  switch (r) {
    case 'only-move': return `the only move that holds here.`;
    // Said ONLY with the move's computed point after it — a verdict with no
    // reason is bare praise (Narration Voice Rule 5). The caller enforces it.
    case 'clear-best': return `the strongest move here.`;
    case 'defends-threat': return `that meets the threat.`;
    case 'wins-material': return `that wins material.`;
    case 'best': return `the strongest move.`;
    case 'solid': return `solid, nothing lost.`;
  }
}
