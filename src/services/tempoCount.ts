// TEMPO, COUNTED (WO-TEACH-GAPS P2 #7). "Develops with tempo" is said already
// (`moveFundamentals`). The half he says and we never did is the COUNT: "that's
// the queen's third move — meanwhile you've got three pieces out". A piece that
// keeps moving in the opening hands the other side free moves, and the board
// can count them.
//
// Their reply moved a non-pawn, non-king piece for the THIRD time or more, still
// inside the opening (≤ 24 plies), and the student has more minor pieces out
// than they do. Never on a capture (it took something). Said once per piece per game — the page's claim ledger holds it.
//
// A LEAF: chess.js over the game's own SAN history.
import { Chess, type Square } from 'chess.js';
import { homeSquaresOf } from './development';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface TempoCount {
  text: string;
  /** The square the piece stands on now. */
  squares: string[];
  /** Stable identity of the piece (its starting square), for say-once. */
  pieceId: string;
  moves: number;
}

/** Plies inside which the count is an opening lesson. */
export const TEMPO_OPENING_PLIES = 24;

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const WORD = ['no', 'one', 'two', 'three', 'four'];

/** One move of the replay, with the identity of the piece that made it (its
 *  starting square) — the ledger every count here reads. */
export interface TrackedMove {
  id: string;
  from: string;
  to: string;
  piece: string;
  color: 'w' | 'b';
  captured: boolean;
  /** The identity of the piece it took, when it took one. */
  capturedId: string | null;
  san: string;
}

/** THE ONE PIECE-IDENTITY REPLAY: every SAN of the game, each tagged with the
 *  piece that made it (castling moves the rook too). Null when a move does not
 *  play — a history from another start is never guessed at. */
export function trackPieces(history: readonly string[]): { board: Chess; moves: TrackedMove[]; idAt: Map<string, string>; moved: Map<string, number> } | null {
  const c = new Chess();
  const idAt = new Map<string, string>();
  for (const sq of c.board().flat()) if (sq) idAt.set(sq.square, sq.square);
  const moved = new Map<string, number>();
  const moves: TrackedMove[] = [];
  for (const san of history) {
    let m;
    try { m = c.move(san); } catch { return null; }
    const capturedSq = m.isEnPassant() ? `${m.to[0]}${m.from[1]}` : m.to;
    const capturedId = m.captured ? idAt.get(capturedSq) ?? capturedSq : null;
    if (m.captured) idAt.delete(capturedSq);
    const id = idAt.get(m.from) ?? m.from;
    idAt.delete(m.from);
    idAt.set(m.to, id);
    const kside = m.isKingsideCastle();
    if (kside || m.isQueensideCastle()) {
      // Castling moves the rook too; it is development, not a wasted move.
      const rf = m.color === 'w' ? (kside ? 'h1' : 'a1') : (kside ? 'h8' : 'a8');
      const rt = m.color === 'w' ? (kside ? 'f1' : 'd1') : (kside ? 'f8' : 'd8');
      const rid = idAt.get(rf) ?? rf;
      idAt.delete(rf);
      idAt.set(rt, rid);
    }
    moved.set(id, (moved.get(id) ?? 0) + 1);
    moves.push({ id, from: m.from, to: m.to, piece: m.piece, color: m.color, captured: !!m.captured, capturedId, san: m.san });
  }
  return { board: c, moves, idAt, moved };
}

