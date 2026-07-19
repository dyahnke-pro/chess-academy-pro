/**
 * boardStructure — pure structural facts computed from a FEN (Phase 0 of the
 * Danya review build; the data-audit's one genuinely NEW fact-computer).
 *
 * Three consumers lean on this:
 *   • pvPlayback's rich narration fact bundles (R1 — variety by content),
 *   • modelGameMatcher's "fits the structure on the board" signature
 *     (David 2026-07-18: any game matching the structure; GM preferred),
 *   • gameThemeClassifier's evidence predicates (Phase 5).
 *
 * Everything here is chess.js board truth — no engine, no LLM, no guesses
 * (G0/G3). Facts a claim can cite are returned with their squares so the
 * narration accuracy gates can verify every spoken reference.
 */
import { Chess } from 'chess.js';

type Color = 'w' | 'b';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export interface PawnStructureFacts {
  /** Pawn files per side, e.g. { w: ['a','b','c','f','g','h'], b: [...] }. */
  pawnFiles: Record<Color, string[]>;
  /** Number of pawn islands per side (contiguous file groups). */
  islands: Record<Color, number>;
  /** Files with no pawns of EITHER side. */
  openFiles: string[];
  /** Files open for one side only (their pawn gone, opponent's remains),
   *  keyed by the side the half-open file favors. */
  halfOpenFiles: Record<Color, string[]>;
  /** Passed pawns per side, as squares ("a7"). */
  passedPawns: Record<Color, string[]>;
  /** Doubled-pawn files per side. */
  doubledFiles: Record<Color, string[]>;
  /** Isolated pawns per side, as squares. */
  isolatedPawns: Record<Color, string[]>;
}

export interface OutpostFacts {
  /** Knights/bishops sitting on a square defended by their own pawn that no
   *  enemy pawn can EVER attack (no enemy pawn on an adjacent file that is
   *  behind-or-level and could advance to attack it). */
  outposts: Array<{ color: Color; piece: 'n' | 'b'; square: string }>;
}

export interface KingFacts {
  kingSquare: Record<Color, string>;
  /** 'kingside' | 'queenside' | 'center' by king file. */
  kingWing: Record<Color, 'kingside' | 'queenside' | 'center'>;
  /** True when the kings sit on opposite wings (both off-center). */
  oppositeWings: boolean;
  /** Pawns still shielding the king (own pawns on the 3 files around the
   *  king, on the king's side of the board). 0-3+; low = airy king. */
  shieldPawns: Record<Color, number>;
}

export interface MaterialFacts {
  /** Material balance in points, positive = White ahead. */
  balance: number;
  /** Non-pawn material total (both sides) — phase signal. */
  nonPawnTotal: number;
  queensOn: boolean;
  /** Endgame classification when little material remains, else null.
   *  E.g. "R+P", "R+B+P", "Q+P", "minor+P", "K+P". */
  endgameType: string | null;
}

export interface StructureFacts {
  pawns: PawnStructureFacts;
  outposts: OutpostFacts['outposts'];
  kings: KingFacts;
  material: MaterialFacts;
}

const PIECE_POINTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

interface Located {
  type: string;
  color: Color;
  square: string;
}

function pieces(chess: Chess): Located[] {
  const out: Located[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell) out.push({ type: cell.type, color: cell.color, square: cell.square });
    }
  }
  return out;
}

function fileOf(square: string): string { return square[0]; }
function rankOf(square: string): number { return Number(square[1]); }
function fileIndex(f: string): number { return FILES.indexOf(f as typeof FILES[number]); }

