// playedMoveGrade — grade the move the student JUST played, cheaply and in time
// to speak it (G0). The bridge from the move-reason classifier to a live call
// site.
//
// THE TIMING SOLVE (David 2026-08-27, "BUILD"): the spoken post-move grade needs
// the after-move eval, and a fresh search would land after the opponent already
// replied. But when the student's played move is already one of the MultiPV
// candidates in the fan we paid for at `fenBefore`, its eval is in hand — cpLoss
// falls straight out, no new search, no timing hack. That grades the common case
// synchronously; a move OUTSIDE the fan (a bigger surprise) returns null and
// stays with the deferred slip faucet. Honest: we speak the grade when we can do
// it correctly and cheaply, and stay quiet (but still log) otherwise.
//
// Doc: docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0c.
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import {
  classifyMoveReason, isFaultReason, reasonWeaknessTag, gradeWorthSpeaking, moveReasonClause,
  hangingNetForMover, type MoveReason, type MoveLabel,
} from './moveReason';
import { computeMustDefend } from './threatOut';
import { findHangingPieces } from './tacticClassifier';
import { missedPlanClause } from './movePlan';
import { moveScoresOneSearch, uciOfSan, type CostFan, type MovePrice } from './moveCost';
import { SINGLETON_SCORER } from './refutedAlternative';
import { stockfishEngine } from './stockfishEngine';
import { proofCut } from './exchangeLedger';
import { gradeMove, provesOnlyMove } from './accuracyService';

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export interface PlayedMoveGrade {
  reason: MoveReason;
  /** The spoken grade (named, not centipawns) — '' when not worth speaking. */
  clause: string;
  cpLossCp: number;
  /** The graded band (`gradeMove`), the input to the stored verdict. */
  label: MoveLabel;
  worthSpeaking: boolean;
  fault: boolean;
  /** Weakness-spine tag for a fault (auto-log to My Mistakes), else null. */
  weaknessTag: string | null;
}

/** The label, from the ONE grader (accuracyService.gradeMove): expected
 *  points from both evals, one mate rule. A missed mate in eight with the
 *  played move still +7 is no fault — it used to read as a 99,000cp blunder. */
function labelFor(
  best: { evaluation: number; mate: number | null },
  played: { evaluation: number; mate: number | null },
  sign: number,
  isBest: boolean,
): MoveLabel {
  if (isBest) return 'best';
  const mateOf = (l: { mate: number | null }): number | null => (l.mate === null ? null : l.mate * sign);
  const cpOf = (l: { evaluation: number; mate: number | null }): number | null => (l.mate === null ? l.evaluation * sign : null);
  return gradeMove({ beforeCp: cpOf(best), afterCp: cpOf(played), mateBefore: mateOf(best), mateAfter: mateOf(played) }) ?? 'good';
}

/**
 * Grade the played move from the paid-for `fenBefore` analysis + the board.
 * Returns null when the move isn't in the fan (can't grade cheaply — the deferred
 * faucet handles it) or the inputs are unusable.
 */
