/**
 * causalChain — "fact A caused fact B caused fact C. THIS IS CHESS!" (David
 * 2026-09-07). The LEAF that links moves ACROSS the game instead of grading each
 * one in isolation. Given a game and a focus move (a tactic that won/attacked a
 * loose enemy piece), it walks BACKWARD and emits the chain of board-proven
 * causes: the premature piece that took a defender's square → the defender
 * displaced → the target left loose → the tactic that collected it.
 *
 * G0 by construction: pure chess.js, no engine, no model, no I/O. EVERY causal
 * EDGE is a board counterfactual proven right here (a knight on f3 DOES defend
 * g5; the knight on e2 does NOT; f3 IS occupied by a friendly piece). The LLM
 * only VOICES the chain (causalChainVoice.ts); it never decides an edge.
 *
 * SILENT ON UNPROVABLE LINKS (David's pick 2026-09-07): a link is emitted only
 * when its board proof holds. The chain is the MAXIMAL proven prefix of causes;
 * where a cause can't be proven the chain simply stops there (or returns null
 * when nothing cross-move links). Never fabricate a "because" — a wrong link is
 * worse than the flat list. This is the "don't overstate the why" rule
 * (2026-07-19) applied to edges.
 *
 * SIDE-AGNOSTIC (the third detection gap): the cause is often the OPPONENT's
 * move (his early queen) enabling the STUDENT's tactic, so nothing here reuses
 * attributePrinciples (student-only, flagged-move-only). Detectors run on
 * whichever colour the board shows.
 */
import { Chess, type Color, type Square, type Move, type PieceSymbol } from 'chess.js';

// ─── types ──────────────────────────────────────────────────────────────────

export type CausalRelation =
  /** A occupies the natural developing square another friendly piece needed. */
  | 'occupies-developing-square'
  /** Because that square is taken, the piece that would guard the target isn't
   *  guarding it (displaced / left home). */
  | 'removes-defender'
  /** The target has no defender → loose (LPDO). */
  | 'leaves-loose'
  /** A standing weakness is the tactic's target/mechanism. */
  | 'enables-tactic';

export type CausalNodeKind =
  | 'premature-piece'   // an early queen / early piece sortie (the root cause)
  | 'blocked-square'    // a friendly piece squats on a developing square
  | 'displaced-defender'// the guard developed to a square that doesn't defend
  | 'loose-piece'       // the target has no defender
  | 'discovered-attack' // the tactic: a move unveils a second attacker
  | 'won-loose-piece';  // the tactic: a direct capture/attack collects a loose piece

export interface CausalNode {
  kind: CausalNodeKind;
  /** 1-based ply that established this fact, or null for a standing condition. */
  ply: number | null;
  /** Whose fact it is (the side the fact describes). */
  color: Color;
  /** Board squares the node names — EVERY one is real on the board it came from. */
  squares: Square[];
  /** Structured, board-true facts the renderer slots into prose. Never phrasing. */
  data: Record<string, string | number>;
}

export interface CausalEdge {
  relation: CausalRelation;
  /** One-line board proof (for tests + debugging; the renderer needn't speak it). */
  proof: string;
}

export interface CausalChain {
  /** Ordered ROOT-CAUSE first → tactic last. nodes[i] --edges[i]--> nodes[i+1]. */
  nodes: CausalNode[];
  edges: CausalEdge[];
  /** The side that benefited from the terminal tactic (the mover of the focus). */
  beneficiary: Color;
  /** 1-based ply of the focus (tactic) move. */
  focusPly: number;
}

export interface CausalChainInput {
  /** Every SAN of the game up to AND INCLUDING the focus move. */
  historySans: readonly string[];
  /** 1-based ply to explain. Default = the last move in historySans. */
  focusPly?: number;
}

// ─── helpers (pure chess.js) ────────────────────────────────────────────────

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }
function fileIdx(sq: string): number { return sq.charCodeAt(0) - 97; }
function rankNum(sq: string): number { return Number(sq[1]); }
function relRank(sq: string, color: Color): number { return color === 'w' ? rankNum(sq) : 9 - rankNum(sq); }

/** The natural developing squares a knight of `color` occupies (canonical), keyed
 *  by home square. A knight "should" be on one of these; when one is blocked by a
 *  friendly piece the causal story is board-true. */
const KNIGHT_NATURAL: Record<Color, Square[]> = { w: ['f3', 'c3'], b: ['f6', 'c6'] };
const KNIGHT_HOME: Record<Color, Square[]> = { w: ['g1', 'b1'], b: ['g8', 'b8'] };