/** `history` = every SAN of the game, ending with THEIR reply. */
export function tempoCount(history: readonly string[], student: 'w' | 'b'): TempoCount | null {
  if (history.length === 0 || history.length > TEMPO_OPENING_PLIES) return null;
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const t = trackPieces(history);
  if (!t) return null;
  const { idAt, moved } = t;
  const last = t.moves[t.moves.length - 1] ?? null;
  // A capture is not a wasted move — it took something.
  if (!last || last.color !== them || !(last.piece in NAME) || last.captured) return null;
  const n = moved.get(last.id) ?? 0;
  if (n < 3) return null;
  // THE development reading's home squares (`homeSquaresOf`) — never a copy here.
  const minorsOut = (side: 'w' | 'b'): number => [...homeSquaresOf('n', side), ...homeSquaresOf('b', side)].filter((home) => {
    for (const [sq, id] of idAt) if (id === home && sq !== home) return true;
    return false;
  }).length;
  const mine = minorsOut(student);
  const theirs = minorsOut(them);
  if (mine <= theirs) return null;
  const name = NAME[last.piece];
  const text = `That's their ${name}'s ${ORDINAL[n] ?? `${n}th`} move already, and you have ${WORD[mine] ?? mine} minor pieces out to their ${WORD[theirs] ?? theirs} — every extra move with one piece is a move you get for free.`;
  return { text, squares: [last.to as Square], pieceId: last.id, moves: n };
}

// ── THE MOVE-COUNT LEDGER FOR TRADES (batch 1, "order and timing") ───────────
// His capture-timing habit: "take on c4 only after their bishop reaches d3, so
// recapturing is its second move", and its sibling, "a much-moved piece traded
// for a fresh one". A trade erases two pieces and every move spent on them, so
// WHEN you take decides whose moves are thrown away. Counted off the game's own
// SAN history through the one identity replay above — exact, never estimated.

export interface TradeLedger {
  kind: 'recapture-tempo' | 'fresh-for-moved';
  text: string;
  /** The squares the counted piece walked through, ending on the trade square. */
  squares: string[];
  /** The square the trade happened on. */
  square: string;
  /** The counted piece's moves before the trade. */
  moves: number;
}

/** The squares a piece (by identity) stood on through the game, home first. */
function pathOf(moves: readonly TrackedMove[], id: string, beforeIndex: number): string[] {
  const out = [id];
  moves.slice(0, beforeIndex).forEach((m) => { if (m.id === id) out.push(m.to); });
  return out;
}

/** Could a piece of this type and colour on `home` capture on `target` with
 *  the board otherwise as it is? (A pure geometry probe: the piece is lifted
 *  from where it stands and put back on its home square.) */
function reachesFromHome(board: Chess, from: string, home: string, target: string): boolean {
  const p = board.get(from as Square);
  if (!p) return false;
  if (from !== home && board.get(home as Square)) return false;
  const probe = new Chess(board.fen());
  probe.remove(from as Square);
  probe.put({ type: p.type, color: p.color }, home as Square);
  return probe.attackers(target as Square, p.color).includes(home as Square);
}

/**
 * `history` = every SAN of the game, ending with THEIR reply to the student's
 * capture. Two readings, both exact:
 *  • RECAPTURE TEMPO — their reply took back on the trade square with a piece
 *    that had already moved, and from its home square it would have taken back
 *    in ONE move: the timing of the capture made them spend an extra move.
 *  • FRESH FOR MOVED — the student's piece, on its first or second move, took a
 *    piece of theirs that had spent at least two more moves getting there, and
 *    the reply took back: their moves went off the board with it.
 * Null otherwise, and only inside the opening (`TEMPO_OPENING_PLIES`), where a
 * move is worth counting.
 */
