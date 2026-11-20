/**
 * THE TWO FUTURES, AND WHAT CHANGED BETWEEN THEM (WO-PICTURE-01 P2, fixes 2–3,
 * David 2026-11-19: "identify everything needed").
 *
 * Danya rules a try out by what it does to the board a few moves on, never by a
 * number: "…Rxh5 and the rook is alive", "…Kf7-e6 and it is a fortress",
 * "…Qf6 hits e6 and a1". Of his 194 refuted tries, 51 cost the RESULT with the
 * material kept, and nothing read what was different about the board after
 * them. This does:
 *  - `futureBoards`: a line's key boards — after the reply, and at the quiet
 *    end (the first board past the reply whose move was neither a capture nor
 *    a check, or the line's end);
 *  - `whatChanged`: every board computer read on the try's board and on the
 *    best line's board at the same point (`readEveryComputer`, one bundle);
 *    what the try's board has that the best's does not is what the try let
 *    happen, and the reverse is what it gave up.
 *
 * Pure: chess.js and the board computers, over the lines the engine already
 * read (no engine call). A fact is matched across the two boards by its
 * computer and its claims, so "their rook is active" on both is no change.
 */
import { sideToMoveAs } from './threatOut';
import { unmarked } from '../utils/sanMark';
import { Chess, type Color, type Square } from 'chess.js';
import { readEveryComputer, type BoardBundle } from './boardBundle';
import type { CoachFact } from './coachFact';
import { readEngineComputers, type BundleEngine } from './engineComputers';
import { stakeValue } from './factStakes';
import { PICTURE_ROLE, type PictureRole } from './positionPicture';
import { fortressOn, fortressLine, type Fortress } from './fortress';
import { DRAW_LEVEL_CP, LOCKED_TEXT, lockedPawns, type LockedPawns } from './drawnEnding';
import { KP_FAST_BUDGET, kpDrawReason, kpVerdict, type KpValue } from './kpSolver';
import { wonEnding } from './wonEnding';
import { snapshot, diff, relationKey, relationSquare, type RelationSnapshot } from './relations';
import { positionKey, type FactBoard } from './teachingSentence';

export interface FutureBoard {
  fen: string;
  /** Plies from the board the line starts on. */
  ply: number;
  /** The rest of the line from here, UCI. */
  rest: readonly string[];
  /** THE PATH (CLAUDE.md, EVERY FACT KNOWS ITS BOARD): the moves from the
   *  board the line starts on to this one — what a fact read here is said
   *  after. */
  path: readonly string[];
  /** The move that reached this board: the board before it, its SAN, who
   *  played it, and the line from that board (this move first). */
  reached: { fenBefore: string; san: string; seat: Color; line: readonly string[] };
}

export interface LineRead {
  moves: readonly string[];
  /** White's seat. */
  cp: number | null;
  mate: number | null;
}

const MAX_PLIES = 8;

