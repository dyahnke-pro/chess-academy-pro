/**
 * matePatterns — classify a DELIVERED checkmate into its named pattern (P2b of
 * the computed-concept engine, docs/plans/2026-09-14-computed-concept-detectors.md).
 *
 * "Name the pattern, not the move" (Narration Voice Rule 7): on a mating leaf
 * the takeaway is "Anastasia's mate", not "Rh5#". Every rule below is a
 * geometry predicate over the mated position — which piece checks, what covers
 * or blocks each flight square, where the king stands — so the pattern is
 * COMPUTED, never guessed (G0). The vocabulary + registers are the shipped
 * `mating-patterns.json` (hand-authored, board-verified lesson data); the
 * known-answer set is that file's mate-in-1 lesson positions
 * (`matePatterns.test.ts` plays each one's mating move and asserts the id).
 *
 * Degrade: a mate that matches no named rule returns null — the caller speaks
 * the generic "no escape" register. Never specific-but-wrong.
 */
import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';
import matingPatternsData from '../data/mating-patterns.json';
import type { MatingPattern } from '../types/matingPattern';

export interface MatePatternResult {
  /** `mating-patterns.json` id, e.g. "anastasias-mate". */
  id: string;
  name: string;
  /** The square of the piece delivering mate + the mated king. */
  squares: string[];
  /** Hand-authored recognition cue from the pattern data. */
  recognition: string;
}

interface Sq { f: number; r: number; }
interface Pc { type: PieceSymbol; color: Color; square: Square; sq: Sq; }

const toSq = (s: string): Sq => ({ f: s.charCodeAt(0) - 97, r: Number(s[1]) });
const name = (s: Sq): Square => `${String.fromCharCode(97 + s.f)}${s.r}` as Square;
const onBoard = (s: Sq): boolean => s.f >= 0 && s.f <= 7 && s.r >= 1 && s.r <= 8;
const cheb = (a: Sq, b: Sq): number => Math.max(Math.abs(a.f - b.f), Math.abs(a.r - b.r));
const isCorner = (s: Sq): boolean => (s.f === 0 || s.f === 7) && (s.r === 1 || s.r === 8);
const onEdge = (s: Sq): boolean => s.f === 0 || s.f === 7 || s.r === 1 || s.r === 8;

interface Flight {
  sq: Sq;
  square: Square;
  /** Occupied by the DEFENDER's own piece (self-block). */
  ownBlocked: boolean;
  /** Attacker pieces (squares) covering this flight — computed with the king
   *  lifted off its square, so a line through the king counts. */
  coveredBy: Square[];
}

interface MateGeometry {
  board: Chess;
  attacker: Color;
  defender: Color;
  king: Pc;
  /** Pieces giving check. */
  checkers: Pc[];
  /** The 8 neighbours that exist on the board. */
  flights: Flight[];
  attackerPieces: Pc[];
  defenderPieces: Pc[];
  /** Attacker pieces (by square) that defend `sq`. */
  protectors: (sq: Square) => Pc[];
}

function pieces(board: Chess): Pc[] {
  const out: Pc[] = [];
  for (const row of board.board()) for (const cell of row) {
    if (cell) out.push({ type: cell.type, color: cell.color, square: cell.square, sq: toSq(cell.square) });
  }
  return out;
}

