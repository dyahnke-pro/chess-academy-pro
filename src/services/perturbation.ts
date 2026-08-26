// perturbation — the "leans-on" why-probe (G0). The one genuinely-NEW capability
// from the offline PositionFacts calculator (docs/plans/2026-08-26-position-
// facts-calculator.md): WHY is a strong piece strong? Leave-one-out on its
// SUPPORTERS — remove each defender, re-run Stockfish's static `eval`, and
// measure how much the piece's own contribution drops. The biggest drop is the
// load-bearing supporter ("the knight leans on the d-pawn; take it and it's
// ordinary"). Board-true by construction: it only probes real defenders
// (chess.js attackers) and reports numbers the engine hands back.
//
// EXPENSIVE — one static eval per supporter. It takes the engine as an injected
// async fn so it stays pure/testable, and callers gate it behind criticality
// (only run it where the score trips) per the cost architecture.
import { Chess, type Square } from 'chess.js';
import { parseEvalTable, strongestByDelta, type PieceValue } from './pieceValueRead';

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface LeansOn {
  /** The outperforming piece the probe explains. */
  piece: string;
  square: string;
  /** Its own-side contribution (pawns) in the base position. */
  contribution: number;
  /** The load-bearing supporter — removing it drops the piece's contribution
   *  by `drop` pawns. */
  leansOn: { square: string; piece: string; drop: number };
}

export type EvalBoardFn = (fen: string) => Promise<string>;

/** A piece's contribution in ITS OWN side's favour (the eval table is
 *  white-positive). */
const ownContribution = (v: PieceValue): number => (v.color === 'w' ? v.value : -v.value);

/**
 * What the mover's best-placed piece leans on. Returns null when there's no
 * clearly-outperforming piece (delta < `minDelta`), no supporter, or no
 * supporter whose removal costs at least `minDrop` — the honest "it doesn't
 * lean on anything in particular" silence.
 */
export async function computeLeansOn(
  fen: string,
  moverColor: 'w' | 'b',
  evalBoard: EvalBoardFn,
  opts: { minDelta?: number; minDrop?: number } = {},
): Promise<LeansOn | null> {
  const minDelta = opts.minDelta ?? 0.3;
  const minDrop = opts.minDrop ?? 0.5;

  let baseTable: PieceValue[];
  try { baseTable = parseEvalTable(await evalBoard(fen)); } catch { return null; }
  const star = strongestByDelta(baseTable, moverColor);
  if (!star || star.delta < minDelta) return null;
  const starVal = baseTable.find((v) => v.square === star.square);
  if (!starVal) return null;
  const before = Math.abs(ownContribution(starVal));

  let defenders: string[] = [];
  try { defenders = new Chess(fen).attackers(star.square as Square, moverColor) ?? []; } catch { return null; }

  let bestDrop = 0;
  let bestSup: LeansOn['leansOn'] | null = null;
  for (const dsq of defenders) {
    const cc = new Chess(fen);
    const removed = cc.remove(dsq as Square);
    if (!removed || removed.type === 'k') continue; // never "remove the king"
    let t2: PieceValue[];
    try { t2 = parseEvalTable(await evalBoard(cc.fen())); } catch { continue; }
    const after = t2.find((v) => v.square === star.square);
    if (!after) continue;
    const drop = +(before - Math.abs(ownContribution(after))).toFixed(2);
    if (drop > bestDrop) { bestDrop = drop; bestSup = { square: dsq, piece: PNAME[removed.type], drop }; }
  }
  if (!bestSup || bestDrop < minDrop) return null;
  return { piece: PNAME[starVal.piece.toLowerCase()], square: star.square, contribution: +before.toFixed(2), leansOn: bestSup };
}