function computePawnFacts(all: Located[]): PawnStructureFacts {
  const pawns: Record<Color, Located[]> = { w: [], b: [] };
  for (const p of all) if (p.type === 'p') pawns[p.color].push(p);

  const pawnFiles: Record<Color, string[]> = {
    w: [...new Set(pawns.w.map((p) => fileOf(p.square)))].sort(),
    b: [...new Set(pawns.b.map((p) => fileOf(p.square)))].sort(),
  };

  const islands: Record<Color, number> = { w: 0, b: 0 };
  for (const c of ['w', 'b'] as const) {
    const idxs = pawnFiles[c].map(fileIndex).sort((a, b) => a - b);
    let count = idxs.length > 0 ? 1 : 0;
    for (let i = 1; i < idxs.length; i++) if (idxs[i] - idxs[i - 1] > 1) count++;
    islands[c] = count;
  }

  const openFiles = FILES.filter((f) => !pawnFiles.w.includes(f) && !pawnFiles.b.includes(f));
  const halfOpenFiles: Record<Color, string[]> = {
    // Half-open FOR White = White's pawn gone, Black's remains (White's rooks
    // can use it).
    w: FILES.filter((f) => !pawnFiles.w.includes(f) && pawnFiles.b.includes(f)),
    b: FILES.filter((f) => !pawnFiles.b.includes(f) && pawnFiles.w.includes(f)),
  };

  const doubledFiles: Record<Color, string[]> = { w: [], b: [] };
  for (const c of ['w', 'b'] as const) {
    for (const f of pawnFiles[c]) {
      if (pawns[c].filter((p) => fileOf(p.square) === f).length >= 2) doubledFiles[c].push(f);
    }
  }

  const isolatedPawns: Record<Color, string[]> = { w: [], b: [] };
  for (const c of ['w', 'b'] as const) {
    for (const p of pawns[c]) {
      const fi = fileIndex(fileOf(p.square));
      const hasNeighbor = pawnFiles[c].some((f) => Math.abs(fileIndex(f) - fi) === 1);
      if (!hasNeighbor) isolatedPawns[c].push(p.square);
    }
  }

  const passedPawns: Record<Color, string[]> = { w: [], b: [] };
  for (const c of ['w', 'b'] as const) {
    const enemy = pawns[c === 'w' ? 'b' : 'w'];
    for (const p of pawns[c]) {
      const fi = fileIndex(fileOf(p.square));
      const r = rankOf(p.square);
      const blocked = enemy.some((e) => {
        const efi = fileIndex(fileOf(e.square));
        if (Math.abs(efi - fi) > 1) return false;
        return c === 'w' ? rankOf(e.square) > r : rankOf(e.square) < r;
      });
      if (!blocked) passedPawns[c].push(p.square);
    }
  }

  return { pawnFiles, islands, openFiles, halfOpenFiles, passedPawns, doubledFiles, isolatedPawns };
}

function computeOutposts(all: Located[]): OutpostFacts['outposts'] {
  const out: OutpostFacts['outposts'] = [];
  const pawnsByColor: Record<Color, Located[]> = { w: [], b: [] };
  for (const p of all) if (p.type === 'p') pawnsByColor[p.color].push(p);

  for (const piece of all) {
    if (piece.type !== 'n' && piece.type !== 'b') continue;
    const c = piece.color;
    const enemy: Color = c === 'w' ? 'b' : 'w';
    const fi = fileIndex(fileOf(piece.square));
    const r = rankOf(piece.square);
    // Must be in the opponent's half (real outposts live there).
    if (c === 'w' ? r < 4 : r > 5) continue;
    // Defended by an own pawn (pawn diagonally behind).
    const defended = pawnsByColor[c].some((p) => {
      const pfi = fileIndex(fileOf(p.square));
      const pr = rankOf(p.square);
      return Math.abs(pfi - fi) === 1 && (c === 'w' ? pr === r - 1 : pr === r + 1);
    });
    if (!defended) continue;
    // No enemy pawn on an adjacent file can ever advance to attack it: an
    // attacker would have to reach rank r±1 on file fi±1 from in front.
    const attackable = pawnsByColor[enemy].some((p) => {
      const pfi = fileIndex(fileOf(p.square));
      if (Math.abs(pfi - fi) !== 1) return false;
      const pr = rankOf(p.square);
      // Enemy pawns move toward the piece: for a white piece on rank r,
      // black pawns attack from rank r+1; a black pawn at pr > r on that
      // file can still advance down to r+1.
      return c === 'w' ? pr > r : pr < r;
    });
    if (attackable) continue;
    out.push({ color: c, piece: piece.type, square: piece.square });
  }
  return out;
}

