/**
 * endgameTechnique — NAMED-technique detectors that sharpen the coarse matchup
 * class into the specific concept a position teaches (P2 of the computed-concept
 * engine, docs/plans/2026-09-14-computed-concept-detectors.md).
 *
 * "Specific > general > silent, never specific-but-wrong" — each detector is a
 * deterministic geometry predicate (a theorem, not a guess). When it fires the
 * engine teaches the named technique (the opposition, Lucena, Philidor…); when it
 * doesn't, the matchup principle (endgameMatchup) is the fallback. Pure / G0 —
 * board geometry + (later) tablebase outcome + the solution move; no LLM.
 *
 * This file starts with the OPPOSITION (the core king-and-pawn concept, the
 * biggest endgame class); Lucena / Philidor / key-squares / zugzwang land here as
 * further validated passes.
 */
import { Chess } from 'chess.js';

export type Side = 'white' | 'black';

interface KingSquares { w: { f: number; r: number }; b: { f: number; r: number }; }

function kingSquares(fen: string): KingSquares | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  let w: { f: number; r: number } | null = null;
  let b: { f: number; r: number } | null = null;
  for (const row of c.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'k') continue;
      const sq = { f: cell.square.charCodeAt(0) - 97, r: Number(cell.square[1]) };
      if (cell.color === 'w') w = sq; else b = sq;
    }
  }
  if (!w || !b) return null;
  return { w, b };
}

export interface OppositionResult {
  /** 'direct' = one square between the kings; 'distant' = 3 or 5 (odd gap). */
  kind: 'direct' | 'distant';
  /** The side that HOLDS the opposition — the one NOT to move (the mover must
   *  give way). */
  holder: Side;
}

/**
 * Detect the opposition: kings on the same file OR rank with an ODD number of
 * squares between them (direct = 1 square gap, distant = 3 or 5). The side NOT to
 * move holds it — that's what makes it powerful (the mover must give ground).
 * Returns null when the kings aren't in opposition. Pure geometry.
 */
export function detectOpposition(fen: string): OppositionResult | null {
  const k = kingSquares(fen);
  if (!k) return null;
  const df = Math.abs(k.w.f - k.b.f);
  const dr = Math.abs(k.w.r - k.b.r);
  const sameFile = df === 0;
  const sameRank = dr === 0;
  if (!sameFile && !sameRank) return null;
  const gap = sameFile ? dr - 1 : df - 1; // empty squares between the kings
  // Opposition needs an ODD gap (1, 3, 5) with the kings aligned. An even gap is
  // NOT the opposition.
  if (gap < 1 || gap % 2 === 0) return null;
  const kind: 'direct' | 'distant' = gap === 1 ? 'direct' : 'distant';
  // The side NOT to move holds the opposition.
  const toMove: Side = fen.split(' ')[1] === 'b' ? 'black' : 'white';
  const holder: Side = toMove === 'white' ? 'black' : 'white';
  return { kind, holder };
}
