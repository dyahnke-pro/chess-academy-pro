/**
 * endgameTechnique — NAMED-technique detectors that sharpen the coarse matchup
 * class into the specific concept a position teaches (P2 of the computed-concept
 * engine, docs/plans/2026-09-14-computed-concept-detectors.md).
 *
 * "Specific > general > silent, never specific-but-wrong" — each detector is a
 * deterministic geometry predicate (a theorem, not a guess). When it fires the
 * engine teaches the named technique (the opposition, Lucena, Philidor…); when it
 * doesn't, the matchup principle (endgameMatchup) is the fallback. Pure / G0 —
 * board geometry + the solution move; no LLM, no engine.
 *
 * Every predicate states GEOMETRY, never a game result: "the king is outside the
 * square, so on its own the pawn queens" is a theorem; "White wins" is not (the
 * other king may still support the pawn). The labeled lesson corpus
 * (`pawn-endings.json`, `rook-endings.json`, `drawn-patterns.json`) is the
 * known-answer set every detector is proven on (`endgameTechnique.test.ts`).
 */
import { Chess, type Square } from 'chess.js';

export type Side = 'white' | 'black';

interface Sq { f: number; r: number; }
interface Piece { type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'; color: 'w' | 'b'; sq: Sq; square: Square; }

interface Board {
  pieces: Piece[];
  kings: { w: Sq; b: Sq };
  toMove: 'w' | 'b';
}

function toSq(square: string): Sq { return { f: square.charCodeAt(0) - 97, r: Number(square[1]) }; }
function sqName(s: Sq): Square { return `${String.fromCharCode(97 + s.f)}${s.r}` as Square; }
function cheb(a: Sq, b: Sq): number { return Math.max(Math.abs(a.f - b.f), Math.abs(a.r - b.r)); }

function scan(fen: string): Board | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const pieces: Piece[] = [];
  let w: Sq | null = null;
  let b: Sq | null = null;
  for (const row of c.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const sq = toSq(cell.square);
      pieces.push({ type: cell.type, color: cell.color, sq, square: cell.square });
      if (cell.type === 'k') { if (cell.color === 'w') w = sq; else b = sq; }
    }
  }
  if (!w || !b) return null;
  return { pieces, kings: { w, b }, toMove: c.turn() };
}

function only(board: Board, color: 'w' | 'b', type: Piece['type']): Piece[] {
  return board.pieces.filter((p) => p.color === color && p.type === type);
}
function nonKing(board: Board, color: 'w' | 'b'): Piece[] {
  return board.pieces.filter((p) => p.color === color && p.type !== 'k');
}
function sideOf(c: 'w' | 'b'): Side { return c === 'w' ? 'white' : 'black'; }
function other(c: 'w' | 'b'): 'w' | 'b' { return c === 'w' ? 'b' : 'w'; }
/** Rank of promotion + direction of travel for a pawn of `color`. */
function promoRank(c: 'w' | 'b'): number { return c === 'w' ? 8 : 1; }
function dir(c: 'w' | 'b'): 1 | -1 { return c === 'w' ? 1 : -1; }
/** Distance (in pawn moves) from `r` to the promotion rank. */
function ranksToGo(c: 'w' | 'b', r: number): number { return Math.abs(promoRank(c) - r); }
function isStartRank(c: 'w' | 'b', r: number): boolean { return c === 'w' ? r === 2 : r === 7; }

/** A pawn is PASSED when no enemy pawn sits ahead of it on its own or an
 *  adjacent file. */
function isPassed(board: Board, pawn: Piece): boolean {
  const d = dir(pawn.color);
  return !board.pieces.some((p) =>
    p.type === 'p' && p.color !== pawn.color &&
    Math.abs(p.sq.f - pawn.sq.f) <= 1 &&
    (d === 1 ? p.sq.r > pawn.sq.r : p.sq.r < pawn.sq.r));
}

/** "K + exactly this material vs K + exactly that material" — the honest gate
 *  for a theorem that only holds with nothing else on the board. */
function material(board: Board, color: 'w' | 'b'): string {
  return nonKing(board, color).map((p) => p.type).sort().join('');
}

// ─── THE OPPOSITION ──────────────────────────────────────────────────────────

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
  const board = scan(fen);
  if (!board) return null;
  const { w, b } = board.kings;
  const df = Math.abs(w.f - b.f);
  const dr = Math.abs(w.r - b.r);
  const sameFile = df === 0;
  const sameRank = dr === 0;
  if (!sameFile && !sameRank) return null;
  const gap = sameFile ? dr - 1 : df - 1; // empty squares between the kings
  // Opposition needs an ODD gap (1, 3, 5) with the kings aligned. An even gap is
  // NOT the opposition.
  if (gap < 1 || gap % 2 === 0) return null;
  const kind: 'direct' | 'distant' = gap === 1 ? 'direct' : 'distant';
  // The side NOT to move holds the opposition.
  const holder: Side = board.toMove === 'w' ? 'black' : 'white';
  return { kind, holder };
}

