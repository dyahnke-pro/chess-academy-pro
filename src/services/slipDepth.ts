// slipDepth — WHY A SLIP HAPPENED, proven on the board (WO-DEPTH-01, David
// 2026-11-08: "this game is 100% deterministic. I think it's up to us and our
// tools as to how deeply we dive into it. And I want to dive deep!!").
//
// The surface read says what the slip did ("the bishop hangs"). These reads
// say why it was there to be made, each one a count the engine's own lines
// prove, never a guess at what the player thought:
//   · THE NARROW PATH — how many of the moves held. A move holds when it gives
//     up less than Lichess's inaccuracy line (0.05 expected score) against
//     the best; "only two of your moves held" is a count off MultiPV.
//   · THE HIDDEN BEST — the move that held was quiet (no capture, no check),
//     the kind a scan of checks and captures walks past.
//   · THE DEEP REFUTATION — how many of the punisher's moves it took for the
//     cost to land, and whether the punishment began with a quiet move.
//   · THE BAIT — what made the slip look good: it took something, gave check,
//     or left a new threat.
// Pure: chess.js, the one win-chance curve, the one line proof. Nothing on a
// null — a reason that is not proven is never said.
import { Chess } from 'chess.js';
import { expectedScore } from './winChance';
import { proofCut } from './exchangeLedger';
import { newThreat } from './threatOut';

/** One engine line, scored from the side to move's view; `pv` in UCI. */
export interface EngineLine {
  cp: number | null;
  mate: number | null;
  pv: readonly string[];
}

/** Lichess's inaccuracy line in expected score: a move that gives up less
 *  than this against the best still holds. */
export const HOLD_GAP = 0.05;

/** A forced mate as centipawns from the side to move's view. */
const MATE_CP = 100000;

function lineCp(l: EngineLine): number {
  if (l.mate != null) return l.mate > 0 ? MATE_CP : -MATE_CP;
  return l.cp ?? 0;
}

function sanOf(fen: string, uci: string | undefined): { san: string; capture: boolean; check: boolean } | null {
  if (!uci || uci.length < 4) return null;
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return m ? { san: m.san, capture: !!m.captured, check: /[+#]$/.test(m.san) } : null;
  } catch { return null; }
}

/** How many of the lines read hold against the best. `read` is how many
 *  lines the engine was asked for, so "every line read held" is told apart
 *  from "only these held". */
export function holdingMoves(lines: readonly EngineLine[]): number {
  if (lines.length === 0) return 0;
  const best = expectedScore(lineCp(lines[0]));
  return lines.filter((l) => best - expectedScore(lineCp(l)) < HOLD_GAP).length;
}

export type SlipBait = 'capture' | 'check' | 'threat';

/** What made the move look good: it took, it checked, or it left a threat. */
export function slipBait(fen: string, san: string): SlipBait | null {
  let after: string;
  let m;
  try { const c = new Chess(fen); m = c.move(san); if (!m) return null; after = c.fen(); } catch { return null; }
  if (m.captured) return 'capture';
  if (/[+#]$/.test(m.san)) return 'check';
  const foe = m.color === 'w' ? 'b' : 'w';
  return newThreat(fen, after, foe) ? 'threat' : null;
}

export interface Refutation {
  /** The punisher's moves until the cost landed (a mate, or settled material). */
  moves: number;
  mate: boolean;
  /** Material the punisher came out ahead, in pawns (null on a mate). */
  netPawns: number | null;
  /** The punishment began with a move that neither took nor checked. */
  quietStart: boolean;
  /** The line, in SAN, cut where the cost lands. */
  sans: string[];
}

/** The punishment the engine found after the slip, cut where it lands. Null
 *  when the line proves no mate and no settled material — then the cost was
 *  positional and no depth is claimed. */
export function refutationOf(fenAfter: string, after: EngineLine | null): Refutation | null {
  if (!after || after.pv.length === 0) return null;
  const sans: string[] = [];
  let fen = fenAfter;
  for (const uci of after.pv) {
    const m = sanOf(fen, uci);
    if (!m) break;
    sans.push(m.san);
    try { const c = new Chess(fen); c.move(m.san); fen = c.fen(); } catch { break; }
  }
  if (sans.length === 0) return null;
  const punisher = new Chess(fenAfter).turn();
  const first = sanOf(fenAfter, after.pv[0]);
  const proof = proofCut(fenAfter, sans, punisher);
  if (!proof) return null;
  if (!proof.mate && (!proof.ledger || proof.ledger.netPawns < 1)) return null;
  return {
    moves: Math.ceil(proof.plies / 2),
    mate: proof.mate,
    netPawns: proof.mate ? null : proof.ledger?.netPawns ?? null,
    quietStart: !!first && !first.capture && !first.check,
    sans: proof.sans.slice(0, proof.plies),
  };
}

export interface SlipDepth {
  /** Moves that held, of the lines read. */
  holds: number;
  read: number;
  /** The best move neither took nor checked. */
  bestQuiet: boolean;
  bait: SlipBait | null;
  refutation: Refutation | null;
}

/** Every deep read of one move, from the engine's lines before it and (for a
 *  slip) the line after it. */
export function slipDepth(fen: string, san: string, lines: readonly EngineLine[], after: EngineLine | null): SlipDepth | null {
  if (lines.length === 0) return null;
  const best = sanOf(fen, lines[0].pv[0]);
  let fenAfter: string | null = null;
  try { const c = new Chess(fen); if (c.move(san)) fenAfter = c.fen(); } catch { fenAfter = null; }
  return {
    holds: holdingMoves(lines),
    read: lines.length,
    bestQuiet: !!best && !best.capture && !best.check,
    bait: slipBait(fen, san),
    refutation: fenAfter ? refutationOf(fenAfter, after) : null,
  };
}
