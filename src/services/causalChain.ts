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
 * only VOICES the chain (causalChainVoice.ts); it never decides an edge. The
 * guards and attacks it reads are the RELATION SNAPSHOT's (`relations.ts`,
 * WO-STORY-MATRIX-01 P1-7), over the game's own boards — never a replay.
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
import { legalSeeGainFor, standsSafe } from './positionReadingService';
import { developedMinorCount, homeMinorCount } from './development';
import { diff, snapshot, type RelationKind, type RelationSnapshot } from './relations';

/** Pin/legality-aware "is the piece on `square` winnable by its enemy?" — the
 *  exact semantics `seeGain` had here (net material the side NOT owning the piece
 *  wins by initiating a capture), but driven off LEGAL captures so a PINNED
 *  attacker or defender is never counted. causalChain rode the pin-blind `seeGain`
 *  at every SEE site (deep-dive C#5): a piece guarded only by a pinned defender
 *  read as "safe" and a real cause→effect chain went unbuilt, while a pinned
 *  would-be capturer could invent one. `>0` ⇒ effectively hanging. */
function winnableGain(chess: Chess, square: Square): number {
  const owner = chess.get(square)?.color;
  if (!owner) return 0;
  return legalSeeGainFor(chess.fen(), square, owner === 'w' ? 'b' : 'w');
}

/** Nothing wins the piece on `square`, as a STANDING fact (never a check
 *  that blocks the capture for one move). */
function safeOn(chess: Chess, square: Square): boolean {
  const owner = chess.get(square)?.color;
  if (!owner) return true;
  return standsSafe(chess.fen(), square, owner === 'w' ? 'b' : 'w');
}

// ─── types ──────────────────────────────────────────────────────────────────

/** Board-marker colours the app's parseBoardTags accepts. green = a vision /
 *  attack sight-line, yellow = a key square the narration names, red = the loose
 *  target / danger, blue = context (where a piece actually is). */
type MarkerColor = 'green' | 'yellow' | 'red' | 'blue';
export interface CausalArrow { from: Square; to: Square; color: MarkerColor; }
export interface CausalHighlight { square: Square; color: MarkerColor; }

/** What an edge links by. A board relation is named in the relation
 *  snapshot's one vocabulary (`RelationKind`, `relations.ts` — WO-STORY-MATRIX-01
 *  P1-7, 2026-10-30): 'guard' is the guard the cause took away (or, in the
 *  premature-queen pattern, the guard the displaced knight would hold). Two
 *  links are not board relations and keep their own labels. The old
 *  'removes-defender' is 'guard'; 'leaves-loose' was never emitted. */
type CausalRelation =
  | RelationKind
  /** A occupies the natural developing square another friendly piece needed. */
  | 'occupies-developing-square'
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

interface CausalChainInput {
  /** Every SAN of the game up to AND INCLUDING the focus move. */
  historySans: readonly string[];
  /** 1-based ply to explain. Default = the last move in historySans. */
  focusPly?: number;
}

// ─── helpers (pure chess.js) ────────────────────────────────────────────────

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

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
function fullmoveOf(chess: Chess): number { return Number.parseInt(chess.fen().split(' ')[5] ?? '1', 10) || 1; }

/** Cheap gate (no replay): does `victimSide` have a piece (≥ minor) that can be
 *  profitably captured RIGHT NOW? Used to skip the expensive both-ways lookahead
 *  on the ~95% of positions where nothing hangs. */
