// THE TEMPTING MOVE'S HOPE, AND WHY ITS REFUTATION IS EASY TO MISS (Danya's
// read of Korchnoi–Salov, steps 3 and 4: the tempting move, what it is
// counting on, the reply that refutes it, and why that reply is easy to miss). The tempting-move read
// said the refutation and never the line the player was hoping for, nor why
// the refutation slips past (OUTLINE 000zk, "missing computers for the read").
//
// Both are read off the human model on the board after the try — what a player
// at this rating expects the other side to answer — and chess.js; no engine.
// Pure leaf: chess.js and the human model only.
import { Chess, type Color, type Move } from 'chess.js';
import { humanMoveProbabilities } from './humanMove';
import { MATERIAL_VALUE } from './pieceValues';

/** A refuting move the eye gives less than this is one few players look at. */
export const MISSED_P = 0.04;

function board(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

function play(b: Chess, uci: string): Move | null {
  try { return b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
}

function materialOf(b: Chess, side: Color): number {
  let n = 0;
  for (const row of b.board()) for (const sq of row) if (sq && sq.color === side && sq.type !== 'k') n += MATERIAL_VALUE[sq.type] ?? 0;
  return n;
}

function eye(fen: string, rating: number): Array<{ uci: string; p: number }> {
  const b = board(fen);
  if (!b) return [];
  const legal = b.moves({ verbose: true }).map((m) => ({ uci: `${m.from}${m.to}${m.promotion ?? ''}`, cp: 0 }));
  return humanMoveProbabilities(fen, legal, rating).map((r) => ({ uci: r.uci, p: r.p }));
}

/**
 * WHAT THE TEMPTING MOVE IS COUNTING ON: a capture counts on being taken back
 * (Legal's mate: …Bxd1, counting on Kxd1 — but Bxf7+ comes first). The
 * recapture on the try's square a player at `rating` would pick (the human
 * model among the recaptures), when it is not the refutation and the try's
 * side is no worse off in material after it. SAN with "…" on a Black reply;
 * null when the try takes nothing, nothing can take back, the recapture IS the
 * refutation, or the hoped-for trade itself loses material.
 */
export function countingOn(fenBefore: string, tryUci: string, refutationUci: string, rating: number): string | null {
  const b = board(fenBefore);
  if (!b) return null;
  const mover = b.turn();
  const other: Color = mover === 'w' ? 'b' : 'w';
  const balance = (): number => materialOf(b, mover) - materialOf(b, other);
  const before = balance();
  const t = play(b, tryUci);
  if (!t || !t.captured) return null;
  const back = new Set(b.moves({ verbose: true }).filter((m) => m.to === t.to).map((m) => `${m.from}${m.to}${m.promotion ?? ''}`));
  const pick = eye(b.fen(), rating).filter((r) => back.has(r.uci)).sort((x, y) => y.p - x.p)[0];
  if (!pick || pick.uci === refutationUci) return null;
  const m = play(b, pick.uci);
  if (!m || balance() < before) return null;
  return `${m.color === 'b' ? '…' : ''}${m.san}`;
}

export type MissShape = 'quiet' | 'retreat';

/**
 * WHY THE REFUTATION IS EASY TO MISS: the human model gives the refuting
 * reply little weight on the board after the try, and the board says why —
 * a retreat (a piece stepping back toward its own side), or a quiet move (no
 * capture, no check). Null when players see it, or it is a capture or a check.
 */
export function easyToMiss(fenBefore: string, tryUci: string, refutationUci: string, rating: number): MissShape | null {
  const b = board(fenBefore);
  if (!b || !play(b, tryUci)) return null;
  const p = eye(b.fen(), rating).find((r) => r.uci === refutationUci)?.p ?? 0;
  if (p >= MISSED_P) return null;
  const m = play(b, refutationUci);
  if (!m || m.captured || /[+#]$/.test(m.san)) return null;
  const back = m.piece !== 'p' && (m.color === 'w' ? Number(m.to[1]) < Number(m.from[1]) : Number(m.to[1]) > Number(m.from[1]));
  return back ? 'retreat' : 'quiet';
}
