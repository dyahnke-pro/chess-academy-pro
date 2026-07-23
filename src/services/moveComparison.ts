// moveComparison — THE METHOD OF COMPARISON (David 2026-07-23, from Naroditsky:
// "that's called the method of comparison. That's where you really get to the
// bottom of why the engine recommends what it does").
//
// The "why" of a move is the DIFF between it and the alternative — and a diff
// between two real boards is COMPUTABLE, so it is never invented. We play both
// moves out, ask the engine to evaluate each, then PROVE which concrete
// difference causes the gap:
//
//   • MATERIAL   — the better line simply keeps/wins material (magnitude
//                  reconciles the gap directly; no experiment needed).
//   • ABLATION   — the controlled experiment. Suspect a passed pawn? REMOVE it
//                  from the better position and re-evaluate: if the gap
//                  collapses, that pawn WAS the reason (engine-proven); if it
//                  holds, the hypothesis is wrong — keep looking.
//   • (later)    — tactic-resource refutation, king-safety, structure.
//
// The engine is the judge; the diff is only a hypothesis. A reason is spoken
// ONLY if it survives verification AND its magnitude reconciles the gap. If
// nothing survives, we return NO delta and hand back the engine's LINE so the
// caller can SHOW the why by playing it out — never manufacture one.
//
// 100% engine (Stockfish, client-side) — zero LLM in the proof. The evaluate
// function is injected so this is a pure, unit-testable core; production wires
// it to stockfishEngine, tests pass a deterministic mock (G0).

import { Chess } from 'chess.js';
import type { Square, Color, PieceSymbol } from 'chess.js';

/** One engine evaluation of a position — white-POV centipawns (+ = White
 *  better). A mate is folded into `cp` by the evaluate implementation. `pv` is
 *  the principal variation as UCI moves (for playing the line out / "show me").*/
export interface EngineEval {
  cp: number;
  pv?: string[];
}

/** The injected engine. Production: stockfishEngine. Tests: a deterministic
 *  mock keyed by FEN. Always returns white-POV cp. */
export type Evaluate = (fen: string) => Promise<EngineEval>;

export type DeltaKind = 'material' | 'passed-pawn' | 'none';

/** A reason that SURVIVED verification — every field is a measured fact. */
export interface VerifiedDelta {
  kind: DeltaKind;
  /** Grounded, board-true phrase for the voice layer (LLM only rewords it). */
  text: string;
  /** How the engine proved it. */
  proof: 'material-count' | 'ablation';
  /** The ablation experiment's numbers (mover-POV cp), when proof==='ablation'.*/
  ablation?: { full: number; ablated: number; worse: number };
}

export interface Comparison {
  /** Which of the two moves the engine prefers (for the mover). */
  better: 'A' | 'B' | 'equal';
  sanBetter: string | null;
  sanWorse: string | null;
  /** White-POV cp after each move. */
  evalA: number;
  evalB: number;
  /** The eval gap from the MOVER's perspective (always ≥ 0). */
  gapCp: number;
  /** The engine-proven reason, or null when none survived — then SHOW `line`. */
  delta: VerifiedDelta | null;
  /** The engine's principal variation from the BETTER move, as SANs, so the
   *  caller can play the why out on the board (bounded). */
  line: string[];
}

const PIECE_VAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_WORD: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** White-minus-black material in points. */
function materialWhiteMinusBlack(fen: string): number {
  const c = new Chess(fen);
  let s = 0;
  for (const row of c.board()) for (const cell of row) if (cell) s += (cell.color === 'w' ? 1 : -1) * PIECE_VAL[cell.type];
  return s;
}

/** Passed pawns of `color` — no enemy pawn on the same or an adjacent file
 *  ahead of it. Pure board fact. */
function passedPawns(fen: string, color: Color): string[] {
  const c = new Chess(fen);
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const enemyPawns: Array<{ f: number; r: number }> = [];
  for (const row of c.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'p' && cell.color === enemy) {
        enemyPawns.push({ f: cell.square.charCodeAt(0) - 97, r: Number(cell.square[1]) });
      }
    }
  }
  const out: string[] = [];
  for (const row of c.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'p' || cell.color !== color) continue;
      const f = cell.square.charCodeAt(0) - 97;
      const r = Number(cell.square[1]);
      const blocked = enemyPawns.some((p) => Math.abs(p.f - f) <= 1 && (color === 'w' ? p.r > r : p.r < r));
      if (!blocked) out.push(cell.square);
    }
  }
  return out;
}

/** Replay a UCI pv from `fen` into SANs (bounded), stopping at the first
 *  illegal move. Used to SHOW the why on the board. */
function pvToSan(fen: string, pv: string[], max = 8): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      if (!m) break;
      out.push(m.san);
    } catch {
      break;
    }
  }
  return out;
}

