// repeatingChecks — TWO FINDINGS FROM ONE SEARCH OF CHECKS (Danya's speedruns:
// "verify there is no perpetual by listing the checking squares and checking
// whether the king can run"; "windmills are often overrated: mostly they lead
// to a perpetual").
//
// 1. THE PERPETUAL. The side to move gives check, every reply of the other king
//    allows another check, and the checks come back to a position already on
//    the board: a draw the defender cannot avoid. A bounded AND-OR search over
//    checking moves only (every defender reply is read, so a block, a capture
//    or a king run that escapes the checks breaks it).
// 2. THE WINDMILL. One piece gives check, steps out with a discovered check
//    from the piece behind it and takes something, steps back with check, and
//    takes again: at least two captures the defender cannot avoid.
//
// PURE: chess.js and the engine reads the surface hands in (the score of the
// board, to stay quiet where the side with the checks is winning anyway).
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';
import { seatCp } from './winChance';
import { andList } from '../utils/andList';
import type { ReplyLine } from './bothSaved';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;
const VALUE: Readonly<Record<PieceSymbol, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** The perpetual: up to this many checks in a row (8 plies, the brief). */
const MAX_CHECKS = 4;
/** The windmill: up to this many moves of the windmill piece. */
const MAX_SAILS = 4;
/** Work the search may do before it gives up and says nothing (unknown is
 *  silence, never a guess). */
const NODE_BUDGET = 5_000;
/** The side with the checks is winning by this much (cp, its seat) on the
 *  engine's read: the draw is not its idea, so the perpetual is not said. */
const WINNING_ANYWAY_CP = 300;
/** Down this much material (pawn units): the perpetual saves the game. */
const SAVES_DOWN = 3;


export interface Perpetual {
  /** The side giving the checks. */
  side: Color;
  /** The checking moves of the line found, SAN, up to the repeat. */
  checks: string[];
  /** The line found, UCI, from the board read: checks and replies. */
  line: string[];
  /** The checking piece(s) and the squares they check from, in order. */
  from: { piece: PieceSymbol; square: Square }[];
  /** The defending king's square on the board read. */
  king: Square;
  /** The checking side is down this much material (pawn units, ≥ 0). */
  down: number;
  key: string;
}

export interface Windmill {
  side: Color;
  /** The piece that turns the sails, where it starts. */
  sail: { piece: PieceSymbol; square: Square };
  /** The piece behind it that gives the discovered checks. */
  axle: { piece: PieceSymbol; square: Square };
  /** What it takes along the line the defender cannot avoid. */
  takes: { piece: PieceSymbol; square: Square }[];
  line: string[];
  key: string;
}

const posKey = (c: Chess): string => c.fen().split(' ').slice(0, 4).join(' ');

function material(c: Chess, side: Color): number {
  let n = 0;
  for (const row of c.board()) for (const p of row) if (p && p.color === side) n += VALUE[p.type];
  return n;
}

function kingSquare(c: Chess, side: Color): Square | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === side) return p.square;
  return null;
}

const uci = (m: Move): string => `${m.from}${m.to}${m.promotion ?? ''}`;
const isCheck = (m: Move): boolean => /[+#]$/.test(m.san);
const ORDER: Readonly<Record<PieceSymbol, number>> = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };

// ── THE PERPETUAL ───────────────────────────────────────────────────────────

/** fail < perpetual < mate: the attacker takes the best, the defender the
 *  least. A line that mates is not a perpetual (the attacker wins). */
type Val = 0 | 1 | 2;
interface Node { v: Val; pv: Move[] }

class Budget {
  n = 0;
  out = false;
  /** Boards (with the checks left) the attacker already failed from. A fail
   *  reached through another path is kept as a fail: it can only make the
   *  search miss a perpetual, never claim one. */
  failed = new Set<string>();
  tick(): boolean { this.n += 1; if (this.n > NODE_BUDGET) this.out = true; return !this.out; }
}

