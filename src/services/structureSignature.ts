// structureSignature — deterministic position classification for TEACHING
// TRANSFER (David 2026-07-30: "make those distilled ideas work in similar
// positions not associated with the exact opening. Deterministically.")
//
// A Danya note taught at one position usually teaches a STRUCTURE, not a move
// order — "trade the defender of the weak square", "rook endgame: activate
// before grabbing pawns". This module computes, in pure code (chess.js only),
// a signature both OFFLINE (each note's taught position) and AT RUNTIME (the
// live board), so "does this idea apply here?" becomes a code-computed set
// intersection — the model decides nothing (G0). The consumer additionally
// truth-filters every candidate note's prose against the live board via
// boardClaimValidator, so a note whose concrete square claims don't hold here
// is dropped before it can be offered.

import { Chess } from 'chess.js';

export interface StructureSignature {
  /** Coarse phase by non-pawn material count. */
  phase: 'opening' | 'middlegame' | 'endgame';
  /** Normalized non-pawn material per side, queens excluded — e.g. "RRBN|RRN".
   *  White is always the LEFT side of the bar; use with `queens`. */
  materialSig: string;
  queens: 'both' | 'white' | 'black' | 'none';
  /** Named pawn-structure families this position belongs to. */
  families: string[];
  /** Feature tags: isolated-w, doubled-b, passed-w, open-file-d, opp-castling… */
  features: string[];
}

const FILES = 'abcdefgh';

interface SidePawns { files: number[][]; squares: string[] }

function pawnMap(chess: Chess): { w: SidePawns; b: SidePawns } {
  const mk = (): SidePawns => ({ files: Array.from({ length: 8 }, () => []), squares: [] });
  const out = { w: mk(), b: mk() };
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.type !== 'p') continue;
      const f = FILES.indexOf(sq.square[0]);
      const r = Number(sq.square[1]);
      out[sq.color].files[f].push(r);
      out[sq.color].squares.push(sq.square);
    }
  }
  return out;
}

function pieceCounts(chess: Chess): { w: Record<string, number>; b: Record<string, number> } {
  const w: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  const b: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.type === 'k') continue;
      (sq.color === 'w' ? w : b)[sq.type] += 1;
    }
  }
  return { w, b };
}

const sideSig = (c: Record<string, number>): string =>
  'R'.repeat(c.r) + 'B'.repeat(c.b) + 'N'.repeat(c.n);