export interface CompareOpts {
  /** Below this mover-POV cp gap the two moves are "about the same". */
  gapThresholdCp?: number;
  /** A candidate must explain at least this fraction of the gap to be spoken. */
  explainFraction?: number;
}

/**
 * Compare two candidate moves from a position and PROVE why one is better.
 * Returns null if either move is illegal. Every reason it speaks is
 * engine-verified; when it can't prove one, `delta` is null and `line` carries
 * the engine's variation so the caller can show the why instead of inventing it.
 */
export async function compareTwoMoves(
  fen: string,
  sanA: string,
  sanB: string,
  evaluate: Evaluate,
  opts: CompareOpts = {},
): Promise<Comparison | null> {
  const gapThreshold = opts.gapThresholdCp ?? 40;
  const explainFraction = opts.explainFraction ?? 0.6;

  let ca: Chess, cb: Chess;
  let mvA: ReturnType<Chess['move']> | null;
  let mvB: ReturnType<Chess['move']> | null;
  try { ca = new Chess(fen); mvA = ca.move(sanA); } catch { return null; }
  try { cb = new Chess(fen); mvB = cb.move(sanB); } catch { return null; }
  if (!mvA || !mvB) return null;

  const mover: Color = new Chess(fen).turn();
  const sign = mover === 'w' ? 1 : -1;

  const [eA, eB] = [await evaluate(ca.fen()), await evaluate(cb.fen())];
  const moverA = sign * eA.cp;
  const moverB = sign * eB.cp;
  const better: 'A' | 'B' | 'equal' = moverA > moverB ? 'A' : moverB > moverA ? 'B' : 'equal';
  const gapCp = Math.abs(moverA - moverB);

  const betterFen = better === 'A' ? ca.fen() : cb.fen();
  const worseFen = better === 'A' ? cb.fen() : ca.fen();
  const betterEval = better === 'A' ? eA : eB;
  const betterCpMover = Math.max(moverA, moverB);
  const worseCpMover = Math.min(moverA, moverB);

  const base = {
    better,
    sanBetter: better === 'A' ? mvA.san : mvB.san,
    sanWorse: better === 'A' ? mvB.san : mvA.san,
    evalA: eA.cp,
    evalB: eB.cp,
    gapCp,
    line: pvToSan(betterFen, betterEval.pv ?? []),
  };

  // The moves come out about the same — no "why" to prove.
  if (gapCp < gapThreshold) {
    return { ...base, delta: { kind: 'none', text: 'the two moves come out about the same', proof: 'material-count' } };
  }

  // ── 1. MATERIAL — the better line simply stays ahead on material. Magnitude
  // reconciles directly (a point of material ≈ 100cp); no experiment needed.
  const matDiffPts = sign * materialWhiteMinusBlack(betterFen) - sign * materialWhiteMinusBlack(worseFen);
  if (matDiffPts >= 1 && matDiffPts * 100 >= explainFraction * gapCp) {
    const pts = matDiffPts >= 9 ? 'the queen' : matDiffPts >= 5 ? 'a rook' : matDiffPts >= 3 ? 'a piece' : `${matDiffPts} pawn${matDiffPts > 1 ? 's' : ''}`;
    return {
      ...base,
      delta: { kind: 'material', text: `it stays ${pts} of material ahead — ${base.sanWorse} gives that back`, proof: 'material-count' },
    };
  }

  // ── 2. PASSED PAWN — the controlled experiment. For each passed pawn the
  // better line has that the worse line does NOT, REMOVE it and re-evaluate. If
  // deleting it collapses most of the gap, that pawn is the proven cause.
  const passersWorse = new Set(passedPawns(worseFen, mover));
  for (const sq of passedPawns(betterFen, mover)) {
    if (passersWorse.has(sq)) continue; // only a passer the better move CREATED
    const abl = new Chess(betterFen);
    abl.remove(sq as Square);
    const eAbl = await evaluate(abl.fen());
    const moverAbl = sign * eAbl.cp;
    const removedCp = betterCpMover - moverAbl; // what the pawn was worth
    if (removedCp >= explainFraction * gapCp) {
      return {
        ...base,
        delta: {
          kind: 'passed-pawn',
          text: `your passed pawn on ${sq} — take it off the board and the edge is gone`,
          proof: 'ablation',
          ablation: { full: betterCpMover, ablated: moverAbl, worse: worseCpMover },
        },
      };
    }
  }

  // ── 3. Nothing survived verification. Do NOT invent a reason — hand back the
  // engine's line so the caller SHOWS the why by playing it out.
  return { ...base, delta: null };
}

export const __test = { materialWhiteMinusBlack, passedPawns, pvToSan, PIECE_WORD };
