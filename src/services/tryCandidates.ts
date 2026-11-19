/**
 * THE TRIES A PLAYER WEIGHS FOR A REASON (WO-PICTURE-01 P2, David
 * 2026-11-19; scratchpad/danya-how-he-reads.md "one level deeper").
 *
 * Danya's most common try is the plan's DIRECT attempt: "a frontal assault on
 * the e6 pawn", "Rh3 to hit the pawns directly", "Nd3-b4 to encircle d5",
 * "f4-f5 to crash through". He tests it, finds the one quiet resource that
 * meets it ("…Rf7", "…h4", "…Kf7-e6"), and the plan he keeps is the one that
 * survives. Our candidate moves came only from the eye (the human model), so
 * the direct try was never weighed at all.
 *
 * A try here is a QUIET move of the side to move (a capture or a check is the
 * eye's, already a candidate) that:
 *  - `target`: newly hits a weak pawn of the other side (isolated, backward or
 *    doubled), by a piece or by a pawn lever — the frontal attack; or
 *  - `storm`: pushes a pawn on the other king's wing, toward that king, when
 *    the kings stand on opposite wings — the crash through.
 * Every such move is a try — no cap: the engine judges each
 * (`boardReadFacts` reads it); nothing here says the try is good or bad.
 *
 * Pure: chess.js and the weak-pawn reader.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { findWeakPawns } from './positionReadingService';

export type TryWhy = 'target' | 'storm';

export interface PlanTry {
  uci: string;
  san: string;
  why: TryWhy;
  /** The weak pawn it hits, or the king it storms. */
  target: string;
}

function attackersOf(board: Chess, sq: Square, by: Color): number {
  try { return board.attackers(sq, by).length; } catch { return 0; }
}

function kingFile(board: Chess, c: Color): number | null {
  const k = board.findPiece({ type: 'k', color: c })[0];
  return k ? k.charCodeAt(0) - 97 : null;
}

export function planTries(fen: string): PlanTry[] {
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  if (board.inCheck()) return [];
  const me = board.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const weak = findWeakPawns(fen, them);
  const targets = [...new Set([...weak.isolated, ...weak.backward, ...weak.doubled])];
  const quiet = board.moves({ verbose: true }).filter((m) => !m.captured && !m.san.includes('+') && !m.san.includes('#') && !m.promotion);
  const out: PlanTry[] = [];

  // EVERY QUIET MOVE THAT NEWLY HITS A TARGET is a try (no cap, G4.5): the
  // engine judges each, and the refuters say the ones that fall short. The
  // king is a piece here too — in an ending his try is the king march.
  for (const t of targets) {
    const before = attackersOf(board, t, me);
    for (const m of quiet) {
      const after = new Chess(fen);
      try { after.move(m); } catch { continue; }
      if (attackersOf(after, t, me) <= before) continue;
      // The mover's own piece must now be one of the attackers (not a line
      // opened for another piece — that is a discovery, a different idea).
      let hits = false;
      try { hits = after.attackers(t, me).includes(m.to); } catch { hits = false; }
      if (!hits) continue;
      out.push({ uci: m.from + m.to, san: m.san, why: 'target', target: t });
    }
  }

  const myK = kingFile(board, me);
  const theirK = kingFile(board, them);
  if (myK !== null && theirK !== null && (myK <= 2) !== (theirK <= 2) && (myK >= 5 || myK <= 2) && (theirK >= 5 || theirK <= 2)) {
    const wing = theirK >= 5 ? [5, 6, 7] : [0, 1, 2];
    const k = board.findPiece({ type: 'k', color: them })[0] ?? '';
    // Every pawn push on their king's wing is a storm try (no cap).
    for (const m of quiet) {
      if (m.piece !== 'p') continue;
      const file = m.to.charCodeAt(0) - 97;
      if (!wing.includes(file)) continue;
      out.push({ uci: m.from + m.to, san: m.san, why: 'storm', target: k });
    }
  }
  return out;
}