/** Attacker to move: give check and keep the king in the net. */
function attack(c: Chess, path: string[], checksLeft: number, b: Budget): Node {
  if (checksLeft === 0 || !b.tick()) return { v: 0, pv: [] };
  const memo = `${posKey(c)}|${checksLeft}`;
  if (b.failed.has(memo)) return { v: 0, pv: [] };
  const r = attackFrom(c, path, checksLeft, b);
  if (r.v === 0 && !b.out) b.failed.add(memo);
  return r;
}

function attackFrom(c: Chess, path: string[], checksLeft: number, b: Budget): Node {
  const checks = c.moves({ verbose: true }).filter(isCheck).sort((x, y) => ORDER[x.piece] - ORDER[y.piece]);
  let best: Node = { v: 0, pv: [] };
  for (const m of checks) {
    c.move(m);
    let r: Node;
    if (c.isCheckmate()) r = { v: 2, pv: [] };
    else if (path.includes(posKey(c))) r = { v: 1, pv: [] };
    else { path.push(posKey(c)); r = defend(c, path, checksLeft - 1, b); path.pop(); }
    c.undo();
    if (b.out) return { v: 0, pv: [] };
    if (r.v > best.v) best = { v: r.v, pv: [m, ...r.pv] };
    if (best.v === 2) break;
  }
  return best;
}

/** Defender to move, in check: every reply must still be met by a check. */
function defend(c: Chess, path: string[], checksLeft: number, b: Budget): Node {
  if (!b.tick()) return { v: 0, pv: [] };
  // The replies most likely to escape first (a capture of a checking piece,
  // then a block), so an escape ends the read early.
  const escapeFirst = (m: Move): number => (m.captured ? 10 + VALUE[m.captured] : m.piece === 'k' ? 0 : 1);
  const replies = c.moves({ verbose: true }).sort((x, y) => escapeFirst(y) - escapeFirst(x));
  if (replies.length === 0) return { v: c.isCheckmate() ? 2 : 0, pv: [] };
  let worst: Node | null = null;
  for (const m of replies) {
    c.move(m);
    let r: Node;
    if (path.includes(posKey(c))) r = { v: 1, pv: [] };
    else { path.push(posKey(c)); r = attack(c, path, checksLeft, b); path.pop(); }
    c.undo();
    if (b.out) return { v: 0, pv: [] };
    // The defender prefers the draw to the mate, and escapes when it can.
    if (worst == null || r.v < worst.v) worst = { v: r.v, pv: [m, ...r.pv] };
    if (worst.v === 0) break;
  }
  return worst ?? { v: 0, pv: [] };
}

function perpetualOf(c: Chess, side: Color, pv: readonly Move[], line: string[]): Perpetual | null {
  const them: Color = side === 'w' ? 'b' : 'w';
  const king = kingSquare(c, them);
  if (!king) return null;
  const checks = pv.filter((m) => m.color === side);
  if (checks.length < 2) return null;
  const from: { piece: PieceSymbol; square: Square }[] = [];
  for (const m of checks) if (!from.some((f) => f.square === m.to)) from.push({ piece: m.piece, square: m.to });
  const down = Math.max(0, material(c, them) - material(c, side));
  return { side, checks: checks.map((m) => m.san), line, from, king, down, key: `perpetual:${side}:${from.map((f) => f.square).join('')}` };
}

/** The side to move on `fen` can force a perpetual check, or null. */
export function perpetualCheck(fen: string): Perpetual | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const b = new Budget();
  const r = attack(c, [posKey(c)], MAX_CHECKS, b);
  if (b.out || r.v !== 1) return null;
  return perpetualOf(c, side, r.pv, r.pv.map(uci));
}

/** The move `san` on `fenBefore` is a check that keeps the other king in a
 *  perpetual the mover cannot be stopped from giving, or null. */