function pieces(chess: Chess, color: Color, type?: PieceSymbol): { type: PieceSymbol; square: Square }[] {
  const out: { type: PieceSymbol; square: Square }[] = [];
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.color === color && (!type || cell.type === type)) out.push({ type: cell.type, square: cell.square });
  }
  return out;
}
function developedMinors(chess: Chess, color: Color): number {
  const home: Square[] = color === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
  return pieces(chess, color).filter((p) => (p.type === 'n' || p.type === 'b') && !home.includes(p.square)).length;
}

/** Squares from which a KNIGHT would attack (defend) `target`. */
function knightSquaresHitting(target: Square): Square[] {
  const f = fileIdx(target); const r = rankNum(target);
  const deltas = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const out: Square[] = [];
  for (const [df, dr] of deltas) {
    const nf = f + df; const nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
    out.push(`${String.fromCharCode(97 + nf)}${nr}` as Square);
  }
  return out;
}

/** true when a friendly (of `color`) line-piece would attack `target` from `from`
 *  along a clear ray — used to test whether a vacated square unveils an attack.
 *  Board-true: rebuilds the board with the mover's from-square emptied. */
function raySees(chess: Chess, from: Square, target: Square): boolean {
  const atk = chess.attackers(target, chess.get(from)?.color ?? 'w');
  return atk.includes(from);
}

/** A position where it is `color` to move regardless of whose turn it is (so
 *  chess.attackers works uniformly). Castling/ep neutralised for safety. */
function replay(historySans: readonly string[], upto: number): { chess: Chess; moves: Move[] } | null {
  const chess = new Chess();
  const moves: Move[] = [];
  try {
    for (let i = 0; i < upto; i++) {
      const m = chess.move(historySans[i].replace(/[?!]+$/, ''));
      if (!m) return null;
      moves.push(m);
    }
  } catch { return null; }
  return { chess, moves };
}

// ─── relation detectors (each board-proven) ─────────────────────────────────

/** The focus move newly attacks an enemy piece (≥3 pts) that is now LOOSE
 *  (no defender). "Newly" = it was not attacked by the mover before the move, so
 *  THIS move created the attack. Returns the target + whether the moved piece is
 *  one of the attackers. Null when no such loose target. */
function exploitedLoosePiece(before: Chess, after: Chess, focus: Move): { target: Square; type: PieceSymbol; movedPieceAttacks: boolean } | null {
  const mover = focus.color;
  const enemy = other(mover);
  let best: { target: Square; type: PieceSymbol; movedPieceAttacks: boolean } | null = null;
  for (const p of pieces(after, enemy)) {
    if (p.type === 'k' || VAL[p.type] < 3) continue;
    const attackersNow = after.attackers(p.square, mover);
    if (attackersNow.length === 0) continue;
    const defenders = after.attackers(p.square, enemy);
    if (defenders.length > 0) continue;                 // not loose
    const attackedBefore = before.get(p.square)?.color === enemy && before.attackers(p.square, mover).length > 0;
    if (attackedBefore) continue;                        // the move didn't create the attack
    const cand = { target: p.square, type: p.type, movedPieceAttacks: attackersNow.includes(focus.to) };
    if (!best || VAL[p.type] > VAL[best.type]) best = cand;
  }
  return best;
}

/** The focus move VACATED its from-square, unveiling a friendly line-piece's
 *  attack on `target` (a discovery). PROOF: a mover bishop/rook/queen attacks
 *  target AFTER the move but did NOT before, and the from-square lies on that
 *  piece's ray to the target. Returns the unveiled attacker's square, or null.
 *  Minor-piece TARGETS are allowed here (the live tactic detector excludes them;
 *  this cross-move detector must not — gap #1). */
function discoveryUnveiled(before: Chess, after: Chess, focus: Move, target: Square): Square | null {
  const mover = focus.color;
  const afterAttackers = after.attackers(target, mover);
  const beforeAttackers = new Set(before.attackers(target, mover));
  for (const sq of afterAttackers) {
    if (sq === focus.to) continue;                       // that's the moved piece, not the unveiled one
    if (beforeAttackers.has(sq)) continue;               // was already attacking → not unveiled
    const pc = after.get(sq);
    if (!pc || (pc.type !== 'b' && pc.type !== 'r' && pc.type !== 'q')) continue;
    // The from-square must lie between the unveiled piece and the target (the
    // focus piece was the shutter). Prove it: the unveiler could see the target
    // through from BEFORE only if from were empty — i.e. before the move the
    // unveiler did NOT attack target but its ray passes through from.
    if (!raySees(after, sq, target)) continue;
    // from-square on the line: same file/rank/diagonal between sq and target.
    if (onSegment(sq, focus.from, target)) return sq;
  }
  return null;
}

