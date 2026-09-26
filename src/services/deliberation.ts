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
import { proofAgainstMover } from './exchangeLedger';
import { strategicWhyLed } from './moveFundamentals';
import { legalSeeGainFor } from './positionReadingService';

const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** A capture that WINS material, the exchange counted out — that is the move's
 *  reason, ahead of any positional gloss. Hand walk 2340: dxe5 "stakes out the
 *  center" when his line was "that's a free pawn" (…Nxe5 loses the knight to
 *  Nxe5). Null for a trade or a sacrifice. */
function materialWhy(fenBefore: string, san: string, mover: 'w' | 'b', opponentLastSan: string | null): string | null {
  try {
    const c = new Chess(fenBefore);
    const m = c.move(san);
    // MATE IS THE REASON. "The move is Qxd6# — it wins the bishop on d6" (hand
    // walk 1200) named the capture and missed the point.
    if (c.isCheckmate()) return 'ends the game';
    if (!m?.captured) return null;
    // A recapture is the trade finishing, never material won — and taking back
    // IS the reason ("The move is Rexd8 — it takes the open d-file" after Qxd8).
    if (opponentLastSan && new RegExp(`x${m.to}(?![1-8])`).test(opponentLastSan)) return `takes back the ${PIECE_NOUN[m.captured] ?? 'piece'}`;
    // SEE counts the recaptures: a positive net is material won, not a trade.
    if (legalSeeGainFor(fenBefore, m.to, mover) <= 0) return null;
    return `wins the ${PIECE_NOUN[m.captured] ?? 'piece'} on ${m.to}`;
  } catch {
    return null;
  }
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MATE_CP = 100000;
/** Default candidates to weigh — David's call: "the first 3, maybe 4." */
const DEFAULT_MAX = 3;
/** A gap (cp, mover POV) past which an alternative is "clearly worse", not just
 *  "a touch less precise". */
const CLEARLY_WORSE_CP = 150;
/** Below this gap (cp) an alternative is a coin-flip, not a fork in the road.
 *  On a quiet opening spine EVERY reasonable move sits inside this band, so
 *  weighing them out loud is filler ("X is playable, but not as precise") — the
 *  exact banned register. `meaningfulAlternatives` drops these; a position with
 *  nothing past the band weighs to '' (silence, which the voice rules allow). */
const MEANINGFUL_DELTA_CP = 40;

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
  /** The candidate's own engine line cut to the point it PROVES against the
   *  mover ("Nxe5, Qd4 and Qxe5 — they win a knight"), when it proves one
   *  (WO-TEACH-02 S5). A candidate is a lesson only with its reason. */
  proof?: string;
}

export interface Deliberation {
  /** The move the engine plays. */
  best: Candidate;
  /** The tempting-but-worse alternatives, most-tempting first (best runner-up). */
  alternatives: Candidate[];
  /** True when there's a genuine choice to weigh out loud (≥1 real alternative). */
  isRealChoice: boolean;
  /** Why the best move is best, from the board (`strategicWhyLed`). Null when
   *  the board gives no reason — then the verdict is not spoken. */
  bestWhy: string | null;
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
  let captured = 0;
  let landed = '';
  try {
    after = new Chess(fen);
    const m = after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!m) return null;
    captured = m.captured ? VAL[m.captured] ?? 0 : 0;
    landed = m.to;
  } catch { return null; }
  let worst: { piece: string; square: string; value: number } | null = null;
  try {
    for (const h of findHangingPieces(after)) {
      if (h.color !== moverColor) continue;
      const value = VAL[h.piece.toLowerCase()] ?? 0;
      if (!worst || value > worst.value) worst = { piece: h.piece.toLowerCase(), square: h.square, value };
    }
  } catch { return null; }
  if (!worst || worst.value < 2) return null;
  // AN EXCHANGE IS NOT A DROP. The capturing piece standing en prise on the
  // square it took on is a trade when it took at least as much (hand walk
  // 2026-09-24: "Rxd8? That drops the rook on d8." — rook for rook).
  if (worst.square === landed && captured >= worst.value - 1) return null;
  return worst;
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
  /** The move the surface is committed to (the DB-canonical TAUGHT move on a
   *  walkthrough). Dropped from the alternatives so the weighing never lists
   *  the move being played as a weaker option — which reads as a
   *  self-contradiction on the board (G3). */
  excludeSan?: string;
  /** The opponent's move just before (SAN), or null at the start. REQUIRED: a
   *  capture back on the square they just took on is the trade finishing, so
   *  "it wins the queen on d8" after …Qxd8 is false (hand walk 2026-09-25). */
  opponentLastSan: string | null;
}): Deliberation | null {
  const { fenBefore, moverColor, excludeSan } = input;
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
    if (!san || san === bestSan || san === excludeSan) continue;
    const evalCp = moverEval(l);
    const deltaCp = Math.max(0, bestEval - evalCp);
    const drop = dropsAfter(fenBefore, l.moves[0], moverColor);
    const shortfall: Shortfall = drop ? 'drops-material' : deltaCp >= CLEARLY_WORSE_CP ? 'clearly-worse' : 'less-precise';
    const proof = proofAgainstMover(fenBefore, l.moves, moverColor);
    alternatives.push({
      san, evalCp, deltaCp, shortfall,
      drops: drop ? { piece: drop.piece, square: drop.square } : undefined,
      ...(proof ? { proof } : {}),
    });
  }

  const bestWhy = moveWhy(fenBefore, bestSan, moverColor, input.opponentLastSan);
  return { best, alternatives, isRealChoice: alternatives.length > 0, bestWhy };
}


