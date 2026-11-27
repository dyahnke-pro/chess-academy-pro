// attackReads — THREE ATTACK QUESTIONS A STRONG PLAYER ASKS (computers work
// list 5, "attack and mate", David's Coach Build Board).
//
// The siege count (`kingSiege`) says how many pieces aim at a king and how
// many defend it; the mate reads say a mate once it is forced; the lever reads
// say what a mate threat wins. Three questions sat between them, unread:
//
//   checkCensus     — THE MATING-SQUARE CENSUS: every check the attacker has,
//                     played, and every reply read. When each check leaves the
//                     king the same single square and nothing else (no block,
//                     no capture), that one square is all that stands between
//                     the checks and mate. Exact: with the king's one move
//                     taken away, a side in check with no legal move is mated.
//   attackLeader    — WHICH PIECE LEADS: in the engine's best line for the
//                     side ahead, the first piece that comes to bear on the
//                     enemy king and the different piece that follows it, with
//                     the board's own why for the order (the leader comes with
//                     check, covers the follower's square, or clears its path).
//   defenderArrival — DOES THE DEFENDER ARRIVE IN TIME: the engine's line mates
//                     in N moves, and every piece of the defender not already
//                     guarding the king needs N moves or more to get there
//                     (counted on the board, `kingSiege.away`) — it arrives too
//                     late, and the mate line proves it.
//
// All three are pure: chess.js, the siege count and the engine's own line
// (G0). They return data; the words are the renderer's (`teachingSentence`).
// Both seats.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { type EngineLine, lineScore, playLine, sortedLines, other } from './engineLineRead';
import { sideToMoveAs } from './threatOut';
import { kingSiege, type SiegePiece } from './kingSiege';
import { MATERIAL_VALUE, materialBalance } from './pieceValues';
import { stemKeyOf } from '../utils/rotateStem';
import { renderCheckCensus, renderAttackLeader, renderDefenderArrival } from './teachingSentence';

// ── THE MATING-SQUARE CENSUS ────────────────────────────────────────────────

export interface CheckCensus {
  /** The side giving the checks. */
  attacker: Color;
  king: Square;
  /** The one square every check leaves the king. */
  flight: Square;
  /** Every check the attacker has (SAN), on the board `fen` read. */
  checks: string[];
  /** The board the checks are read on (the attacker to move). */
  fen: string;
  /** One check and the king's one answer: the census, played. */
  line: string[];
  text: string;
  squares: Square[];
}

/** The fewest checks a census needs: one check with one answer is a check,
 *  not a census. */
const CENSUS_MIN_CHECKS = 2;

/** The census for `attacker` on `board` (attacker to move), or null. */
function censusFor(board: string, attacker: Color): Omit<CheckCensus, 'text'> | null {
  let c: Chess;
  try { c = new Chess(board); } catch { return null; }
  if (c.turn() !== attacker) return null;
  const king = c.findPiece({ type: 'k', color: other(attacker) })[0] as Square | undefined;
  if (!king) return null;
  const checks = c.moves({ verbose: true }).filter((m) => m.san.includes('+') || m.san.includes('#'));
  // A check that mates is the mate's own lesson.
  if (checks.length < CENSUS_MIN_CHECKS || checks.some((m) => m.san.includes('#'))) return null;
  // A promotion with check is counted once (the four pieces are one square).
  const seen = new Set<string>();
  const distinct: Move[] = [];
  for (const m of checks) {
    const k = `${m.from}${m.to}`;
    if (seen.has(k)) continue;
    seen.add(k); distinct.push(m);
  }
  if (distinct.length < CENSUS_MIN_CHECKS) return null;
  let flight: Square | null = null;
  let line: string[] = [];
  for (const m of distinct) {
    const a = new Chess(board);
    a.move(m);
    const replies = a.moves({ verbose: true });
    // A block or a capture answers the check another way: no census.
    if (replies.length === 0 || replies.some((r) => r.piece !== 'k' || r.captured)) return null;
    for (const r of replies) {
      if (flight === null) { flight = r.to; line = [m.san, r.san]; } else if (r.to !== flight) return null;
    }
  }
  if (!flight) return null;
  return { attacker, king, flight, checks: distinct.map((m) => m.san), fen: board, line, squares: [king, flight, ...new Set(distinct.map((m) => m.from))] };
}

/** THE CENSUS, both seats: the side to move's checks on the board, the other
 *  side's handed the move. With the engine's lines, a mate the attacker has
 *  within three moves is the mate's lesson, not this one. */
