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
import type { FundamentalId } from './principleAttribution';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { seeGain } from './positionReadingService';

// ─── types ──────────────────────────────────────────────────────────────────

/** Board-marker colours the app's parseBoardTags accepts. green = a vision /
 *  attack sight-line, yellow = a key square the narration names, red = the loose
 *  target / danger, blue = context (where a piece actually is). */
export type MarkerColor = 'green' | 'yellow' | 'red' | 'blue';
export interface CausalArrow { from: Square; to: Square; color: MarkerColor; }
export interface CausalHighlight { square: Square; color: MarkerColor; }

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
  | 'won-loose-piece'   // the tactic: a direct capture collects a loose piece
  | 'defender-removed'; // a cause: the opponent moved the only guard off a piece

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
  /** The fundamental this node relates back to (David 2026-09-07: "link to the
   *  fundamentals and relate them back to the chain") — the SAME id the
   *  attribution/drill spine uses, so a chained mistake feeds My Mistakes. Null
   *  for the beneficiary's winning tactic (that's not a mistake). */
  fundamentalId?: FundamentalId | null;
  /** The misconception/weakness bucket the node files under (for the drill
   *  spine). Present only on the cause nodes (the mistakes), never the tactic. */
  tag?: MisconceptionTagId;
  /** Lead-the-eye arrows for this node — every `from` is a real piece on the
   *  focus board, board-proven (David 2026-09-07: "add lead the eye arrows"). */
  arrows: CausalArrow[];
  /** Key squares to highlight as this node's sentence is spoken. Every square is
   *  real on the focus board. */
  highlights: CausalHighlight[];
}

export interface CausalEdge {
  relation: CausalRelation;
  /** One-line board proof (for tests + debugging; the renderer needn't speak it). */
  proof: string;
}

/** How the chain relates to the actual game (David 2026-09-07: "both ways"):
 *  - 'played'  — it happened on the board.
 *  - 'missed'  — it was AVAILABLE to the student, who played something else (the
 *                win they could have had).
 *  - 'allowed' — the student's move LEFT it available to the opponent (the shot
 *                they now have; the prophylaxis lesson). */
export type CausalStance = 'played' | 'missed' | 'allowed';