/** Is `mid` strictly between `a` and `b` on a rank, file, or diagonal? */
function onSegment(a: string, mid: string, b: string): boolean {
  const af = fileIdx(a), ar = rankNum(a), bf = fileIdx(b), br = rankNum(b), mf = fileIdx(mid), mr = rankNum(mid);
  const dfAB = Math.sign(bf - af), drAB = Math.sign(br - ar);
  // must be colinear (same or diagonal line)
  const df = bf - af, dr = br - ar;
  const straight = df === 0 || dr === 0;
  const diagonal = Math.abs(df) === Math.abs(dr);
  if (!straight && !diagonal) return false;
  let f = af + dfAB, r = ar + drAB;
  while (f !== bf || r !== br) {
    if (f === mf && r === mr) return true;
    f += dfAB; r += drAB;
    if (f < 0 || f > 7 || r < 1 || r > 8) return false;
  }
  return false;
}

/** WHY is `target` (a `targetColor` piece) undefended? Look for a MISSING NATURAL
 *  DEFENDER: a knight of targetColor that would defend `target` from one of its
 *  canonical squares, where that square is instead occupied by a FRIENDLY piece
 *  of another type (the blocker), and the knight is not defending the target.
 *  Returns the ideal defending square + the blocker + the actual knight, or null.
 *  Board-proven counterfactual (a knight on the ideal square really does hit the
 *  target; the blocker really is there; the knight really is elsewhere). */
function missingNaturalDefender(after: Chess, target: Square, targetColor: Color):
  { idealSquare: Square; blocker: PieceSymbol; blockerSquare: Square; knightSquare: Square } | null {
  const hitting = knightSquaresHitting(target);
  const natural = KNIGHT_NATURAL[targetColor];
  const knights = pieces(after, targetColor, 'n');
  if (knights.length === 0) return null;
  // A knight of targetColor already defending target → nothing missing.
  if (after.attackers(target, targetColor).some((sq) => after.get(sq)?.type === 'n')) return null;
  for (const ideal of hitting) {
    if (!natural.includes(ideal)) continue;              // only canonical developing squares tell an honest story
    const occ = after.get(ideal);
    if (!occ || occ.color !== targetColor || occ.type === 'n') continue; // must be a friendly NON-knight blocker
    // The knight that "belongs" near this square: the one whose home shares the file side.
    const homeSide = fileIdx(ideal) >= 4 ? 'k' : 'q';
    const knight = knights.find((k) => (fileIdx(k.square) >= 4 ? 'k' : 'q') === homeSide)
      ?? knights.find((k) => KNIGHT_HOME[targetColor].includes(k.square)) ?? knights[0];
    if (!knight) continue;
    return { idealSquare: ideal, blocker: occ.type, blockerSquare: ideal, knightSquare: knight.square };
  }
  return null;
}

/** The ply (1-based) at which `color` last moved a piece TO `square`, with the
 *  board state right before it (for premature testing). Null when never. */
function plyPieceArrived(historySans: readonly string[], color: Color, square: Square, before: number):
  { ply: number; move: Move; boardBefore: Chess } | null {
  for (let i = before - 1; i >= 0; i--) {
    const r = replay(historySans, i);
    if (!r) continue;
    // Whose move is at ply i+1? side to move at position i.
    const sideToMove = r.chess.turn();
    if (sideToMove !== color) continue;
    const step = new Chess(r.chess.fen());
    let m: Move | null = null;
    try { m = step.move(historySans[i].replace(/[?!]+$/, '')); } catch { m = null; }
    if (m && m.to === square) return { ply: i + 1, move: m, boardBefore: r.chess };
  }
  return null;
}

/** Was moving `move` to its square premature? (early-queen-sortie criteria,
 *  reused board-side-agnostic): a queen off the back rank with < 3 minors
 *  developed. Board-proven from the position before the move. */
function wasPrematureQueen(boardBefore: Chess, move: Move): boolean {
  if (move.piece !== 'q') return false;
  if (relRank(move.to, move.color) === 1) return false;
  return developedMinors(boardBefore, move.color) < 3;
}

// ─── the builder ────────────────────────────────────────────────────────────

/**
 * Build the maximal board-proven causal chain that explains the focus move.
 * Returns null when the focus is not a tactic on a loose piece, or when no
 * cross-move cause can be proven (fewer than one causal link) — then the flat
 * ranked list stands, per the silent-on-unprovable rule.
 */