function hasWinnablePiece(chess: Chess, victimSide: Color): boolean {
  for (const p of pieces(chess, victimSide)) {
    if (p.type === 'k' || VAL[p.type] < 3) continue;
    try { if (winnableGain(chess, p.square) >= 2) return true; } catch { /* skip */ }
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
    if (m.from === s && m.piece === victimType && safeOn(c, m.to)) return true;
    // (b) the victim stayed on s and is no longer winnable (defended / attacker gone)
    const p = c.get(s);
    if (p && p.color === enemy && p.type === victimType && safeOn(c, s)) return true;
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

// ─── the game's boards, once ────────────────────────────────────────────────

/** THE GAME'S BOARDS, built once and extended, never replayed (WO-STORY-MATRIX-01
 *  P1-7, 2026-10-30). Every call here used to replay the game from move one —
 *  three times a pattern, and once per earlier ply to find when a piece arrived
 *  (O(n²)) — while Review asks for a chain at every ply three times over. */
interface GameBoards {
  /** fens[i] = the board after i plies; fens[0] is the start. */
  fens: readonly string[];
  /** moves[i] = ply i + 1. Stops at the first move that is not legal. */
  moves: readonly Move[];
}

const BOARDS_MEMO_MAX = 32;
const boardsMemo = new Map<string, GameBoards>();

function cleanSan(san: string): string { return san.replace(/[?!]+$/, ''); }

/** The boards of `historySans`, extended from the longest prefix already built
 *  (Review walks a game ply by ply, so each call adds one move). */
function boardsFor(historySans: readonly string[]): GameBoards {
  const key = historySans.join(' ');
  const hit = boardsMemo.get(key);
  if (hit) {
    // Least recently used goes first: Review asks for the whole game every
    // ply, between the growing prefixes.
    boardsMemo.delete(key);
    boardsMemo.set(key, hit);
    return hit;
  }
  let base: GameBoards = { fens: [new Chess().fen()], moves: [] };
  let baseLen = 0;
  for (const [k, v] of boardsMemo) {
    const len = k === '' ? 0 : k.split(' ').length;
    if (len <= baseLen || len > historySans.length || v.moves.length < len) continue;
    if (k === '' || key === k || key.startsWith(`${k} `)) { base = v; baseLen = len; }
  }
  const fens = [...base.fens];
  const moves = [...base.moves];
  const chess = new Chess(fens[fens.length - 1]);
  for (let i = baseLen; i < historySans.length; i++) {
    let m: Move | null = null;
    try { m = chess.move(cleanSan(historySans[i])); } catch { m = null; }
    if (!m) break;
    moves.push(m);
    fens.push(chess.fen());
  }
  const out: GameBoards = { fens, moves };
  if (boardsMemo.size >= BOARDS_MEMO_MAX) {
    const oldest = boardsMemo.keys().next().value;
    if (oldest !== undefined) boardsMemo.delete(oldest);
  }
  boardsMemo.set(key, out);
  return out;
}

/** The boards of the first `plies` moves, plus one more move — a hypothetical
 *  focus for the both-ways lookahead, without touching the memo. */
function boardsWith(g: GameBoards, plies: number, m: Move, fenAfter: string): GameBoards {
  return { fens: [...g.fens.slice(0, plies + 1), fenAfter], moves: [...g.moves.slice(0, plies), m] };
}

// ─── relation reads (the snapshot, `relations.ts`) ──────────────────────────

/** `color`'s pieces attacking the piece on `sq` on this board, `attackers()` order. */
function attackersOn(s: RelationSnapshot, sq: Square, color: Color): Square[] {
  return s.relations.filter((r) => r.kind === 'attack' && r.square === sq && r.byPiece[0] === color).map((r) => (r as { by: Square }).by);
}

/** How many of `mover`'s pieces attack `sq` and how many of the owner's pieces
 *  REALLY guard it — a guard pinned off the square cannot recapture, so it is
 *  not counted (`guard-pinned`) — the counts behind "won", so the sentence says
 *  them instead of assuming the guards were zero (review 2026-10-19,
 *  chesscom-1040709576: "nothing left guarding" a bishop the queen on d1 still
 *  guarded). */
function guardCount(s: RelationSnapshot, sq: Square, mover: Color): { attackers: number; guards: number } {
  return {
    attackers: attackersOn(s, sq, mover).length,
    guards: s.relations.filter((r) => r.kind === 'guard' && r.square === sq).length,
  };
}

// ─── relation detectors (each board-proven) ─────────────────────────────────

/** The focus move newly attacks an enemy piece (≥3 pts) that is now LOOSE
 *  (no defender). "Newly" = it was not attacked by the mover before the move, so
 *  THIS move created the attack. Returns the target + whether the moved piece is
 *  one of the attackers. Null when no such loose target. */
function exploitedLoosePiece(before: RelationSnapshot, after: RelationSnapshot, afterBoard: Chess, focus: Move): { target: Square; type: PieceSymbol; movedPieceAttacks: boolean } | null {
  const mover = focus.color;
  const enemy = other(mover);
  let best: { target: Square; type: PieceSymbol; movedPieceAttacks: boolean } | null = null;
  for (const p of pieces(afterBoard, enemy)) {
    if (p.type === 'k' || VAL[p.type] < 3) continue;
    const attackersNow = attackersOn(after, p.square, mover);
    if (attackersNow.length === 0) continue;
    // Pin-aware "loose": the mover wins the FULL piece — i.e. there is no REAL,
    // unpinned recapturer. A geometric guard count read a defender pinned to its
    // own king as a live guard, so a genuinely loose piece read as defended and
    // the chain went unbuilt (deep-dive C#5). winnableGain drives off legal
    // captures, so a pinned defender no longer masks the win (and a pinned
    // would-be recapturer can't inflate the count).
    if (winnableGain(afterBoard, p.square) < VAL[p.type]) continue;
    // The move didn't create the attack when the mover already attacked it.
    if (attackersOn(before, p.square, mover).length > 0) continue;
    const cand = { target: p.square, type: p.type, movedPieceAttacks: attackersNow.includes(focus.to) };
    if (!best || VAL[p.type] > VAL[best.type]) best = cand;
  }
  return best;
}

/** The focus move VACATED its from-square, unveiling a friendly line-piece's
 *  attack on `target` (a discovery). PROOF: a mover bishop/rook/queen attacks
 *  target AFTER the move but did NOT before, and the from-square lies on that
 *  piece's ray to the target — the attack relation the move gained, read off the
 *  two snapshots. Returns the unveiled attacker's square, or null. Minor-piece
 *  TARGETS are allowed here (the live tactic detector excludes them; this
 *  cross-move detector must not — gap #1). */
function discoveryUnveiled(before: RelationSnapshot, after: RelationSnapshot, focus: Move, target: Square): Square | null {
  const beforeAttackers = new Set(attackersOn(before, target, focus.color));
  for (const r of after.relations) {
    if (r.kind !== 'attack' || r.square !== target || r.byPiece[0] !== focus.color) continue;
    if (r.by === focus.to) continue;                     // that's the moved piece, not the unveiled one
    if (beforeAttackers.has(r.by)) continue;             // was already attacking → not unveiled
    if (r.byPiece[1] !== 'b' && r.byPiece[1] !== 'r' && r.byPiece[1] !== 'q') continue;
    // The from-square must lie between the unveiled piece and the target (the
    // focus piece was the shutter).
    if (onSegment(r.by, focus.from, target)) return r.by;
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
function missingNaturalDefender(after: Chess, afterSnap: RelationSnapshot, target: Square, targetColor: Color):
  { idealSquare: Square; blocker: PieceSymbol; blockerSquare: Square; knightSquare: Square } | null {
  const hitting = knightSquaresHitting(target);
  const natural = KNIGHT_NATURAL[targetColor];
  const knights = pieces(after, targetColor, 'n');
  if (knights.length === 0) return null;
  // A knight of targetColor already covering target → nothing missing.
  if (afterSnap.relations.some((r) => (r.kind === 'guard' || r.kind === 'guard-pinned') && r.square === target && r.byPiece === `${targetColor}n`)) return null;
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
 *  board right before it (for premature testing). Null when never. Read off the
 *  game's own moves — this walked back replaying the game once per ply. */
function plyPieceArrived(g: GameBoards, color: Color, square: Square, before: number):
  { ply: number; move: Move; boardBefore: Chess } | null {
  for (let i = Math.min(before, g.moves.length) - 1; i >= 0; i--) {
    const m = g.moves[i];
    if (m.color === color && m.to === square) return { ply: i + 1, move: m, boardBefore: new Chess(g.fens[i]) };
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
  if (developedMinorCount(boardBefore, move.color) >= 3) return false;
  if (homeMinorCount(boardBefore, move.color) < 2) return false;
  return true;
}

// ─── the builders (one per board-proven pattern) ────────────────────────────

/**
 * PATTERN 1 — premature queen → displaced knight → loose piece → DISCOVERED
 * attack. The airtight case from David's game. Returns null unless every link is
 * board-proven (silent-on-unprovable).
 */
function buildPrematureQueenDiscoveryChain(g: GameBoards, focusPly: number): CausalChain | null {
  if (focusPly < 1 || focusPly > g.moves.length) return null;
  const beforeSnap = snapshot(g.fens[focusPly - 1]);
  const afterSnap = snapshot(g.fens[focusPly]);
  if (!beforeSnap || !afterSnap) return null;
  const after = new Chess(g.fens[focusPly]);
  const focus = g.moves[focusPly - 1];
  const mover = focus.color;
  const enemy = other(mover);

  // 1. The tactic: did this move win/attack a LOOSE enemy piece it wasn't
  //    attacking before?
  const loose = exploitedLoosePiece(beforeSnap, afterSnap, after, focus);
  if (!loose) return null;

  // 🔒 REQUIRE A GENUINE DISCOVERED ATTACK. A single attacker on an undefended
  // piece is often just a KICK the piece escapes (…h6 hits Bg5, the bishop simply
  // retreats — not "won"). The airtight, can't-escape pattern is the discovered
  // DOUBLE attack: the moved piece AND an unveiled piece both bear on the target,
  // so it cannot dodge both. No unveiled second attacker → not a won piece →
  // silence (David 2026-09-07: "don't overstate the why"; a kicked piece is not
  // a dropped piece).
  const unveiler = discoveryUnveiled(beforeSnap, afterSnap, focus, loose.target);
  if (!unveiler) return null;

  // An arrow only when its `from` really holds a piece on the focus board.
  const arrowIf = (from: Square, to: Square, color: MarkerColor): CausalArrow[] =>
    after.get(from) ? [{ from, to, color }] : [];

  // Terminal node — the tactic that collected the loose piece. The attack arrows
  // lead the eye: the unveiled piece and the moved piece both bearing on the
  // loose target (the discovered double attack), the target itself in red. No
  // fundamental/tag — this is the beneficiary's WINNING move, not a mistake.
  const tacticNode: CausalNode = {
    kind: 'discovered-attack', ply: focusPly, color: mover,
    squares: [focus.from, focus.to, unveiler, loose.target],
    data: { move: focus.san, unveiler, target: loose.target, targetPiece: PIECE_NOUN[loose.type], from: focus.from, to: focus.to },
    fundamentalId: null,
    arrows: [...arrowIf(unveiler, loose.target, 'green'), ...arrowIf(focus.to, loose.target, 'green')],
    highlights: [{ square: loose.target, color: 'red' }],
  };

  // 2. WHY was the target loose? A missing natural defender (displaced by a
  //    friendly piece squatting on its square).
  const missing = missingNaturalDefender(after, afterSnap, loose.target, enemy);

  if (!missing) {
    // No provable cross-move cause. A bare "you won a loose piece" is not a
    // chain — leave it to the flat list (silent on unprovable).
    return null;
  }

  // The loose-piece node — the target in red, with a green arrow from every
  // attacker bearing on it (board-true: the attack relations of the focus board).
  const looseNode: CausalNode = {
    kind: 'loose-piece', ply: null, color: enemy,
    squares: [loose.target],
    data: { square: loose.target, piece: PIECE_NOUN[loose.type] },
    fundamentalId: 'loose-piece',
    tag: 'hung-material',
    arrows: attackersOn(afterSnap, loose.target, mover).map((sq) => ({ from: sq, to: loose.target, color: 'green' as const })),
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
  const arrival = plyPieceArrived(g, enemy, missing.idealSquare, focusPly);
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
  // displaced-defender → loose-piece: the GUARD the knight would hold
  // (board-proven counterfactual).
  nodes.push(displacedNode);
  edges.push({
    relation: 'guard',
    proof: `a knight on ${missing.idealSquare} defends ${loose.target}; the knight on ${missing.knightSquare} does not`,
  });
  // loose-piece → tactic (enables-tactic).
  nodes.push(looseNode);
  edges.push({
    relation: 'enables-tactic',
    proof: `${focus.san} unveils ${unveiler}'s attack on the loose ${PIECE_NOUN[loose.type]} on ${loose.target}`,
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
function buildRemovedDefenderChain(g: GameBoards, focusPly: number): CausalChain | null {
  if (focusPly < 3 || focusPly > g.moves.length) return null; // need an opponent move before

  const afterBoard = new Chess(g.fens[focusPly]);
  const beforeBoard = new Chess(g.fens[focusPly - 1]);   // after the opponent's move, before focus
  const prevBoard = new Chess(g.fens[focusPly - 2]);     // before the opponent's move
  const focus = g.moves[focusPly - 1];
  const oppMove = g.moves[focusPly - 2];
  const mover = focus.color;
  const enemy = other(mover);
  if (oppMove.color !== enemy) return null;

  // The focus move CAPTURES a real piece (≥ minor) that is winnable — a genuine
  // material grab, not an equal trade.
  if (!focus.captured) return null;
  const s = focus.to;
  const victimType = beforeBoard.get(s)?.type;
  if (!victimType || victimType === 'k' || VAL[victimType] < 3) return null;
  if (winnableGain(beforeBoard, s) < 2) return null;   // capturing it wins material NOW
  // …and the capturer SITS SAFELY afterwards — else it's a trade in a flurry, not
  // a won piece (the single-square SEE win must survive the recapture).
  if (!safeOn(afterBoard, s)) return null;

  // It was SAFE before the opponent's move: the SAME enemy piece stood on s and
  // was not winnable then. (Excludes recaptures — if the opponent had just
  // captured on s, prev's s held a MOVER piece, not this enemy victim.)
  const prevPiece = prevBoard.get(s);
  if (!prevPiece || prevPiece.color !== enemy || prevPiece.type !== victimType) return null;
  if (winnableGain(prevBoard, s) > 0) return null;     // already hanging before → not the opponent's doing

  // The opponent's move took one of s's REAL guards away: a `guard` relation on
  // s held by the piece on the move's from-square before, and gone after (the
  // snapshot diff). A pinned "guard" is a `guard-pinned` relation, so it never
  // counts — moving a piece that could not recapture is not what left s loose.
  const prevSnap = snapshot(g.fens[focusPly - 2]);
  const beforeSnap = snapshot(g.fens[focusPly - 1]);
  if (!prevSnap || !beforeSnap) return null;
  const guardLost = diff(prevSnap, beforeSnap).lost.find((r) => r.kind === 'guard' && r.square === s && r.by === oppMove.from);
  if (!guardLost || guardLost.kind !== 'guard') return null;
  const guardType = guardLost.byPiece[1];

  // 🔒 IT MUST HAVE BEEN A CHOICE, NOT A FORCED MOVE (David 2026-09-07). The true
  // counterfactual — the same discipline principleAttribution uses: was there a
  // legal move that would have kept the piece safe? If yes, abandoning the guard
  // was a real decision → the lesson stands. If NO move saved it, the loss was
  // unavoidable and blaming this move overstates the why → silence. This is
  // stronger than a crude "was in check" proxy (an in-check player with a saving
  // block still made a choice; a player whose only legal move drops it did not).
  if (!targetWasSavable(prevBoard, s, enemy, victimType)) return null;

  const counts = guardCount(beforeSnap, s, mover);
  const causeNode: CausalNode = {
    kind: 'defender-removed', ply: focusPly - 1, color: enemy,
    squares: [oppMove.from, s],
    data: { move: oppMove.san, guardPiece: PIECE_NOUN[guardType], from: oppMove.from, target: s, targetPiece: PIECE_NOUN[victimType], ...counts },
    fundamentalId: 'loose-piece',
    tag: 'hung-material',
    arrows: [],
    highlights: [{ square: oppMove.from, color: 'yellow' }, { square: s, color: 'red' }],
  };
  const tacticNode: CausalNode = {
    kind: 'won-loose-piece', ply: focusPly, color: mover,
    squares: [focus.to, s],
    data: { move: focus.san, target: s, targetPiece: PIECE_NOUN[victimType], to: focus.to, ...counts },
    fundamentalId: null,
    arrows: [],
    highlights: [{ square: s, color: 'red' }],
  };
  return {
    nodes: [causeNode, tacticNode],
    edges: [{ relation: 'guard', proof: `${oppMove.san} moved the ${PIECE_NOUN[guardType]} off ${oppMove.from}; it was defending ${s}, now winnable (SEE ${winnableGain(beforeBoard, s)})` }],
    beneficiary: mover,
    focusPly,
    stance: 'played',
  };
}

/** Both patterns, in priority order, on the game's boards. */
function chainOn(g: GameBoards, focusPly: number): CausalChain | null {
  return buildPrematureQueenDiscoveryChain(g, focusPly)
    ?? buildRemovedDefenderChain(g, focusPly);
}

/**
 * The public entry — try each board-proven pattern in priority order, return the
 * first that fires. Silent (null) when none does; the flat ranked list stands.
 * David 2026-09-07: "moves do not exist in isolation" — the library grows one
 * board-proven, game-validated pattern at a time.
 */
export function buildCausalChain(input: CausalChainInput): CausalChain | null {
  const focusPly = input.focusPly ?? input.historySans.length;
  if (focusPly < 1 || focusPly > input.historySans.length) return null;
  return chainOn(boardsFor(input.historySans), focusPly);
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
function chainAvailableFor(g: GameBoards, plyBefore: number, side: Color): { chain: CausalChain; moveSan: string } | null {
  if (plyBefore > g.moves.length) return null;
  const board = new Chess(g.fens[plyBefore]);
  if (board.turn() !== side) return null;
  let moves: Move[];
  try { moves = board.moves({ verbose: true }); } catch { return null; }
  for (const m of moves) {
    if (!m.captured) continue;                 // the tactic move is always a capture
    // Only a capture of a genuinely WINNABLE piece can be a chain tactic — this
    // prunes the candidate set to ~1-2 (the hot-path optimisation that keeps the
    // both-ways lookahead cheap enough to run per move).
    let gain = 0; try { gain = winnableGain(board, m.to); } catch { gain = 0; }
    if (gain < 2) continue;
    const next = new Chess(g.fens[plyBefore]);
    let played: Move | null = null;
    try { played = next.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { played = null; }
    if (!played) continue;
    const chain = chainOn(boardsWith(g, plyBefore, played, next.fen()), plyBefore + 1);
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
  const g = boardsFor(historySans);
  if (studentMovePly - 1 > g.moves.length) return null;
  const before = new Chess(g.fens[studentMovePly - 1]);
  if (before.turn() !== studentColor) return null;   // must be the student's move
  // Cheap gate: no enemy piece hangs → no missed win to find. Skips the lookahead.
  if (!hasWinnablePiece(before, other(studentColor))) return null;
  const avail = chainAvailableFor(g, studentMovePly - 1, studentColor);
  if (!avail) return null;
  const actualRaw = historySans[studentMovePly - 1];
  const actual = cleanSan(actualRaw);
  if (cleanSan(avail.moveSan) === actual) return null;     // they DID play it → 'played', not missed
  // Don't call it a "miss" when the student played a CHECK — that is their own
  // forcing plan (often a mating attack), not an oversight (David 2026-09-07:
  // "don't overstate the why"). A quiet or equal-trade move that let a free win
  // slip is a genuine miss; a check is not second-guessed.
  if (/[+#]/.test(actual)) return null;
  // Nor when the move played took at least as much as the "missed" win — a
  // recaptured queen is not a miss for a loose knight (review walk 2026-10-01:
  // "You could have won their knight on d3 with Bxd3 … You played Rxa4", where
  // Rxa4 took back a queen).
  const tsq = chainTargetSquare(avail.chain);
  const target = tsq ? before.get(tsq) : null;
  let tookValue = 0;
  try { const mv = new Chess(before.fen()).move(actual); if (mv?.captured) tookValue = VAL[mv.captured] ?? 0; } catch { tookValue = 0; }
  if (target && tookValue >= (VAL[target.type] ?? 0)) return null;
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
  const g = boardsFor(historySans);
  if (studentMovePly > g.moves.length) return null;
  // Cheap gate: after the student's move, does a student piece hang? If nothing
  // is winnable, the opponent has no chain to allow → skip the lookahead.
  if (!hasWinnablePiece(new Chess(g.fens[studentMovePly]), studentColor)) return null;
  const avail = chainAvailableFor(g, studentMovePly, opponent);
  if (!avail) return null;
  // Avoidance — a legal student move (instead of the one played) after which the
  // chain's target is no longer winnable by the opponent, and that doesn't itself
  // hang a piece. Cheap: a single apply + SEE per candidate (no chain rebuild),
  // and we don't re-run the full lookahead. The target square comes from the
  // chain itself.
  let avoidance: string | undefined;
  const targetSq = chainTargetSquare(avail.chain);
  const posBefore = new Chess(g.fens[studentMovePly - 1]);
  if (targetSq && posBefore.turn() === studentColor) {
    let moves: Move[] = [];
    try { moves = posBefore.moves({ verbose: true }); } catch { moves = []; }
    const played = cleanSan(historySans[studentMovePly - 1]);
    for (const m of moves) {
      if (cleanSan(m.san) === played) continue;   // the move they actually played
      const c = new Chess(posBefore.fen());
      try { if (!c.move({ from: m.from, to: m.to, promotion: m.promotion })) continue; } catch { continue; }
      if (!safeOn(c, m.to)) continue;                     // don't suggest a move that hangs
      if (!safeOn(c, targetSq)) continue;                 // the target is still winnable → not an avoidance
      avoidance = m.san;
      break;
    }
  }
  return { ...avail.chain, stance: 'allowed', ...(avoidance ? { avoidance } : {}) };
}

// ─── consumer helpers ───────────────────────────────────────────────────────

/** THE CHAIN'S CLAIM — one key for "this cross-move story was said", the same
 *  on every surface (WO-STORY-MATRIX-01 P1-8c): its stance and each node's kind
 *  and squares. Learn keyed its chain line by the highlighted squares and
 *  Review by this signature in a set of its own, so the game's story could not
 *  tell that the two had said the same chain. */
export function causalChainKey(chain: CausalChain): string {
  return `cause:${chain.stance}:${chain.nodes.map((n) => `${n.kind}${n.squares.join('')}`).join('|')}`;
}

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