export function perpetualStartedBy(fenBefore: string, san: string): Perpetual | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const side = c.turn();
  const root = posKey(c);
  let m: Move;
  try { m = c.move(san); } catch { return null; }
  if (!c.inCheck() || c.isCheckmate()) return null;
  const b = new Budget();
  const r = defend(c, [root, posKey(c)], MAX_CHECKS - 1, b);
  if (b.out || r.v !== 1) return null;
  c.undo();
  const pv = [m, ...r.pv];
  return perpetualOf(c, side, pv, pv.map(uci));
}

/** The engine's score of a board, the given seat. */
function scoreFor(replies: readonly ReplyLine[], seat: Color): number | null {
  const l = replies[0];
  if (!l || (l.cp == null && l.mate == null)) return null;
  return seatCp({ evaluation: l.cp ?? 0, mate: l.mate }, seat);
}

/** The engine reads the side with the checks as winning anyway: the draw is
 *  not its idea. `replies`: the engine's lines from the board read. */
export function winningAnyway(replies: readonly ReplyLine[], side: Color): boolean {
  const s = scoreFor(replies, side);
  return s != null && s >= WINNING_ANYWAY_CP;
}

/** Said from the seat of the side with the checks (`mine`: the student's).
 *  `started`: the move just played was the first check. Names the piece and
 *  its squares; rotated on the board. */
export function perpetualLine(p: Perpetual, mine: boolean, started: boolean, fen: string): string {
  const own = mine ? 'your' : 'their';
  const other = mine ? 'their' : 'your';
  const pieces = new Set(p.from.map((f) => f.piece));
  const one = pieces.size === 1 ? NAME[p.from[0].piece] : null;
  const squares = andSquares(p.from.map((f) => f.square));
  const who = one ? `${own} ${one}` : `${own} pieces`;
  const saves = p.down >= SAVES_DOWN
    ? (mine ? ' You are behind on material, and the draw saves the game.' : ' They are behind on material, and the draw saves the game for them.')
    : '';
  const lead = started
    ? rotateStem([
      `That check starts a perpetual. ${openSentence(who)} checks from ${squares} again and again, and ${other} king on ${p.king} cannot hide.`,
      `${openSentence(who)} can keep checking now, from ${squares}, and ${other} king on ${p.king} has no way out. It is a perpetual check.`,
      `A perpetual: ${who} goes back and forth between ${squares}, and every move of ${other} king on ${p.king} runs into the next check.`,
    ], stemKeyOf(fen))
    : mine
      ? rotateStem([
        `You can force a perpetual check. ${openSentence(who)} checks from ${squares}, and their king on ${p.king} cannot get away from the checks.`,
        `Look at the checks: ${who} can check from ${squares} forever. Their king on ${p.king} has nowhere to hide, so it is a draw whenever you want it.`,
        `Their king on ${p.king} cannot escape ${who}. Checks from ${squares} come back to the same position, a perpetual check.`,
      ], stemKeyOf(fen))
      : rotateStem([
        `They can force a perpetual check. ${openSentence(who)} checks from ${squares}, and your king on ${p.king} cannot hide from the checks.`,
        `Your king on ${p.king} has no shelter now. ${openSentence(who)} can check from ${squares} again and again, a perpetual.`,
        `Count their checks: ${who} from ${squares}, and every king move of yours walks into the next one. That is a perpetual check.`,
      ], stemKeyOf(fen));
  return `${lead}${saves}`;
}

// ── THE WINDMILL ────────────────────────────────────────────────────────────

/** A forced mate on the way: the mate is the idea, not the windmill. */
const MATE = 1000;

interface WNode {
  /** Material the windmill side nets along the line (pawn units). */
  net: number;
  pv: Move[];
  /** The sail's captures made with a discovered check. */
  takes: Move[];
}
const NONE: WNode = { net: 0, pv: [], takes: [] };

/** Is the check after `m` (just played) given by a piece other than the one
 *  that moved — a discovered check? */