export interface CausalChain {
  /** Ordered ROOT-CAUSE first → tactic last. nodes[i] --edges[i]--> nodes[i+1]. */
  nodes: CausalNode[];
  edges: CausalEdge[];
  /** The side that benefited from the terminal tactic (the mover of the focus). */
  beneficiary: Color;
  /** 1-based ply of the focus (tactic) move. */
  focusPly: number;
  /** Played by default; 'missed'/'allowed' for the hypothetical (both-ways) chains. */
  stance: CausalStance;
  /** 'missed' — the SAN the student could have played to win it. */
  missedMove?: string;
  /** 'missed' — what the student actually played instead. */
  playedInstead?: string;
  /** 'allowed' — a SAN the student could have played to AVOID it (prophylaxis).
   *  Absent when no clean avoiding move was found. */
  avoidance?: string;
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
/** Minors still sitting on their home squares — the "genuinely undeveloped"
 *  signal that distinguishes an early opening from a traded-down middlegame
 *  (where developedMinors is also low, but because pieces were exchanged). */
function homeMinors(chess: Chess, color: Color): number {
  const home: Square[] = color === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
  return pieces(chess, color).filter((p) => (p.type === 'n' || p.type === 'b') && home.includes(p.square)).length;
}
function fullmoveOf(chess: Chess): number { return Number.parseInt(chess.fen().split(' ')[5] ?? '1', 10) || 1; }

/** Cheap gate (no replay): does `victimSide` have a piece (≥ minor) that can be
 *  profitably captured RIGHT NOW? Used to skip the expensive both-ways lookahead
 *  on the ~95% of positions where nothing hangs. */
function hasWinnablePiece(chess: Chess, victimSide: Color): boolean {
  for (const p of pieces(chess, victimSide)) {
    if (p.type === 'k' || VAL[p.type] < 3) continue;
    try { if (seeGain(chess, p.square) >= 2) return true; } catch { /* skip */ }
  }
  return false;
}

/** Counterfactual: at `prev` (the OPPONENT to move), does a legal move exist that
 *  keeps the piece of `victimType` on `s` safe — either by moving that piece to a
 *  safe square, or by any move that leaves it on `s` no longer winnable (adding a
 *  defender / removing the attacker)? If so, abandoning the guard was a genuine
 *  CHOICE; if not, the loss was unavoidable (a forced move is not the cause). */
function targetWasSavable(prev: Chess, s: Square, enemy: Color, victimType: PieceSymbol): boolean {
  let moves: Move[];
  try { moves = prev.moves({ verbose: true }); } catch { return false; }
  for (const m of moves) {
    const c = new Chess(prev.fen());
    try { if (!c.move({ from: m.from, to: m.to, promotion: m.promotion })) continue; } catch { continue; }
    // (a) the victim moved to safety
    if (m.from === s && m.piece === victimType && seeGain(c, m.to) <= 0) return true;
    // (b) the victim stayed on s and is no longer winnable (defended / attacker gone)
    const p = c.get(s);
    if (p && p.color === enemy && p.type === victimType && seeGain(c, s) <= 0) return true;
  }
  return false;
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
    // The blocker must be the OWNER'S QUEEN — the premature-sortie case, the only
    // sound cross-move cause (a pawn or a routinely-developed piece on a knight's
    // square is not why another piece is loose — the false-causality trap).
    if (!occ || occ.color !== targetColor || occ.type !== 'q') continue;
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
  // Genuinely EARLY — not a traded-down middlegame where the queen recaptures on
  // a knight square (Qxc3 on move 29 is not a "premature sortie"). Require the
  // opening phase AND minors still HOME (traded-off minors also read as "few
  // developed", which is the loophole that mislabelled a move-29 queen as early).
  if (fullmoveOf(boardBefore) > 12) return false;
  if (developedMinors(boardBefore, move.color) >= 3) return false;
  if (homeMinors(boardBefore, move.color) < 2) return false;
  return true;
}

// ─── the builders (one per board-proven pattern) ────────────────────────────

/**
 * PATTERN 1 — premature queen → displaced knight → loose piece → DISCOVERED
 * attack. The airtight case from David's game. Returns null unless every link is
 * board-proven (silent-on-unprovable).
 */
function buildPrematureQueenDiscoveryChain(input: CausalChainInput): CausalChain | null {
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

  // Is it a DISCOVERY (a second attacker unveiled)?
  const unveiler = discoveryUnveiled(before, after, focus, loose.target);

  // 🔒 REQUIRE A GENUINE DISCOVERED ATTACK. A single attacker on an undefended
  // piece is often just a KICK the piece escapes (…h6 hits Bg5, the bishop simply
  // retreats — not "won"). The airtight, can't-escape pattern is the discovered
  // DOUBLE attack: the moved piece AND an unveiled piece both bear on the target,
  // so it cannot dodge both. No unveiled second attacker → not a won piece →
  // silence (David 2026-09-07: "don't overstate the why"; a kicked piece is not
  // a dropped piece).
  if (!unveiler) return null;

  // An arrow only when its `from` really holds a piece on the focus board.
  const arrowIf = (from: Square, to: Square, color: MarkerColor): CausalArrow[] =>
    after.get(from) ? [{ from, to, color }] : [];

  // Terminal node — the tactic that collected the loose piece. The attack arrows
  // lead the eye: the unveiled piece and the moved piece both bearing on the
  // loose target (the discovered double attack), the target itself in red. No
  // fundamental/tag — this is the beneficiary's WINNING move, not a mistake.
  const tacticNode: CausalNode = unveiler
    ? {
        kind: 'discovered-attack', ply: focusPly, color: mover,
        squares: [focus.from, focus.to, unveiler, loose.target],
        data: { move: focus.san, unveiler, target: loose.target, targetPiece: PIECE_NOUN[loose.type], from: focus.from, to: focus.to },
        fundamentalId: null,
        arrows: [...arrowIf(unveiler, loose.target, 'green'), ...arrowIf(focus.to, loose.target, 'green')],
        highlights: [{ square: loose.target, color: 'red' }],
      }
    : {
        kind: 'won-loose-piece', ply: focusPly, color: mover,
        squares: [focus.to, loose.target],
        data: { move: focus.san, target: loose.target, targetPiece: PIECE_NOUN[loose.type], to: focus.to },
        fundamentalId: null,
        arrows: arrowIf(focus.to, loose.target, 'green'),
        highlights: [{ square: loose.target, color: 'red' }],
      };

  // 2. WHY was the target loose? A missing natural defender (displaced by a
  //    friendly piece squatting on its square).
  const missing = missingNaturalDefender(after, loose.target, enemy);

  if (!missing) {
    // No provable cross-move cause. A bare "you won a loose piece" is not a
    // chain — leave it to the flat list (silent on unprovable).
    return null;
  }

  // The loose-piece node — the target in red, with a green arrow from every
  // attacker bearing on it (board-true: the attackers come straight from the FEN).
  const looseNode: CausalNode = {
    kind: 'loose-piece', ply: null, color: enemy,
    squares: [loose.target],
    data: { square: loose.target, piece: PIECE_NOUN[loose.type] },
    fundamentalId: 'loose-piece',
    tag: 'hung-material',
    arrows: after.attackers(loose.target, mover).map((sq) => ({ from: sq, to: loose.target, color: 'green' as const })),
    highlights: [{ square: loose.target, color: 'red' }],
  };

  // The displaced-defender node. Highlights lead the eye: where the knight ACTUALLY
  // is (blue), the square it SHOULD hold (yellow), and the target it would guard
  // from there (yellow). No arrow for the missing defence — a knight-jump arrow
  // from f3 would read as "the queen on f3 guards g5" (it doesn't); the highlight
  // pair + the spoken "a knight on f3 would guard g5" carries it honestly.
  const displacedNode: CausalNode = {
    kind: 'displaced-defender', ply: null, color: enemy,
    squares: [missing.knightSquare, missing.idealSquare, loose.target],
    data: {
      knightSquare: missing.knightSquare, idealSquare: missing.idealSquare,
      target: loose.target, targetPiece: PIECE_NOUN[loose.type],
    },
    tag: 'misplaced-piece',
    arrows: [],
    highlights: [
      { square: missing.knightSquare, color: 'blue' },
      { square: missing.idealSquare, color: 'yellow' },
      { square: loose.target, color: 'yellow' },
    ],
  };

  // 3. WHY is the defender displaced? A friendly blocker occupies its natural
  //    square. Find when the blocker arrived + whether it was premature.
  const arrival = plyPieceArrived(historySans, enemy, missing.idealSquare, focusPly);
  const premature = arrival ? wasPrematureQueen(arrival.boardBefore, arrival.move) : false;

  // 🔒 STRICT ROOT — only a PREMATURE PIECE that took the defender's square is a
  // sound cross-move cause (David 2026-09-07: "don't overstate the why"; "does
  // it know when NOT to link the dots"). A normal PAWN or a routinely-developed
  // piece on a natural knight square is NOT why a piece is loose — treating it as
  // the cause is the false-causality trap (a pawn on c3 does not "cause" a queen
  // that walked to e4 to hang). We require:
  //   (a) a premature QUEEN sortie sits on the defender's ideal square, AND
  //   (b) the defender knight is genuinely DISPLACED to a passive rank (≤ 2 from
  //       its own side) — not merely developed actively elsewhere.
  // Anything short of both → silence, and the flat list stands.
  if (!arrival || !premature) return null;
  if (relRank(missing.knightSquare, enemy) > 2) return null;

  // Assemble ROOT → tactic. nodes[i] --edges[i]--> nodes[i+1], so each edge is
  // pushed AFTER its source node and BEFORE its target node.
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];

