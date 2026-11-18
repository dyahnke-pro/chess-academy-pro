// targetSelector — THE OPPONENT'S REAL TARGETS (WO-DANYA-READS-01 #3, Danya's
// articles: "his isolated pawn has become a shackling liability. It is this
// structural deficiency that Karpov must exploit", "removing the knight from
// c6 is tantamount to capitulation", "White has established formidable
// central pressure"). The read that names THEIR weakness — the pawn no pawn of
// theirs can ever guard — where the coach used to name the student's own
// ("Your dark squares are weak").
//
// A TARGET is a pawn of theirs that is isolated or backward (`findWeakPawns`,
// the one weak-pawn reader): no pawn can guard it, so pieces must. It is a
// target only when the student's pieces can get at it — one hits it now, or
// one can hit it next move from a square where it is not simply lost.
//
// THE COUNT is the one a strong player makes: attackers against guards, with
// the pieces stacked behind them on the same line (a rook behind a rook, the
// queen behind the rooks — the battery counts all of them, which `attackers`
// does not). It is said as the count and never as a verdict: winning the pawn
// is a plan, and the plan is the siege (`pressureOf`), which the engine's own
// line must play before it is said.
//
// THE SIEGE (Alekhine's gun): the move that brings another heavy piece to the
// file the target stands on, read against the engine's line after it — the
// rooks doubled, then the queen behind them. Said only for a move that cost
// nothing (the caller's engine gate) and only as far as the engine's own line
// builds it: never an instruction the engine did not play.
//
// PURE: chess.js and the board readers; no engine.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { findWeakPawns, legalSeeGainFor } from './positionReadingService';
import { mateInOneExists, pieceEnPrise } from './nextPlans';
import { isEndgameByMaterial } from './gamePhaseService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { countWord } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

/** Why no pawn can guard it. */
export type TargetWhy = 'isolated' | 'backward' | 'left-behind';

export interface Target {
  square: Square;
  why: TargetWhy;
  /** The mover's pieces that hit it now, the stacked ones behind included. */
  attackers: Square[];
  /** Their pieces that guard it, stacked ones included. */
  guards: Square[];
  /** The mover's pieces that can hit it next move, landing where they are not
   *  simply lost (the square each would go to). */
  reachers: Array<{ from: Square; to: Square }>;
  /** The file it stands on is open to the mover's heavy pieces from behind:
   *  no pawn of the mover's stands between the mover's back rank and it. */
  fileOpen: boolean;
}

const ORTHO: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT: ReadonlyArray<readonly [number, number]> = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

function sqAt(f: number, r: number): Square | null {
  return f >= 0 && f < 8 && r >= 0 && r < 8 ? (`${String.fromCharCode(97 + f)}${r + 1}` as Square) : null;
}

/**
 * Every piece of `color` that bears on `sq`, the ones stacked behind on the
 * same line included: down each line from the square, the first piece that
 * hits it and then every piece behind it of the same line kind (a rook or
 * queen behind on a file or rank, a bishop or queen behind on a diagonal),
 * until a piece that cannot see through. Knights hit directly. A pawn or a
 * king counts only next to it, and a slider may stand behind it.
 */
export function stackedAttackers(board: Chess, sq: Square, color: Color): Square[] {
  const f0 = sq.charCodeAt(0) - 97;
  const r0 = Number(sq[1]) - 1;
  const out: Square[] = [];
  for (const [df, dr] of KNIGHT) {
    const s = sqAt(f0 + df, r0 + dr);
    const p = s ? board.get(s) : null;
    if (s && p && p.color === color && p.type === 'n') out.push(s);
  }
  const walk = (dirs: ReadonlyArray<readonly [number, number]>, slider: ReadonlySet<PieceSymbol>, diag: boolean): void => {
    for (const [df, dr] of dirs) {
      let first = true;
      for (let k = 1; k < 8; k += 1) {
        const s = sqAt(f0 + df * k, r0 + dr * k);
        if (!s) break;
        const p = board.get(s);
        if (!p) continue;
        if (p.color !== color) break;
        if (slider.has(p.type)) { out.push(s); first = false; continue; }
        // A pawn or king next to it hits it once; a slider behind it still counts.
        if (first && k === 1 && p.type === 'k') { out.push(s); first = false; continue; }
        // A pawn hits only diagonally forward: a white pawn from below, a black one from above.
        if (first && k === 1 && diag && p.type === 'p' && (color === 'w' ? dr === -1 : dr === 1)) { out.push(s); first = false; continue; }
        break;
      }
    }
  };
  walk(ORTHO, new Set<PieceSymbol>(['r', 'q']), false);
  walk(DIAG, new Set<PieceSymbol>(['b', 'q']), true);
  return out;
}