function discovered(c: Chess, m: Move): boolean {
  const king = kingSquare(c, c.turn());
  if (!king) return false;
  return c.attackers(king, m.color).some((s) => s !== m.to);
}

const FILE = 'abcdefgh';
/** Does the piece on `sail` stand between one of its own sliders and the
 *  other king, with nothing else on the line: a move of it uncovers a check? */
function isBlocker(c: Chess, sail: Square): boolean {
  const p = c.get(sail);
  if (!p) return false;
  const king = kingSquare(c, p.color === 'w' ? 'b' : 'w');
  if (!king) return false;
  const kf = FILE.indexOf(king[0]); const kr = Number(king[1]);
  const sf = FILE.indexOf(sail[0]); const sr = Number(sail[1]);
  const df = Math.sign(sf - kf); const dr = Math.sign(sr - kr);
  const straight = df === 0 || dr === 0;
  if (!straight && Math.abs(sf - kf) !== Math.abs(sr - kr)) return false;
  let f = kf + df; let r = kr + dr;
  while (f !== sf || r !== sr) {
    if (c.get(`${FILE[f]}${r}` as Square)) return false;
    f += df; r += dr;
  }
  for (f = sf + df, r = sr + dr; f >= 0 && f < 8 && r >= 1 && r <= 8; f += df, r += dr) {
    const q = c.get(`${FILE[f]}${r}` as Square);
    if (!q) continue;
    return q.color === p.color && (q.type === 'q' || q.type === (straight ? 'r' : 'b'));
  }
  return false;
}

/** The sail on `sail`, its side to move: checks only, the best net. Stopping
 *  (no check) nets nothing more. `battery`: the last sail move was a direct
 *  check, so this one has to be a discovered one (a windmill turns on the
 *  piece behind it, not on checks of the sail alone). */
function sails(c: Chess, sail: Square, left: number, b: Budget, battery: boolean): WNode {
  if (left === 0 || !b.tick()) return NONE;
  if (battery && !isBlocker(c, sail)) return NONE;
  let best: WNode = NONE;
  for (const m of c.moves({ verbose: true, square: sail }).filter(isCheck)) {
    c.move(m);
    const disc = discovered(c, m);
    const gain = m.captured ? VALUE[m.captured] : 0;
    const r: WNode = c.isCheckmate() ? { net: MATE, pv: [], takes: [] } : turns(c, m.to, left - 1, b, !disc, best.net - gain);
    c.undo();
    if (b.out) return NONE;
    const net = r.net + gain;
    const take = disc && !!m.captured;
    if (net > best.net) best = { net, pv: [m, ...r.pv], takes: take ? [m, ...r.takes] : r.takes };
  }
  return best;
}

/** Defender to move, in check: the least it can give up. Taking the sail
 *  stops the windmill. `alpha`: what the windmill side has already; a reply
 *  that holds it to that settles this branch. */
function turns(c: Chess, sail: Square, left: number, b: Budget, battery: boolean, alpha: number): WNode {
  if (!b.tick()) return NONE;
  let worst: WNode | null = null;
  for (const m of c.moves({ verbose: true })) {
    c.move(m);
    const loss = m.captured ? VALUE[m.captured] : 0;
    const r = m.to === sail ? NONE : sails(c, sail, left, b, battery);
    c.undo();
    if (b.out) return NONE;
    const net = r.net - loss;
    if (worst == null || net < worst.net) worst = { net, pv: [m, ...r.pv], takes: r.takes };
    if (worst.net <= alpha) break;
  }
  return worst ?? NONE;
}

