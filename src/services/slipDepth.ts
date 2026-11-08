// slipDepth — HOW THE PUNISHMENT LANDED, proven on the board (WO-DEPTH-01,
// David 2026-11-08: "this game is 100% deterministic. I think it's up to us and
// our tools as to how deeply we dive into it. And I want to dive deep!!").
//
// Measured on David's 1,134 slips against the same player's ordinary moves in
// the same game (`slipDepth.measure.test.ts`): the narrow path (60% vs 55%
// with three or fewer moves holding), a quiet best move (72% vs 67%) and the
// lead-up conditions (pressure 9.2% vs 11.1%, complication 1.6% vs 1.5%,
// cramp 2.5% vs 2.6% over 6,221 slips) do not tell his slips apart, so none of
// them is said as a reason. What does: his slips are quiet moves (62% took,
// checked and threatened nothing, against 50%), and of those that lost
// material, 73% took two or more of the opponent's moves to land and a third
// began with a quiet move. So the deep read is HOW the punishment landed —
// the habit that would have caught it reads it (`safetyHabits.slipHabit`).
// Pure: chess.js and the one line proof. Nothing on a null.
import { Chess } from 'chess.js';
import { proofCut } from './exchangeLedger';

function sanOf(fen: string, uci: string | undefined): { san: string; capture: boolean; check: boolean } | null {
  if (!uci || uci.length < 4) return null;
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return m ? { san: m.san, capture: !!m.captured, check: /[+#]$/.test(m.san) } : null;
  } catch { return null; }
}

export interface Refutation {
  /** The punisher's moves until the cost landed (a mate, or settled material). */
  moves: number;
  /** The line's plies until the cost landed, the punisher's first move
   *  included — what `lineTrust`'s naming horizon is measured in. */
  plies: number;
  mate: boolean;
  /** Material the punisher came out ahead, in pawns (null on a mate). */
  netPawns: number | null;
  /** The punishment began with a move that neither took nor checked. */
  quietStart: boolean;
  /** The line, in SAN, cut where the cost lands. */
  sans: string[];
}

/** The punishment the engine found after the slip (`pvUci`, the punisher's
 *  move first), cut where it lands. Null when the line proves no mate and no
 *  settled material — then the cost was positional and no depth is claimed. */
export function refutationOf(fenAfter: string, pvUci: readonly string[]): Refutation | null {
  if (pvUci.length === 0) return null;
  const sans: string[] = [];
  let fen = fenAfter;
  for (const uci of pvUci) {
    const m = sanOf(fen, uci);
    if (!m) break;
    sans.push(m.san);
    try { const c = new Chess(fen); c.move(m.san); fen = c.fen(); } catch { break; }
  }
  if (sans.length === 0) return null;
  const punisher = new Chess(fenAfter).turn();
  const first = sanOf(fenAfter, pvUci[0]);
  const proof = proofCut(fenAfter, sans, punisher);
  if (!proof) return null;
  if (!proof.mate && (!proof.ledger || proof.ledger.netPawns < 1)) return null;
  return {
    moves: Math.ceil(proof.plies / 2),
    plies: proof.plies,
    mate: proof.mate,
    netPawns: proof.mate ? null : proof.ledger?.netPawns ?? null,
    quietStart: !!first && !first.capture && !first.check,
    sans: proof.sans.slice(0, proof.plies),
  };
}
