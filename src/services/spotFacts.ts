/**
 * WHAT THE BOARD SHOWS ABOUT A SHOT — the facts that pick which "how to spot
 * it next time" cue fits (David 2026-11-07: "Make sure to add all ways to
 * spot. Use data gathered from trusted sources"). A knight fork is spotted
 * differently from a pawn fork, a pin to the king differently from a pin to
 * the queen, a back-rank mate differently from a smothered one; these are the
 * computed facts that tell them apart (`spotCue.SPOT_RULES` reads them). Pure:
 * chess.js and the geometry readers, no engine.
 *
 * The line is the shot as played: its first move by the side that has the
 * tactic, then the replies. Every fact is read off the board, never guessed:
 * an illegal move ends the read and what was read stands.
 */
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { findPins, absolutePinRay, isRealSkewer } from './pinGeometry';
import { CAPTURE_VALUE } from './pieceValues';
import { classifyMatePattern } from './matePatterns';

export interface SpotBoard {
  /** The board before the shot. */
  fen: string;
  /** The shot as played, UCI, first move by the side with the tactic. */
  line: readonly string[];
}

export interface SpotPiece { type: PieceSymbol; square: Square }

export interface SpotFacts {
  /** The side with the tactic. */
  by: Color;
  /** The piece that plays the first move, and where it lands. */
  piece: PieceSymbol;
  from: Square;
  to: Square;
  /** The mover's next move in the line (its third ply), when there is one. */
  nextMine: { piece: PieceSymbol; to: Square } | null;
  /** What the first move takes, if anything. */
  captured: PieceSymbol | null;
  /** The taken piece had a guard; how many of the mover's pieces hit it and
   *  how many of theirs guarded it; one of its guards was pinned to the king. */
  capturedGuarded: boolean;
  attackersOnCaptured: number;
  guardsOnCaptured: number;
  guardPinned: boolean;
  /** Their pieces the moved piece hits after the first move (a knight or
   *  more, or the king), strongest first, and how many of them are unguarded. */
  hits: SpotPiece[];
  hitsLoose: number;
  /** Their pieces (a knight or more) the mover could take for nothing before
   *  the move: attacked and unguarded. */
  freeBefore: number;
  /** How the first move checks: by the moved piece, by a piece it uncovered,
   *  by both, or not at all. */
  check: 'none' | 'direct' | 'discovered' | 'double';
  /** The first move uncovers an attack by another of the mover's pieces on
   *  something of theirs worth a knight or more. */
  uncovers: boolean;
  /** What that uncovered attack hits (the king on a discovered check). */
  uncoveredHits: PieceSymbol[];
  /** Their king can take the moved piece. */
  kingCanTake: boolean;
  /** The moved piece stands where they can take it (attacked by them). */
  movedEnPrise: boolean;
  /** The moved piece was under attack before it moved. */
  movedWasAttacked: boolean;
  /** A pin the moved piece makes: to the king (absolute) or to a bigger
   *  piece (relative). */
  pin: 'absolute' | 'relative' | null;
  /** A skewer the moved piece makes: the king in front (absolute) or a big
   *  piece in front of a smaller one (relative). */
  skewer: { kind: 'absolute' | 'relative'; front: PieceSymbol; behind: PieceSymbol; straight: boolean } | null;
  /** The line ends in mate: its named pattern, or 'mate' when it has none. */
  mate: string | null;
  /** The piece a pawn promotes to in the line, if one does; and whether the
   *  first move itself promotes with a capture. */
  promotesTo: PieceSymbol | null;
  capturePromotes: boolean;
  /** At that promotion: a queen there would have stalemated them; a knight
   *  there gives check. What makes an underpromotion the point, not the
   *  engine picking a rook where a queen does the same job. */
  queenWouldStalemate: boolean;
  knightChecks: boolean;
  /** Pieces (no pawns, no kings) on the board before the shot. */
  material: { mover: PieceSymbol[]; them: PieceSymbol[] };
  /** Moves in the line. */
  plies: number;
}

const VALUE = CAPTURE_VALUE;

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

function moveOf(chess: Chess, uci: string): Move {
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci.length > 4 ? { promotion: uci[4] } : {}) });
}

function checkersOf(chess: Chess): Square[] {
  const side = chess.turn();
  const king = chess.board().flat().find((p) => p?.type === 'k' && p.color === side);
  return king ? chess.attackers(king.square, other(side)) : [];
}

/** The skewer the moved piece makes on one of its lines, decided by the ONE
 *  skewer rule (`pinGeometry.isRealSkewer`): their king in front of anything,
 *  or a bigger piece in front of a smaller one worth taking. */
function skewerOf(chess: Chess, from: Square, by: Color): SpotFacts['skewer'] {
  const p = chess.get(from);
  if (!p || (p.type !== 'b' && p.type !== 'r' && p.type !== 'q')) return null;
  const diag: Array<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const orth: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dirs = p.type === 'b' ? diag : p.type === 'r' ? orth : [...diag, ...orth];
  const f0 = from.charCodeAt(0) - 97;
  const r0 = Number(from[1]) - 1;
  let found: SpotFacts['skewer'] = null;
  for (const [df, dr] of dirs) {
    const seen: Array<{ type: PieceSymbol; color: Color; square: Square }> = [];
    for (let f = f0 + df, r = r0 + dr; f >= 0 && f < 8 && r >= 0 && r < 8 && seen.length < 2; f += df, r += dr) {
      const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
      const q = chess.get(sq);
      if (q) seen.push({ type: q.type, color: q.color, square: sq });
    }
    if (seen.length < 2 || seen[0].color === by) continue;
    if (!isRealSkewer(chess, from, seen[0].square, seen[1].square)) continue;
    const straight = df === 0 || dr === 0;
    if (seen[0].type === 'k') return { kind: 'absolute', front: 'k', behind: seen[1].type, straight };
    found = { kind: 'relative', front: seen[0].type, behind: seen[1].type, straight };
  }
  return found;
}

