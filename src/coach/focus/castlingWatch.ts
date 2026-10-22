/**
 * THE CASTLING WATCH (WO-FOCUS-TACTICS-01 P3, PLAN.md item 5) — pure. It
 * replaces the kings focus and runs beside the tactics focus in every Learn
 * free-play game, until the student castles or loses the right.
 *
 * David 2026-10-22: "I don't want it called out because of a blunder. But
 * because the king is in the middle" → "If the eval drops at any time because
 * of not castled then it needs to call it out and mark in weaknesses."
 *
 * PROVEN BY A WHAT-IF, NEVER BY A LABEL: the board after the student's move,
 * with their king and rook on their castled squares, is read by the engine.
 * STOP fires on a student move that (i) costs at least `CASTLE_DROP_CP`,
 * (ii) whose castled what-if is better than the real board by at least that
 * cost, and (iii) that hung no material (castling would not have saved a hung
 * piece). Castling squares blocked or attacked → no claim.
 *
 * Once, early, when castling was ready and the student played something else,
 * the coach says so — no pause. Everything else is silent.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import type { ReadLine } from './focusChances';

/** A move must cost at least this (cp) for the king to be blamed. */
export const CASTLE_DROP_CP = 100;
/** At or below this (cp, the student's view) the position is losing. */
export const CASTLE_LOSING_CP = -300;
/** The reminder is said only in the early opening: the student's first twelve
 *  moves (board plies 1–24). */
export const REMINDER_LAST_PLY = 24;

export type CastleSide = 'k' | 'q';

interface CastleGeometry {
  rook: Square;
  /** Squares between the king and the rook — must be empty. */
  between: Square[];
  /** Squares the king stands on, crosses or lands on — must not be attacked. */
  path: Square[];
  kingTo: Square;
  rookTo: Square;
}