/** Build the mate geometry, or null when the position is not a checkmate. */
function geometry(fen: string): MateGeometry | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (!board.isCheckmate()) return null;
  const defender = board.turn();
  const attacker: Color = defender === 'w' ? 'b' : 'w';
  const all = pieces(board);
  const king = all.find((p) => p.type === 'k' && p.color === defender);
  if (!king) return null;
  const attackerPieces = all.filter((p) => p.color === attacker);
  const defenderPieces = all.filter((p) => p.color === defender && p.type !== 'k');
  const checkers = attackerPieces.filter((p) => board.attackers(king.square, attacker).includes(p.square));

  // Lift the king so lines THROUGH it count for flight coverage.
  const lifted = new Chess(fen);
  lifted.remove(king.square);
  const flights: Flight[] = [];
  for (const df of [-1, 0, 1]) for (const dr of [-1, 0, 1]) {
    if (df === 0 && dr === 0) continue;
    const sq = { f: king.sq.f + df, r: king.sq.r + dr };
    if (!onBoard(sq)) continue;
    const square = name(sq);
    const occ = board.get(square);
    const ownBlocked = !!occ && occ.color === defender;
    let coveredBy: Square[] = [];
    try { coveredBy = lifted.attackers(square, attacker); } catch { coveredBy = []; }
    flights.push({ sq, square, ownBlocked, coveredBy });
  }
  const protectors = (sq: Square): Pc[] => {
    let ps: Square[] = [];
    try { ps = lifted.attackers(sq, attacker); } catch { ps = []; }
    return attackerPieces.filter((p) => ps.includes(p.square) && p.square !== sq);
  };
  return { board, attacker, defender, king, checkers, flights, attackerPieces, defenderPieces, protectors };
}

const byType = (ps: Pc[], t: PieceSymbol): Pc[] => ps.filter((p) => p.type === t);
const pieceAt = (g: MateGeometry, sq: Square): Pc | undefined => g.attackerPieces.find((p) => p.square === sq);
const coveredByType = (g: MateGeometry, fl: Flight, t: PieceSymbol): boolean =>
  fl.coveredBy.some((s) => pieceAt(g, s)?.type === t);
/** Flights not self-blocked (the squares the attacker must cover). */
const openFlights = (g: MateGeometry): Flight[] => g.flights.filter((f) => !f.ownBlocked);
/** Diagonal direction class of a bishop's line to a square: +1 (NE-SW) / -1 (NW-SE). */
const diagDir = (a: Sq, b: Sq): number | null => {
  const df = b.f - a.f, dr = b.r - a.r;
  if (Math.abs(df) !== Math.abs(dr) || df === 0) return null;
  return Math.sign(df) === Math.sign(dr) ? 1 : -1;
};

// ─── the rules, most specific first ──────────────────────────────────────────
type Rule = (g: MateGeometry) => boolean;

/** Fundamentals: the defender has ONLY a king. Keyed by attacker material. */
function pieceMate(g: MateGeometry): string | null {
  if (g.defenderPieces.length > 0) return null;
  const mat = g.attackerPieces.filter((p) => p.type !== 'k' && p.type !== 'p').map((p) => p.type).sort().join('');
  const map: Record<string, string> = {
    q: 'queen-mate', r: 'rook-mate', rr: 'two-rook-mate', bb: 'two-bishop-mate', bn: 'knight-bishop-mate',
    bq: 'queen-bishop-mate', nq: 'queen-knight-mate',
  };
  return map[mat] ?? null;
}

const single = (g: MateGeometry, t: PieceSymbol): Pc | null =>
  g.checkers.length === 1 && g.checkers[0].type === t ? g.checkers[0] : null;