// ─── KEY SQUARES (K+P vs K) ──────────────────────────────────────────────────

export interface KeySquaresResult {
  side: Side;
  pawn: Square;
  /** The pawn's key squares — if the attacking king stands on one, the pawn
   *  promotes by force whoever is to move. */
  keySquares: Square[];
  /** The attacking king is ON a key square right now. */
  kingOnKeySquare: Square | null;
}

/**
 * Key squares of a lone (non-rook) pawn in K+P vs K: for a pawn on its 2nd–4th
 * rank the three squares two ranks ahead; from the 5th rank on, the three
 * squares one AND two ranks ahead (six). A rook pawn has none (the defender
 * hides in the corner — see `detectRookPawnCorner`). Fires only in K+P vs K —
 * the theorem needs an otherwise empty board.
 */
export function detectKeySquares(fen: string): KeySquaresResult | null {
  const board = scan(fen);
  if (!board) return null;
  for (const c of ['w', 'b'] as const) {
    if (material(board, c) !== 'p' || material(board, other(c)) !== '') continue;
    const pawn = only(board, c, 'p')[0];
    if (pawn.sq.f === 0 || pawn.sq.f === 7) return null; // rook pawn — no key squares
    const d = dir(c);
    const fromHome = c === 'w' ? pawn.sq.r : 9 - pawn.sq.r; // 2..7
    const ranks = fromHome >= 5 ? [pawn.sq.r + d, pawn.sq.r + 2 * d] : [pawn.sq.r + 2 * d];
    const keySquares: Square[] = [];
    for (const r of ranks) {
      if (r < 1 || r > 8) continue;
      for (const f of [pawn.sq.f - 1, pawn.sq.f, pawn.sq.f + 1]) {
        if (f < 0 || f > 7) continue;
        keySquares.push(sqName({ f, r }));
      }
    }
    const king = board.kings[c];
    const on = keySquares.find((s) => s === sqName(king)) ?? null;
    return { side: sideOf(c), pawn: pawn.square, keySquares, kingOnKeySquare: on };
  }
  return null;
}

// ─── RULE OF THE SQUARE (K+P vs K, a pure race) ─────────────────────────────

export interface RuleOfSquareResult {
  side: Side;
  pawn: Square;
  /** The defending king can reach the promotion square in time (inside the
   *  square, counting who is to move and the double step). */
  defenderInside: boolean;
}

/**
 * The rule of the square in K+P vs K when the pawn is RACING on its own (the
 * attacking king too far to support it — otherwise the opposition / key
 * squares govern). Counts honestly: if the pawn's side is to move it pushes
 * first (two squares from its start rank); the defender then needs to be within
 * (ranks-to-go + 1) king moves of the promotion square to stop it.
 */
export function detectRuleOfSquare(fen: string): RuleOfSquareResult | null {
  const board = scan(fen);
  if (!board) return null;
  for (const c of ['w', 'b'] as const) {
    if (material(board, c) !== 'p' || material(board, other(c)) !== '') continue;
    const pawn = only(board, c, 'p')[0];
    const attacker = board.kings[c];
    const d = dir(c);
    // A pawn whose king is AHEAD of it and close is shepherded — that's the
    // opposition / key-squares lesson, not a race. A king behind its pawn (or
    // far away) can't shield it, so the square decides.
    const ahead = d === 1 ? attacker.r > pawn.sq.r : attacker.r < pawn.sq.r;
    const near = cheb(attacker, pawn.sq);
    if (near <= 1 || (ahead && near <= 2)) return null;
    let rank = pawn.sq.r;
    if (board.toMove === c) rank += isStartRank(c, rank) ? 2 * d : d; // it pushes first
    const promo: Sq = { f: pawn.sq.f, r: promoRank(c) };
    const toGo = ranksToGo(c, rank);
    const defender = board.kings[other(c)];
    const defenderInside = cheb(defender, promo) <= toGo + 1;
    return { side: sideOf(c), pawn: pawn.square, defenderInside };
  }
  return null;
}

// ─── ROOK PAWN + CORNER (K+P vs K, K+B+P vs K) ──────────────────────────────