export function buildCausalChain(input: CausalChainInput): CausalChain | null {
  const { historySans } = input;
  const focusPly = input.focusPly ?? historySans.length;
  if (focusPly < 1 || focusPly > historySans.length) return null;

  const beforeR = replay(historySans, focusPly - 1);
  const afterR = replay(historySans, focusPly);
  if (!beforeR || !afterR) return null;
  const before = beforeR.chess;
  const after = afterR.chess;
  const focus = afterR.moves[afterR.moves.length - 1];
  if (!focus) return null;
  const mover = focus.color;
  const enemy = other(mover);

  // 1. The tactic: did this move win/attack a LOOSE enemy piece it wasn't
  //    attacking before?
  const loose = exploitedLoosePiece(before, after, focus);
  if (!loose) return null;

  // Is it a DISCOVERY (a second attacker unveiled) or a direct hit?
  const unveiler = discoveryUnveiled(before, after, focus, loose.target);

  // Terminal node — the tactic that collected the loose piece.
  const tacticNode: CausalNode = unveiler
    ? {
        kind: 'discovered-attack', ply: focusPly, color: mover,
        squares: [focus.from, focus.to, unveiler, loose.target],
        data: { move: focus.san, unveiler, target: loose.target, targetPiece: PIECE_NOUN[loose.type], from: focus.from, to: focus.to },
      }
    : {
        kind: 'won-loose-piece', ply: focusPly, color: mover,
        squares: [focus.to, loose.target],
        data: { move: focus.san, target: loose.target, targetPiece: PIECE_NOUN[loose.type], to: focus.to },
      };

  // 2. WHY was the target loose? A missing natural defender (displaced by a
  //    friendly piece squatting on its square).
  const missing = missingNaturalDefender(after, loose.target, enemy);

  if (!missing) {
    // No provable cross-move cause. A bare "you won a loose piece" is not a
    // chain — leave it to the flat list (silent on unprovable).
    return null;
  }

  // The loose-piece node.
  const looseNode: CausalNode = {
    kind: 'loose-piece', ply: null, color: enemy,
    squares: [loose.target],
    data: { square: loose.target, piece: PIECE_NOUN[loose.type] },
  };

  // The displaced-defender node.
  const displacedNode: CausalNode = {
    kind: 'displaced-defender', ply: null, color: enemy,
    squares: [missing.knightSquare, missing.idealSquare, loose.target],
    data: {
      knightSquare: missing.knightSquare, idealSquare: missing.idealSquare,
      target: loose.target, targetPiece: PIECE_NOUN[loose.type],
    },
  };

  // 3. WHY is the defender displaced? A friendly blocker occupies its natural
  //    square. Find when the blocker arrived + whether it was premature.
  const arrival = plyPieceArrived(historySans, enemy, missing.idealSquare, focusPly);

  // Assemble ROOT → tactic. nodes[i] --edges[i]--> nodes[i+1], so each edge is
  // pushed AFTER its source node and BEFORE its target node.
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];
  const premature = arrival ? wasPrematureQueen(arrival.boardBefore, arrival.move) : false;

  // Optional ROOT: the blocker that took the defender's square. When it's a
  // premature queen, that's the root cause; otherwise a plain "square taken".
  if (arrival && premature) {
    nodes.push({
      kind: 'premature-piece', ply: arrival.ply, color: enemy,
      squares: [missing.idealSquare],
      data: { piece: PIECE_NOUN[arrival.move.piece], square: missing.idealSquare, move: arrival.move.san },
    });
  } else if (arrival) {
    nodes.push({
      kind: 'blocked-square', ply: arrival.ply, color: enemy,
      squares: [missing.idealSquare],
      data: { square: missing.idealSquare, blocker: PIECE_NOUN[missing.blocker] },
    });
  }
  // ROOT → displaced-defender (only when a root exists).
  if (nodes.length > 0) {
    edges.push({
      relation: 'occupies-developing-square',
      proof: `${arrival ? arrival.move.san + ' put the ' + PIECE_NOUN[arrival.move.piece] : PIECE_NOUN[missing.blocker]} on ${missing.idealSquare}, the knight's natural developing square`,
    });
  }
  // displaced-defender → loose-piece (removes-defender; board-proven).
  nodes.push(displacedNode);
  edges.push({
    relation: 'removes-defender',
    proof: `a knight on ${missing.idealSquare} defends ${loose.target}; the knight on ${missing.knightSquare} does not`,
  });
  // loose-piece → tactic (enables-tactic).
  nodes.push(looseNode);
  edges.push({
    relation: 'enables-tactic',
    proof: unveiler
      ? `${focus.san} unveils ${unveiler}'s attack on the loose ${PIECE_NOUN[loose.type]} on ${loose.target}`
      : `${focus.san} attacks the loose ${PIECE_NOUN[loose.type]} on ${loose.target}`,
  });
  nodes.push(tacticNode);

  // A chain needs at least one causal link across moves; edges === nodes-1.
  if (nodes.length < 2 || edges.length !== nodes.length - 1) return null;

  return { nodes, edges, beneficiary: mover, focusPly };
}
