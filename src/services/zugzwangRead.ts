// zugzwangRead — THE SIDE TO MOVE WOULD RATHER PASS, read without the network
// (WO-DANYA-READS-01 #5, Danya: "White has no choice but to move his king —
// but moving it in any direction is suicidal"; "this straightforward move
// already places White in Zugzwang").
//
// The tablebase read (`zugzwang.ts`) is exact but async and seven pieces at
// most; this one runs where the board is read synchronously, two ways:
//
//   engine — the surface hands in the engine's lines for the board AND for the
//            same board with the other side to move (the null-move read every
//            reading surface already makes, `passBefore` / `passAfter`). The
//            side to move is in zugzwang when its best move scores worse than
//            passing would, across a result band (win / draw / loss) — the
//            same test as the tablebase, on the engine's numbers.
//   count  — no engine read, kings and pawns only: a bounded material search
//            (chess.js, three plies and the captures after them). Every move
//            the side to move has gives up material, while passing gives up
//            nothing. That is the claim and all of it: "every move drops a
//            pawn", never a result.
//
// A board in check has no pass, so no zugzwang. Claims share the tablebase
// reader's key (`zugzwang:<board> <side>`), so a turn says it once.
//
// PURE: chess.js and the lines handed in.
import { Chess, type Color } from 'chess.js';
import type { AnalysisLine } from '../types';
import type { Proof } from './proof';
import { passFen } from './zugzwang';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { seatCp } from './winChance';
import { MATERIAL_VALUE } from './pieceValues';

/** Lines as the engine reads them: White's view, a mate as `mate`. */
type Lines = ReadonlyArray<Pick<AnalysisLine, 'evaluation' | 'mate' | 'moves'>>;

/** A result band edge, centipawns: beyond it a side is winning. */
const BAND_CP = 200;
/** Level by the read: within this of zero. */
const DRAW_CP = 80;
/** The least gap between moving and passing the engine path claims. */
const GAP_CP = 150;

export interface ZugzwangSync {
  /** The side to move — the one in zugzwang. */
  side: Color;
  source: 'engine' | 'count';
  /** Engine: the band on move and if it could pass, from `side`'s view
   *  (-1 loss, 0 draw, 1 win). Count: null. */
  onMove: number | null;
  ifPassed: number | null;
  /** Count: material every move gives up (pawns), at least one. */
  drops: number | null;
  /** Count: true when, could they pass, the OTHER side would be the one to
   *  drop material — mutual zugzwang, whoever moves loses. */
  mutual: boolean;
  key: string;
}

function cpOf(l: Pick<AnalysisLine, 'evaluation' | 'mate'>): number {
  return l.mate ? seatCp({ evaluation: l.evaluation, mate: l.mate }, 'w') : l.evaluation;
}
/** The result band: a win past `BAND_CP`, a draw within `DRAW_CP` of level,
 *  and nothing between — "+1.3" is neither a draw nor a win, so a gap that
 *  lands there claims no result. */
function band(cp: number): number | null { return cp >= BAND_CP ? 1 : cp <= -BAND_CP ? -1 : Math.abs(cp) <= DRAW_CP ? 0 : null; }

const VALUE = MATERIAL_VALUE;

function materialFor(c: Chess, side: Color): number {
  let s = 0;
  for (const cell of c.board().flat()) if (cell) s += (cell.color === side ? 1 : -1) * VALUE[cell.type];
  return s;
}

/** The search's node budget: past it, nothing is claimed. */
const NODE_BUDGET = 4000;
let nodes = 0;
class Budget extends Error {}
const MATE = 100;
const Q_DEPTH = 4;

/** Captures and promotions only, standing pat — material from the side to
 *  move. No legal move: mate or stalemate (a draw scores level). */
