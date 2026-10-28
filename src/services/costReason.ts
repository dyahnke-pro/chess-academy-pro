// costReason — WHY A MOVE COST WHAT IT COST, THE SAME DEPTH FOR BOTH SIDES
// (WO-DECIDER-02, David 2026-10-28: "We can't give shallow reasoning for their
// moves and deeper reasons for users moves. They both need the same level of
// quality").
//
// One walker, both seats. A move that lost a pawn or more is explained by the
// first thing in the engine's line that covers the cost and holds:
//   allowed — the line after the move wins material (or mates) for the other side;
//   missed  — the best line from before won it for the mover.
// Measured on 337 of David's costly moves: Review named the reason for the
// student's moves at 70–93% inside three moves and for the opponent's at
// 14–57% — the readers were different for the two seats, not the board. This
// is the one reader; the seat only changes the words a surface puts around it.
//
// Whether the LINE may be said is `lineTrust` (two moves on one read, five on
// two agreeing reads, past five only forcing and agreed). A reason found but
// not trusted is HELD: the cost is still the engine's and stands; the line is
// not taught (a held reason is recorded, never a gap).
//
// Pure: chess.js + the one ledger (`proofCut`) + the one classifier.
import { Chess } from 'chess.js';
import { proofCut, type ExchangeLedger } from './exchangeLedger';
import { lineTrust, type LineTrust } from './lineTrust';
import { detectTacticType } from './missedTacticService';
import { MATERIAL_VALUE } from './pieceValues';
import type { TacticType } from '../types';

/** A read of one board: its principal line, where it came from, and the other
 *  reads of the SAME board that may vouch for it. */
export interface BoardRead {
  uci: readonly string[];
  source: 'deep' | 'record';
  /** REQUIRED: other reads of this board (`[]` = none). */
  seconds: ReadonlyArray<readonly string[] | null | undefined>;
}

export interface ReasonPly { san: string; uci: string; fenBefore: string; fenAfter: string; moverColor: 'white' | 'black' }

export interface CostReason {
  /** WHO PAYS — the side that played the costly move, seat-relative to the
   *  student. Required on the one shape: the 92 seat flips of 2026-10-28 were a
   *  reason with no seat. */
  seat: 'you' | 'them';
  kind: 'allowed' | 'missed';
  mate: boolean;
  /** The board the line starts from: after the move (allowed) or before it (missed). */
  fen: string;
  /** The line up to and including the blow (plus a forced recapture the
   *  ledger plays out). */
  plies: ReasonPly[];
  /** Plies from the line's start to the blow. */
  blowPlies: number;
  /** The settled exchange, counted for the student (`describeProofResult`). */
  ledger: ExchangeLedger | null;
  /** What the side that wins nets, in pawns (a mate is 100). */
  netForWinner: number;
  trust: LineTrust;
  source: 'deep' | 'record';
  /** The one classifier's name for the line, when it names one. */
  motif: TacticType | null;
}

/** The pawns a reason must win to explain a cost: most of it, never less than
 *  one. A pawn does not explain a lost knight. */
export function reasonNeed(costCp: number): number {
  return Math.max(1, Math.round((0.6 * costCp) / 100));
}

function replay(fen: string, uci: readonly string[]): { sans: string[]; plies: ReasonPly[] } {
  const sans: string[] = [];
  const plies: ReasonPly[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) {
      const fenBefore = c.fen();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      sans.push(m.san);
      plies.push({ san: m.san, uci: u, fenBefore, fenAfter: c.fen(), moverColor: m.color === 'w' ? 'white' : 'black' });
    }
  } catch { /* the playable prefix is what we have */ }
  return { sans, plies };
}

/** The winner's material lead on a board, in pawns. */
function lead(fen: string, winner: 'w' | 'b'): number {
  let w = 0; let b = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = MATERIAL_VALUE[ch.toLowerCase()];
    if (v === undefined || ch.toLowerCase() === 'k') continue;
    if (ch === ch.toUpperCase()) w += v; else b += v;
  }
  return winner === 'w' ? w - b : b - w;
}