export interface RookPawnCornerResult {
  side: Side;
  pawn: Square;
  corner: Square;
  /** 'pawn' = lone rook pawn, the defender's king holds the corner;
   *  'wrong-bishop' = the bishop can't control the corner's colour either. */
  kind: 'pawn' | 'wrong-bishop';
}

/**
 * The rook-pawn draws. A lone a-/h-pawn (or one with a bishop of the WRONG
 * colour — one that never touches the promotion corner) cannot be forced through
 * once the defending king reaches the corner: it can never be driven out, and
 * pushing the pawn only stalemates. Fires when the defender is already in the
 * corner box (≤1 from the corner) or standing in front of the pawn on its file.
 */
export function detectRookPawnCorner(fen: string): RookPawnCornerResult | null {
  const board = scan(fen);
  if (!board) return null;
  for (const c of ['w', 'b'] as const) {
    const mine = material(board, c);
    if ((mine !== 'p' && mine !== 'bp') || material(board, other(c)) !== '') continue;
    const pawn = only(board, c, 'p')[0];
    if (pawn.sq.f !== 0 && pawn.sq.f !== 7) continue;
    const corner: Sq = { f: pawn.sq.f, r: promoRank(c) };
    let kind: RookPawnCornerResult['kind'] = 'pawn';
    if (mine === 'bp') {
      const bishop = only(board, c, 'b')[0];
      const bishopDark = (bishop.sq.f + bishop.sq.r) % 2 === 1;
      const cornerDark = (corner.f + corner.r) % 2 === 1;
      if (bishopDark === cornerDark) continue; // the RIGHT bishop — a win, not this draw
      kind = 'wrong-bishop';
    }
    const defender = board.kings[other(c)];
    const d = dir(c);
    const inFront = defender.f === pawn.sq.f && (d === 1 ? defender.r > pawn.sq.r : defender.r < pawn.sq.r);
    if (cheb(defender, corner) > 1 && !inFront) continue;
    return { side: sideOf(c), pawn: pawn.square, corner: sqName(corner), kind };
  }
  return null;
}

// ─── ROOK ENDINGS: LUCENA / PHILIDOR / CUT-OFF / ROOK BEHIND THE PASSER ──────

export interface LucenaResult { side: Side; pawn: Square; }

/**
 * The Lucena position (R+P vs R): the pawn on its 7th rank (not a rook pawn),
 * the attacking king on the promotion square in front of it, the defending
 * king cut off (two or more king moves from the promotion square) and the
 * defending rook still on the board. The winning technique is "building the
 * bridge" — the rook lifts to the 4th rank so the king can step out of the
 * checks and shelter behind it.
 */
export function detectLucena(fen: string): LucenaResult | null {
  const board = scan(fen);
  if (!board) return null;
  for (const c of ['w', 'b'] as const) {
    if (material(board, c) !== 'pr' || material(board, other(c)) !== 'r') continue;
    const pawn = only(board, c, 'p')[0];
    if (pawn.sq.f === 0 || pawn.sq.f === 7) continue;
    if (ranksToGo(c, pawn.sq.r) !== 1) continue;
    const promo: Sq = { f: pawn.sq.f, r: promoRank(c) };
    if (cheb(board.kings[c], promo) !== 0) continue;
    // CUT OFF: the defending king can't contest the pawn's front — at least two
    // files away, or far down the board (the fixture's Kc4 against a b-pawn is
    // cut by rank; the classic Kd8 is cut by file). A king one file over and
    // close (Kc6) is not yet a Lucena.
    const dk = board.kings[other(c)];
    if (Math.abs(dk.f - pawn.sq.f) < 2 && cheb(dk, promo) < 3) continue;
    return { side: sideOf(c), pawn: pawn.square };
  }
  return null;
}

export interface PhilidorResult {
  /** The DEFENDING side (the one holding the draw). */
  side: Side;
  pawn: Square;
  /** The defender's rook already fences the attacking king out on the third
   *  rank (from the defender's side). */
  thirdRankSet: boolean;
}

/**
 * The Philidor rook-ending defence (R+P vs R): the defending king sits on or
 * beside the promotion square in front of the pawn, and the pawn has not yet
 * crossed its 5th rank. The drawing plan is the third-rank defence: the rook
 * holds the third rank (from the defender's side) so the attacking king can't
 * come forward; once the pawn advances, the rook drops back and checks from
 * behind. Fires whenever the geometry is a Philidor SETUP — `thirdRankSet`
 * says whether the rook is already on its post.
 */