/** No pawn of `me` stands on the target's file between the mover's back
 *  rank and the target: a heavy piece can come at it down the file. */
function fileOpenFor(board: Chess, target: Square, me: Color): boolean {
  const file = target[0];
  const tr = Number(target[1]);
  for (let r = 1; r <= 8; r += 1) {
    const between = me === 'w' ? r < tr : r > tr;
    if (!between) continue;
    const p = board.get(`${file}${r}` as Square);
    if (p && p.type === 'p' && p.color === me) return false;
  }
  return true;
}

/** The squares the mover's pieces can reach next move and hit `target` from,
 *  landing where the piece is not simply lost (the legal exchange there wins
 *  nothing for them). A capture is the other readers' (a trade, a win). */
function reachersOf(fen: string, target: Square, me: Color, already: ReadonlySet<Square>): Array<{ from: Square; to: Square }> {
  const them: Color = me === 'w' ? 'b' : 'w';
  const parts = fen.split(' ');
  if (parts[1] !== me) { parts[1] = me; parts[3] = '-'; }
  let board: Chess;
  try { board = new Chess(parts.join(' ')); } catch { return []; }
  if (board.inCheck()) return [];
  const out: Array<{ from: Square; to: Square }> = [];
  const seen = new Set<Square>();
  for (const m of board.moves({ verbose: true })) {
    if (m.piece === 'p' || m.piece === 'k' || m.captured || already.has(m.from) || seen.has(m.from)) continue;
    board.move(m);
    const hits = stackedAttackers(board, target, me).includes(m.to);
    const safe = hits && legalSeeGainFor(board.fen(), m.to, them) <= 0;
    board.undo();
    if (hits && safe) { out.push({ from: m.from, to: m.to }); seen.add(m.from); }
  }
  return out;
}

/** Pawns of `color` whose neighbours on the files beside it have all moved
 *  past it: a guard must stand one rank behind, and a pawn never goes back,
 *  so no pawn can ever guard it (a pawn with no neighbour at all is isolated,
 *  `findWeakPawns`' own). A neighbour level with it is not past it — the
 *  pawn can step up beside it and be guarded. */
function leftBehind(board: Chess, color: Color): Square[] {
  const pawns: Square[] = [];
  for (const row of board.board()) for (const c of row) if (c && c.type === 'p' && c.color === color) pawns.push(c.square);
  const ahead = (a: Square, b: Square): boolean => (color === 'w' ? Number(a[1]) > Number(b[1]) : Number(a[1]) < Number(b[1]));
  return pawns.filter((sq) => {
    const nb = pawns.filter((o) => Math.abs(o.charCodeAt(0) - sq.charCodeAt(0)) === 1);
    return nb.length > 0 && nb.every((o) => ahead(o, sq));
  });
}

/**
 * Their pawns no pawn can guard that the side `me` can get at, the best
 * target first: more attackers than guards first, then the most attackers,
 * then the most pieces that can join. Empty on a board where something
 * sharper is the story: a mate in one, a piece en prise, a check.
 */
export function opponentTargets(fen: string, me: Color): Target[] {
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  const out = weakPawnsOf(board, fen, me)
    .map(({ sq, why }) => targetAt(board, fen, sq, why, me))
    .filter((t): t is Target => !!t);
  if (out.length > 0 && sharperStory(board, fen)) return [];
  const edge = (t: Target): number => t.attackers.length - t.guards.length;
  return out.sort((a, b) => edge(b) - edge(a) || b.attackers.length - a.attackers.length || b.reachers.length - a.reachers.length || a.square.localeCompare(b.square));
}

/** A check, a mate in one, or a piece en prise: something sharper than a weak
 *  pawn is the board's story. */
function sharperStory(board: Chess, fen: string): boolean {
  return board.inCheck() || mateInOneExists(board) || pieceEnPrise(board, fen);
}