function computeKingFacts(all: Located[]): KingFacts {
  const kingSquare: Record<Color, string> = { w: 'e1', b: 'e8' };
  for (const p of all) if (p.type === 'k') kingSquare[p.color] = p.square;

  const wing = (sq: string): 'kingside' | 'queenside' | 'center' => {
    const fi = fileIndex(fileOf(sq));
    if (fi >= 5) return 'kingside';
    if (fi <= 2) return 'queenside';
    return 'center';
  };
  const kingWing: Record<Color, 'kingside' | 'queenside' | 'center'> = {
    w: wing(kingSquare.w),
    b: wing(kingSquare.b),
  };
  const oppositeWings =
    kingWing.w !== 'center' && kingWing.b !== 'center' && kingWing.w !== kingWing.b;

  const shieldPawns: Record<Color, number> = { w: 0, b: 0 };
  for (const c of ['w', 'b'] as const) {
    const kfi = fileIndex(fileOf(kingSquare[c]));
    const kr = rankOf(kingSquare[c]);
    shieldPawns[c] = all.filter((p) => {
      if (p.type !== 'p' || p.color !== c) return false;
      const pfi = fileIndex(fileOf(p.square));
      const pr = rankOf(p.square);
      if (Math.abs(pfi - kfi) > 1) return false;
      // In front of the king, within two ranks.
      return c === 'w' ? pr > kr && pr <= kr + 2 : pr < kr && pr >= kr - 2;
    }).length;
  }

  return { kingSquare, kingWing, oppositeWings, shieldPawns };
}

function computeMaterialFacts(all: Located[]): MaterialFacts {
  let balance = 0;
  let nonPawnTotal = 0;
  let queensOn = false;
  const counts: Record<Color, Record<string, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };
  for (const p of all) {
    if (p.type === 'k') continue;
    const v = PIECE_POINTS[p.type] ?? 0;
    balance += p.color === 'w' ? v : -v;
    if (p.type !== 'p') nonPawnTotal += v;
    if (p.type === 'q') queensOn = true;
    counts[p.color][p.type] += 1;
  }

  // Endgame classification when each side's non-pawn material is down to
  // roughly two pieces (R+B=8, Q=9, R+R=10). The old both-sides-combined
  // threshold (<=13) missed plain R+B-vs-R+B and Q+P endings entirely.
  let endgameType: string | null = null;
  const nonPawnBySide: Record<Color, number> = {
    w: counts.w.n * 3 + counts.w.b * 3 + counts.w.r * 5 + counts.w.q * 9,
    b: counts.b.n * 3 + counts.b.b * 3 + counts.b.r * 5 + counts.b.q * 9,
  };
  if (nonPawnBySide.w <= 10 && nonPawnBySide.b <= 10) {
    const label = (c: Color): string => {
      const parts: string[] = [];
      if (counts[c].q) parts.push('Q');
      if (counts[c].r) parts.push('R');
      if (counts[c].b || counts[c].n) parts.push(counts[c].r || counts[c].q ? 'minor' : 'minor');
      if (counts[c].p) parts.push('P');
      return parts.length > 0 ? parts.join('+') : 'K';
    };
    const w = label('w');
    const b = label('b');
    endgameType = w === b ? w : `${w} vs ${b}`;
  }

  return { balance, nonPawnTotal, queensOn, endgameType };
}

/** The full structural read of a position. Throws never — an invalid FEN
 *  returns null. */
