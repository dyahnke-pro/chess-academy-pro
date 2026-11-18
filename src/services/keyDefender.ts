// keyDefender — THE PIECE HOLDING THEIR POSITION TOGETHER, AND THE TRADE THAT
// TAKES IT OFF (Danya, "The Positional Threat", Naroditsky–Puranik 2015:
// "exchanging your opponent's strongest (or most important) piece often
// removes the cog that makes his position run … the unsung hero was the
// queen, which covered all the holes and kept the passed a-pawn in check. As
// soon as it was removed, Black's pieces turned into passive spectators").
//
// THE DEFENDER, read on the board: a piece of theirs (not the king, not a
// pawn) that is the ONLY piece of theirs — pawns included — doing a job:
//  · man    — a man of theirs that is safe now and is won by the legal
//             exchange on the board with the defender and the trading piece
//             both gone;
//  · king   — two or more squares next to their king that the trader's side
//             still hits once the trade is over, guarded by the defender alone;
//  · holes  — two or more holes in their camp (`campHoles`) the trader's side
//             has a piece to use, guarded by the defender alone;
//  · passer — a square on the path of the trader's passed pawn that the
//             defender alone stops (it stands on it, or guards it alone).
//
// THE TRADE, either seat: the move takes the defender with a piece of the
// same value and the legal exchange on that square is even, or it brings a
// piece of the same value onto a line with the defender so that the trade is
// on the board (the capture is even) where it was not before.
//
// THE ENGINE HAS TO AGREE that the trade helps the side making it: the move
// costs its mover less than `SOUND_CP`, and the engine's score after it has
// the trader at least `HELPS_CP` up. A standing read (`keyDefenderPlan`) needs
// the trade inside the engine's best line, with the same bar on its score.
// No engine read, nothing said.
//
// PURE: chess.js, the legal exchange and the hole reader.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor, signedLegalSeeFor, campHoles } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { pawnsOf } from './boardStructure';
import { seatCp } from './winChance';
import type { AnalysisLine } from '../types';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { PIECE_WORD, other } from './tradeWords';

/** The move cost its mover less than this: the engine calls it sound. */
const SOUND_CP = 50;
/** The trader is at least this far up after it: the trade helps them. */
export const HELPS_CP = 50;
/** A standing read looks this many of the trader's own moves into the line. */
const PLAN_MOVES = 3;
/** Squares next to the king, or holes, that make a job. */
const MIN_SQUARES = 2;
/** How far ahead on a passer's path the defender has to be stopping it. */
const PATH_AHEAD = 3;

export type DefenderJob =
  | { kind: 'man'; square: Square; piece: PieceSymbol }
  | { kind: 'king'; squares: Square[] }
  | { kind: 'holes'; squares: Square[] }
  | { kind: 'passer'; pawn: Square; square: Square };

export interface KeyDefender {
  /** The defender's side. */
  side: Color;
  piece: PieceSymbol;
  square: Square;
  jobs: DefenderJob[];
}

export interface DefenderTrade {
  defender: KeyDefender;
  /** The trading piece and the square it stands on when the trade is on. */
  trader: { piece: PieceSymbol; square: Square };
  /** 'takes': the move takes it now; 'offers': the trade is on the board. */
  how: 'takes' | 'offers';
  /** The move that does it. */
  san: string;
  key: string;
}

const boardOf = (fen: string): Chess | null => { try { return new Chess(fen); } catch { return null; } };
const sameValue = (a: PieceSymbol, b: PieceSymbol): boolean => (MATERIAL_VALUE[a] ?? 0) === (MATERIAL_VALUE[b] ?? -1);

/** `fen` with the pieces on `squares` lifted off and `toMove` to move, or null. */
function without(fen: string, squares: readonly Square[], toMove: Color): string | null {
  const c = boardOf(fen);
  if (!c) return null;
  for (const s of squares) c.remove(s);
  const parts = c.fen().split(' ');
  parts[1] = toMove;
  parts[3] = '-';
  const f = parts.join(' ');
  const ok = boardOf(f);
  // A board where the side not to move stands in check cannot exist.
  if (!ok) return null;
  const flip = boardOf([...parts.slice(0, 1), other(toMove), ...parts.slice(2)].join(' '));
  if (flip?.inCheck()) return null;
  return f;
}

function kingOf(c: Chess, color: Color): Square | null {
  return (c.board().flat().find((x) => x && x.type === 'k' && x.color === color)?.square ?? null);
}

function around(king: Square): Square[] {
  const out: Square[] = [];
  const f = king.charCodeAt(0); const r = Number(king[1]);
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (!df && !dr) continue;
      const nf = f + df; const nr = r + dr;
      if (nf < 97 || nf > 104 || nr < 1 || nr > 8) continue;
      out.push(`${String.fromCharCode(nf)}${nr}` as Square);
    }
  }
  return out;
}