export function detectPhilidor(fen: string): PhilidorResult | null {
  const board = scan(fen);
  if (!board) return null;
  for (const a of ['w', 'b'] as const) {
    const dfd = other(a);
    if (material(board, a) !== 'pr' || material(board, dfd) !== 'r') continue;
    const pawn = only(board, a, 'p')[0];
    const fromHome = a === 'w' ? pawn.sq.r : 9 - pawn.sq.r;
    if (fromHome > 5) continue;
    const promo: Sq = { f: pawn.sq.f, r: promoRank(a) };
    const dk = board.kings[dfd];
    const d = dir(a);
    const inFront = Math.abs(dk.f - pawn.sq.f) <= 1 && (d === 1 ? dk.r > pawn.sq.r : dk.r < pawn.sq.r);
    if (!inFront || cheb(dk, promo) > 1) continue;
    const thirdRank = a === 'w' ? 6 : 3; // the defender's 3rd rank
    const rook = only(board, dfd, 'r')[0];
    const attackerBelow = a === 'w' ? board.kings[a].r < thirdRank : board.kings[a].r > thirdRank;
    return { side: sideOf(dfd), pawn: pawn.square, thirdRankSet: rook.sq.r === thirdRank && attackerBelow };
  }
  return null;
}

export interface CutOffResult {
  side: Side;
  rook: Square;
  /** The line the rook holds — a file ('e') or a rank ('3'). */
  line: string;
  pawn: Square;
}

/**
 * Cutting off the king in a rook ending: the rook holds a file or rank that
 * lies BETWEEN the defending king and the passed pawn it needs to reach, so the
 * king can't cross without walking into the rook's line. Fires for the side
 * whose rook does the cutting and whose passed pawn is on the far side.
 */
export function detectCutOff(fen: string): CutOffResult | null {
  const board = scan(fen);
  if (!board) return null;
  for (const c of ['w', 'b'] as const) {
    // The textbook case only: one rook and ONE pawn — the single passer the
    // cut-off king must reach. With more pawns the line the rook holds is not
    // the whole story, and "unhindered" would overstate it.
    if (material(board, c) !== 'pr') continue;
    const rook = only(board, c, 'r')[0];
    const dk = board.kings[other(c)];
    for (const pawn of only(board, c, 'p')) {
      if (!isPassed(board, pawn)) continue;
      // File cut: rook's file strictly between the king's file and the pawn's.
      const fileCut = (dk.f < rook.sq.f && rook.sq.f < pawn.sq.f) || (pawn.sq.f < rook.sq.f && rook.sq.f < dk.f);
      // Rank cut: rook's rank strictly between the king's rank and the pawn's.
      const rankCut = (dk.r < rook.sq.r && rook.sq.r < pawn.sq.r) || (pawn.sq.r < rook.sq.r && rook.sq.r < dk.r);
      if (!fileCut && !rankCut) continue;
      const line = fileCut ? String.fromCharCode(97 + rook.sq.f) : String(rook.sq.r);
      return { side: sideOf(c), rook: rook.square, line, pawn: pawn.square };
    }
  }
  return null;
}

export interface RookBehindPasserResult {
  /** The side whose ROOK is behind the passer. */
  side: Side;
  rook: Square;
  pawn: Square;
  /** Whether it's the rook's own pawn (supporting it) or the enemy's (restraining it). */
  ownPawn: boolean;
}

/**
 * Tarrasch's rule: rooks belong BEHIND passed pawns — your own (the rook pushes
 * it while staying free) or the enemy's (the rook ties the pawn down and every
 * step it takes shortens the rook's own leash on it). Fires when a rook stands on
 * a passed pawn's file, behind it in its direction of travel, with a clear line.
 */
export function detectRookBehindPasser(fen: string): RookBehindPasserResult | null {
  const board = scan(fen);
  if (!board) return null;
  for (const rook of board.pieces.filter((p) => p.type === 'r')) {
    for (const pawn of board.pieces.filter((p) => p.type === 'p' && p.sq.f === rook.sq.f)) {
      if (!isPassed(board, pawn)) continue;
      const d = dir(pawn.color);
      const behind = d === 1 ? rook.sq.r < pawn.sq.r : rook.sq.r > pawn.sq.r;
      if (!behind) continue;
      const lo = Math.min(rook.sq.r, pawn.sq.r);
      const hi = Math.max(rook.sq.r, pawn.sq.r);
      const blocked = board.pieces.some((p) => p.sq.f === rook.sq.f && p.sq.r > lo && p.sq.r < hi);
      if (blocked) continue;
      return { side: sideOf(rook.color), rook: rook.square, pawn: pawn.square, ownPawn: rook.color === pawn.color };
    }
  }
  return null;
}