function piecesOf(chess: Chess, c: Color): PieceSymbol[] {
  return chess.board().flat().flatMap((p) => (p && p.color === c && p.type !== 'p' && p.type !== 'k' ? [p.type] : []));
}

export function spotFacts(b: SpotBoard): SpotFacts | null {
  if (b.line.length === 0) return null;
  let before: Chess;
  try { before = new Chess(b.fen); } catch { return null; }
  const by = before.turn();
  const them = other(by);
  const material = { mover: piecesOf(before, by), them: piecesOf(before, them) };
  let freeBefore = 0;
  for (const p of before.board().flat()) {
    if (!p || p.color !== them || VALUE[p.type] < 3 || p.type === 'k') continue;
    if (before.attackers(p.square, by).length > 0 && before.attackers(p.square, them).length === 0) freeBefore += 1;
  }
  const uci = b.line[0];
  const from = uci.slice(0, 2) as Square;
  const target = uci.slice(2, 4) as Square;
  const movedWasAttacked = before.attackers(from, them).length > 0;
  const victim = before.get(target);
  const guards = victim && victim.color === them ? before.attackers(target, them) : [];
  const guardPinned = guards.some((sq) => absolutePinRay(before, sq) !== null);
  const attackersOnCaptured = victim && victim.color === them ? before.attackers(target, by).length : 0;
  const chess = new Chess(b.fen);
  let first;
  try { first = moveOf(chess, uci); } catch { return null; }
  const to = first.to;
  const hits: SpotPiece[] = [];
  for (const p of chess.board().flat()) {
    if (!p || p.color !== them || p.type === 'p') continue;
    if (chess.attackers(p.square, by).includes(to)) hits.push({ type: p.type, square: p.square });
  }
  hits.sort((x, y) => VALUE[y.type] - VALUE[x.type]);
  const hitsLoose = hits.filter((h) => h.type !== 'k' && chess.attackers(h.square, them).length === 0).length;
  const checkers = checkersOf(chess);
  const direct = checkers.includes(to);
  const others = checkers.filter((sq) => sq !== to);
  const check: SpotFacts['check'] = checkers.length === 0 ? 'none'
    : direct && others.length > 0 ? 'double'
      : direct ? 'direct' : 'discovered';
  const uncoveredHits: PieceSymbol[] = check === 'discovered' || check === 'double' ? ['k'] : [];
  for (const p of chess.board().flat()) {
    if (!p || p.color !== them || VALUE[p.type] < 3 || p.type === 'k') continue;
    const now = chess.attackers(p.square, by).filter((sq) => sq !== to);
    const was = before.attackers(p.square, by);
    if (now.some((sq) => !was.includes(sq))) uncoveredHits.push(p.type);
  }
  const uncovers = uncoveredHits.length > 0;
  const theirKing = chess.board().flat().find((p) => p?.type === 'k' && p.color === them);
  const kingCanTake = !!theirKing && chess.attackers(to, them).includes(theirKing.square);
  const movedEnPrise = chess.attackers(to, them).length > 0;
  let pin: SpotFacts['pin'] = null;
  for (const pat of findPins(chess, to)) {
    if (chess.get(pat.involvedSquares[2] as Square)?.type === 'k') { pin = 'absolute'; break; }
    pin = 'relative';
  }
  const skewer = skewerOf(chess, to, by);
  let promotesTo: PieceSymbol | null = null;
  let queenWouldStalemate = false;
  let knightChecks = false;
  const promotionAt = (fenPre: string, uciMove: string, to: PieceSymbol): void => {
    if (promotesTo) return;
    promotesTo = to;
    const as = (piece: PieceSymbol): Chess | null => {
      const c = new Chess(fenPre);
      try { c.move({ from: uciMove.slice(0, 2), to: uciMove.slice(2, 4), promotion: piece }); return c; } catch { return null; }
    };
    queenWouldStalemate = !!as('q')?.isStalemate();
    knightChecks = !!as('n')?.inCheck();
  };
  if (first.promotion) promotionAt(b.fen, uci, first.promotion);
  const capturePromotes = !!first.promotion && !!first.captured;
  let plies = 1;
  let nextMine: SpotFacts['nextMine'] = null;
  for (const m of b.line.slice(1)) {
    const fenPre = chess.fen();
    try {
      const mv = moveOf(chess, m);
      plies += 1;
      if (plies === 3) nextMine = { piece: mv.piece, to: mv.to };
      if (mv.promotion && mv.color === by) promotionAt(fenPre, m, mv.promotion);
    } catch { break; }
  }
  const mate = chess.isCheckmate() ? (classifyMatePattern(chess.fen())?.id ?? 'mate') : null;
  return {
    by, piece: first.piece, from, to, nextMine, captured: first.captured ?? null,
    capturedGuarded: guards.length > 0, attackersOnCaptured, guardsOnCaptured: guards.length, guardPinned,
    hits, hitsLoose, freeBefore, check, uncovers, uncoveredHits, kingCanTake, movedEnPrise, movedWasAttacked,
    pin, skewer, mate, promotesTo, capturePromotes, queenWouldStalemate, knightChecks, material, plies,
  };
}