/** The ONLY piece of `side` guarding `sq` on `c` is the one on `d`. */
const soleGuard = (c: Chess, sq: Square, side: Color, d: Square): boolean => {
  const a = c.attackers(sq, side);
  return a.length === 1 && a[0] === d;
};

/** The jobs the piece on `d` (of `side`) does alone, on `fen`, with the
 *  trading piece on `traderSq` (null: none named yet) lifted off with it. */
export function defenderJobs(fen: string, d: Square, traderSq: Square | null): DefenderJob[] {
  const c = boardOf(fen);
  const piece = c?.get(d);
  if (!c || !piece || piece.type === 'k' || piece.type === 'p') return [];
  const side = piece.color;
  const them = other(side);
  const jobs: DefenderJob[] = [];
  // MAN: safe now, won once the defender and the trader are both gone.
  const gone = without(fen, traderSq ? [d, traderSq] : [d], them);
  if (gone) {
    for (const cell of c.board().flat()) {
      if (!cell || cell.color !== side || cell.type === 'k' || cell.square === d) continue;
      if (!c.attackers(cell.square, side).includes(d)) continue;
      if (legalSeeGainFor(fen, cell.square, them) > 0) continue;
      if (legalSeeGainFor(gone, cell.square, them) <= 0) continue;
      jobs.push({ kind: 'man', square: cell.square, piece: cell.type });
    }
  }
  // KING: squares next to their king they still hit after the trade, held by it alone.
  const king = kingOf(c, side);
  if (king && gone) {
    const g = boardOf(gone);
    const sq = around(king).filter((s) => {
      const occ = c.get(s);
      if (occ && occ.color === side) return false;
      return soleGuard(c, s, side, d) && !!g && g.attackers(s, them).length > 0;
    });
    if (sq.length >= MIN_SQUARES) jobs.push({ kind: 'king', squares: sq });
  }
  // HOLES: holes in their camp the trader's side can use, held by it alone.
  {
    const holes = campHoles(fen, side, them).filter((s) => {
      const occ = c.get(s);
      return !(occ && occ.color === side) && soleGuard(c, s, side, d);
    });
    if (holes.length >= MIN_SQUARES) jobs.push({ kind: 'holes', squares: holes });
  }
  // PASSER: the trader's passed pawn, stopped on its path by this piece alone.
  for (const p of pawnsOf(fen, them).passed) {
    const file = p[0];
    const rank = Number(p[1]);
    const step = them === 'w' ? 1 : -1;
    for (let k = 1; k <= PATH_AHEAD; k += 1) {
      const r = rank + k * step;
      if (r < 1 || r > 8) break;
      const s = `${file}${r}` as Square;
      const occ = c.get(s);
      if (s === d || (!occ && soleGuard(c, s, side, d))) { jobs.push({ kind: 'passer', pawn: p as Square, square: s }); break; }
      if (occ) break;
    }
  }
  return jobs;
}

/** What a job is worth, most first: a pawn that queens, a man that falls,
 *  the king's squares, the holes. The first is said as what the trade leaves. */
const JOB_ORDER: Record<DefenderJob['kind'], number> = { passer: 0, man: 1, king: 2, holes: 3 };

/** The piece on `d` holds their position together: it does a job no other
 *  piece of theirs does. Null when it does none. */
export function keyDefenderAt(fen: string, d: Square, traderSq: Square | null): KeyDefender | null {
  const c = boardOf(fen);
  const p = c?.get(d);
  if (!c || !p) return null;
  const jobs = [...defenderJobs(fen, d, traderSq)].sort((a, b) => JOB_ORDER[a.kind] - JOB_ORDER[b.kind]);
  return jobs.length ? { side: p.color, piece: p.type, square: d, jobs } : null;
}

/** Is a trade of the piece on `d` for a piece of the same value on the board
 *  for the side to move on `c` — the least valuable legal capture there is
 *  of that value and the legal exchange is even? The trader's square, or null. */
function tradeOn(c: Chess, d: Square): Square | null {
  const dp = c.get(d);
  if (!dp) return null;
  const caps = c.moves({ verbose: true }).filter((m) => m.to === d && m.captured);
  if (caps.length === 0) return null;
  const cheapest = [...caps].sort((x, y) => (MATERIAL_VALUE[x.piece] ?? 0) - (MATERIAL_VALUE[y.piece] ?? 0))[0];
  if (!sameValue(cheapest.piece, dp.type)) return null;
  if (signedLegalSeeFor(c.fen(), d, c.turn()) !== 0) return null;
  return cheapest.from;
}