export function tradeLedger(history: readonly string[], student: 'w' | 'b'): TradeLedger | null {
  if (history.length < 2 || history.length > TEMPO_OPENING_PLIES) return null;
  const t = trackPieces(history);
  if (!t) return null;
  const mine = t.moves[t.moves.length - 2];
  const reply = t.moves[t.moves.length - 1];
  if (!mine || !reply || mine.color !== student || reply.color === student) return null;
  if (!mine.captured || !reply.captured || reply.to !== mine.to) return null;
  const sq = mine.to;
  // Their recapturer: how many moves had it made BEFORE taking back?
  const before = (t.moved.get(reply.id) ?? 1) - 1;
  if (reply.piece in NAME && reply.piece !== 'q' && before >= 1) {
    const board = new Chess();
    for (const m of history.slice(0, -1)) board.move(m);
    if (reachesFromHome(board, reply.from, reply.id, sq)) {
      const path = pathOf(t.moves, reply.id, t.moves.length - 1);
      const name = NAME[reply.piece];
      const ord = ORDINAL[before + 1] ?? `${before + 1}th`;
      const via = path[path.length - 1];
      const text = rotateStem([
        `Good timing: their ${name} had already gone to ${via}, so taking back on ${sq} is its ${ord} move — from ${reply.id} it would have been its first. The trade gained you a move.`,
        `You took on ${sq} after their ${name} went to ${via} — taking back is its ${ord} move instead of its first, so that trade cost them a move.`,
      ], stemKeyOf(sq));
      return { kind: 'recapture-tempo', text, squares: [...path, sq], square: sq, moves: before };
    }
  }
  // Their piece the student took: how many moves had it spent?
  if (mine.capturedId && mine.piece !== 'p' && mine.piece !== 'k') {
    const spentTheirs = t.moves.slice(0, t.moves.length - 2).filter((m) => m.id === mine.capturedId).length;
    const spentMine = t.moved.get(mine.id) ?? 1;
    const victim = history.length >= 3 ? t.moves.slice(0, t.moves.length - 2).filter((m) => m.id === mine.capturedId).pop() : undefined;
    // A TRADE, like for like — winning their piece outright is a different lesson.
    const VALUE: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
    if (victim && victim.piece in NAME && VALUE[victim.piece] === VALUE[mine.piece] && spentTheirs >= 3 && spentTheirs >= spentMine + 2) {
      const text = rotateStem([
        `Your ${NAME[mine.piece] ?? 'piece'}, on its ${ORDINAL[spentMine] ?? `${spentMine}th`} move, traded off their ${NAME[victim.piece]} that spent ${WORD[spentTheirs] ?? spentTheirs} moves getting to ${sq} — every one of those moves went off the board with it.`,
        `Their ${NAME[victim.piece]} took ${WORD[spentTheirs] ?? spentTheirs} moves to reach ${sq}; your ${NAME[mine.piece] ?? 'piece'} needed ${WORD[spentMine] ?? spentMine} to trade it off. That trade is a gift of time.`,
      ], stemKeyOf(sq));
      return { kind: 'fresh-for-moved', text, squares: [...pathOf(t.moves, mine.capturedId, t.moves.length - 2)], square: sq, moves: spentTheirs };
    }
  }
  return null;
}

/** THE PROSPECTIVE HALF — "take on c4 only AFTER their bishop reaches d3".
 *  The student, to move, can capture on a square where the only piece that can
 *  take back is a minor still on its home square: taking now hands it a free
 *  developing move. Spoken only when the engine's best is NOT that capture and
 *  the capture is an even trade (nothing is won by taking now). */
export function captureTooEarly(fen: string, student: 'w' | 'b', bestSan: string | null): { text: string; squares: string[]; capture: string; recapture: string } | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== student) return null;
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const strip = (x: string): string => x.replace(/[+#]$/, '');
  for (const m of board.moves({ verbose: true })) {
    if (!m.captured || m.promotion || (bestSan && strip(bestSan) === strip(m.san))) continue;
    const after = new Chess(fen);
    after.move(m.san);
    const takers = after.moves({ verbose: true }).filter((x) => x.to === m.to && x.captured);
    if (takers.length !== 1) continue;
    const r = takers[0];
    if (r.piece !== 'n' && r.piece !== 'b') continue;
    if (!homeSquaresOf(r.piece, them).includes(r.from)) continue;
    // An even trade: what was taken equals what is given back.
    const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    if ((val[m.captured] ?? 0) !== (val[m.piece] ?? -1)) continue;
    const name = NAME[r.piece];
    return {
      text: `Taking on ${m.to} now lets their ${name} take back straight from ${r.from}, which develops it at the same time. Wait until it has moved; then taking back costs it a second move.`,
      squares: [m.from, m.to, r.from],
      capture: m.san,
      recapture: r.san,
    };
  }
  return null;
}