export function checkCensus(fen: string, lines: readonly EngineLine[] | null, student: Color): CheckCensus | null {
  let toMove: Color;
  try { toMove = new Chess(fen).turn(); } catch { return null; }
  for (const attacker of [toMove, other(toMove)]) {
    const board = attacker === toMove ? fen : sideToMoveAs(fen, attacker);
    if (!board) continue;
    const r = censusFor(board, attacker);
    if (!r) continue;
    if (attacker === toMove && lines?.some((l) => l.mate != null && (attacker === 'w' ? l.mate > 0 : l.mate < 0) && Math.abs(l.mate) <= 3)) continue;
    const text = renderCheckCensus({ mine: attacker === student, king: r.king, flight: r.flight, checks: r.checks.length, stem: stemKeyOf(`${fen}|census`) });
    return { ...r, text };
  }
  return null;
}

// ── WHICH PIECE LEADS ───────────────────────────────────────────────────────

export interface AttackStep { piece: PieceSymbol; from: Square; to: Square; san: string; ply: number }

export interface AttackLeader {
  /** The attacking side (the side to move). */
  side: Color;
  king: Square;
  leader: AttackStep;
  follower: AttackStep;
  /** The board's why for the order, every one true on the line. */
  why: { check: boolean; covers: boolean; clears: boolean };
  /** The line from the board through the follower's move (SAN). */
  line: string[];
  text: string;
  squares: Square[];
}

/** The side ahead by this much (cp) attacks; level boards are a plan's
 *  question, not an attack's. */
const LEAD_CP = 150;
/** The leader is the side's first move; the follower comes by its third.
 *  Later than that, the line is a plan, not an attack. */
const LEAD_BY_MOVE = 1;
const FOLLOW_BY_MOVE = 3;

const PIECES: readonly PieceSymbol[] = ['n', 'b', 'r', 'q'];

/** The squares a slider passes between `from` and `to` (none for a knight). */
function between(from: Square, to: Square): Square[] {
  const df = Math.sign(to.charCodeAt(0) - from.charCodeAt(0));
  const dr = Math.sign(Number(to[1]) - Number(from[1]));
  const ddf = Math.abs(to.charCodeAt(0) - from.charCodeAt(0));
  const ddr = Math.abs(Number(to[1]) - Number(from[1]));
  if (!(ddf === 0 || ddr === 0 || ddf === ddr)) return [];
  const out: Square[] = [];
  let f = from.charCodeAt(0) + df; let r = Number(from[1]) + dr;
  while (`${String.fromCharCode(f)}${r}` !== to) {
    out.push(`${String.fromCharCode(f)}${r}` as Square);
    f += df; r += dr;
  }
  return out;
}