/** The move `san` on `fenBefore` takes, or puts on, the trade of a key
 *  defender of the other side. Board only — the engine's word is the
 *  caller's (`defenderTradeMade`). */
export function defenderTradeBy(fenBefore: string, san: string): DefenderTrade | null {
  const c = boardOf(fenBefore);
  if (!c) return null;
  let mv: Move;
  try { mv = c.move(san); } catch { return null; }
  const me = mv.color;
  const them = other(me);
  // TAKES: the move takes a piece of the same value, and the exchange is even.
  if (mv.captured) {
    if (!sameValue(mv.piece, mv.captured) || mv.captured === 'p') return null;
    if (signedLegalSeeFor(fenBefore, mv.to, me) !== 0) return null;
    const def = keyDefenderAt(fenBefore, mv.to, mv.from);
    if (!def) return null;
    return { defender: def, trader: { piece: mv.piece, square: mv.from }, how: 'takes', san: mv.san, key: `key-defender:${mv.to}` };
  }
  if (mv.piece === 'k' || mv.piece === 'p' || c.inCheck()) return null;
  // OFFERS: after the move the moved piece could trade the defender evenly
  // (the side to move then — the mover again — read as if to move).
  const asMe = boardOf([c.fen().split(' ')[0], me, '-', '-', '0', '1'].join(' '));
  if (!asMe) return null;
  const before = boardOf([fenBefore.split(' ')[0], me, '-', '-', '0', '1'].join(' '));
  for (const cell of c.board().flat()) {
    if (!cell || cell.color !== them || cell.type === 'k' || cell.type === 'p' || !sameValue(cell.type, mv.piece)) continue;
    if (!asMe.attackers(cell.square, me).includes(mv.to)) continue;
    if (tradeOn(asMe, cell.square) !== mv.to) continue;
    // New: the moved piece could not take it from where it stood.
    if (before && before.attackers(cell.square, me).includes(mv.from)) continue;
    const def = keyDefenderAt(fenBefore, cell.square, mv.from);
    if (!def) continue;
    return { defender: def, trader: { piece: mv.piece, square: mv.to }, how: 'offers', san: mv.san, key: `key-defender:${cell.square}` };
  }
  return null;
}

/** THE MOVE, with the engine's word: `costCp` what it cost its mover, and
 *  `after` the engine's best line after it (the reply first). Both seats. */
export function defenderTradeMade(fenBefore: string, san: string, costCp: number | null, after: AnalysisLine | null): DefenderTrade | null {
  if (costCp === null || !after || costCp >= SOUND_CP) return null;
  const mover = (fenBefore.split(' ')[1] === 'b' ? 'b' : 'w') as Color;
  if (seatCp(after, mover) < HELPS_CP) return null;
  return defenderTradeBy(fenBefore, san);
}

/** The jobs of `now` the defender still does at the trade (`then`): a man
 *  still guarded alone, a passer still stopped, and of the squares by the
 *  king or the holes, those still held alone — two or more. */
function stillDone(now: readonly DefenderJob[], then: readonly DefenderJob[]): DefenderJob[] {
  const out: DefenderJob[] = [];
  for (const j of now) {
    if (j.kind === 'man') { if (then.some((x) => x.kind === 'man' && x.square === j.square)) out.push(j); continue; }
    if (j.kind === 'passer') { if (then.some((x) => x.kind === 'passer' && x.pawn === j.pawn)) out.push(j); continue; }
    const kept = then.find((x): x is typeof j => x.kind === j.kind);
    const squares = kept ? j.squares.filter((q) => kept.squares.includes(q)) : [];
    if (squares.length >= MIN_SQUARES) out.push({ kind: j.kind, squares });
  }
  return out;
}

/** THE STANDING READ: on `fen` (side to move the trader), the engine's best
 *  line takes or offers the trade of a key defender within the trader's
 *  first `PLAN_MOVES` moves, and keeps the trader `HELPS_CP` up. The defender
 *  is judged on THIS board — it stands on its square until the trade, and the
 *  jobs are the ones it does now, with the trader lifted off from where it
 *  stands now — so nothing is said about a board the student cannot see. */