/** Compute the deterministic structure signature of a FEN. Pure; ~1ms. */
export function computeStructureSignature(fen: string): StructureSignature {
  const chess = new Chess(fen);
  const pawns = pawnMap(chess);
  const counts = pieceCounts(chess);
  const has = (color: 'w' | 'b', square: string): boolean => {
    const p = chess.get(square as Parameters<typeof chess.get>[0]);
    return !!p && p.color === color && p.type === 'p';
  };

  // Phase by non-pawn, non-queen material (queens counted separately): the
  // classic "minor+rook count" heuristic. Endgame = little left; opening is
  // only meaningful for the runtime caller (exact/prefix tiers own it), so the
  // split here is deliberately coarse.
  const minorsMajors = counts.w.r + counts.w.b + counts.w.n + counts.b.r + counts.b.b + counts.b.n;
  const queens: StructureSignature['queens'] =
    counts.w.q > 0 && counts.b.q > 0 ? 'both' : counts.w.q > 0 ? 'white' : counts.b.q > 0 ? 'black' : 'none';
  const phase: StructureSignature['phase'] =
    minorsMajors <= 4 && queens !== 'both' ? 'endgame' : minorsMajors >= 9 ? 'opening' : 'middlegame';

  const features: string[] = [];
  const families: string[] = [];

  // Per-side pawn features.
  for (const color of ['w', 'b'] as const) {
    const pf = pawns[color].files;
    const opp = pawns[color === 'w' ? 'b' : 'w'].files;
    for (let f = 0; f < 8; f += 1) {
      if (pf[f].length === 0) continue;
      const neighbors = (f > 0 && pf[f - 1].length > 0) || (f < 7 && pf[f + 1].length > 0);
      if (!neighbors) features.push(`isolated-${color}`);
      if (pf[f].length > 1) features.push(`doubled-${color}`);
      // Passed: no opposing pawn on this or adjacent files ahead of it.
      for (const r of pf[f]) {
        const blocked = [f - 1, f, f + 1].some((g) =>
          g >= 0 && g <= 7 && opp[g].some((or) => (color === 'w' ? or > r : or < r)));
        if (!blocked && (color === 'w' ? r >= 4 : r <= 5)) { features.push(`passed-${color}`); break; }
      }
    }
  }

  // Open / half-open files (no pawns of either side / of one side).
  for (let f = 0; f < 8; f += 1) {
    const wN = pawns.w.files[f].length;
    const bN = pawns.b.files[f].length;
    if (wN === 0 && bN === 0) features.push(`open-file-${FILES[f]}`);
  }

  // Castling configuration — where the kings actually live.
  const kingSq = (color: 'w' | 'b'): string => {
    for (const row of chess.board()) for (const sq of row) if (sq && sq.type === 'k' && sq.color === color) return sq.square;
    return '';
  };
  const wk = kingSq('w');
  const bk = kingSq('b');
  const zone = (sq: string): 'k' | 'q' | 'c' => (sq && sq[0] >= 'f' ? 'k' : sq && sq[0] <= 'c' ? 'q' : 'c');
  if (zone(wk) !== 'c' && zone(bk) !== 'c' && zone(wk) !== zone(bk)) features.push('opp-castling');

  // ── Named pawn families (high-confidence only — empty beats wrong) ──
  // IQP: isolated pawn on the d-file, the classic teaching structure.
  const isoD = (color: 'w' | 'b'): boolean => {
    const pf = pawns[color].files;
    return pf[3].length === 1 && pf[2].length === 0 && pf[4].length === 0;
  };
  if (isoD('w')) families.push('iqp-white');
  if (isoD('b')) families.push('iqp-black');

  // Maróczy bind: white pawns on c4 AND e4 with no white d-pawn.
  if (has('w', 'c4') && has('w', 'e4') && pawns.w.files[3].length === 0) families.push('maroczy-bind');

  // Fixed e4/e5 centre (Ruy/Italian/Glek-type closed king-pawn centre).
  if (has('w', 'e4') && has('b', 'e5')) families.push('e4e5-closed');

  // KID-style locked chain: white d5 vs black e5+d6.
  if (has('w', 'd5') && has('b', 'e5') && has('b', 'd6')) families.push('kid-lock');
  // French/Advance-style chain: white e5+d4 vs black e6+d5.
  if (has('w', 'e5') && has('w', 'd4') && has('b', 'e6') && has('b', 'd5')) families.push('advance-chain');
  // Carlsbad: white d4+c3 vs black d5+c6, both e-files traded off.
  if (has('w', 'd4') && has('w', 'c3') && has('b', 'd5') && has('b', 'c6') &&
      pawns.w.files[4].length === 0 && pawns.b.files[4].length === 0) families.push('carlsbad');

  // Kingside fianchetto shells (teaching-relevant: the g2/g7 bishop rules).
  const fian = (color: 'w' | 'b', g: string, bishop: string): boolean => {
    const bp = chess.get(bishop as Parameters<typeof chess.get>[0]);
    return has(color, g) && !!bp && bp.color === color && bp.type === 'b';
  };
  if (fian('w', 'g3', 'g2')) families.push('fianchetto-white-k');
  if (fian('b', 'g6', 'g7')) families.push('fianchetto-black-k');

  return {
    phase,
    materialSig: `${sideSig(counts.w)}|${sideSig(counts.b)}`,
    queens,
    families,
    features: [...new Set(features)].sort(),
  };
}

/** Deterministic transfer-match score between a live position's signature and
 *  a note's taught-position signature. 0 = not applicable. Endgames match on
 *  material class; middlegames on shared families (heavily) + features. */
export function signatureMatchScore(live: StructureSignature, taught: StructureSignature): number {
  if (taught.phase === 'endgame' || live.phase === 'endgame') {
    // Endgame teaching binds to the material configuration.
    if (live.phase !== taught.phase) return 0;
    if (live.materialSig !== taught.materialSig || live.queens !== taught.queens) return 0;
    const shared = taught.features.filter((f) => live.features.includes(f)).length;
    return 10 + shared;
  }
  const famShared = taught.families.filter((f) => live.families.includes(f)).length;
  if (famShared === 0) return 0; // a named family is the transfer license
  const featShared = taught.features.filter((f) => live.features.includes(f)).length;
  return famShared * 5 + featShared;
}