export function describeStructure(fen: string): StructureFacts | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const all = pieces(chess);
  return {
    pawns: computePawnFacts(all),
    outposts: computeOutposts(all),
    kings: computeKingFacts(all),
    material: computeMaterialFacts(all),
  };
}

/**
 * Compact comparable signature for structure MATCHING (Phase 2 cameos): the
 * salient features a teacher would call "the same kind of position".
 */
export interface StructureSignature {
  outpostSquares: string[];
  oppositeWings: boolean;
  openFiles: string[];
  passedPawnCount: number;
  endgameType: string | null;
  queensOn: boolean;
  /** Either side has an isolated pawn on the d- or e-file (the isolani
   *  teaching structure — "play against/with the IQP"). */
  iqp: boolean;
  /** Any doubled-pawn file on either side. */
  doubled: boolean;
  /** ≥2 central files (c–f) where pawns stand head-to-head blocked —
   *  the locked-chain shape (French/KID centres). */
  lockedCenter: boolean;
  /** Split pawn majorities: the side holding the QUEENSIDE (a–d)
   *  majority while the other holds the kingside one — the Carlsbad /
   *  minority-attack / majority-race shape. Null when not split. */
  queensideMajority: Color | null;
}

export function structureSignature(fen: string): StructureSignature | null {
  const s = describeStructure(fen);
  if (!s) return null;
  const iso = [...s.pawns.isolatedPawns.w, ...s.pawns.isolatedPawns.b];
  const iqp = iso.some((sq) => sq[0] === 'd' || sq[0] === 'e');

  let chess: Chess | null = null;
  try {
    chess = new Chess(fen);
  } catch {
    chess = null;
  }

  // Locked centre: central files where a pawn of each colour stands
  // directly blocked head-to-head.
  let lockedCenter = false;
  // Split majorities (strict counts, queenside = files a–d).
  let queensideMajority: Color | null = null;
  if (chess) {
    const allPawns = pieces(chess).filter((p) => p.type === 'p');
    const pawnAt = (f: string, r: number, c: Color): boolean =>
      allPawns.some((p) => p.color === c && p.square === `${f}${r}`);
    let lockedFiles = 0;
    for (const f of ['c', 'd', 'e', 'f']) {
      for (let r = 2; r <= 6; r++) {
        if (pawnAt(f, r, 'w') && pawnAt(f, r + 1, 'b')) {
          lockedFiles++;
          break;
        }
      }
    }
    lockedCenter = lockedFiles >= 2;

    const countWing = (c: Color, wing: 'q' | 'k'): number =>
      allPawns.filter(
        (p) =>
          p.color === c &&
          (wing === 'q' ? fileIndex(fileOf(p.square)) <= 3 : fileIndex(fileOf(p.square)) >= 4),
      ).length;
    const wq = countWing('w', 'q');
    const bq = countWing('b', 'q');
    const wk = countWing('w', 'k');
    const bk = countWing('b', 'k');
    if (wq > bq && bk > wk) queensideMajority = 'w';
    else if (bq > wq && wk > bk) queensideMajority = 'b';
  }

  return {
    outpostSquares: s.outposts.map((o) => o.square).sort(),
    oppositeWings: s.kings.oppositeWings,
    openFiles: s.pawns.openFiles,
    passedPawnCount: s.pawns.passedPawns.w.length + s.pawns.passedPawns.b.length,
    endgameType: s.material.endgameType,
    queensOn: s.material.queensOn,
    iqp,
    doubled: s.pawns.doubledFiles.w.length > 0 || s.pawns.doubledFiles.b.length > 0,
    lockedCenter,
    queensideMajority,
  };
}

/** Detailed shared-feature overlap between two positions — the Phase 2
 *  match metric. `score/weight` is the 0..1 ratio; `weight` is how much
 *  structural evidence PARTICIPATED. A high ratio on a tiny weight is a
 *  vacuous match (two featureless middlegames) — the matcher must floor
 *  on BOTH. Weights favor the features Danya cites when comparing
 *  ("same outpost", "same race shape", "same ending", "the isolani"). */