  // ROOT — the premature queen that took the knight's square.
  nodes.push({
    kind: 'premature-piece', ply: arrival.ply, color: enemy,
    squares: [missing.idealSquare],
    data: { piece: PIECE_NOUN[arrival.move.piece], square: missing.idealSquare, move: arrival.move.san },
    fundamentalId: 'early-queen-sortie',
    tag: 'neglected-development',
    arrows: [],
    highlights: [{ square: missing.idealSquare, color: 'yellow' }],
  });
  // ROOT → displaced-defender.
  edges.push({
    relation: 'occupies-developing-square',
    proof: `${arrival.move.san} put the ${PIECE_NOUN[arrival.move.piece]} on ${missing.idealSquare}, the knight's natural developing square`,
  });
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

  return { nodes, edges, beneficiary: mover, focusPly, stance: 'played' };
}

/**
 * PATTERN 2 — the opponent moved the ONLY guard off a piece, and it was won.
 * The most common cross-move "why" at club level: "their last move pulled the
 * knight off c6 — the only thing guarding the bishop — so you took it." Board-
 * proven with SEE: the piece was safe before the opponent's move, the opponent's
 * move removed a defender of it, and it is now winnable and gets captured.
 * Silent unless every link holds.
 */
function buildRemovedDefenderChain(input: CausalChainInput): CausalChain | null {
  const { historySans } = input;
  const focusPly = input.focusPly ?? historySans.length;
  if (focusPly < 3 || focusPly > historySans.length) return null; // need an opponent move before

  const afterR = replay(historySans, focusPly);
  const beforeR = replay(historySans, focusPly - 1);  // after the opponent's move, before focus
  const prevR = replay(historySans, focusPly - 2);    // before the opponent's move
  if (!afterR || !beforeR || !prevR) return null;
  const focus = afterR.moves[afterR.moves.length - 1];
  const oppMove = beforeR.moves[beforeR.moves.length - 1];
  if (!focus || !oppMove) return null;
  const mover = focus.color;
  const enemy = other(mover);
  if (oppMove.color !== enemy) return null;

  // The focus move CAPTURES a real piece (≥ minor) that is winnable — a genuine
  // material grab, not an equal trade.
  if (!focus.captured) return null;
  const s = focus.to;
  const victimType = beforeR.chess.get(s)?.type;
  if (!victimType || victimType === 'k' || VAL[victimType] < 3) return null;
  if (seeGain(beforeR.chess, s) < 2) return null;   // capturing it wins material NOW
  // …and the capturer SITS SAFELY afterwards — else it's a trade in a flurry, not
  // a won piece (the single-square SEE win must survive the recapture).
  if (seeGain(afterR.chess, s) > 0) return null;

  // It was SAFE before the opponent's move: the SAME enemy piece stood on s and
  // was not winnable then. (Excludes recaptures — if the opponent had just
  // captured on s, prevR's s held a MOVER piece, not this enemy victim.)
  const prevPiece = prevR.chess.get(s);
  if (!prevPiece || prevPiece.color !== enemy || prevPiece.type !== victimType) return null;
  if (seeGain(prevR.chess, s) > 0) return null;     // already hanging before → not the opponent's doing

  // The opponent's move MOVED one of s's own defenders away (abandonment). The
  // guard was defending s before and no longer is, and the opponent moved it.
  const defendersBefore = new Set(prevR.chess.attackers(s, enemy));
  const defendersNow = new Set(beforeR.chess.attackers(s, enemy));
  const guardLeft = defendersBefore.has(oppMove.from as never) && !defendersNow.has(oppMove.from as never);
  if (!guardLeft) return null;                       // the opponent's move is not what removed the guard
  const guardType = prevPiece && prevR.chess.get(oppMove.from)?.type;
  if (!guardType) return null;

  // 🔒 IT MUST HAVE BEEN A CHOICE, NOT A FORCED MOVE (David 2026-09-07). The true
  // counterfactual — the same discipline principleAttribution uses: was there a
  // legal move that would have kept the piece safe? If yes, abandoning the guard
  // was a real decision → the lesson stands. If NO move saved it, the loss was
  // unavoidable and blaming this move overstates the why → silence. This is
  // stronger than a crude "was in check" proxy (an in-check player with a saving
  // block still made a choice; a player whose only legal move drops it did not).
  if (!targetWasSavable(prevR.chess, s, enemy, victimType)) return null;

  const causeNode: CausalNode = {
    kind: 'defender-removed', ply: focusPly - 1, color: enemy,
    squares: [oppMove.from, s],
    data: { move: oppMove.san, guardPiece: PIECE_NOUN[guardType], from: oppMove.from, target: s, targetPiece: PIECE_NOUN[victimType] },
    fundamentalId: 'loose-piece',
    tag: 'hung-material',
    arrows: [],
    highlights: [{ square: oppMove.from, color: 'yellow' }, { square: s, color: 'red' }],
  };
  const tacticNode: CausalNode = {
    kind: 'won-loose-piece', ply: focusPly, color: mover,
    squares: [focus.to, s],
    data: { move: focus.san, target: s, targetPiece: PIECE_NOUN[victimType], to: focus.to },
    fundamentalId: null,
    arrows: [],
    highlights: [{ square: s, color: 'red' }],
  };
  return {
    nodes: [causeNode, tacticNode],
    edges: [{ relation: 'removes-defender', proof: `${oppMove.san} moved the ${PIECE_NOUN[guardType]} off ${oppMove.from}; it was defending ${s}, now winnable (SEE ${seeGain(beforeR.chess, s)})` }],
    beneficiary: mover,
    focusPly,
    stance: 'played',
  };
}