/** Their pawns no pawn can guard (the candidates, before any count). */
function weakPawnsOf(board: Chess, fen: string, me: Color): Array<{ sq: Square; why: TargetWhy }> {
  const them: Color = me === 'w' ? 'b' : 'w';
  const weak = findWeakPawns(fen, them);
  const out: Array<{ sq: Square; why: TargetWhy }> = [];
  const push = (sq: Square, why: TargetWhy): void => { if (!out.some((o) => o.sq === sq)) out.push({ sq, why }); };
  for (const sq of weak.isolated) push(sq, 'isolated');
  for (const sq of weak.backward) push(sq, 'backward');
  for (const sq of leftBehind(board, them)) push(sq, 'left-behind');
  return out;
}

/** One weak pawn read as a target for `me`, or null when it is no target:
 *  nothing can get at it, more guards than can come, or it is their king's
 *  cover with the queens on. */
function targetAt(board: Chess, fen: string, sq: Square, why: TargetWhy, me: Color): Target | null {
  const them: Color = me === 'w' ? 'b' : 'w';
  // A pawn beside their king with the queens on is the king's cover: the
  // king attack reads it, not the structure.
  const kingSq: Square | undefined = board.findPiece({ type: 'k', color: them })[0];
  const queensOn = board.findPiece({ type: 'q', color: me }).length > 0;
  if (queensOn && kingSq && Math.max(Math.abs(kingSq.charCodeAt(0) - sq.charCodeAt(0)), Math.abs(Number(kingSq[1]) - Number(sq[1]))) <= 1) return null;
  const attackers = stackedAttackers(board, sq, me);
  const guards = stackedAttackers(board, sq, them);
  const reachers = reachersOf(fen, sq, me, new Set(attackers));
  // Reachable only, against more guards than can come: not a target yet.
  if (attackers.length === 0 && (reachers.length === 0 || guards.length > reachers.length)) return null;
  return { square: sq, why, attackers, guards, reachers, fileOpen: fileOpenFor(board, sq, me) };
}

/** Past this edge (student's centipawns) a middlegame is about the attack or
 *  the tactic, not a weak pawn; an ending is still won by its weak pawns. */
const DECIDED_CP = 300;

/**
 * THE TARGET THE POSITION READ NAMES — the first of `opponentTargets`, read
 * only when it is the board's story: not when the engine's best move is a
 * check or a capture of something else (the sharper fact speaks), and not in
 * a middlegame already decided either way. `evalCp` is the student's (the
 * side `me`), null when no engine read is in hand; `bestUci` the engine's best
 * move on `fen`, or null.
 */
export function standingTarget(fen: string, me: Color, evalCp: number | null, bestUci: string | null): Target | null {
  if (!bestUci) return null;
  if (evalCp !== null && Math.abs(evalCp) >= DECIDED_CP && !isEndgameByMaterial(fen)) return null;
  let after: Chess;
  let m;
  try {
    after = new Chess(fen);
    if (after.turn() !== me) return null;
    m = after.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] });
  } catch { return null; }
  if (m.san.includes('+') || m.san.includes('#')) return null;
  // The engine's best goes after it: it takes the pawn, or the piece it moves
  // hits it from its new square — and the pieces that can come outnumber the
  // guards, so the pressure can tell.
  const targets = opponentTargets(fen, me).filter((t) => t.attackers.length + t.reachers.length > t.guards.length);
  const hit = targets.find((t) => (m.captured ? m.to === t.square
    : stackedAttackers(after, t.square, me).includes(m.to) && !t.attackers.includes(m.from)));
  return hit ?? null;
}

const WHY: Record<TargetWhy, string> = {
  isolated: 'it is isolated, so no pawn can ever guard it',
  backward: 'it is backward, so no pawn can ever guard it',
  'left-behind': 'the pawns beside it have moved past it, so no pawn can ever guard it',
};

/** "two of your pieces" / "your rook on d1". */
function piecesWords(board: Chess, squares: readonly Square[], owner: string): string {
  if (squares.length === 1) {
    const p = board.get(squares[0]);
    return `${owner} ${p ? NAME[p.type] : 'piece'} on ${squares[0]}`;
  }
  return `${countWord(squares.length)} of ${owner} pieces`;
}

/** The target said from the mover's seat (`whose`: 'your' when the target's
 *  attacker is the student). One idea a sentence; the count, never a verdict. */