function windmillOf(c: Chess, first: Move, r: WNode): Windmill | null {
  // A forced mate is the mate's idea; two captures that cost the sail back
  // are not a windmill.
  if (r.net >= MATE / 2 || r.net <= 0 || r.takes.length < 2) return null;
  const probe = new Chess(c.fen());
  let axle: { piece: PieceSymbol; square: Square } | null = null;
  for (const m of r.pv) {
    probe.move(m.san);
    if (m !== r.takes[0]) continue;
    const king = kingSquare(probe, probe.turn());
    const sq = king ? probe.attackers(king, m.color).find((s) => s !== m.to) : undefined;
    const p = sq ? probe.get(sq) : undefined;
    if (sq && p) axle = { piece: p.type, square: sq };
    break;
  }
  if (!axle) return null;
  return {
    side: first.color,
    sail: { piece: first.piece, square: first.from },
    axle,
    takes: r.takes.map((m) => ({ piece: m.captured as PieceSymbol, square: m.to })),
    line: r.pv.map(uci),
    key: `windmill:${first.color}:${first.from}:${axle.square}`,
  };
}

/** The side to move on `fen` has a windmill: two captures or more by
 *  discovered check the defender cannot avoid, the sail kept, or null. */
export function windmill(fen: string): Windmill | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const b = new Budget();
  const from = new Set(c.moves({ verbose: true }).filter(isCheck).map((m) => m.from));
  let best: Windmill | null = null;
  for (const sq of from) {
    const r = sails(c, sq, MAX_SAILS, b, false);
    if (b.out) return null;
    const first = r.pv[0];
    const w = first ? windmillOf(c, first, r) : null;
    if (w && (!best || w.takes.length > best.takes.length)) best = w;
  }
  return best;
}

/** The move `san` on `fenBefore` turns a windmill's first sail, or null. */
export function windmillStartedBy(fenBefore: string, san: string): Windmill | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let m: Move;
  try { m = c.move(san); } catch { return null; }
  if (!c.inCheck() || c.isCheckmate()) return null;
  const b = new Budget();
  const disc = discovered(c, m);
  const take = !!m.captured && disc;
  const r = turns(c, m.to, MAX_SAILS - 1, b, !disc, -Infinity);
  c.undo();
  if (b.out) return null;
  const node: WNode = { net: r.net + (m.captured ? VALUE[m.captured] : 0), pv: [m, ...r.pv], takes: take ? [m, ...r.takes] : r.takes };
  return windmillOf(c, m, node);
}

/** Said from the seat of the windmill's side (`mine`: the student's).
 *  `started`: the move just played turned the first sail. Rotated. */
export function windmillLine(w: Windmill, mine: boolean, started: boolean, fen: string): string {
  const own = mine ? 'your' : 'their';
  const other = mine ? 'their' : 'your';
  const sail = NAME[w.sail.piece];
  const axle = NAME[w.axle.piece];
  const loot = andSquares(w.takes.map((t) => t.square));
  const what = andWords(w.takes.map((t) => `the ${NAME[t.piece]} on ${t.square}`));
  if (!mine) {
    return rotateStem([
      `Watch out for the windmill. Their ${sail} checks, steps away with a discovered check from their ${axle} on ${w.axle.square}, and takes on ${loot}.`,
      `Their ${sail} and their ${axle} on ${w.axle.square} make a windmill: every time the ${sail} steps out, the ${axle} checks your king, and the ${sail} eats ${what}.`,
      `Your king is caught in a windmill. The ${axle} on ${w.axle.square} checks each time their ${sail} moves, so the ${sail} picks off ${what} for free.`,
    ], stemKeyOf(fen));
  }
  const lead = started ? `That starts a windmill. ` : '';
  return lead + rotateStem([
    `${openSentence(own)} ${sail} turns a windmill: each time it steps out, ${own} ${axle} on ${w.axle.square} gives a discovered check, and the ${sail} takes on ${loot}.`,
    `The ${axle} on ${w.axle.square} sits behind ${own} ${sail}. Each time the ${sail} steps off the ${axle}'s line, the ${axle} checks, so ${other} king has to move, and the ${sail} collects ${what}.`,
    `A windmill: ${own} ${sail} checks, steps away with a discovered check from the ${axle} on ${w.axle.square}, and comes back. It takes ${what} on the way.`,
  ], stemKeyOf(fen));
}

const andWords = andList;
const andSquares = andList;