export function keyDefenderPlan(fen: string, best: AnalysisLine | null): (DefenderTrade & { plies: number; sans: string[] }) | null {
  if (!best || best.moves.length === 0) return null;
  const c = boardOf(fen);
  if (!c) return null;
  const me = c.turn();
  if (seatCp(best, me) < HELPS_CP) return null;
  const sans: string[] = [];
  // Where each piece now on a square started the line.
  const origin = new Map<Square, Square>();
  const touched = new Set<Square>();
  let mine = 0;
  for (let i = 0; i < best.moves.length && mine < PLAN_MOVES; i += 1) {
    const u = best.moves[i];
    const fenNow = c.fen();
    let m: Move;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
    sans.push(m.san);
    const from = origin.get(m.from) ?? m.from;
    if (m.color === me) {
      mine += 1;
      const t = defenderTradeBy(fenNow, m.san);
      if (t && !touched.has(t.defender.square)) {
        const def = keyDefenderAt(fen, t.defender.square, from);
        const here = new Chess(fen).get(t.defender.square);
        const jobs = def ? stillDone(def.jobs, t.defender.jobs) : [];
        if (def && here && here.type === t.defender.piece && here.color === t.defender.side && jobs.length) {
          return { ...t, defender: { ...def, jobs }, plies: i + 1, sans };
        }
      }
    }
    origin.delete(m.from);
    origin.set(m.to, from);
    touched.add(m.from);
    touched.add(m.to);
  }
  return null;
}

/** The squares a read shows: the defender, the trader, and every job's square. */
export function defenderSquares(t: DefenderTrade): Square[] {
  const out = new Set<Square>([t.defender.square, t.trader.square]);
  for (const j of t.defender.jobs) {
    if (j.kind === 'man') out.add(j.square);
    else if (j.kind === 'passer') { out.add(j.pawn); out.add(j.square); }
    else for (const s of j.squares) out.add(s);
  }
  return [...out];
}

/** What the defender does alone, in words, from the defender's owner's seat
 *  (`own`: "their" / "your"; `opp`: the trader's). */
function jobWords(j: DefenderJob, own: string, opp: string): string {
  switch (j.kind) {
    case 'man': return `guards ${own} ${PIECE_WORD[j.piece]} on ${j.square}`;
    case 'king': return `covers ${andList(j.squares)} next to ${own} king`;
    case 'holes': return `covers the holes on ${andList(j.squares)}`;
    case 'passer': return `stands in the way of ${opp} passed pawn on ${j.pawn}`;
  }
}

/** Said from the student's seat: the trader is the student (`you`) or not.
 *  `standing`: a plan read off the board, not a move just played. */
export function keyDefenderLine(t: DefenderTrade, traderIsStudent: boolean, standing: boolean, fen: string): string {
  const own = traderIsStudent ? 'their' : 'your';
  const opp = traderIsStudent ? 'your' : 'their';
  const Own = traderIsStudent ? 'Their' : 'Your';
  const d = `${PIECE_WORD[t.defender.piece]} on ${t.defender.square}`;
  // Two passers it stops are one job said once ("your passed pawns on g7 and f6").
  const passers = t.defender.jobs.filter((j): j is Extract<DefenderJob, { kind: 'passer' }> => j.kind === 'passer').map((j) => j.pawn);
  const said = t.defender.jobs.filter((j) => j.kind !== 'passer').map((j) => jobWords(j, own, opp));
  if (passers.length) said.unshift(`stands in the way of ${opp} passed ${passers.length > 1 ? 'pawns' : 'pawn'} on ${andList(passers)}`);
  const jobs = andList(said);
  const lead = t.defender.jobs[0];
  // What the trade leaves, said from the trader's side — the first job's.
  const afterWords = (mine: boolean): string => {
    const yourOwn = mine ? 'your' : 'their';
    const theirOwn = mine ? 'their' : 'your';
    switch (lead.kind) {
      case 'man': return `Once it's gone, ${theirOwn} ${PIECE_WORD[lead.piece]} on ${lead.square} falls.`;
      case 'king': return `Once it's gone, ${theirOwn} king loses its only guard on those squares.`;
      case 'holes': return `Once it's gone, those holes are ${mine ? 'yours' : 'theirs'} to use.`;
      case 'passer': return `Once it's gone, ${yourOwn} pawn on ${lead.pawn} can run.`;
    }
  };
  const key = stemKeyOf(`${fen}|${t.key}`);
  if (!traderIsStudent) {
    return rotateStem([
      `${Own} ${d} is the piece holding your position together: it ${jobs}. ${standing ? 'Their plan is to trade it off.' : 'They\'re trading it off.'} ${afterWords(false)}`,
      `They're going after your ${d}. It ${jobs}, and no other piece of yours does. ${afterWords(false)}`,
    ], key);
  }
  const verb = standing ? 'The plan is to trade it off.' : t.how === 'takes' ? 'This trade takes it off.' : 'Now the trade is on the board.';
  return rotateStem([
    `${Own} ${d} is the piece holding their position together: it ${jobs}. ${verb} ${afterWords(true)}`,
    `The ${PIECE_WORD[t.defender.piece]} on ${t.defender.square} does a job no other piece of theirs does: it ${jobs}. ${verb} ${afterWords(true)}`,
  ], key);
}