/**
 * The public entry — try each board-proven pattern in priority order, return the
 * first that fires. Silent (null) when none does; the flat ranked list stands.
 * David 2026-09-07: "moves do not exist in isolation" — the library grows one
 * board-proven, game-validated pattern at a time.
 */
export function buildCausalChain(input: CausalChainInput): CausalChain | null {
  return buildPrematureQueenDiscoveryChain(input)
    ?? buildRemovedDefenderChain(input);
}

// ─── both-ways: available (missed / allowed) chains ─────────────────────────

/** The square of the piece the chain's tactic wins (for the avoidance search). */
function chainTargetSquare(chain: CausalChain): Square | null {
  for (const n of chain.nodes) {
    if (n.kind === 'won-loose-piece' || n.kind === 'discovered-attack') return String(n.data.target) as Square;
    if (n.kind === 'loose-piece') return String(n.data.square) as Square;
  }
  return null;
}

/** Is a chain-tactic AVAILABLE to `side` at the position after `plyBefore` plies?
 *  Tries each CAPTURING move for `side` as a hypothetical focus (both patterns'
 *  tactic is a capture) and returns the first that fires a chain, plus its SAN.
 *  Pure lookahead — nothing is committed to the game. */
function chainAvailableFor(historySans: readonly string[], plyBefore: number, side: Color): { chain: CausalChain; moveSan: string } | null {
  const r = replay(historySans, plyBefore);
  if (!r) return null;
  if (r.chess.turn() !== side) return null;
  let moves: Move[];
  try { moves = r.chess.moves({ verbose: true }); } catch { return null; }
  const base = historySans.slice(0, plyBefore);
  for (const m of moves) {
    if (!m.captured) continue;                 // the tactic move is always a capture
    // Only a capture of a genuinely WINNABLE piece can be a chain tactic — this
    // prunes the candidate set to ~1-2 (the hot-path optimisation that keeps the
    // both-ways lookahead cheap enough to run per move).
    let g = 0; try { g = seeGain(r.chess, m.to); } catch { g = 0; }
    if (g < 2) continue;
    const chain = buildCausalChain({ historySans: [...base, m.san], focusPly: plyBefore + 1 });
    if (chain) return { chain, moveSan: m.san };
  }
  return null;
}