const GEOMETRY: Record<Color, { king: Square; sides: Record<CastleSide, CastleGeometry> }> = {
  w: {
    king: 'e1',
    sides: {
      k: { rook: 'h1', between: ['f1', 'g1'], path: ['e1', 'f1', 'g1'], kingTo: 'g1', rookTo: 'f1' },
      q: { rook: 'a1', between: ['b1', 'c1', 'd1'], path: ['e1', 'd1', 'c1'], kingTo: 'c1', rookTo: 'd1' },
    },
  },
  b: {
    king: 'e8',
    sides: {
      k: { rook: 'h8', between: ['f8', 'g8'], path: ['e8', 'f8', 'g8'], kingTo: 'g8', rookTo: 'f8' },
      q: { rook: 'a8', between: ['b8', 'c8', 'd8'], path: ['e8', 'd8', 'c8'], kingTo: 'c8', rookTo: 'd8' },
    },
  },
};

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function load(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

/** The castling rights `color` still holds on this board. */
export function castleRights(fen: string, color: Color): CastleSide[] {
  const field = fen.split(' ')[2] ?? '-';
  const out: CastleSide[] = [];
  if (field.includes(color === 'w' ? 'K' : 'k')) out.push('k');
  if (field.includes(color === 'w' ? 'Q' : 'q')) out.push('q');
  return out;
}

/** The watch is over for the student once they have no castling right left
 *  (castled, or gave it up). */
export function watchOver(fen: string, student: Color): boolean {
  return castleRights(fen, student).length === 0;
}

/** Castling is a legal move for the student on this board, right now. */
export function castleReady(fen: string, student: Color): boolean {
  const c = load(fen);
  if (!c || c.turn() !== student) return false;
  return c.moves({ verbose: true }).some((m) => m.isKingsideCastle() || m.isQueensideCastle());
}

/** Could `color` castle on `side` here but for whose turn it is: the right,
 *  the king and rook at home, nothing between, no square of the king's path
 *  attacked. */
function castleOpen(c: Chess, color: Color, side: CastleSide, fen: string): boolean {
  if (!castleRights(fen, color).includes(side)) return false;
  const g = GEOMETRY[color];
  const s = g.sides[side];
  const king = c.get(g.king);
  const rook = c.get(s.rook);
  if (!king || king.type !== 'k' || king.color !== color || !rook || rook.type !== 'r' || rook.color !== color) return false;
  if (s.between.some((sq) => c.get(sq))) return false;
  return !s.path.some((sq) => c.isAttacked(sq, other(color)));
}

/**
 * THE WHAT-IF: the board after the student's move (the opponent to move) with
 * the student's king and rook on their castled squares — the kingside when it
 * is open, else the queenside. Null when neither is open, or the castled king
 * would stand in check (no claim either way).
 */
export function castleWhatIf(fenAfter: string, student: Color): { fen: string; side: CastleSide } | null {
  const c = load(fenAfter);
  if (!c || c.turn() === student) return null;
  for (const side of ['k', 'q'] as const) {
    if (!castleOpen(c, student, side, fenAfter)) continue;
    const g = GEOMETRY[student];
    const s = g.sides[side];
    const w = load(fenAfter);
    if (!w) return null;
    w.remove(g.king);
    w.remove(s.rook);
    w.put({ type: 'k', color: student }, s.kingTo);
    w.put({ type: 'r', color: student }, s.rookTo);
    if (w.isAttacked(s.kingTo, other(student))) return null;
    const parts = w.fen().split(' ');
    // The castled side holds no right; the opponent keeps theirs.
    const keep = (parts[2] ?? '-').split('').filter((ch) => ch !== '-' && (student === 'w' ? ch === ch.toLowerCase() : ch === ch.toUpperCase())).join('');
    parts[2] = keep || '-';
    parts[3] = '-';
    const fen = parts.join(' ');
    return load(fen) ? { fen, side } : null;
  }
  return null;
}

const NAMED: ReadonlySet<PieceSymbol> = new Set(['p', 'n', 'b', 'r', 'q']);

/** Did the move hang material — leave a piece or pawn of the student's to be
 *  won that could not be won before? Castling would not have saved it. */
export function hungMaterial(fenBefore: string, fenAfter: string, student: Color): boolean {
  const before = load(fenBefore);
  const after = load(fenAfter);
  if (!before || !after) return false;
  const foe = other(student);
  for (const row of after.board()) for (const cell of row) {
    if (!cell || cell.color !== student || !NAMED.has(cell.type)) continue;
    if (legalSeeGainFor(fenAfter, cell.square, foe) < 1) continue;
    const was = before.get(cell.square);
    const wasLoose = !!was && was.color === student && was.type === cell.type && legalSeeGainFor(fenBefore, cell.square, foe) >= 1;
    if (!wasLoose) return true;
  }
  return false;
}

/** A line's value for `side`, cp (a mate is ±100 000). */
export function studentCp(l: Pick<ReadLine, 'evaluation' | 'mate'>, side: Color): number {
  const v = l.mate !== null ? Math.sign(l.mate) * 100000 : l.evaluation;
  return side === 'w' ? v : -v;
}

/** What the move cost against the best line, and where it left the student
 *  (both the student's view, cp) — from the read on the board before. Null
 *  when the read does not cover the move. */
export function costOf(fenBefore: string, san: string, lines: readonly ReadLine[] | null, student: Color): { drop: number; realCp: number; bestCp: number } | null {
  if (!lines || lines.length === 0) return null;
  let uci: string;
  try { const m = new Chess(fenBefore).move(san); uci = `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
  const bestCp = Math.max(...lines.map((l) => studentCp(l, student)));
  const line = lines.find((l) => l.moves[0] === uci);
  if (!line) return null;
  const realCp = studentCp(line, student);
  return { drop: Math.max(0, bestCp - realCp), realCp, bestCp };
}

/** What the page must read before the watch can judge the move: the what-if
 *  board, and the real board after when the read before did not cover the
 *  move. Null = no claim to test (castled or no right, no read, a cheap
 *  move, hung material, or castling not open on the board after). */
export interface CastleProbe {
  fenAfter: string;
  whatIf: string;
  side: CastleSide;
  /** The best line's value before the move (the student's view). */
  bestCp: number;
  /** The real board's value after the move, when the read before covered it. */
  realCp: number | null;
}

export function castleProbe(m: { fenBefore: string; san: string; fenAfter: string; student: Color; lines: readonly ReadLine[] | null }): CastleProbe | null {
  if (watchOver(m.fenAfter, m.student)) return null;
  if (!m.lines || m.lines.length === 0) return null;
  if (m.san.startsWith('O-O')) return null;
  const cost = costOf(m.fenBefore, m.san, m.lines, m.student);
  // A move the read lists and that costs little is not a question.
  if (cost && cost.drop < CASTLE_DROP_CP) return null;
  if (hungMaterial(m.fenBefore, m.fenAfter, m.student)) return null;
  const w = castleWhatIf(m.fenAfter, m.student);
  if (!w) return null;
  const bestCp = cost?.bestCp ?? Math.max(...m.lines.map((l) => studentCp(l, m.student)));
  return { fenAfter: m.fenAfter, whatIf: w.fen, side: w.side, bestCp, realCp: cost?.realCp ?? null };
}

/** The verdict once both boards are read (the student's view, cp): STOP when
 *  the move cost at least `CASTLE_DROP_CP` and the castled king would have
 *  held at least that much of it. */
export function castleVerdict(p: { bestCp: number; realCp: number; whatIfCp: number }): { stop: boolean; drop: number; gain: number } {
  const drop = Math.max(0, p.bestCp - p.realCp);
  const gain = p.whatIfCp - p.realCp;
  return { stop: drop >= CASTLE_DROP_CP && gain >= drop, drop, gain };
}

function kingSquare(c: Chess, color: Color): Square | null {
  for (const row of c.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === color) return cell.square;
  return null;
}

const distance = (a: string, b: string): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));

/** An ATTACK (David: "only true if attacking and the eval drops"): a capture,
 *  a check, a piece moving toward their king, or a PAWN BREAK (David
 *  2026-10-22: "But a pawn push can open up the center") — a push that lands
 *  hitting a pawn or piece of theirs, a lever or a kick. A quiet push (a3, d3)
 *  is not, or every pawn move would read as an attack. */
export function isAttack(fenBefore: string, san: string): boolean {
  const c = load(fenBefore);
  if (!c) return false;
  const mover = c.turn();
  const theirKing = kingSquare(c, other(mover));
  let m;
  try { m = c.move(san); } catch { return false; }
  if (m.captured || c.inCheck()) return true;
  if (m.piece === 'p') return pawnHits(m.to, mover).some((sq) => { const p = c.get(sq); return !!p && p.color !== mover; });
  if (!theirKing || m.piece === 'k') return false;
  return distance(m.to, theirKing) < distance(m.from, theirKing);
}

/** The two squares a pawn of `color` on `sq` attacks. */
function pawnHits(sq: string, color: Color): Square[] {
  const file = sq.charCodeAt(0);
  const rank = Number(sq[1]) + (color === 'w' ? 1 : -1);
  if (rank < 1 || rank > 8) return [];
  return [file - 1, file + 1].filter((f) => f >= 97 && f <= 104).map((f) => `${String.fromCharCode(f)}${rank}` as Square);
}

/** THE FOUR FIXED LINES (David 2026-10-22), so the line is always true:
 *  losing vs a cost, an attack vs a quiet move. */
export function castleStopLine(losing: boolean, attack: boolean): string {
  const head = losing
    ? "STOP! You're not castled, and because of that you're now in a losing position!"
    : "STOP! You're not castled, and that just cost you!";
  return `${head} ${attack ? 'You need to castle before you attack!' : 'You need to castle first!'}`;
}

/** Asked with the STOP when a board to go back to exists. */
export const CASTLE_REWIND_ASK = 'Want to go back and castle?';

/** Said once, early, when castling was ready and the student played
 *  something else. */
export const CASTLE_REMINDER_LINE = 'You could have castled there. Get your king safe before the centre opens.';

export function reminderDue(m: { fenBefore: string; san: string; student: Color }, ply: number, reminded: boolean): boolean {
  return !reminded && ply <= REMINDER_LAST_PLY && !m.san.startsWith('O-O') && castleReady(m.fenBefore, m.student);
}

/** A board the student moved from with castling ready — where the rewind
 *  can go back to. */
export interface CastleBoard {
  ply: number;
  fen: string;
  prevFen: string | null;
  lines: readonly ReadLine[] | null;
}

/** THE REWIND (David 2026-10-22: "Yes, offer the take back"): the latest board
 *  where castling was legal and the student was not yet losing, so going back
 *  actually fixes it. */
export function rewindTarget(boards: readonly CastleBoard[], student: Color): CastleBoard | null {
  for (let i = boards.length - 1; i >= 0; i -= 1) {
    const b = boards[i];
    if (!castleReady(b.fen, student)) continue;
    const best = b.lines && b.lines.length > 0 ? Math.max(...b.lines.map((l) => studentCp(l, student))) : null;
    if (best === null || best > CASTLE_LOSING_CP) return b;
  }
  return null;
}