function quiesce(c: Chess, alpha: number, beta: number, qd: number): number {
  nodes += 1;
  if (nodes > NODE_BUDGET) throw new Budget();
  const ms = c.moves({ verbose: true });
  if (ms.length === 0) return c.inCheck() ? -MATE : 0;
  const stand = materialFor(c, c.turn());
  if (qd === 0 || stand >= beta) return stand;
  let a = Math.max(alpha, stand);
  for (const m of ms) {
    if (!m.captured && !m.promotion) continue;
    if (m.promotion && m.promotion !== 'q') continue;
    c.move(m);
    const v = -quiesce(c, -beta, -a, qd - 1);
    c.undo();
    if (v >= beta) return v;
    if (v > a) a = v;
  }
  return a;
}

function search(c: Chess, depth: number, alpha: number, beta: number): number {
  nodes += 1;
  if (nodes > NODE_BUDGET) throw new Budget();
  if (depth === 0) return quiesce(c, alpha, beta, Q_DEPTH);
  const ms = c.moves({ verbose: true });
  if (ms.length === 0) return c.inCheck() ? -MATE : 0;
  // Captures and promotions first.
  ms.sort((x, y) => Number(!!y.captured || !!y.promotion) - Number(!!x.captured || !!x.promotion));
  let a = alpha;
  for (const m of ms) {
    if (m.promotion && m.promotion !== 'q') continue;
    c.move(m);
    const v = -search(c, depth - 1, -beta, -a);
    c.undo();
    if (v >= beta) return v;
    if (v > a) a = v;
  }
  return a;
}

const DEPTH = 3;

/** Kings and pawns only, at least one pawn, at most this many men. */
const COUNT_MAX_MEN = 8;

/** The count is a pure function of the board: kept per board, so the move
 *  read and the position read of one board search once. */
const COUNT_CACHE = new Map<string, { drops: number; mutual: boolean } | null>();
const COUNT_CACHE_MAX = 256;

function countPath(fen: string): { drops: number; mutual: boolean } | null {
  const k = fen.split(' ').slice(0, 4).join(' ');
  if (COUNT_CACHE.has(k)) return COUNT_CACHE.get(k) ?? null;
  const r = countPathRaw(fen);
  if (COUNT_CACHE.size >= COUNT_CACHE_MAX) COUNT_CACHE.delete(COUNT_CACHE.keys().next().value as string);
  COUNT_CACHE.set(k, r);
  return r;
}

function countPathRaw(fen: string): { drops: number; mutual: boolean } | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const cells = c.board().flat().filter(Boolean);
  if (cells.some((x) => x && x.type !== 'k' && x.type !== 'p')) return null;
  if (!cells.some((x) => x?.type === 'p') || cells.length > COUNT_MAX_MEN) return null;
  const pf = passFen(fen);
  if (!pf) return null;
  let p: Chess;
  try { p = new Chess(pf); } catch { return null; }
  // A pass board with the mover's king attacked cannot exist.
  if (p.inCheck()) return null;
  const now = materialFor(c, c.turn());
  nodes = 0;
  let onMove: number; let ifPassed: number;
  try {
    onMove = search(c, DEPTH, -1000, 1000);
    ifPassed = -search(p, DEPTH, -1000, 1000);
  } catch (e) {
    if (e instanceof Budget) return null;
    throw e;
  }
  // Moving costs material; passing would cost nothing.
  const drops = now - onMove;
  if (drops < 1 || ifPassed < now || ifPassed >= MATE || onMove <= -MATE) return null;
  return { drops, mutual: ifPassed > now };
}

/** ZUGZWANG for the side to move on `fen`, or null. `reads`: the engine's
 *  lines for the board (`lines`) and for it with the other side to move
 *  (`pass`), White's view; null (or either empty) reads by the count. */