/** The line's key boards: after the reply, then the quiet end. */
export function futureBoards(fen: string, moves: readonly string[]): { reply: FutureBoard | null; quiet: FutureBoard | null } {
  let b: Chess;
  try { b = new Chess(fen); } catch { return { reply: null, quiet: null }; }
  let reply: FutureBoard | null = null;
  let quiet: FutureBoard | null = null;
  const n = Math.min(moves.length, MAX_PLIES);
  for (let i = 0; i < n; i += 1) {
    const u = moves[i];
    const fenBefore = b.fen();
    let m;
    try { m = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    const here: FutureBoard = { fen: b.fen(), ply: i + 1, rest: moves.slice(i + 1), path: moves.slice(0, i + 1),
      reached: { fenBefore, san: m.san, seat: m.color, line: moves.slice(i) } };
    if (i === 1) reply = here;
    if (i >= 1 && !m.captured && !/[+#]$/.test(m.san)) { quiet = here; break; }
    quiet = here;
  }
  return { reply, quiet };
}

/**
 * The bundle on a future board. The move that reached it is the line's own
 * move, so every computer that reads the move played (`priorMove`) reads it.
 * `priorLines` — the engine's line from the board before that move — is the
 * line itself from there, only when that move is the engine's choice: every
 * move past the try is (the line is the engine's best play after it), so the
 * line from before it IS the engine's best line, scored as the whole line. The
 * try itself is never a future board's move (the first future is after the
 * reply), so no cost is ever made up for a move the engine did not choose.
 */
export function bundleAt(f: FutureBoard, line: LineRead, student: Color, rating: number): BoardBundle {
  const r = f.reached;
  const engineChose = f.ply >= 2;
  return {
    fen: f.fen,
    student,
    lines: [{ moves: [...f.rest], cp: line.cp, mate: line.mate }],
    rating,
    history: [],
    priorMove: { fenBefore: r.fenBefore, san: r.san },
    priorMoveSeat: r.seat,
    priorLines: engineChose ? [{ moves: [...r.line], cp: line.cp, mate: line.mate }] : null,
  };
}

/** The engine-backed computers' facts on each future board
 *  (`engineFutureFacts`): read where an engine is at hand, added to the pure
 *  read of the same board. */
export interface EngineFutureFacts {
  onTry: Partial<Record<'reply' | 'quiet', CoachFact[]>>;
  onBest: Partial<Record<'reply' | 'quiet', CoachFact[]>>;
}

/** The engine-backed computers (`readEngineComputers`) read on the four
 *  future boards — the try's and the best's, after the reply and at the quiet
 *  end — each with the extra reads it needs, through `engine`. */
export async function engineFutureFacts(args: { fen: string; student: Color; rating: number; tryLine: LineRead; bestLine: LineRead }, engine: BundleEngine): Promise<EngineFutureFacts> {
  const t = futureBoards(args.fen, args.tryLine.moves);
  const b = futureBoards(args.fen, args.bestLine.moves);
  const out: EngineFutureFacts = { onTry: {}, onBest: {} };
  for (const at of ['reply', 'quiet'] as const) {
    const tf = t[at];
    const bf = b[at];
    if (!tf || !bf) continue;
    out.onTry[at] = await readEngineComputers(bundleAt(tf, args.tryLine, args.student, args.rating), engine).catch(() => []);
    out.onBest[at] = await readEngineComputers(bundleAt(bf, args.bestLine, args.student, args.rating), engine).catch(() => []);
  }
  return out;
}

/** `changeReason` with the engine-backed computers read on the futures too. */
export async function changeReasonWithEngine(args: Parameters<typeof changeReason>[0], engine: BundleEngine): Promise<string | null> {
  return changeReason(args, await engineFutureFacts(args, engine));
}

function factKey(f: CoachFact): string {
  return `${f.computer}|${[...f.claims].sort().join(',') || f.text}`;
}
/** The same fact on both boards: the same claims, or the same words. */
function sameOn(f: CoachFact, other: { keys: ReadonlySet<string>; texts: ReadonlySet<string> }): boolean {
  return other.keys.has(factKey(f)) || other.texts.has(`${f.computer}|${f.text}`);
}
/** A claim that states a board RELATION (`relations.ts`): a piece loose or
 *  hanging on a square, a passed pawn on one. The producers key these with
 *  what they need for say-once (`conceptKey.looseKey` adds the ply the spell
 *  began), so two boards holding the same loose piece can carry different
 *  claims; the relation is the same, and the relations diff says so. */
const RELATION_CLAIM = /^(loose|hanging|passer):([a-h][1-8])(?![a-h1-8])/;

/** The relation keys a fact states on its board's snapshot, or null when it
 *  states none the snapshot can name (then it is matched by claims and words). */
export function relationsOfFact(f: Pick<CoachFact, 'claims'>, snap: RelationSnapshot): string[] | null {
  const keys: string[] = [];
  for (const c of f.claims) {
    const m = RELATION_CLAIM.exec(c);
    if (!m) continue;
    const here = snap.relations.filter((r) => r.kind === m[1] && relationSquare(r) === m[2]);
    if (here.length === 0) return null;
    keys.push(...here.map(relationKey));
  }
  return keys.length > 0 ? keys : null;
}

/** The squares the line acts on, its first moves' from and to, and both kings
 *  on the board it reaches: a change there is what the line did, a change
 *  elsewhere is the rest of the board. */
function touched(fen: string, moves: readonly string[], upTo: string): Set<string> {
  const out = new Set<string>();
  for (const u of moves.slice(0, 4)) { out.add(u.slice(0, 2)); out.add(u.slice(2, 4)); }
  try {
    const b = new Chess(upTo);
    for (const c of ['w', 'b'] as const) for (const k of b.findPiece({ type: 'k', color: c })) out.add(k);
  } catch { /* no kings read */ }
  void fen;
  return out;
}

/** The roles a difference can be: what the board holds, not what to do. */
const CHANGE_ROLES: ReadonlySet<PictureRole> = new Set<PictureRole>(['threat', 'resource', 'asset', 'weakness', 'board', 'standing']);
const ROLE_ORDER: Record<PictureRole, number> = {
  threat: 0, resource: 1, standing: 2, asset: 3, weakness: 4, board: 5,
  try: 9, plan: 9, move: 9, line: 9, habit: 9, theory: 9, story: 9,
};

export interface Change {
  /** Where it was read: after the reply, or at the quiet end. */
  at: 'reply' | 'quiet';
  fact: CoachFact;
  /** It is about a square the line acted on, or a king. */
  inLine: boolean;
  /** THE BOARD IT IS TRUE ON (CLAUDE.md, EVERY FACT KNOWS ITS BOARD): the
   *  moves (uci) from the board the line starts on to the board it was read
   *  on, and that board's key. */
  board: FactBoard;
}

export interface WhatChanged {
  /** On the try's board and not the best's: what the try let happen. */
  appeared: Change[];
  /** On the best's board and not the try's: what the try gave up. */
  lost: Change[];
}

function rank(c: Change): number {
  const role = PICTURE_ROLE[c.fact.computer] ?? 'board';
  return (c.inLine ? 0 : 1e9) + ROLE_ORDER[role] * 1e7 - (stakeValue(c.fact.stakes) ?? 0) + (c.at === 'reply' ? 0 : 1);
}

/**
 * What the try changed: every computer read on both futures, at the same
 * point. Most telling first: a threat or a resource before a standing, the
 * fact worth most within a role, the reply's board before the quiet end.
 */
export function whatChanged(args: {
  fen: string;
  student: Color;
  rating: number;
  /** The try's line from `fen` (the try first). */
  tryLine: LineRead;
  /** The best line from `fen`. */
  bestLine: LineRead;
}, more: EngineFutureFacts | null = null): WhatChanged {
  const t = futureBoards(args.fen, args.tryLine.moves);
  const b = futureBoards(args.fen, args.bestLine.moves);
  const appeared: Change[] = [];
  const lost: Change[] = [];
  for (const at of ['reply', 'quiet'] as const) {
    const tf = t[at];
    const bf = b[at];
    if (!tf || !bf) continue;
    const onTry = [...readEveryComputer(bundleAt(tf, args.tryLine, args.student, args.rating)), ...(more?.onTry[at] ?? [])]
      .filter((f) => CHANGE_ROLES.has(PICTURE_ROLE[f.computer] ?? 'board'));
    const onBest = [...readEveryComputer(bundleAt(bf, args.bestLine, args.student, args.rating)), ...(more?.onBest[at] ?? [])]
      .filter((f) => CHANGE_ROLES.has(PICTURE_ROLE[f.computer] ?? 'board'));
    const index = (xs: CoachFact[]) => ({ keys: new Set(xs.map(factKey)), texts: new Set(xs.map((f) => `${f.computer}|${f.text}`)) });
    const ti = index(onTry);
    const bi = index(onBest);
    const tT = touched(args.fen, args.tryLine.moves, tf.fen);
    const bT = touched(args.fen, args.bestLine.moves, bf.fen);
    // ONE DIFFER (relations.ts): a fact that states a board relation is a
    // change exactly when the relations diff of the two boards has it — the
    // try's board gained it (appeared) or the best's lost it (given up). The
    // rest are matched by their claims and words, as before.
    const ts = snapshot(tf.fen);
    const bs = snapshot(bf.fen);
    const rd = ts && bs ? diff(bs, ts) : null;
    const gainedOnTry = new Set((rd?.gained ?? []).map(relationKey));
    const onlyOnBest = new Set((rd?.lost ?? []).map(relationKey));
    const changed = (f: CoachFact, own: RelationSnapshot | null, only: ReadonlySet<string>, other: { keys: ReadonlySet<string>; texts: ReadonlySet<string> }): boolean => {
      const rels = rd && own ? relationsOfFact(f, own) : null;
      return rels ? rels.some((k) => only.has(k)) : !sameOn(f, other);
    };
    const tBoard: FactBoard = { key: positionKey(tf.fen), path: tf.path, relation: 'try' };
    const bBoard: FactBoard = { key: positionKey(bf.fen), path: bf.path, relation: 'line' };
    for (const f of onTry) if (changed(f, ts, gainedOnTry, bi)) appeared.push({ at, fact: f, inLine: f.squares.some((q) => tT.has(q)), board: tBoard });
    for (const f of onBest) if (changed(f, bs, onlyOnBest, ti)) lost.push({ at, fact: f, inLine: f.squares.some((q) => bT.has(q)), board: bBoard });
  }
  const seen = new Set<string>();
  const once = (xs: Change[]): Change[] => xs.sort((x, y) => rank(x) - rank(y)).filter((c) => {
    const k = factKey(c.fact);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { appeared: once(appeared), lost: once(lost) };
}

// ── WHAT THE TRY'S LINE DOES (his "with a perpetual check", "and White
// promotes", "the back-rank checkmate") — read off the line's own moves ──

export type LineStoryKind = 'perpetual' | 'promotes' | 'mates' | 'stalemate' | 'bareDraw';

export interface LineStory {
  kind: LineStoryKind;
  /** From the seat of the side that played the try (`own` / `other`). */
  text: string;
  /** The squares it is about. */
  squares: string[];
}

/** The try side's possessive, from `other` (the side that answers it). */
function ownWord(other: 'your' | 'their'): string { return other === 'your' ? 'their' : 'your'; }

/**
 * THE SQUARE OF THE PAWN, COUNTED (his "loses by a single tempo"). On the
 * first board after the reply where only kings and pawns are left and the
 * promoting pawn's file ahead is empty, with the try side to move: its king's
 * distance to the queening square (the rule of the square) against the
 * pawn's pushes plus one (the double step counted; the king moves first).
 * How many moves late the king is; null when no such board comes or the king
 * was in time there.
 * `line` is the try's line up to and including the promotion; `mover` the
 * side that played the try.
 */
export function lateToCatch(fen: string, line: readonly string[], mover: Color): number | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const boards: string[] = [];
  const moves: Array<{ from: string; to: string; piece: string; color: Color }> = [];
  for (const u of line) {
    try { moves.push(b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })); boards.push(b.fen()); } catch { return null; }
  }
  const last = moves[moves.length - 1];
  if (!last || last.piece !== 'p' || last.color === mover) return null;
  // The promoting pawn's square on each board, traced back from its last push.
  const at: Array<string | null> = new Array<string | null>(moves.length).fill(null);
  let cur = last.from;
  for (let j = moves.length - 2; j >= 0; j -= 1) {
    at[j] = cur;
    const m = moves[j];
    if (m.color === last.color && m.piece === 'p' && m.to === cur) cur = m.from;
  }
  for (let j = 1; j < moves.length - 1; j += 1) {
    const sq = at[j];
    if (!sq) continue;
    let c: Chess;
    try { c = new Chess(boards[j]); } catch { continue; }
    // Counted with the try side's king to move: the moment it could start running.
    if (c.turn() !== mover) continue;
    if (c.board().flat().some((p) => p && p.type !== 'k' && p.type !== 'p')) continue;
    const r = Number(sq[1]);
    const dir = last.color === 'w' ? 1 : -1;
    let clear = true;
    for (let rr = r + dir; rr >= 1 && rr <= 8; rr += dir) if (c.get(`${sq[0]}${rr}` as Square)) { clear = false; break; }
    if (!clear) continue;
    const promo = `${sq[0]}${last.color === 'w' ? 8 : 1}` as Square;
    const king = c.board().flat().find((p) => p && p.type === 'k' && p.color === mover)?.square;
    if (!king) return null;
    const startRank = last.color === 'w' ? 2 : 7;
    const pushes = Math.abs((last.color === 'w' ? 8 : 1) - r) - (r === startRank ? 1 : 0);
    // THE RULE OF THE SQUARE: the king's straight-line distance, as a player
    // counts it (a fenced walk overcounts: the line's king takes its way through).
    const steps = Math.max(Math.abs(king.charCodeAt(0) - promo.charCodeAt(0)), Math.abs(Number(king[1]) - Number(promo[1])));
    // The king's side to move: it catches the pawn with one move more than the pushes.
    const allowed = pushes + 1;
    return steps > allowed ? steps - allowed : null;
  }
  return null;
}

const PERPETUAL_CHECKS = 3;
/** A line that ends within this of level is a draw (White's seat, centipawns). */
const PERPETUAL_LEVEL_CP = 50;

/**
 * What the try's line does that no single board shows:
 *  - `perpetual`: the other side checks on every move from its reply on, at
 *    least three times or until a position repeats — "…Rg1+, and the checks
 *    never stop";
 *  - `promotes`: a pawn of the other side reaches the last rank in the line;
 *  - `mates`: the other side mates in the line;
 *  - `stalemate`: a move in the line leaves the side to move no legal move and
 *    no check (his "results in stalemate");
 *  - `bareDraw`: a capture in the line leaves nothing on the board that can
 *    mate (chess.js's insufficient material; his "is a draw!").
 * A promotion says what it promotes to and, when only kings and pawns are
 * left, whether the try side's king was outside the pawn's square — his
 * "loses by a single tempo" (`lateToCatch`). Null when the line does none of
 * these. Pure: chess.js over the line.
 */
export function lineStory(fen: string, tryLine: readonly string[], other: 'your' | 'their', tryCp: number | null = null): LineStory | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const mover = b.turn();
  const seen = new Map<string, number>();
  const posKey = (c: Chess): string => c.fen().split(' ').slice(0, 4).join(' ');
  seen.set(posKey(b), 1);
  let checks = 0;
  let firstCheck: string | null = null;
  let checker: string | null = null;
  let checksBroken = false;
  const theirWord = other === 'your' ? 'you' : 'they';
  for (let i = 0; i < tryLine.length; i += 1) {
    const u = tryLine[i];
    let m;
    try { m = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    const byOther = m.color !== mover;
    const sanWords = `${m.color === 'b' ? '…' : ''}${m.san}`;
    if (byOther && b.isCheckmate()) return { kind: 'mates', text: `${m.color === 'b' ? '…' : ''}${unmarked(m.san)} is mate.`, squares: [m.to] };
    if (byOther && m.promotion) {
      // A rook or bishop in an engine line is a queen's stand-in (the same
      // score); a knight is the point of the move.
      const promo = m.promotion === 'q' ? 'queens' : m.promotion === 'n' ? 'promotes to a knight' : 'promotes';
      const late = lateToCatch(fen, tryLine.slice(0, i + 1), mover);
      const tail = late === 1 ? `: ${ownWord(other)} king is one move too late to catch it` : late !== null ? `: ${ownWord(other)} king is too far away to catch it` : '';
      return { kind: 'promotes', text: `${other === 'your' ? 'Your' : 'Their'} ${m.from[0]}-pawn runs through and ${promo} on ${m.to}${tail}.`, squares: [m.from, m.to] };
    }
    // A STALEMATE ON THE BOARD is a draw whatever the engine says next.
    if (b.isStalemate()) {
      const stuck = (m.color === mover) === (other === 'your') ? 'you' : 'them';
      return { kind: 'stalemate', text: `${sanWords} leaves ${stuck} no legal move: it is stalemate, a draw.`, squares: [m.to] };
    }
    // Nothing left that can mate: the capture that took the last of it.
    if (m.captured && b.isInsufficientMaterial()) {
      const bare = b.board().flat().every((p) => !p || p.type === 'k');
      // WHOSE piece takes it is said (F5, the Saavedra: "After Kxc7 only the
      // kings are left" read as the student's king).
      const taker = (m.color === mover) === (other === 'your') ? 'their' : 'your';
      const noun = ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as Record<string, string>)[m.piece] ?? 'piece';
      const takes = `once ${taker} ${noun} takes on ${m.to}`;
      return { kind: 'bareDraw', text: bare ? `${takes[0].toUpperCase()}${takes.slice(1)}, only the kings are left: a draw.` : `${takes[0].toUpperCase()}${takes.slice(1)}, nothing is left that can mate: a draw.`, squares: [m.to] };
    }
    if (byOther && !checksBroken) {
      if (/\+$/.test(m.san)) {
        checks += 1;
        if (!firstCheck) { firstCheck = sanWords; checker = m.to; }
      } else if (i > 0) checksBroken = true;
    }
    const k = posKey(b);
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    // A PERPETUAL IS A DRAW: the checks have to bring a position back, or the
    // line has to end level — three checks the king walks out of are not one.
    const levelEnd = tryCp !== null && Math.abs(tryCp) <= PERPETUAL_LEVEL_CP;
    if (!checksBroken && firstCheck && (n >= 2 || (checks >= PERPETUAL_CHECKS && levelEnd))) {
      return { kind: 'perpetual', text: `${firstCheck} starts a perpetual check: ${theirWord} keep checking and the king can't get away.`, squares: checker ? [checker] : [] };
    }
  }
  return null;
}

// ── THE DEFENDER COMES ALIVE (his "…Rxh5 and the rook is alive") — a
// difference, so it is read here, across the two futures ──

export interface ComesAlive {
  /** The side whose piece comes alive (the side answering the try). */
  side: Color;
  piece: 'r' | 'q' | 'b' | 'n' | 'k';
  /** Where it stands on the try's board. */
  square: Square;
  /** Its moves there, and the most any piece of its kind has on the best line's board. */
  moves: number;
  movesOnBest: number;
  at: 'reply' | 'quiet';
}

/** How many squares each piece of `side` could go to, its side to move. */
function mobility(fen: string, side: Color): Map<Square, { type: string; n: number }> {
  const out = new Map<Square, { type: string; n: number }>();
  const turned = sideToMoveAs(fen, side);
  if (!turned) return out;
  let c: Chess;
  try { c = new Chess(turned); } catch { return out; }
  for (const p of c.board().flat()) {
    if (!p || p.color !== side || p.type === 'p') continue;
    out.set(p.square, { type: p.type, n: c.moves({ square: p.square }).length });
  }
  return out;
}

/** The gain that makes a passive piece "alive", by kind: how many more
 *  squares, at most how many it had, at least how many it has. */
const ALIVE_BAR: Record<ComesAlive['piece'], { gain: number; wasAtMost: number; nowAtLeast: number }> = {
  r: { gain: 5, wasAtMost: 5, nowAtLeast: 9 },
  q: { gain: 8, wasAtMost: 6, nowAtLeast: 16 },
  b: { gain: 4, wasAtMost: 3, nowAtLeast: 7 },
  n: { gain: 3, wasAtMost: 2, nowAtLeast: 5 },
  k: { gain: 3, wasAtMost: 2, nowAtLeast: 5 },
};

/**
 * A piece of the answering side that is passive on the best line's board and
 * active on the try's, at the same point: the most mobile piece of each kind
 * on each board, compared (a rook shut in on a8 with 3 squares against a rook
 * on h5 with 11). The piece must stand on a square the try's line acted on,
 * so the life is what the line gave it. A king counts only with the queens
 * off. Pure: chess.js over the two lines.
 */
export function comesAlive(args: { fen: string; tryLine: LineRead; bestLine: LineRead }): ComesAlive | null {
  let mover: Color;
  try { mover = new Chess(args.fen).turn(); } catch { return null; }
  const side: Color = mover === 'w' ? 'b' : 'w';
  const t = futureBoards(args.fen, args.tryLine.moves);
  const b = futureBoards(args.fen, args.bestLine.moves);
  let best: (ComesAlive & { gain: number }) | null = null;
  for (const at of ['reply', 'quiet'] as const) {
    const tf = t[at];
    const bf = b[at];
    if (!tf || !bf) continue;
    const queensOff = !/q/i.test(tf.fen.split(' ')[0]);
    const lineSquares = touched(args.fen, args.tryLine.moves, tf.fen);
    const onTry = mobility(tf.fen, side);
    const onBest = mobility(bf.fen, side);
    for (const kind of ['r', 'q', 'b', 'n', 'k'] as const) {
      if (kind === 'k' && !queensOff) continue;
      const bar = ALIVE_BAR[kind];
      const most = (m: Map<Square, { type: string; n: number }>): { sq: Square | null; n: number } => {
        let sq: Square | null = null; let n = -1;
        for (const [s, v] of m) if (v.type === kind && v.n > n) { sq = s; n = v.n; }
        return { sq, n };
      };
      const tr = most(onTry);
      const br = most(onBest);
      if (!tr.sq || !br.sq || !lineSquares.has(tr.sq)) continue;
      const gain = tr.n - br.n;
      if (gain < bar.gain || br.n > bar.wasAtMost || tr.n < bar.nowAtLeast) continue;
      if (!best || gain / bar.gain > best.gain) best = { side, piece: kind, square: tr.sq, moves: tr.n, movesOnBest: br.n, at, gain: gain / bar.gain };
    }
  }
  if (!best) return null;
  const { gain: _g, ...out } = best;
  return out;
}

const ALIVE_NAME: Record<ComesAlive['piece'], string> = { r: 'rook', q: 'queen', b: 'bishop', n: 'knight', k: 'king' };

/** The words for a piece that comes alive, from the try side's seat. */
export function comesAliveText(a: ComesAlive, other: 'your' | 'their'): string {
  const whose = other === 'your' ? 'Your' : 'Their';
  return `${whose} ${ALIVE_NAME[a.piece]} comes alive on ${a.square}: it has ${a.moves} squares to work with there, where the better line keeps it to ${a.movesOnBest}.`;
}

// ── THE FORTRESS THE TRY LETS THEM BUILD (his "and once again, White cannot
// make progress") — a state on the board the line reaches, so it is read on
// that board, not off the move that reached it ──

export interface FortressGained {
  fortress: Fortress;
  at: 'reply' | 'quiet';
  /** The try's board it stands on. */
  fen: string;
}

/**
 * A fortress the side answering the try holds on the try's board (after the
 * reply, or at the quiet end) and does not hold on the best line's board at
 * the same point. The draw read is the line's own score (the engine's read of
 * the line the board lies on), so no read, no claim. Pure: chess.js over the
 * two lines.
 */
export function fortressGained(args: { fen: string; tryLine: LineRead; bestLine: LineRead }): FortressGained | null {
  let mover: Color;
  try { mover = new Chess(args.fen).turn(); } catch { return null; }
  const side: Color = mover === 'w' ? 'b' : 'w';
  const t = futureBoards(args.fen, args.tryLine.moves);
  const b = futureBoards(args.fen, args.bestLine.moves);
  for (const at of ['reply', 'quiet'] as const) {
    const tf = t[at];
    if (!tf) continue;
    const f = fortressOn(tf.fen, [{ moves: tf.rest, cp: args.tryLine.cp, mate: args.tryLine.mate }]);
    if (!f || f.defender !== side) continue;
    const bf = b[at];
    const onBest = bf ? fortressOn(bf.fen, [{ moves: bf.rest, cp: args.bestLine.cp, mate: args.bestLine.mate }]) : null;
    if (onBest && onBest.defender === side) continue;
    return { fortress: f, at, fen: tf.fen };
  }
  return null;
}

// ── THE PAWNS LOCKED, NO WAY IN (his "and once again, White cannot make
// progress", "the position is totally locked up") — read on every board the
// try's line reaches, since a lock is permanent: once the chain is frozen and
// walls the kings out, nothing on the board can change ──

export interface LockGained {
  lock: LockedPawns;
  /** The ply of the try's line the lock stands from, and its board. */
  ply: number;
  fen: string;
}

/** The boards a line reaches, from its first move (ply 1). */
function lineBoards(fen: string, moves: readonly string[]): { ply: number; fen: string }[] {
  const out: { ply: number; fen: string }[] = [];
  let b: Chess;
  try { b = new Chess(fen); } catch { return out; }
  for (let i = 0; i < moves.length; i += 1) {
    const u = moves[i];
    try { b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    out.push({ ply: i + 1, fen: b.fen() });
  }
  return out;
}

/**
 * A locked pawn ending (`lockedPawns`) the try's line reaches after the reply,
 * the line's own score level (within `DRAW_LEVEL_CP`, no mate: the engine's
 * proof), and that the best line never reaches. Pure: chess.js over the two
 * lines.
 */
export function lockGained(args: { fen: string; tryLine: LineRead; bestLine: LineRead }): LockGained | null {
  if (args.tryLine.mate !== null || args.tryLine.cp === null || Math.abs(args.tryLine.cp) > DRAW_LEVEL_CP) return null;
  const onTry = lineBoards(args.fen, args.tryLine.moves).filter((x) => x.ply >= 2).find((x) => lockedPawns(x.fen));
  if (!onTry) return null;
  if (lineBoards(args.fen, args.bestLine.moves).some((x) => lockedPawns(x.fen))) return null;
  return { lock: lockedPawns(onTry.fen) as LockedPawns, ply: onTry.ply, fen: onTry.fen };
}

// ── THE PAWN ENDING, SOLVED (his "White cannot make progress", "the king
// gets there first"): a kings-and-pawns board on the try's line and on the
// best line, each solved exactly (`kpVerdict`) — a proof, not a score ──

export interface KpChange {
  /** `drawn`: the try lets the other side hold a draw the best line wins;
   *  `lost`: the try loses a pawn ending the best line holds or wins. */
  kind: 'drawn' | 'lost';
  /** The try's board the proof stands on. */
  fen: string;
  ply: number;
  text: string;
}

/** Boards from a line's end back, the solver tries this many per line. */
const KP_BOARDS_PER_LINE = 3;

/** The first proven value on a line's kings-and-pawns boards (from its end
 *  back: the deepest board has the fewest pawns, so it is the cheapest proof),
 *  or null when none is proven. */
function provenOnLine(fen: string, moves: readonly string[]): { value: Exclude<KpValue, 'unknown'>; fen: string; ply: number } | null {
  const boards = lineBoards(fen, moves).filter((x) => x.ply >= 1).reverse();
  let tried = 0;
  for (const x of boards) {
    const v = kpVerdict(x.fen, KP_FAST_BUDGET);
    if (!v) continue;
    if (v.value !== 'unknown') return { value: v.value, fen: x.fen, ply: x.ply };
    if (++tried >= KP_BOARDS_PER_LINE) break;
  }
  return null;
}

/**
 * The try's line reaches a pawn ending the solver proves worse for the try's
 * side than the best line's: a draw where the best line wins (and why it
 * holds, `kpDrawReason`), or a loss where the best line holds or wins. Null
 * when either line has no proven kings-and-pawns board. Pure: chess.js and the
 * solver over the two lines.
 */
export function kpResultChange(args: { fen: string; student: Color; tryLine: LineRead; bestLine: LineRead; other: 'your' | 'their' }): KpChange | null {
  let mover: Color;
  try { mover = new Chess(args.fen).turn(); } catch { return null; }
  const t = provenOnLine(args.fen, args.tryLine.moves);
  if (!t) return null;
  const b = provenOnLine(args.fen, args.bestLine.moves);
  if (!b) return null;
  const win = mover === 'w' ? 'white' : 'black';
  const score = (v: Exclude<KpValue, 'unknown'>): number => (v === 'draw' ? 0 : v === win ? 1 : -1);
  const st = score(t.value); const sb = score(b.value);
  if (st >= sb) return null;
  const yours = args.other === 'your';
  if (st === 0) {
    const why = kpDrawReason(t.fen, args.student, { attacker: mover, budget: KP_FAST_BUDGET });
    const lead = yours ? 'That throws the win away.' : 'That lets you hold the draw.';
    return { kind: 'drawn', fen: t.fen, ply: t.ply, text: why ? `${lead} ${why.text}` : `${lead} The pawn ending that follows is a draw by force.` };
  }
  let bestSan = '';
  try {
    const u = args.bestLine.moves[0];
    bestSan = new Chess(args.fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
  } catch { return null; }
  const said = mover === 'b' ? `…${bestSan}` : bestSan;
  const kept = sb === 0 ? 'would have held the draw' : 'would have won it';
  // WHY the other side wins it, from the solved board's shape (null: no shape).
  const why = wonEnding(t.fen, args.student, KP_FAST_BUDGET);
  const reason = why && why.side !== mover ? ` ${why.text}` : '';
  return { kind: 'lost', fen: t.fen, ply: t.ply,
    text: yours ? `That loses the pawn ending by force.${reason} ${said} ${kept}.` : `That loses them the pawn ending by force.${reason} ${said} ${kept}.` };
}

/** The change a try lets happen, as the reason it falls short: the line's own
 *  story first; then a known draw the try lets the other side reach (the
 *  board's drawing resource, confirmed level by the line); then a fortress
 *  the try lets them build (`fortressGained`); then a threat or
 *  a resource that appears on the board after it, about a square the line
 *  acted on or a king; then a piece of theirs that comes alive. Null when
 *  none. */
export function changeReason(args: ChangeReasonInput, more: EngineFutureFacts | null = null): string | null {
  return changeReasonRead(args, more)?.text ?? null;
}

/** Computers whose fact is the game's STATE ("they're worse, so they're
 *  setting you a problem"), not a relation on one board: never anchored to a
 *  line's board. */
const STATE_NOT_BOARD: ReadonlySet<string> = new Set(['practicalChance']);

export interface ChangeReasonInput {
  fen: string;
  student: Color;
  rating: number;
  tryLine: LineRead;
  bestLine: LineRead;
  other: 'your' | 'their';
}

/** The reason with its board: `board` is set ONLY when the reason states a
 *  fact about a board the line reaches (a piece, a square, on that board) —
 *  a verdict about the line (a draw, a solved ending, a fortress, a story, a
 *  standing) is about no one board and carries none. */
export function changeReasonRead(args: ChangeReasonInput, more: EngineFutureFacts | null = null): { text: string; board: FactBoard | null } | null {
  const plain = (text: string | null): { text: string; board: null } | null => (text ? { text, board: null } : null);
  return changeReasonOf(args, more, plain);
}

function changeReasonOf(args: ChangeReasonInput, more: EngineFutureFacts | null, plain: (t: string | null) => { text: string; board: null } | null): { text: string; board: FactBoard | null } | null {
  const story = lineStory(args.fen, args.tryLine.moves, args.other, args.tryLine.mate === null ? args.tryLine.cp : null);
  if (story) return plain(story.text);
  const wc = whatChanged(args, more);
  // A reason is what the OTHER side gains: a fact about the try's own side
  // (advice to it, "before you take…") is no reason the try fails.
  const theirSeat = args.other === 'their' ? 'opponent' : 'student';
  // A danger the try's side would walk into NEXT (`latent-danger`, "before you
  // take on e5…") is advice for a later move, not what the reply did.
  // A KNOWN DRAW THE TRY LETS THEM REACH (his "is obviously a draw", "a
  // corner pawn of the wrong colour"): the drawing shape is held by the side
  // answering the try, and the best line's board does not have it.
  const drawn = wc.appeared.find((c) => c.fact.seat === theirSeat && c.fact.claims.some((k) => k.startsWith('verdict:drawn:')));
  if (drawn) return plain(drawn.fact.text);
  // THE PAWNS LOCKED, NO WAY IN: the try's line freezes the chain level.
  if (lockGained(args)) return plain(LOCKED_TEXT);
  // THE PAWN ENDING, SOLVED: the try's line reaches a kings-and-pawns board
  // proven worse for the try's side than the best line's.
  const kp = kpResultChange(args);
  if (kp) return plain(kp.text);
  // A FORTRESS THE TRY LETS THEM BUILD: a piece down, and the board's reason
  // the extra material cannot win.
  const fort = fortressGained(args);
  if (fort) return plain(fortressLine(fort.fortress, fort.fortress.defender === args.student, fort.fen));
  const hit = wc.appeared.find((c) => c.inLine && c.fact.seat === theirSeat && c.fact.kind !== 'latent-danger' && ['threat', 'resource'].includes(PICTURE_ROLE[c.fact.computer] ?? 'board'));
  // A piece on a square, on the board the line reaches: stamped there. A
  // fact with no square (a standing, "they're worse, so…") is no board fact.
  // THE BOARD ON SCREEN IS NEVER ANCHORED: a standing that frames the fact
  // ("you're on top, but …") is about the screen, so a line's reason is the
  // fact without it (`onceSaid.text`).
  if (hit) return { text: hit.fact.onceSaid && hit.fact.onceSaid.claim.startsWith('standing:') ? hit.fact.onceSaid.text : hit.fact.text, board: hit.fact.squares.length > 0 && !STATE_NOT_BOARD.has(hit.fact.computer) ? hit.board : null };
  const alive = comesAlive(args);
  return plain(alive ? comesAliveText(alive, args.other) : null);
}