export function targetLine(t: Target, fen: string, whose: 'your' | 'their'): string {
  const board = new Chess(fen);
  const other = whose === 'your' ? 'their' : 'your';
  const key = stemKeyOf(`${fen}|target|${t.square}`);
  const lead = rotateStem([
    `${openSentence(other)} pawn on ${t.square} is the target: ${WHY[t.why]}.`,
    `The target is ${other} pawn on ${t.square}: ${WHY[t.why]}.`,
  ], key);
  const guards = t.guards.length === 0 ? 'nothing guards it' : `${piecesWords(board, t.guards, other)} ${t.guards.length === 1 ? 'guards' : 'guard'} it`;
  const count = t.attackers.length > 0
    ? `${openSentence(piecesWords(board, t.attackers, whose))} ${t.attackers.length === 1 ? 'hits' : 'hit'} it, and ${guards}.`
    : t.reachers.length > 0
      ? `Nothing of ${whose === 'your' ? 'yours' : 'theirs'} hits it yet, but ${piecesWords(board, t.reachers.map((r) => r.from), whose)} can get at it next move. ${openSentence(guards)}.`
      : '';
  return `${lead} ${count}`.trim();
}

/** The squares the target read lights: the pawn, its attackers and guards. */
export function targetSquares(t: Target): Square[] {
  return [...new Set([t.square, ...t.attackers, ...t.guards])];
}

// ── THE PRESSURE, AND THE SIEGE: heavy pieces stacked on the target's file ──

/** The formation the mover's heavy pieces make on one file. */
export type SiegeForm = 'doubled' | 'tripled' | 'gun';

export interface TargetPressure {
  target: Square;
  why: TargetWhy;
  file: string;
  /** The move that brings a heavy piece to the file. */
  moved: { piece: PieceSymbol; from: Square; to: Square };
  /** The formation the engine's line builds on the target's file (null: the
   *  move adds an attacker, no stack), and the move that completes it when it
   *  is not this one (SAN, from the mover's seat). */
  form: SiegeForm | null;
  completedBy: string | null;
  /** The heavy pieces on the file once it is built, front to back. */
  stack: Square[];
  attackers: number;
  guards: number;
  squares: Square[];
  key: string;
}

/** The mover's heavy pieces on `file` that see down it toward `target`,
 *  front (nearest the target) to back. */
function heavyStack(board: Chess, file: string, target: Square, me: Color): Square[] {
  const tr = Number(target[1]);
  const out: Square[] = [];
  const ranks = me === 'w' ? [...Array(tr - 1).keys()].map((i) => tr - 1 - i) : [...Array(8 - tr).keys()].map((i) => tr + 1 + i);
  for (const r of ranks) {
    const s = `${file}${r}` as Square;
    const p = board.get(s);
    if (!p) continue;
    if (p.color === me && (p.type === 'r' || p.type === 'q')) { out.push(s); continue; }
    break;
  }
  return out;
}

function formOf(board: Chess, stack: readonly Square[]): SiegeForm | null {
  if (stack.length < 2) return null;
  const types = stack.map((s) => board.get(s)?.type);
  const rooks = types.filter((t) => t === 'r').length;
  // Alekhine's gun: the rooks in front, the queen behind them.
  if (rooks >= 2 && types[types.length - 1] === 'q') return 'gun';
  if (stack.length >= 3) return 'tripled';
  return 'doubled';
}

/**
 * THE PRESSURE A MOVE ADDS: the move `san` on `fenBefore` brings a piece to
 * hit a target of theirs (`opponentTargets`) it did not hit before, with the
 * pieces that can come outnumbering its guards. When the piece is a rook or
 * the queen on the target's own file, the engine's line after the move
 * (`lineAfter`, from the board after it, the reply first) is read for the
 * siege it builds there — the rooks doubled, then the queen behind them —
 * the mover's moves only, while the pawn stands. The caller gates the move on
 * the engine (it cost nothing). Null otherwise.
 */