function walk(
  fen: string, read: BoardRead, winner: 'w' | 'b', student: 'w' | 'b', need: number,
  prior: { fenBefore: string; san: string } | null,
): Omit<CostReason, 'seat' | 'kind'> | null {
  const { sans, plies } = replay(fen, read.uci);
  if (sans.length === 0) return null;
  const sign = winner === student ? 1 : -1;
  // THE FIRST BLOW THAT COVERS THE COST AND HOLDS. A deep line rarely ENDS
  // settled — it is cut off mid-fight — so the ledger is asked of each prefix
  // in turn: the first one whose settled result wins enough for the winner,
  // and whose lead the rest of the line never gives back by more than half
  // the need, is the reason (measured this way on David's 337 costly moves).
  let proof: ReturnType<typeof proofCut> = null;
  for (let k = 1; k <= sans.length && !proof; k += 1) {
    const p = proofCut(fen, sans.slice(0, k), student, prior);
    if (!p) continue;
    if (p.mate) {
      const mater = plies[Math.min(p.plies, plies.length) - 1]?.moverColor;
      if (mater === (winner === 'w' ? 'white' : 'black')) proof = p;
      continue;
    }
    if (!p.ledger?.settled || sign * p.ledger.netPawns < need) continue;
    const at = plies[Math.min(p.plies, plies.length) - 1]?.fenAfter;
    if (at && p.sans.length <= plies.length) {
      const blowLead = lead(at, winner);
      const gaveBack = plies.slice(p.plies).some((x) => lead(x.fenAfter, winner) < blowLead - need / 2);
      if (gaveBack) continue;
    }
    proof = p;
  }
  if (!proof) return null;
  const blowPlies = proof.plies;
  // The ledger may play a forced recapture past the engine's line; those
  // plies are part of what is shown.
  const shown = plies.slice(0, Math.min(blowPlies, plies.length));
  if (blowPlies > shown.length) {
    try {
      const c = new Chess(shown.length ? shown[shown.length - 1].fenAfter : fen);
      for (const san of proof.sans.slice(shown.length, blowPlies)) {
        const fenBefore = c.fen();
        const m = c.move(san);
        shown.push({ san: m.san, uci: `${m.from}${m.to}${m.promotion ?? ''}`, fenBefore, fenAfter: c.fen(), moverColor: m.color === 'w' ? 'white' : 'black' });
      }
    } catch { return null; }
  }
  const trust = lineTrust({ fen, uci: shown.map((p) => p.uci), plies: blowPlies, winner, seconds: read.seconds });
  let motif: TacticType | null = null;
  try { motif = detectTacticType(fen, shown[0].uci, shown.map((p) => p.uci)); } catch { motif = null; }
  return {
    mate: proof.mate,
    fen,
    plies: shown,
    blowPlies,
    ledger: proof.ledger,
    netForWinner: proof.mate ? 100 : sign * (proof.ledger?.netPawns ?? 0),
    trust,
    source: read.source,
    motif,
  };
}

/**
 * THE ONE REASON for a costly move, read the same way for both seats. Null
 * when the cost has no material reason in the reads (a positional cost — the
 * surface's position computers say that one) or the move cost under a pawn.
 */
export function costReason(args: {
  fenBefore: string;
  playedSan: string;
  /** The side that played the move. */
  mover: 'w' | 'b';
  /** REQUIRED — whose seat the words are for. */
  student: 'w' | 'b';
  /** What the move cost, centipawns, from the mover's side. */
  costCp: number;
  /** The board after the move (their reply first), or null. */
  after: BoardRead | null;
  /** The best line from before the move (the mover's best move first), or null. */
  before: BoardRead | null;
  /** The move that led to `fenBefore`, so a recapture is half a trade. */
  priorMove: { fenBefore: string; san: string } | null;
}): CostReason | null {
  if (!(args.costCp >= 100)) return null;
  const seat: 'you' | 'them' = args.mover === args.student ? 'you' : 'them';
  const other: 'w' | 'b' = args.mover === 'w' ? 'b' : 'w';
  const need = reasonNeed(args.costCp);
  let fenAfter: string | null = null;
  try { const c = new Chess(args.fenBefore); c.move(args.playedSan); fenAfter = c.fen(); } catch { fenAfter = null; }
  if (fenAfter && args.after) {
    const a = walk(fenAfter, args.after, other, args.student, need, { fenBefore: args.fenBefore, san: args.playedSan });
    if (a) return { seat, kind: 'allowed', ...a };
  }
  if (args.before) {
    const b = walk(args.fenBefore, args.before, args.mover, args.student, need, args.priorMove);
    if (b) return { seat, kind: 'missed', ...b };
  }
  return null;
}

/** The decision row's view of a reason: what it was, how far, whether it was
 *  said and why — so an audit can hold both seats to the same depth. */
export interface CostReasonRow {
  ply: number;
  seat: 'you' | 'them';
  kind: 'allowed' | 'missed' | 'none';
  blowPlies: number | null;
  named: boolean;
  why: string;
  source: 'deep' | 'record' | null;
  /** The line was said on this ply. */
  spoken?: boolean;
  /** Their slip's punishment, held for the student's own next move (U8). */
  withheld?: boolean;
}

export function costReasonRow(ply: number, seat: 'you' | 'them', r: CostReason | null): CostReasonRow {
  if (!r) return { ply, seat, kind: 'none', blowPlies: null, named: false, why: 'no-material-reason', source: null };
  return { ply, seat, kind: r.kind, blowPlies: r.blowPlies, named: r.trust.name, why: r.trust.why, source: r.source };
}