const RULES: Array<[string, Rule]> = [
  // SMOTHERED: a knight checks and every flight is the king's own piece.
  ['smothered-mate', (g) => !!single(g, 'n') && g.flights.every((f) => f.ownBlocked)],

  // ARABIAN: corner king, rook checks from the adjacent square, a knight protects
  // the rook (and covers the diagonal flight).
  ['arabian-mate', (g) => {
    const r = single(g, 'r'); if (!r || !isCorner(g.king.sq) || cheb(r.sq, g.king.sq) !== 1) return false;
    return g.protectors(r.square).some((p) => p.type === 'n');
  }],

  // ANASTASIA: edge king, rook checks along the edge line, a knight two files in
  // covers the flights off the edge, the rest self-blocked.
  ['anastasias-mate', (g) => {
    const r = single(g, 'r'); if (!r || !onEdge(g.king.sq) || isCorner(g.king.sq)) return false;
    const sameLine = r.sq.f === g.king.sq.f || r.sq.r === g.king.sq.r;
    if (!sameLine || cheb(r.sq, g.king.sq) < 2) return false;
    const knights = byType(g.attackerPieces, 'n');
    return knights.some((n) => openFlights(g).some((f) => f.coveredBy.includes(n.square)));
  }],

  // HOOK: rook checks, protected by a knight, which a pawn protects.
  ['hook-mate', (g) => {
    const r = single(g, 'r'); if (!r) return false;
    const n = g.protectors(r.square).find((p) => p.type === 'n'); if (!n) return false;
    return g.protectors(n.square).some((p) => p.type === 'p');
  }],

  // VUKOVIC: rook checks from the square beside the king, protected by a piece
  // (not a pawn), while a knight covers the flights on either side.
  ['vukovic-mate', (g) => {
    const r = single(g, 'r'); if (!r || cheb(r.sq, g.king.sq) !== 1) return false;
    if (!g.protectors(r.square).some((p) => p.type !== 'p' && p.type !== 'k' && p.type !== 'n')) return false;
    return byType(g.attackerPieces, 'n').some((n) => openFlights(g).some((f) => f.coveredBy.includes(n.square)));
  }],

  // ANDERSSEN: rook (or queen) mates on the corner of the back rank, protected
  // by a pawn one step in.
  ['anderssens-mate', (g) => {
    const r = single(g, 'r') ?? single(g, 'q'); if (!r || !isCorner(r.sq) || cheb(r.sq, g.king.sq) !== 1) return false;
    return g.protectors(r.square).some((p) => p.type === 'p');
  }],

  // CORNER: corner king, knight checks, a rook/queen holds the adjacent file/rank.
  ['corner-mate', (g) => {
    if (!single(g, 'n') || !isCorner(g.king.sq)) return false;
    return openFlights(g).some((f) => coveredByType(g, f, 'r') || coveredByType(g, f, 'q'));
  }],

  // LÉGAL: knight checks; only minor pieces (a bishop + knights) cover the flights.
  ['legals-mate', (g) => {
    if (!single(g, 'n')) return false;
    const open = openFlights(g);
    const minorsOnly = open.every((f) => f.coveredBy.every((s) => ['b', 'n'].includes(pieceAt(g, s)?.type ?? '')));
    return open.length > 0 && minorsOnly && byType(g.attackerPieces, 'n').length >= 2 && byType(g.attackerPieces, 'b').length >= 1;
  }],

  // SUFFOCATION: knight checks; a bishop covers the open flights from afar.
  ['suffocation-mate', (g) => {
    if (!single(g, 'n')) return false;
    const open = openFlights(g);
    return open.length > 0 && open.every((f) => coveredByType(g, f, 'b') || coveredByType(g, f, 'n'))
      && open.some((f) => coveredByType(g, f, 'b'));
  }],


  // PAWN mate.
  ['pawn-mate', (g) => !!single(g, 'p')],

  // BLACKBURNE: bishop checks protected by a knight; the other bishop covers.
  ['blackburnes-mate', (g) => {
    const b = single(g, 'b'); if (!b) return false;
    return g.protectors(b.square).some((p) => p.type === 'n') && byType(g.attackerPieces, 'b').length >= 2;
  }],

  // DOUBLE-BISHOP: bishop checks, second bishop on the PARALLEL adjacent diagonal.
  ['double-bishop-mate', (g) => {
    const b = single(g, 'b'); if (!b) return false;
    const other = byType(g.attackerPieces, 'b').find((x) => x.square !== b.square); if (!other) return false;
    const d1 = diagDir(b.sq, g.king.sq);
    return d1 !== null && openFlights(g).some((f) => f.coveredBy.includes(other.square) && diagDir(other.sq, f.sq) === d1);
  }],

  // BODEN: bishop checks, second bishop covers flights on the CROSSING diagonal.
  ['bodens-mate', (g) => {
    const b = single(g, 'b'); if (!b) return false;
    const other = byType(g.attackerPieces, 'b').find((x) => x.square !== b.square); if (!other) return false;
    return openFlights(g).some((f) => f.coveredBy.includes(other.square));
  }],


  // RÉTI: bishop checks protected by a rook down a file/rank; king hemmed by own men.
  ['retis-mate', (g) => {
    const b = single(g, 'b'); if (!b) return false;
    return g.protectors(b.square).some((p) => p.type === 'r') && g.flights.filter((f) => f.ownBlocked).length >= 3;
  }],

  // MORPHY: bishop checks on the long diagonal, a rook holds the file beside the corner king.
  ['morphys-mate', (g) => {
    const b = single(g, 'b'); if (!b || !isCorner(g.king.sq)) return false;
    return openFlights(g).some((f) => coveredByType(g, f, 'r'));
  }],

  // BALESTRA: bishop checks; the queen covers the flights.
  ['balestra-mate', (g) => !!single(g, 'b') && openFlights(g).some((f) => coveredByType(g, f, 'q'))],

  // OPERA: rook checks on the back rank, protected by a bishop; king on the back rank.
  ['opera-mate', (g) => {
    const r = single(g, 'r'); if (!r || r.sq.r !== g.king.sq.r || !(g.king.sq.r === 1 || g.king.sq.r === 8)) return false;
    return g.protectors(r.square).some((p) => p.type === 'b');
  }],

  // PILLSBURY: rook checks down the file/rank, a bishop on the long diagonal covers the corner flight.
  ['pillsburys-mate', (g) => {
    const r = single(g, 'r'); if (!r) return false;
    return openFlights(g).some((f) => coveredByType(g, f, 'b') && (isCorner(f.sq) || onEdge(f.sq)));
  }],

  // KILL BOX: rook checks, the queen (at distance, not adjacent) covers the flights.
  ['kill-box-mate', (g) => {
    const r = single(g, 'r'); if (!r) return false;
    const q = byType(g.attackerPieces, 'q')[0]; if (!q || cheb(q.sq, g.king.sq) < 2) return false;
    return openFlights(g).some((f) => f.coveredBy.includes(q.square));
  }],

  // BACK-RANK: rook/queen checks along the king's home rank; every flight is self-blocked or on the rank.
  ['back-rank-mate', (g) => {
    const c = single(g, 'r') ?? single(g, 'q'); if (!c) return false;
    const home = g.defender === 'w' ? 1 : 8;
    if (g.king.sq.r !== home || c.sq.r !== home) return false;
    return g.flights.filter((f) => f.sq.r !== home).every((f) => f.ownBlocked);
  }],

  // DAMIANO: queen mates on the rook file adjacent to the king, protected by a pawn.
  ['damianos-mate', (g) => {
    const q = single(g, 'q'); if (!q || cheb(q.sq, g.king.sq) !== 1 || !(q.sq.f === 0 || q.sq.f === 7)) return false;
    return g.protectors(q.square).some((p) => p.type === 'p');
  }],

  // LOLLI: queen mates on the knight file adjacent to the king, protected by a pawn.
  ['lollis-mate', (g) => {
    const q = single(g, 'q'); if (!q || cheb(q.sq, g.king.sq) !== 1 || !(q.sq.f === 1 || q.sq.f === 6)) return false;
    return g.protectors(q.square).some((p) => p.type === 'p');
  }],

  // GRECO: queen checks along the rook file, a bishop covers the flight beside the king.
  ['grecos-mate', (g) => {
    const q = single(g, 'q'); if (!q || !(q.sq.f === g.king.sq.f && (q.sq.f === 0 || q.sq.f === 7))) return false;
    return openFlights(g).some((f) => coveredByType(g, f, 'b'));
  }],

  // MAX LANGE: queen adjacent to an edge king, protected by a bishop.
  ['max-langes-mate', (g) => {
    const q = single(g, 'q'); if (!q || cheb(q.sq, g.king.sq) !== 1 || !onEdge(g.king.sq)) return false;
    return g.protectors(q.square).some((p) => p.type === 'b');
  }],

  // EPAULETTE: the king's two rank-neighbours are its own pieces; the queen checks head-on down the file.
  ['epaulette-mate', (g) => {
    const q = single(g, 'q'); if (!q) return false;
    const onFile = q.sq.f === g.king.sq.f, onRank = q.sq.r === g.king.sq.r;
    if (!onFile && !onRank) return false;
    // The "epaulettes" sit on either side of the king ACROSS the check line.
    const side = (d: number): Flight | undefined => g.flights.find((f) =>
      onFile ? f.sq.f === g.king.sq.f + d && f.sq.r === g.king.sq.r : f.sq.r === g.king.sq.r + d && f.sq.f === g.king.sq.f);
    return !!side(-1)?.ownBlocked && !!side(1)?.ownBlocked;
  }],

  // SWALLOW'S TAIL: queen orthogonally adjacent; the two diagonal flights BEHIND
  // the king (away from the queen) are its own pieces.
  ['swallows-tail-mate', (g) => {
    const q = single(g, 'q'); if (!q || cheb(q.sq, g.king.sq) !== 1 || (q.sq.f !== g.king.sq.f && q.sq.r !== g.king.sq.r)) return false;
    const df = Math.sign(g.king.sq.f - q.sq.f), dr = Math.sign(g.king.sq.r - q.sq.r);
    const behind = g.flights.filter((f) => (df === 0 ? f.sq.r === g.king.sq.r + dr && f.sq.f !== g.king.sq.f : f.sq.f === g.king.sq.f + df && f.sq.r !== g.king.sq.r));
    return behind.length === 2 && behind.every((f) => f.ownBlocked);
  }],

  // TRIANGLE: queen adjacent (protected by the king or a rook), a rook covers the rest from one square away.
  ['triangle-mate', (g) => {
    const q = single(g, 'q'); if (!q || cheb(q.sq, g.king.sq) !== 1) return false;
    return byType(g.attackerPieces, 'r').some((r) =>
      (r.sq.f === q.sq.f || r.sq.r === q.sq.r) && cheb(r.sq, q.sq) <= 2 && openFlights(g).some((f) => f.coveredBy.includes(r.square)));
  }],

  // DOVETAIL: queen diagonally adjacent; the two flights the queen does not cover are self-blocked.
  ['dovetail-mate', (g) => {
    const q = single(g, 'q'); if (!q || cheb(q.sq, g.king.sq) !== 1 || q.sq.f === g.king.sq.f || q.sq.r === g.king.sq.r) return false;
    // The dovetail's signature: the king's own pieces plug the flights the queen
    // leaves (the queen still x-rays through the king, so "not covered by the
    // queen" is the wrong test — a self-blocked square can be both).
    return g.flights.some((f) => f.square !== q.square && f.ownBlocked);
  }],

];