export function gradePlayedMove(input: {
  fenBefore: string;
  /** The move actually played, UCI (e.g. 'e2e4'). */
  playedUci: string;
  fenAfter: string;
  analysisBefore: Pick<StockfishAnalysis, 'topLines' | 'bestMove'> & { depth?: number };
  studentColor: 'w' | 'b';
  /** The depth a cost must come from (the price's depth). REQUIRED: a fan the
   *  budget cut short of it grades nothing — Kg5's "63" was a depth-6 spread
   *  of lines read as a cost (#2 root cause 4, 2026-10-20). */
  depth: number;
}): PlayedMoveGrade | null {
  const { fenBefore, playedUci, fenAfter, analysisBefore, studentColor } = input;
  if ((analysisBefore.depth ?? 0) < input.depth) return null;     // shallow fan → the price decides
  const sign = studentColor === 'w' ? 1 : -1;
  const lines = [...(analysisBefore.topLines ?? [])].sort((a, b) => a.rank - b.rank).filter((l) => l.moves.length);
  if (lines.length === 0) return null;

  const moverEval = (l: { evaluation: number; mate: number | null }): number =>
    (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation) * sign;

  const bestEval = moverEval(lines[0]);
  const played = lines.find((l) => l.moves[0] === playedUci);
  if (!played) return null;                       // outside the fan → defer
  const cpLossCp = Math.max(0, bestEval - moverEval(played));
  const isBest = analysisBefore.bestMove === playedUci || lines[0].moves[0] === playedUci;
  // A GAP IS NOT A DECISION WHEN THE RUNNER-UP STILL WINS (Learn walk
  // 2026-10-01: "Bxe4: the only move that holds" with three moves mating —
  // the in-app read had the second as a big plus). Only-move and clear-best
  // both need the second move to give the win away.
  const secondStillWins = lines.length >= 2 && moverEval(lines[1]) >= 300 && bestEval >= 300;
  const gap12 = lines.length >= 2 && !secondStillWins ? bestEval - moverEval(lines[1]) : 0;
  const label = labelFor(lines[0], played, sign, isBest);

  // THE PLAYED MOVE'S OWN LINE DECIDES WHAT IT WON OR LOST (WO-OUTCOME-01 B).
  // The fan already carries the engine's line for the played move; the ledger
  // settles it. A one-square swap count said "that wins material" of a knight
  // taken straight back, and "that hung the X" of a piece the line never takes.
  const playedSans: string[] = [];
  try {
    const r = new Chess(fenBefore);
    for (const u of played.moves) {
      const m = r.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      playedSans.push(m.san);
    }
  } catch { /* a short line proves less, never more */ }
  const proof = playedSans.length ? proofCut(fenBefore, playedSans, studentColor) : null;
  const lineNet = proof && !proof.mate && proof.ledger ? proof.ledger.netPawns : null;
  const opp = studentColor === 'w' ? 'b' : 'w';
  const lineTakes = (sq: string): boolean => {
    if (!proof) return false;
    try {
      const r = new Chess(fenBefore);
      for (const san of proof.sans.slice(0, proof.plies)) {
        const m = r.move(san);
        if (m.color === opp && m.captured && m.to === sq) return true;
      }
    } catch { return false; }
    return false;
  };
  const bad0 = label === 'mistake' || label === 'blunder';

  // Board-only signals (synchronous). On a FAULT they are claims about what the
  // move lost, so the line must prove them; on a good move the threat is only
  // the fact that one stood ("that meets the threat").
  const md = (() => { try { return computeMustDefend(fenBefore, studentColor); } catch { return { net: 0, pieces: [] }; } })();
  const threatNetBefore = !bad0 ? md.net
    : md.pieces[0] && lineNet !== null && lineNet <= -2 && lineTakes(md.pieces[0].square) ? md.net : 0;
  let hangAfter = hangingNetForMover(fenAfter, studentColor);
  let capture = false, seeNow = 0, hung: { piece: string; square: string } | undefined;
  try {
    const c = new Chess(fenBefore);
    const mv = c.move({ from: playedUci.slice(0, 2), to: playedUci.slice(2, 4), promotion: playedUci[4] });
    // What the capture NETS over its line, never the captured piece's value.
    if (mv?.captured) { capture = true; seeNow = lineNet !== null ? Math.max(0, lineNet) : 0; }
  } catch { /* board read is a bonus */ }
  if (hangAfter >= 2) {
    try {
      // Name the biggest piece the move left hanging (for the spoken clause).
      const after = new Chess(fenAfter);
      let worst = -1;
      for (const h of findHangingPieces(after)) {
        if (h.color !== studentColor) continue;
        const v = VAL[h.piece.toLowerCase()] ?? 0;
        if (v > worst) { worst = v; hung = { piece: h.piece.toLowerCase(), square: h.square }; }
      }
    } catch { /* naming is a bonus */ }
    // The line must take the named piece and leave the mover ≥2 down.
    if (!hung || lineNet === null || lineNet > -2 || !lineTakes(hung.square)) { hangAfter = 0; hung = undefined; }
  }

  // ONE "ONLY MOVE" TEST — the same predicate Review's Great reads.
  const onlyMove = lines.length >= 2 && provesOnlyMove(bestEval, moverEval(lines[1]));
  const reason = classifyMoveReason({
    label, isBest, cpLossCp, gap12, onlyMove, threatNetBefore, hangAfter,
    forceNetBest: 0, capture, seeNow, refuteNet: 0,
  });
  const worthSpeaking = gradeWorthSpeaking(reason);
  let clause = worthSpeaking ? moveReasonClause(reason, { hung }) : '';
  // §9 missed-PLAN: on a real fault, if the engine's plan and the played move's
  // plan clearly diverge (castle-the-king / strike-the-centre), name the idea the
  // position called for — the whole idea was wrong, not just the square. Board-
  // true; '' unless it's one of the two high-confidence cases.
  if (worthSpeaking && isFaultReason(reason)) {
    const bestUci = analysisBefore.bestMove || lines[0].moves[0];
    const plan = missedPlanClause(fenBefore, playedUci, bestUci);
    if (plan) clause = clause ? `${clause} ${plan}` : plan;
  }
  return {
    reason,
    clause,
    cpLossCp,
    label,
    worthSpeaking,
    fault: isFaultReason(reason),
    weaknessTag: reasonWeaknessTag(reason),
  };
}

/** WHAT ONE MOVE COST — THE ONE PRICE (#2 root cause 4, 2026-10-20). The cost
 *  and, when both moves were scored as centipawns in the same search, those
 *  two White-POV scores, so the band ("inaccuracy" / "mistake") is graded from
 *  the tree the cost came from. Null scores: the played move was the fan's best
 *  (cost 0 by definition) on a read too shallow or mate-scored to quote. */