/** One alternative's shortfall, board-true and terse. Concrete where the drop is
 *  computed; honest-terse ("isn't as strong here") where only the eval says so —
 *  never an invented positional reason. */
function shortfallText(c: Candidate): string {
  // The proof leads: the line that shows WHY beats a label for it.
  // …for EVERY shortfall with a proof. `deliberationFacts` lets a less-precise
  // move through only BECAUSE it has one, and this branch used to skip it for
  // exactly that category — so the move fell to the filler line below (hand
  // walk 2026-09-24: "Bb3 is playable, but not as precise").
  if (c.proof) {
    // The proof line starts with the candidate itself; asked as a question it
    // is already named, so the answer starts with the REPLY — "Qf5? Then
    // castles, and the rook on e8 falls", never "Qf5? Qf5, castles…".
    const esc = c.san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rest = c.proof.replace(new RegExp(`^${esc}(?:, | and )`), '');
    if (rest !== c.proof) return `${c.san}? Then ${rest}.`;
    return `${c.san}? ${c.proof[0].toUpperCase()}${c.proof.slice(1)}.`;
  }
  if (c.shortfall === 'drops-material' && c.drops) {
    return `${c.san}? That drops the ${PNAME[c.drops.piece] ?? 'piece'} on ${c.drops.square}.`;
  }
  return `${c.san} is playable, but not as precise.`;
}

/**
 * The weighing as ordered board-true facts for voiceFacts — the tempting
 * alternatives first (each with why it falls short), then the move. The DNA
 * register turns this into the spoken discussion; this is only the facts.
 * Returns '' when there's nothing to weigh.
 */
export function deliberationFacts(d: Deliberation): string {
  // Only a REAL fork is weighed out loud (the 2026-09-24 Learn tape: "h5 is
  // playable, but not as precise. g6 is playable, but not as precise. The move
  // is Rg8." on a quiet endgame move). Coin-flip alternatives are the banned
  // filler register; with none left there is no choice to narrate — silence.
  // …and only with a REASON. "g6 is playable, but not as precise" came back on
  // a real 40–150cp gap (same tape): true, and still filler — it names a move
  // and teaches nothing about it. An alternative is weighed out loud only when
  // the board says WHY it falls short: a line that proves it, a piece it drops,
  // or a gap big enough to call clearly worse.
  // "Clearly worse here" is a verdict, not a reason (rule 1, hand walk 1380:
  // "cxb3? Clearly worse here."). An alternative is ruled out loud only with
  // the line that proves it or the piece it drops.
  const reasoned = meaningfulAlternatives(d).filter((a) => !!a.proof || (a.shortfall === 'drops-material' && !!a.drops));
  if (!d.isRealChoice || reasoned.length === 0) return '';
  // THE VERDICT CARRIES ITS REASON, or it is not said (David 2026-09-24:
  // "The move is Rxf3" alone is an order, not teaching). The weighing still
  // stands on its own — ruling the bad moves out IS the thinking out loud.
  const verdict = d.bestWhy ? ` The move is ${d.best.san} — it ${d.bestWhy}.` : '';
  return `${reasoned.map(shortfallText).join(' ')}${verdict}`;
}

/** The alternatives that are a real fork in the road — they drop material or
 *  sit a meaningful gap below the best. Coin-flip moves (inside
 *  `MEANINGFUL_DELTA_CP`) are dropped: on a quiet opening spine every reasonable
 *  move is one, and weighing them is filler. */
export function meaningfulAlternatives(d: Deliberation): Candidate[] {
  return d.alternatives.filter(
    (a) => a.shortfall === 'drops-material' || a.deltaCp >= MEANINGFUL_DELTA_CP,
  );
}

/**
 * The weighing WITHOUT the "the move is X" conclusion. Safe to splice into a
 * TAUGHT line (the Watch walkthrough), where the conclusion is the DB-canonical
 * taught move — NOT necessarily the engine's best. Emitting the tempting
 * alternatives + why each falls short teaches the discussion without ever
 * contradicting the board (which would break G3).
 *
 * Only MEANINGFUL alternatives are spoken (a genuine fork — drops material or a
 * real gap). A quiet position where every move is a coin-flip weighs to '' —
 * silence, which the voice rules allow, instead of "X is playable, but not as
 * precise" filler on every equal opening move.
 */
export function deliberationAlternativesFacts(d: Deliberation): string {
  if (!d.isRealChoice) return '';
  const meaningful = meaningfulAlternatives(d);
  if (meaningful.length === 0) return '';
  return meaningful.map(shortfallText).join(' ');
}

/** Why `san` is the move, phrased to follow "it" ("…— it wins the pawn on
 *  d5"). The ONE reason computer behind "The move is X" — shared so every lane
 *  that names a move gives the same reason. Null when nothing is computable. */
export function moveWhy(fenBefore: string, san: string, mover: 'w' | 'b', opponentLastSan: string | null): string | null {
  return materialWhy(fenBefore, san, mover, opponentLastSan) ?? strategicWhyLed(fenBefore, san, mover === 'w' ? 'white' : 'black');
}