export function pressureOf(fenBefore: string, san: string, lineAfter: readonly string[]): TargetPressure | null {
  let before: Chess;
  let after: Chess;
  let mv;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); mv = after.move(san); } catch { return null; }
  if (mv.piece === 'k' || mv.captured || mv.promotion || after.inCheck()) return null;
  const me = mv.color;
  // Cheap first: the weak pawns the moved piece hits after the move.
  const hitNow = weakPawnsOf(before, fenBefore, me).filter((w) => stackedAttackers(after, w.sq, me).includes(mv.to));
  if (hitNow.length === 0 || sharperStory(before, fenBefore)) return null;
  for (const w of hitNow) {
    const t = targetAt(before, fenBefore, w.sq, w.why, me);
    if (!t) continue;
    if (t.attackers.length + t.reachers.length <= t.guards.length) continue;
    const file = t.square[0];
    const onFile = (mv.piece === 'r' || mv.piece === 'q') && mv.to[0] === file && t.fileOpen;
    const siege = onFile ? siegeWalk(after, file, t.square, me, lineAfter) : null;
    // A new attacker, or a heavy piece stepping up its file so the line can
    // stack another behind it (the rook from d1 to d3, then the other to d1).
    const newHit = !t.attackers.includes(mv.from);
    const grows = !!siege && siege.stack.length > heavyStack(before, file, t.square, me).length;
    if (!newHit && !grows) continue;
    const finalBoard = new Chess(siege?.fen ?? after.fen());
    return {
      target: t.square, why: t.why, file,
      moved: { piece: mv.piece, from: mv.from, to: mv.to },
      form: siege?.form ?? null, completedBy: siege?.by ?? null, stack: siege?.stack ?? [],
      attackers: stackedAttackers(finalBoard, t.square, me).length,
      guards: stackedAttackers(finalBoard, t.square, me === 'w' ? 'b' : 'w').length,
      squares: [...new Set([t.square, mv.from, mv.to, ...(siege?.stack ?? [])])],
      key: `pressure:${t.square}`,
    };
  }
  return null;
}

const FORM_RANK: Record<SiegeForm, number> = { doubled: 1, tripled: 2, gun: 3 };

/** The biggest stack the mover's heavy pieces make on `file` against
 *  `target`, on the board after the move or after one of the mover's moves in
 *  the engine's line — read while the pawn stands and nothing is taken on the
 *  file. Null when no stack of two forms. */
function siegeWalk(after: Chess, file: string, target: Square, me: Color, lineAfter: readonly string[]): { stack: Square[]; form: SiegeForm; by: string | null; fen: string } | null {
  const start = heavyStack(after, file, target, me);
  const f0 = formOf(after, start);
  let best = f0 ? { stack: start, form: f0, by: null as string | null, fen: after.fen() } : null;
  const walk = new Chess(after.fen());
  for (let k = 0; k < lineAfter.length && k < 8; k += 1) {
    const u = lineAfter[k];
    let m;
    try { m = walk.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    if (m.captured && m.to[0] === file) break;
    const tp = walk.get(target);
    if (!tp || tp.type !== 'p' || tp.color === me) break;
    if (m.color !== me) continue;
    const st = heavyStack(walk, file, target, me);
    const f = formOf(walk, st);
    if (f && (!best || FORM_RANK[f] > FORM_RANK[best.form])) best = { stack: st, form: f, by: `${me === 'b' ? '…' : ''}${m.san}`, fen: walk.fen() };
  }
  return best;
}

/** What the stack is, said as a player says it. */
const FORM_WORDS: Record<SiegeForm, string> = {
  doubled: 'the rooks are doubled on it',
  tripled: 'three heavy pieces are stacked on it',
  gun: "it is Alekhine's gun: both rooks in front, the queen behind them",
};

/** The pressure said from the mover's seat. One idea a sentence. */
export function pressureLine(s: TargetPressure, fenBefore: string, whose: 'your' | 'their'): string {
  const other = whose === 'your' ? 'their' : 'your';
  const key = stemKeyOf(`${fenBefore}|pressure|${s.target}`);
  const piece = `${whose} ${NAME[s.moved.piece]}`;
  const lead = s.form && s.moved.from[0] === s.file
    ? `${openSentence(piece)} steps up the ${s.file}-file against ${other} pawn on ${s.target}, making room behind it.`
    : s.form
    ? rotateStem([
      `${openSentence(piece)} comes to the ${s.file}-file, against ${other} pawn on ${s.target}.`,
      `${openSentence(piece)} joins the pressure on ${other} pawn on ${s.target}, down the ${s.file}-file.`,
    ], key)
    : rotateStem([
      `${openSentence(piece)} goes after ${other} pawn on ${s.target}.`,
      `${openSentence(piece)} adds pressure on ${other} pawn on ${s.target}.`,
    ], key);
  const why = `${openSentence(WHY[s.why])} — pieces have to.`;
  const build = !s.form ? '' : s.completedBy ? ` After ${s.completedBy}, ${FORM_WORDS[s.form]}.` : ` Now ${FORM_WORDS[s.form]}.`;
  const tally = `That makes ${countWord(s.attackers)} attacker${s.attackers === 1 ? '' : 's'} against ${countWord(s.guards)} guard${s.guards === 1 ? '' : 's'}.`;
  return `${lead} ${why}${build} ${tally}`;
}