export function zugzwangOn(fen: string, reads: { lines: Lines; pass: Lines } | null): ZugzwangSync | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck() || c.isGameOver()) return null;
  const side = c.turn();
  const key = `zugzwang:${fen.split(' ').slice(0, 2).join(' ')}`;
  if (reads && reads.lines.length > 0 && reads.pass.length > 0) {
    if (!passFen(fen)) return null;
    const sign = side === 'w' ? 1 : -1;
    const moveCp = cpOf(reads.lines[0]) * sign;
    const passCp = cpOf(reads.pass[0]) * sign;
    if (passCp - moveCp < GAP_CP) return null;
    const onMove = band(moveCp); const ifPassed = band(passCp);
    if (onMove === null || ifPassed === null || onMove >= ifPassed) return null;
    return { side, source: 'engine', onMove, ifPassed, drops: null, mutual: false, key };
  }
  const count = countPath(fen);
  if (count === null) return null;
  return { side, source: 'count', onMove: null, ifPassed: null, drops: count.drops, mutual: count.mutual, key };
}

const RESULT = ['loses', 'is only a draw', 'wins'];
const PASS = ['', 'hold the draw', 'win'];

function dropWords(n: number): string {
  return n === 1 ? 'a pawn' : n === 2 ? 'two pawns' : 'material';
}

/** ZUGZWANG IN WORDS, from the student's seat. `made`: a move just put the
 *  side to move in it (said of the move), else the board as it stands. */
export function zugzwangSyncLine(z: ZugzwangSync, student: Color, made: boolean): string {
  const mine = z.side === student;
  const k = stemKeyOf(z.key);
  const lead = made
    ? (mine ? 'Their move puts you in zugzwang.' : rotateStem(['That puts them in zugzwang.', 'Zugzwang: that move leaves them nothing good to play.'], k))
    : (mine ? rotateStem(['You are in zugzwang.', 'Zugzwang, and it is on you.'], k) : rotateStem(['They are in zugzwang.', 'Zugzwang: it is their move, and that is their problem.'], k));
  if (z.source === 'count') {
    const d = dropWords(z.drops ?? 1);
    if (z.mutual) {
      return mine
        ? `${lead} Every move you have gives up ${d}, and if it were their move, they would be the ones to lose one. Whoever has to move loses a pawn.`
        : `${lead} Every move they have gives up ${d}, and if it were your move, you would be the one to lose one. Whoever has to move loses a pawn.`;
    }
    return mine
      ? `${lead} Every move you have gives up ${d}. If you could pass, nothing would drop.`
      : `${lead} Every move they have gives up ${d}. If they could pass, nothing would drop.`;
  }
  const on = RESULT[(z.onMove ?? 0) + 1];
  const pass = PASS[(z.ifPassed ?? 0) + 1];
  return mine
    ? `${lead} Having to move here ${on} for you. If you could pass, you would ${pass}.`
    : `${lead} Having to move here ${on} for them. If they could pass, they would ${pass}.`;
}

/** The read's proof: the count, or the two scores the engine gave (not exact). */
export function zugzwangSyncProof(z: ZugzwangSync, student: Color): Proof {
  const mine = z.side === student;
  const who = mine ? 'you' : 'they';
  if (z.source === 'count') {
    const d = dropWords(z.drops ?? 1);
    return { kind: 'count', exact: true, short: `every move gives up ${d}`, full: `every move ${who} have gives up ${d}, and passing gives up nothing` };
  }
  return { kind: 'count', exact: false, short: `on move it ${RESULT[(z.onMove ?? 0) + 1]}`, full: `on move it ${RESULT[(z.onMove ?? 0) + 1]}. If ${who} could pass, ${who} would ${PASS[(z.ifPassed ?? 0) + 1]}` };
}

/** THE MOVE THAT MADE IT (either seat): after `san`, the side to move is in
 *  zugzwang and was handed it by the move. `reads`: the engine's lines after
 *  the move and with the mover to move again, or null. */
export function zugzwangMade(fenBefore: string, san: string, reads: { lines: Lines; pass: Lines } | null): { read: ZugzwangSync; fenAfter: string } | null {
  let c: Chess;
  try { c = new Chess(fenBefore); c.move(san); } catch { return null; }
  const fenAfter = c.fen();
  const read = zugzwangOn(fenAfter, reads);
  return read ? { read, fenAfter } : null;
}