export interface StructureMatchDetail {
  score: number;
  weight: number;
}

export function structureMatchDetail(
  a: StructureSignature,
  b: StructureSignature,
): StructureMatchDetail {
  let score = 0;
  let max = 0;
  // Only feature classes PRESENT on at least one side participate — matching
  // on shared absence ("neither has an outpost") is not a teaching hook, and
  // counting it would make two featureless positions look alike.
  // Outposts — the strongest teaching hook. Same square = strong.
  if (a.outpostSquares.length > 0 || b.outpostSquares.length > 0) {
    max += 4;
    const shared = a.outpostSquares.filter((sq) => b.outpostSquares.includes(sq));
    if (shared.length > 0) score += 4;
    else if (a.outpostSquares.length > 0 && b.outpostSquares.length > 0) score += 2;
  }
  // Opposite-wing kings (the race shape).
  if (a.oppositeWings || b.oppositeWings) {
    max += 3;
    if (a.oppositeWings && b.oppositeWings) score += 3;
  }
  // The isolani — a named teaching structure.
  if (a.iqp || b.iqp) {
    max += 3;
    if (a.iqp && b.iqp) score += 3;
  }
  // Locked central chains — a named structure class (French/KID centres);
  // weighted like the isolani so a chain-vs-chain match can carry a cameo.
  if (a.lockedCenter || b.lockedCenter) {
    max += 3;
    if (a.lockedCenter && b.lockedCenter) score += 3;
  }
  // Split majorities with the SAME orientation (whose queenside it is
  // matters — the minority attack runs at a specific side). Same
  // orientation is a named structure class (Carlsbad) — isolani-class
  // weight; opposite-orientation splits share only the race idea.
  if (a.queensideMajority !== null || b.queensideMajority !== null) {
    max += 3;
    if (a.queensideMajority !== null && a.queensideMajority === b.queensideMajority) score += 3;
    else if (a.queensideMajority !== null && b.queensideMajority !== null) score += 1;
  }
  // Open files.
  if (a.openFiles.length > 0 || b.openFiles.length > 0) {
    max += 2;
    if (a.openFiles.some((f) => b.openFiles.includes(f))) score += 2;
    else if (a.openFiles.length > 0 && b.openFiles.length > 0) score += 1;
  }
  // Doubled pawns.
  if (a.doubled || b.doubled) {
    max += 1;
    if (a.doubled && b.doubled) score += 1;
  }
  // Passed pawns.
  if (a.passedPawnCount > 0 || b.passedPawnCount > 0) {
    max += 1;
    if (a.passedPawnCount > 0 && b.passedPawnCount > 0) score += 1;
  }
  // Endgame type — exact 3; sharing one side's exact label ("R+minor+P"
  // vs "R+minor+P vs R+P") 2; both endgames of different types 1.
  if (a.endgameType !== null || b.endgameType !== null) {
    max += 3;
    if (a.endgameType !== null && b.endgameType !== null) {
      if (a.endgameType === b.endgameType) score += 3;
      else {
        const sidesA = a.endgameType.split(' vs ');
        const sidesB = b.endgameType.split(' vs ');
        score += sidesA.some((s) => sidesB.includes(s)) ? 2 : 1;
      }
    }
  }
  // Queens on/off is a TIEBREAK only — it participates only when real
  // structural evidence already did, so it can never carry a match alone.
  if (max > 0) {
    max += 1;
    if (a.queensOn === b.queensOn) score += 1;
  }
  return { score, weight: max };
}

/** Ratio form of structureMatchDetail, 0..1. Two positions with no
 *  participating features score 0. */
export function structureMatchScore(a: StructureSignature, b: StructureSignature): number {
  const d = structureMatchDetail(a, b);
  return d.weight > 0 ? d.score / d.weight : 0;
}