/**
 * MISSED (for the user) — at the student's move (studentMovePly), a winning chain
 * was AVAILABLE to them and they played something else. Returns the chain with
 * stance 'missed', the move they could have played, and what they played instead.
 */
export function findMissedChain(historySans: readonly string[], studentMovePly: number, studentColor: Color): CausalChain | null {
  if (studentMovePly < 1 || studentMovePly > historySans.length) return null;
  const before = replay(historySans, studentMovePly - 1);
  if (!before || before.chess.turn() !== studentColor) return null;   // must be the student's move
  // Cheap gate: no enemy piece hangs → no missed win to find. Skips the lookahead.
  if (!hasWinnablePiece(before.chess, other(studentColor))) return null;
  const avail = chainAvailableFor(historySans, studentMovePly - 1, studentColor);
  if (!avail) return null;
  const actualRaw = historySans[studentMovePly - 1];
  const actual = actualRaw.replace(/[?!]+$/, '');
  if (avail.moveSan.replace(/[?!]+$/, '') === actual) return null;     // they DID play it → 'played', not missed
  // Don't call it a "miss" when the student played a CHECK — that is their own
  // forcing plan (often a mating attack), not an oversight (David 2026-09-07:
  // "don't overstate the why"). A quiet or equal-trade move that let a free win
  // slip is a genuine miss; a check is not second-guessed.
  if (/[+#]/.test(actual)) return null;
  return { ...avail.chain, stance: 'missed', missedMove: avail.moveSan, playedInstead: historySans[studentMovePly - 1] };
}

/**
 * ALLOWED (against the user) — the student's move (studentMovePly) LEFT a chain
 * available to the opponent. Returns the chain with stance 'allowed' and, when a
 * clean prophylactic move exists, the avoidance SAN. The cause node is the
 * student's own move (their colour), so it reads "your move left it".
 */
export function findAllowedChain(historySans: readonly string[], studentMovePly: number, studentColor: Color): CausalChain | null {
  if (studentMovePly < 1 || studentMovePly > historySans.length) return null;
  const opponent = other(studentColor);
  // Cheap gate: after the student's move, does a student piece hang? If nothing
  // is winnable, the opponent has no chain to allow → skip the lookahead.
  const posAfter = replay(historySans, studentMovePly);
  if (!posAfter || !hasWinnablePiece(posAfter.chess, studentColor)) return null;
  const avail = chainAvailableFor(historySans, studentMovePly, opponent);
  if (!avail) return null;
  // Avoidance — a legal student move (instead of the one played) after which the
  // chain's target is no longer winnable by the opponent, and that doesn't itself
  // hang a piece. Cheap: a single apply + SEE per candidate (no chain rebuild),
  // and we don't re-run the full lookahead. The target square comes from the
  // chain itself.
  let avoidance: string | undefined;
  const targetSq = chainTargetSquare(avail.chain);
  const posBefore = replay(historySans, studentMovePly - 1);
  if (targetSq && posBefore && posBefore.chess.turn() === studentColor) {
    let moves: Move[] = [];
    try { moves = posBefore.chess.moves({ verbose: true }); } catch { moves = []; }
    const played = historySans[studentMovePly - 1].replace(/[?!]+$/, '');
    for (const m of moves) {
      if (m.san.replace(/[?!]+$/, '') === played) continue;   // the move they actually played
      const c = new Chess(posBefore.chess.fen());
      try { if (!c.move({ from: m.from, to: m.to, promotion: m.promotion })) continue; } catch { continue; }
      if (seeGain(c, m.to) > 0) continue;                     // don't suggest a move that hangs
      if (seeGain(c, targetSq) > 0) continue;                 // the target is still winnable → not an avoidance
      avoidance = m.san;
      break;
    }
  }
  return { ...avail.chain, stance: 'allowed', ...(avoidance ? { avoidance } : {}) };
}

// ─── consumer helpers ───────────────────────────────────────────────────────

/** Every lead-the-eye arrow across the chain, deduped, for ONE board frame (the
 *  focus position — where all the chain's pieces stand). Feeds the review
 *  segment's planArrows / a lesson beat's arrows. */
export function causalChainArrows(chain: CausalChain): CausalArrow[] {
  const seen = new Set<string>();
  const out: CausalArrow[] = [];
  for (const n of chain.nodes) for (const a of n.arrows) {
    const k = `${a.from}-${a.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

const HL_PRIORITY: Record<MarkerColor, number> = { red: 3, yellow: 2, green: 1, blue: 0 };
/** Every key-square highlight across the chain, deduped — the highest-priority
 *  colour wins per square (red danger beats a yellow key square beats blue
 *  context), so the loose target reads red even where an earlier node marked it. */
export function causalChainHighlights(chain: CausalChain): CausalHighlight[] {
  const best = new Map<Square, MarkerColor>();
  for (const n of chain.nodes) for (const h of n.highlights) {
    const cur = best.get(h.square);
    if (!cur || HL_PRIORITY[h.color] > HL_PRIORITY[cur]) best.set(h.square, h.color);
  }
  return [...best.entries()].map(([square, color]) => ({ square, color }));
}

/** The misconception buckets the STUDENT's cause-nodes file under — the drill
 *  spine feed so a chained mistake becomes a My-Mistakes drill (David 2026-09-07:
 *  "relate them back… feed the fundamentals"). Empty when the student is the
 *  beneficiary (their own tactic isn't a mistake). Deduped, cause-nodes only. */
export function causalChainMistakeTags(chain: CausalChain, studentColor: Color): MisconceptionTagId[] {
  const out = new Set<MisconceptionTagId>();
  for (const n of chain.nodes) {
    if (n.color === studentColor && n.tag) out.add(n.tag);
  }
  return [...out];
}
