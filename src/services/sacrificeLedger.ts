// sacrificeLedger — "at worst a perpetual": what a sacrifice leaves you with
// on BOTH branches (missed computers, 2026-10-08). One restricted search scores
// the opponent's best capture of the offered piece (accepted), another their
// best move that does NOT take it (declined). A sacrifice is said to hold only
// when both branches are computed and neither leaves the student worse; the
// claim names both replies and the band each leaves, never a number.
//
// The engine is injected (`bestAmong`), so the read is pure and testable.
import { Chess, type Square } from 'chess.js';
import type { Proof } from './proof';
import { lineProofFromUci } from './proof';
import type { ScoredMove } from './pvPlayback';

/** The best of exactly these moves, from one search (UCI `searchmoves`). */
export type BestAmong = (fen: string, ucis: readonly string[]) => Promise<ScoredMove | null>;

export interface SacrificeLedgerRead {
  text: string;
  proof: Proof;
  squares: string[];
}

const MATE_CP = 10_000;

function studentPov(m: ScoredMove, student: 'w' | 'b'): number {
  const white = m.mate != null ? (m.mate > 0 ? MATE_CP : -MATE_CP) : m.evaluation;
  return student === 'w' ? white : -white;
}

/** Words for where a branch leaves the student, or null when it leaves them worse. */
export function ledgerBand(cp: number): string | null {
  if (cp >= 300) return 'winning';
  if (cp >= 100) return 'better';
  if (cp >= -50) return 'about level';
  return null;
}

function sanOf(fen: string, uci: string): string | null {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })?.san ?? null;
  } catch { return null; }
}

/**
 * `fenAfter` is the board after the student's sacrifice (opponent to move) and
 * `sacSquare` the square the offered piece stands on.
 */
export async function sacrificeLedger(
  fenAfter: string, sacSquare: string, student: 'w' | 'b', bestAmong: BestAmong,
): Promise<SacrificeLedgerRead | null> {
  let c: Chess;
  try { c = new Chess(fenAfter); } catch { return null; }
  if (c.turn() === student) return null;
  const legal = c.moves({ verbose: true });
  const uci = (m: (typeof legal)[number]): string => `${m.from}${m.to}${m.promotion ?? ''}`;
  const takes = legal.filter((m) => m.to === sacSquare && !!m.captured).map(uci);
  const others = legal.filter((m) => !(m.to === sacSquare && m.captured)).map(uci);
  if (takes.length === 0 || others.length === 0) return null;
  const [acc, dec] = await Promise.all([bestAmong(fenAfter, takes), bestAmong(fenAfter, others)]);
  if (!acc?.moves[0] || !dec?.moves[0]) return null;
  const accCp = studentPov(acc, student);
  const decCp = studentPov(dec, student);
  const accBand = ledgerBand(accCp);
  const decBand = ledgerBand(decCp);
  if (!accBand || !decBand) return null;
  const accSan = sanOf(fenAfter, acc.moves[0]);
  const decSan = sanOf(fenAfter, dec.moves[0]);
  if (!accSan || !decSan) return null;
  const proof = lineProofFromUci(fenAfter, acc.moves.slice(0, 4));
  if (!proof) return null;
  const worst = accCp <= decCp ? accBand : decBand;
  const text = accBand === decBand
    ? `The sacrifice holds either way: if they take with ${accSan} or decline with ${decSan}, you are ${accBand}.`
    : `The sacrifice holds either way: if they take with ${accSan} you are ${accBand}, and if they decline with ${decSan} you are ${decBand} — at worst ${worst}.`;
  const decTo = dec.moves[0].slice(2, 4);
  return { text, proof, squares: [sacSquare as Square, decTo] };
}