/**
 * Classify a checkmated position into its named pattern. Returns null when the
 * position is not mate, or matches no named geometry (degrade to silence).
 */
export function classifyMatePattern(fenAfterMate: string): MatePatternResult | null {
  const g = geometry(fenAfterMate);
  if (!g) return null;
  const patterns = matingPatternsData as MatingPattern[];
  const finish = (id: string): MatePatternResult | null => {
    const p = patterns.find((x) => x.id === id);
    if (!p) return null;
    const checker = g.checkers[0];
    return { id: p.id, name: p.name, squares: [checker.square, g.king.square], recognition: p.narration.recognition };
  };
  // A piece-mate FUNDAMENTAL (K+Q, K+R, B+N…) is the technique mate: the
  // attacking king takes part and no pawn helps. A lone king mated by pieces
  // from afar (Balestra, Anderssen with its pawn) is a named pattern first.
  const fundamental = pieceMate(g);
  const attackerKing = g.attackerPieces.find((p) => p.type === 'k');
  const kingTakesPart = !!attackerKing && cheb(attackerKing.sq, g.king.sq) <= 2;
  const pawnHelps = byType(g.attackerPieces, 'p').length > 0;
  if (fundamental && kingTakesPart && !pawnHelps) return finish(fundamental);
  for (const [id, rule] of RULES) {
    let hit = false;
    try { hit = rule(g); } catch { hit = false; }
    if (hit) return finish(id);
  }
  return fundamental ? finish(fundamental) : null;
}

/** Test-only: the rule order (so the known-answer harness can name misses). */
export const _mateRuleIds = RULES.map(([id]) => id);