export function attackLeader(fen: string, lines: readonly EngineLine[], student: Color, namesMoves: boolean): AttackLeader | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const best = sortedLines(lines, side)[0];
  if (!best) return null;
  const scored = best.cp != null || best.mate != null;
  if (scored && lineScore(best, side) < LEAD_CP) return null;
  const { moves, boards } = playLine(fen, best.moves, FOLLOW_BY_MOVE * 2);
  // Unscored (the record's one line): the line's own end proves the edge — it
  // mates, or the side is a pawn and a half up on material by its end.
  if (!scored) {
    const whole = playLine(fen, best.moves);
    const gain = (materialBalance(whole.boards[whole.boards.length - 1]) - materialBalance(fen)) * (side === 'w' ? 1 : -1);
    if (!whole.moves.some((m) => m.san.endsWith('#')) && gain * 100 < LEAD_CP) return null;
  }
  const defender = other(side);
  const king = c.findPiece({ type: 'k', color: defender })[0] as Square | undefined;
  if (!king) return null;
  // No queen, no attack to lead (the siege count's own rule, `siegeSpeaks`).
  if (c.findPiece({ type: 'q', color: side }).length === 0) return null;
  const joins: AttackStep[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const m = moves[i];
    // A promotion is a new piece, and a capture of a piece is winning
    // material: neither is a piece coming to the king.
    if (!PIECES.includes(m.piece) || m.color !== side || m.promotion || (m.captured && m.captured !== 'p')) continue;
    const before = kingSiege(boards[i], defender);
    const after = kingSiege(boards[i + 1], defender);
    if (!before || !after) continue;
    const was = before.attackers.some((a: SiegePiece) => a.square === m.from);
    const now = after.attackers.some((a: SiegePiece) => a.square === m.to);
    if (!was && now) joins.push({ piece: m.piece, from: m.from, to: m.to, san: m.san, ply: i });
  }
  const leader = joins[0];
  if (!leader || leader.ply / 2 >= LEAD_BY_MOVE) return null;
  // The leader's square through the line: a second move of the same piece is
  // the leader again, never its follower.
  let leaderAt: Square = leader.to;
  let follower: AttackStep | null = null;
  for (let i = leader.ply + 2; i < moves.length; i += 2) {
    const m = moves[i];
    const j = joins.find((x) => x.ply === i);
    if (m.from === leaderAt) { leaderAt = m.to; continue; }
    if (j) { follower = j; break; }
  }
  if (!follower || follower.ply / 2 >= FOLLOW_BY_MOVE) return null;
  // The leader still stands when the follower comes: a piece given up first
  // is a sacrifice's lesson, not the order of an attack.
  if (moves.slice(leader.ply + 1, follower.ply).some((m, k) => (leader.ply + 1 + k) % 2 === 1 && m.to === leaderAt)) return null;
  // A piece won on the way is the material's lesson, not the attack's order.
  if (moves.slice(0, follower.ply + 1).some((m, k) => k % 2 === 0 && m.captured && m.captured !== 'p')) return null;
  // Together they make an attack: the two outnumber the king's defenders.
  const siegeThen = kingSiege(boards[follower.ply + 1], defender);
  if (!siegeThen || siegeThen.attackers.length < 2 || siegeThen.attackers.length <= siegeThen.defenders.length) return null;
  // The board's why for the order (a different kind of piece, or the order
  // is no lesson).
  if (follower.piece === leader.piece) return null;
  const check = leader.san.includes('+');
  let covers = false;
  try { covers = new Chess(boards[leader.ply + 1]).attackers(follower.to, side).includes(leaderAt); } catch { covers = false; }
  const clears = follower.piece !== 'n' && between(follower.from, follower.to).includes(leader.from);
  if (!check && !covers && !clears) return null;
  const mine = side === student;
  const names = !mine || namesMoves;
  const line = moves.slice(0, follower.ply + 1).map((m) => m.san);
  const text = renderAttackLeader({
    mine, names, leader: leader.piece, leaderSan: leader.san, follower: follower.piece, followerSan: follower.san,
    followerSquare: follower.to, check, covers, clears, stem: stemKeyOf(`${fen}|lead`),
  });
  const squares = names ? [leader.from, leader.to, follower.from, follower.to, king] : [leader.from, follower.from, king];
  return { side, king, leader, follower, why: { check, covers, clears }, line, text, squares: [...new Set(squares)] };
}

// ── DOES THE DEFENDER ARRIVE IN TIME ────────────────────────────────────────

export interface DefenderArrival {
  /** The side that mates (the side to move). */
  side: Color;
  king: Square;
  /** Moves to mate, the attacker's own. */
  mateIn: number;
  /** The defender's nearest piece not already guarding the king, and the
   *  moves it needs on this board (null: more than three). */
  nearest: SiegePiece & { moves: number | null };
  /** The mate line (SAN). */
  line: string[];
  text: string;
  squares: Square[];
}

/** A mate in one is the mate's lesson. */
const RACE_MIN = 2;
/** `kingSiege.away` counts a defender's route to three moves: a mate in four
 *  is the longest race it can prove lost (a piece past three moves needs four
 *  or more). */
const RACE_MAX = 4;

export function defenderArrival(fen: string, lines: readonly EngineLine[], student: Color): DefenderArrival | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const best = sortedLines(lines, side)[0];
  if (!best) return null;
  // A scored line that is not a mate for the side to move is no race.
  if (best.cp != null && best.mate == null) return null;
  if (best.mate != null && (side === 'w' ? best.mate <= 0 : best.mate >= 0)) return null;
  const { moves } = playLine(fen, best.moves, RACE_MAX * 2);
  const at = moves.findIndex((m) => m.san.endsWith('#'));
  if (at < 0 || at % 2 !== 0) return null;
  const mateIn = at / 2 + 1;
  if (mateIn < RACE_MIN || mateIn > RACE_MAX) return null;
  const defender = other(side);
  const s = kingSiege(fen, defender);
  if (!s || s.away.length === 0) return null;
  // The defender moves mateIn − 1 times before the mate: a piece that needs
  // mateIn moves or more cannot arrive.
  if (s.away.some((p) => p.moves !== null && p.moves < mateIn)) return null;
  const nearest = [...s.away].sort((a, b) => (a.moves ?? 99) - (b.moves ?? 99) || (MATERIAL_VALUE[b.piece] - MATERIAL_VALUE[a.piece]) || a.square.localeCompare(b.square))[0];
  const text = renderDefenderArrival({
    mine: side === student, king: s.king, piece: nearest.piece, square: nearest.square, moves: nearest.moves, mateIn, stem: stemKeyOf(`${fen}|arrival`),
  });
  return { side, king: s.king, mateIn, nearest, line: moves.slice(0, at + 1).map((m) => m.san), text, squares: [s.king, nearest.square] };
}