export type { MovePrice } from './moveCost';

/** One price per (position, move) for the life of the page: the door, the
 *  spoken verdict and the saved record all read the SAME promise, so the
 *  engine runs one search and the three cannot disagree (Kg5: the door said 63,
 *  the record 115, Stockfish depth 20 says 112-142). The first reader's fan and
 *  depth decide; later readers share its answer. */
const PRICE_MEMO = new Map<string, Promise<MovePrice | null>>();
const PRICE_MEMO_CAP = 256;

/** Test seam: forget every remembered price. */
export function clearMovePriceMemo(): void { PRICE_MEMO.clear(); }

/** THE PRICE OF THE PLAYED MOVE, FROM ONE SEARCH — memoized per (fen, move).
 *  Null when it cannot be priced (no fan, the scorer failed, a mate either
 *  way): unpriced is never "free". */
export function liveMovePrice(fenBefore: string, playedUci: string, fan: CostFan | null, depth: number): Promise<MovePrice | null> {
  return memoPrice(fenBefore, playedUci, fan, depth, (args) => moveScoresOneSearch({ ...args, scorer: SINGLETON_SCORER }));
}

/** THE PRICE OF THE MOVE THE STUDENT JUST PLAYED LEADS THE ENGINE (OS-18,
 *  Smith-Morra replay 2026-10-20, move 14: the price joined the back of the
 *  line and the verdict was built 6.7 s after a costly move). The same one
 *  price as `liveMovePrice` — one memo, so the record reads this search — run
 *  through the engine's hold: the search in flight stops and background reads
 *  wait, because the student is waiting on its answer. */
export function studentMovePrice(fenBefore: string, playedUci: string, fan: CostFan | null, depth: number): Promise<MovePrice | null> {
  return memoPrice(fenBefore, playedUci, fan, depth, (args) => stockfishEngine.holdForQuestion((engine) => moveScoresOneSearch({
    ...args,
    scorer: {
      async scoreMoves(fen, ucis, d) {
        const r = await engine.analyzePosition(fen, d, { searchmoves: ucis.join(' ') });
        return r.topLines.map((l) => ({ evaluation: l.evaluation, mate: l.mate, moves: l.moves }));
      },
    },
  })));
}

type PriceSearch = (args: { fenBefore: string; playedUci: string; fan: CostFan | null; depth: number }) => ReturnType<typeof moveScoresOneSearch>;

function memoPrice(fenBefore: string, playedUci: string, fan: CostFan | null, depth: number, search: PriceSearch): Promise<MovePrice | null> {
  const key = `${fenBefore}|${playedUci}`;
  const known = PRICE_MEMO.get(key);
  if (known) return known;
  const run = (async (): Promise<MovePrice | null> => {
    const lines = (fan?.topLines ?? []).filter((l) => l.moves.length > 0);
    const best = lines[0];
    if (best && best.moves[0] === playedUci) {
      // The fan's best move costs nothing; its score is quotable only from a
      // deep enough, centipawn read.
      const quotable = (fan?.depth ?? 0) >= depth && best.mate == null;
      return { costCp: 0, scores: quotable ? { bestWhiteCp: best.evaluation, playedWhiteCp: best.evaluation } : null };
    }
    const s = await search({ fenBefore, playedUci, fan, depth });
    return s ? { costCp: s.costCp, scores: { bestWhiteCp: s.bestWhiteCp, playedWhiteCp: s.playedWhiteCp } } : null;
  })();
  // A failed search is not remembered: the next reader may price it.
  const guarded = run.catch(() => null);
  void guarded.then((p) => { if (p === null && PRICE_MEMO.get(key) === guarded) PRICE_MEMO.delete(key); });
  if (PRICE_MEMO.size >= PRICE_MEMO_CAP) {
    const oldest = PRICE_MEMO.keys().next().value;
    if (oldest !== undefined) PRICE_MEMO.delete(oldest);
  }
  PRICE_MEMO.set(key, guarded);
  return guarded;
}

/** The band the price grades to, from its two same-search scores (the ONE
 *  grader, `gradeMove`). 'best' at no cost; null when the scores are unknown. */
export function priceLabel(price: MovePrice | null, mover: 'w' | 'b'): MoveLabel | null {
  if (!price) return null;
  if (price.costCp === 0) return 'best';
  if (!price.scores) return null;
  const sign = mover === 'w' ? 1 : -1;
  return gradeMove({ beforeCp: price.scores.bestWhiteCp * sign, afterCp: price.scores.playedWhiteCp * sign }) ?? 'good';
}

/** The price's cost alone — `liveMovePrice`'s number. */
export async function liveMoveCost(fenBefore: string, playedUci: string, fan: CostFan | null, depth: number): Promise<number | null> {
  return (await liveMovePrice(fenBefore, playedUci, fan, depth))?.costCp ?? null;
}

export { uciOfSan };
