// deliberation — narrate the WEIGHING, not just the winner (G0).
//
// THE KEYSTONE (David 2026-08-26, emphatic): Danya has a one-sided DISCUSSION
// with his viewers; the app BROADCASTS. Every position we already run a MultiPV
// fan — the top candidate moves and why each falls short — and then speak ONLY
// the winner as a bare fact. That fan IS the discussion: "Knight f3? No, drops
// the pawn. Bishop d3? Solid but slow. It's got to be this." We compute the whole
// deliberation and delete it before we open our mouth. This turns it back on.
//
// It DECIDES nothing (G0): the candidates, their evals, and whether each drops
// material are all Stockfish + chess.js. This orders the weighing into board-true
// facts; the DNA register phrases them into the spoken discussion. Nothing is
// invented — the deliberation is SPOKEN, not manufactured.
//
// Doc: docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0.
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import { findHangingPieces } from './tacticClassifier';

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MATE_CP = 100000;
/** Default candidates to weigh — David's call: "the first 3, maybe 4." */
const DEFAULT_MAX = 3;
/** A gap (cp, mover POV) past which an alternative is "clearly worse", not just
 *  "a touch less precise". */
const CLEARLY_WORSE_CP = 150;

export type Shortfall = 'drops-material' | 'clearly-worse' | 'less-precise';

export interface Candidate {
  san: string;
  /** Eval of THIS candidate, mover POV (cp; mate → ±100000). */
  evalCp: number;
  /** How much worse than the best move, mover POV (cp, ≥0). 0 for the best. */
  deltaCp: number;
  /** Why it falls short (alternatives only). */
  shortfall?: Shortfall;
  /** The piece it drops, when `shortfall === 'drops-material'`. */
  drops?: { piece: string; square: string };
}

export interface Deliberation {
  /** The move the engine plays. */
  best: Candidate;
  /** The tempting-but-worse alternatives, most-tempting first (best runner-up). */
  alternatives: Candidate[];
  /** True when there's a genuine choice to weigh out loud (≥1 real alternative). */
  isRealChoice: boolean;
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m ? m.san : null;
  } catch { return null; }
}

/** Material the MOVER leaves hanging after playing `uci` from `fen` (SEE-lite via
 *  findHangingPieces) — the concrete "that drops the …" read. Returns the biggest
 *  hanging piece, or null. */
function dropsAfter(fen: string, uci: string, moverColor: 'w' | 'b'): { piece: string; square: string; value: number } | null {
  let after: Chess;
  try {
    after = new Chess(fen);
    const m = after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!m) return null;
  } catch { return null; }
  let worst: { piece: string; square: string; value: number } | null = null;
  try {
    for (const h of findHangingPieces(after)) {
      if (h.color !== moverColor) continue;
      const value = VAL[h.piece.toLowerCase()] ?? 0;
      if (!worst || value > worst.value) worst = { piece: h.piece.toLowerCase(), square: h.square, value };
    }
  } catch { return null; }
  return worst && worst.value >= 2 ? worst : null;
}

/**
 * Build the weighing from the MultiPV fan. Takes the top `maxCandidates`
 * (default 3) lines, converts each to a SAN, computes the mover-POV eval + the
 * gap to the best, and classifies why each alternative falls short (drops
 * material / clearly worse / just less precise). Empty `alternatives` → nothing
 * to weigh (a forced position); `isRealChoice` is then false.
 */
export function buildDeliberation(input: {
  analysis: Pick<StockfishAnalysis, 'topLines'>;
  fenBefore: string;
  moverColor: 'w' | 'b';
  maxCandidates?: number;
}): Deliberation | null {
  const { fenBefore, moverColor } = input;
  const sign = moverColor === 'w' ? 1 : -1;
  const max = input.maxCandidates ?? DEFAULT_MAX;

  const lines = [...(input.analysis.topLines ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .filter((l) => l.moves.length > 0);
  if (lines.length === 0) return null;

  const moverEval = (l: { evaluation: number; mate: number | null }): number =>
    (l.mate != null ? (l.mate > 0 ? MATE_CP : -MATE_CP) : l.evaluation) * sign;

  const bestLine = lines[0];
  const bestSan = uciToSan(fenBefore, bestLine.moves[0]);
  if (!bestSan) return null;
  const bestEval = moverEval(bestLine);
  const best: Candidate = { san: bestSan, evalCp: bestEval, deltaCp: 0 };

  const alternatives: Candidate[] = [];
  for (const l of lines.slice(1, max)) {
    const san = uciToSan(fenBefore, l.moves[0]);
    if (!san || san === bestSan) continue;
    const evalCp = moverEval(l);
    const deltaCp = Math.max(0, bestEval - evalCp);
    const drop = dropsAfter(fenBefore, l.moves[0], moverColor);
    const shortfall: Shortfall = drop ? 'drops-material' : deltaCp >= CLEARLY_WORSE_CP ? 'clearly-worse' : 'less-precise';
    alternatives.push({
      san, evalCp, deltaCp, shortfall,
      drops: drop ? { piece: drop.piece, square: drop.square } : undefined,
    });
  }

  return { best, alternatives, isRealChoice: alternatives.length > 0 };
}

/** One alternative's shortfall, board-true and terse. Concrete where the drop is
 *  computed; honest-terse ("isn't as strong here") where only the eval says so —
 *  never an invented positional reason. */
function shortfallText(c: Candidate): string {
  if (c.shortfall === 'drops-material' && c.drops) {
    return `${c.san}? That drops the ${PNAME[c.drops.piece] ?? 'piece'} on ${c.drops.square}.`;
  }
  if (c.shortfall === 'clearly-worse') return `${c.san}? Clearly worse here.`;
  return `${c.san} is playable, but not as precise.`;
}

/**
 * The weighing as ordered board-true facts for voiceFacts — the tempting
 * alternatives first (each with why it falls short), then the move. The DNA
 * register turns this into the spoken discussion; this is only the facts.
 * Returns '' when there's nothing to weigh.
 */
export function deliberationFacts(d: Deliberation): string {
  if (!d.isRealChoice) return '';
  const weigh = d.alternatives.map(shortfallText);
  return `${weigh.join(' ')} The move is ${d.best.san}.`;
}

/**
 * The weighing WITHOUT the "the move is X" conclusion. Safe to splice into a
 * TAUGHT line (the Watch walkthrough), where the conclusion is the DB-canonical
 * taught move — NOT necessarily the engine's best. Emitting the tempting
 * alternatives + why each falls short teaches the discussion without ever
 * contradicting the board (which would break G3). '' when there's nothing to
 * weigh.
 */
export function deliberationAlternativesFacts(d: Deliberation): string {
  if (!d.isRealChoice) return '';
  return d.alternatives.map(shortfallText).join(' ');
}
