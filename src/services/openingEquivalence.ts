// OPENING EQUIVALENCE — MOVES INSERTED, OR COLOURS REVERSED (batch 1, "opening
// and traps"): his "an Alekhine with c3 and c5 thrown in", "this is a reversed
// Sicilian". A board the DB does not name is often a named opening with one
// move each thrown in, or a named opening with the colours swapped. Knowing
// which is how a player transfers what they already know to a board they have
// never seen.
//
// Pure: every name is a real Lichess DB position (`openingAtPosition`, the
// offline index — G3), and every claim is checked on the board:
//  • REVERSED — the board, mirrored rank for rank with the colours swapped, IS
//    a named position. The side to move here has the move the reference side
//    would not: a move up.
//  • INSERTED — undo one non-capturing move of each side and the board IS a
//    named position that never stood in this game; the two moves are replayed
//    from it with chess.js and must land exactly here.
// What the insertion is WORTH needs the reference position's own eval, which
// no surface holds on the move path — so no verdict is spoken (never a guess).
import { Chess } from 'chess.js';
import { openingAtPosition, openingPositionsLoaded } from './openingPositions';
import { legalLineProof, squaresProof, type Proof } from './proof';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface OpeningEquivalence {
  kind: 'reversed' | 'inserted';
  /** The named reference opening. */
  name: string;
  text: string;
  proof: Proof;
  squares: string[];
  /** INSERTED: the two moves thrown in, SAN, from the reference board. */
  inserted?: [string, string];
  /** REVERSED: the side here that is a move up, or null for an exact mirror. */
  moveUp?: 'w' | 'b' | null;
}

/** Equivalence is an opening idea: past this many plies it is not news. */
export const EQUIVALENCE_MAX_PLIES = 24;
/** A reference shorter than this names too little to transfer. */
export const EQUIVALENCE_MIN_REF_PLIES = 4;


/** The board mirrored rank for rank, colours swapped. */
export function flipFen(fen: string): string {
  const [placement, turn, castling] = fen.split(' ');
  const rows = placement.split('/').reverse().map((r) => r.replace(/[a-zA-Z]/g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())));
  const cast = castling === '-' ? '-' : castling.split('').map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).sort((a, b) => {
    const order = 'KQkq';
    return order.indexOf(a) - order.indexOf(b);
  }).join('');
  return `${rows.join('/')} ${turn === 'w' ? 'b' : 'w'} ${cast} - 0 1`;
}

/** The named position this board is, mirrored — with either side to move. */
function reversedHit(fen: string): { name: string; plies: number; extra: boolean } | null {
  const flipped = flipFen(fen);
  const exact = openingAtPosition(flipped);
  if (exact) return { ...exact, extra: false };
  const parts = flipped.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  const other = openingAtPosition(parts.join(' '));
  return other ? { ...other, extra: true } : null;
}

/** The board as 64 cells (a8 first), '' for empty. */
function cellsOf(placement: string): string[] {
  const out: string[] = [];
  for (const ch of placement.replace(/\//g, '')) {
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i += 1) out.push('');
    else out.push(ch);
  }
  return out;
}
function placementOf(cells: readonly string[]): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r += 1) {
    let row = ''; let run = 0;
    for (let f = 0; f < 8; f += 1) {
      const c = cells[r * 8 + f];
      if (!c) { run += 1; continue; }
      if (run) { row += String(run); run = 0; }
      row += c;
    }
    if (run) row += String(run);
    rows.push(row);
  }
  return rows.join('/');
}
const idx = (sq: string): number => (8 - Number(sq[1])) * 8 + (sq.charCodeAt(0) - 97);
const sqOf = (i: number): string => `${String.fromCharCode(97 + (i % 8))}${8 - Math.floor(i / 8)}`;

/** Every way to undo one quiet move of `side` (no capture, no king, no rook,
 *  no castling), by GEOMETRY on the board as it stands: the piece could have
 *  stepped from an empty square to where it is, the path between empty. Cheap
 *  on purpose (no move generation) — every candidate the index names is then
 *  replayed with chess.js and must land exactly here. */
function undoOne(cells: readonly string[], side: 'w' | 'b'): Array<{ from: string; to: string }> {
  const out: Array<{ from: string; to: string }> = [];
  const mine = (c: string): boolean => !!c && (side === 'w' ? c === c.toUpperCase() : c === c.toLowerCase());
  const clear = (from: number, to: number): boolean => {
    const fx = (to % 8) - (from % 8); const fy = Math.floor(to / 8) - Math.floor(from / 8);
    const sx = Math.sign(fx); const sy = Math.sign(fy);
    let x = (from % 8) + sx; let y = Math.floor(from / 8) + sy;
    while (x !== to % 8 || y !== Math.floor(to / 8)) {
      if (cells[y * 8 + x]) return false;
      x += sx; y += sy;
    }
    return true;
  };
  for (let s = 0; s < 64; s += 1) {
    const c = cells[s];
    if (!mine(c)) continue;
    const t = c.toLowerCase();
    if (t === 'k' || t === 'r') continue;
    for (let o = 0; o < 64; o += 1) {
      if (cells[o] || o === s) continue;
      const fx = Math.abs((o % 8) - (s % 8));
      const ry = Math.abs(Math.floor(o / 8) - Math.floor(s / 8));
      let ok = false;
      if (t === 'p') {
        // rank index grows downward (a8 = 0): a white pawn moved UP the board.
        const dr = (Math.floor(o / 8) - Math.floor(s / 8)) * (side === 'w' ? 1 : -1);
        const homeRow = side === 'w' ? 6 : 1;
        ok = fx === 0 && (dr === 1 || (dr === 2 && Math.floor(o / 8) === homeRow && clear(o, s)));
      } else if (t === 'n') ok = (fx === 1 && ry === 2) || (fx === 2 && ry === 1);
      else if (t === 'b') ok = fx === ry && clear(o, s);
      else if (t === 'q') ok = (fx === ry || fx === 0 || ry === 0) && clear(o, s);
      if (ok) out.push({ from: sqOf(o), to: sqOf(s) });
    }
  }
  return out;
}

/** The positions that already stood in this game, as index keys. */
function positionsOf(history: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const c = new Chess();
  seen.add(c.fen().split(' ')[0]);
  for (const san of history) {
    try { c.move(san); } catch { break; }
    seen.add(c.fen().split(' ')[0]);
  }
  return seen;
}

/**
 * The board after `history` (from the start position), seen by `student`.
 * Null outside the opening, when the only equivalence is inside the board's
 * own named family, or when none is proven. Silent until the offline index has loaded.
 */
/** Memo: review builds every ply more than once, and the answer for one
 *  history and seat never changes (bounded — cleared when it grows). */
const MEMO = new Map<string, OpeningEquivalence | null>();
export function openingEquivalence(history: readonly string[], student: 'w' | 'b'): OpeningEquivalence | null {
  const key = `${student}|${history.join(' ')}`;
  const hit = MEMO.get(key);
  if (hit !== undefined) return hit;
  const r = computeEquivalence(history, student);
  // A null from an index that has not loaded yet must not be remembered.
  if (r || openingPositionsLoaded()) {
    if (MEMO.size > 500) MEMO.clear();
    MEMO.set(key, r);
  }
  return r;
}

function computeEquivalence(history: readonly string[], student: 'w' | 'b'): OpeningEquivalence | null {
  if (history.length < 4 || history.length > EQUIVALENCE_MAX_PLIES) return null;
  const c = new Chess();
  for (const san of history) { try { c.move(san); } catch { return null; } }
  const fen = c.fen();
  // A board with a name of its own still has an equivalence worth saying — the
  // English that is a reversed Sicilian — but never one inside its own family
  // ("the Sicilian with …a6 thrown in" is just a Sicilian).
  const own = openingAtPosition(fen);
  const family = (name: string): string => name.split(':')[0].trim();
  const sameFamily = (name: string): boolean => !!own && family(own.name) === family(name);
  const toMove = c.turn();
  const color = (s: 'w' | 'b'): string => (s === 'w' ? 'White' : 'Black');

  // A SYMMETRIC pawn skeleton mirrors onto itself, so its "reversed" opening
  // is just the other symmetric line (1.e4 e5 2.Nf3 Nc6 is not a reversed
  // Vienna in any sense a player uses). Reversed openings are asymmetric.
  const pawnsOnly = (placement: string): string => placement.replace(/\d/g, (d) => '.'.repeat(Number(d))).replace(/[nbrqkNBRQK]/g, '.');
  const symmetric = pawnsOnly(flipFen(fen).split(' ')[0]) === pawnsOnly(fen.split(' ')[0]);
  const rev = symmetric ? null : reversedHit(fen);
  if (rev && rev.plies >= EQUIVALENCE_MIN_REF_PLIES && !sameFamily(rev.name)) {
    const moveUp = rev.extra ? toMove : null;
    // The side here playing the reference's BLACK pieces is White, and vice versa.
    const studentRole = color(student === 'w' ? 'b' : 'w');
    const tail = moveUp === null ? '' : moveUp === student ? ', with an extra move' : ', and they have an extra move';
    const text = rotateStem([
      `This is the ${rev.name} with the colours reversed: you have ${studentRole}'s setup${tail}.`,
      `Turn the board around and it is the ${rev.name} — you are playing ${studentRole}'s side of it${tail}.`,
    ], stemKeyOf(fen));
    const pawns = c.board().flat().flatMap((x) => (x && x.type === 'p' ? [x.square] : []));
    const proof = squaresProof(text, pawns);
    if (proof) return { kind: 'reversed', name: rev.name, text, proof, squares: pawns, moveUp };
  }

  // INSERTED: undo the side to move's opponent's last-style move, then the
  // other side's — the reference had the same side to move as here.
  // INSERTED only for a board with no name of its own: a named board (the
  // Nimzo-Indian) is its own opening, not another one with moves thrown in.
  if (own) return null;
  const lastMover: 'w' | 'b' = toMove === 'w' ? 'b' : 'w';
  const seen = positionsOf(history);
  let best: OpeningEquivalence | null = null;
  const cells = cellsOf(fen.split(' ')[0]);
  const undoLast = undoOne(cells, lastMover);
  const undoMover = undoOne(cells, toMove);
  const tail = ` ${toMove} ${fen.split(' ')[2]} -`;
  for (const a of undoLast) {
    for (const b of undoMover) {
      if (b.to === a.from || b.from === a.to || b.to === a.to || b.from === a.from) continue;
      // The reference: both moves undone on this board, the same side to move.
      const ref = [...cells];
      ref[idx(a.from)] = ref[idx(a.to)]; ref[idx(a.to)] = '';
      ref[idx(b.from)] = ref[idx(b.to)]; ref[idx(b.to)] = '';
      const refFen = `${placementOf(ref)}${tail} 0 1`;
      const hit = openingAtPosition(refFen);
      if (!hit || hit.plies < EQUIVALENCE_MIN_REF_PLIES || sameFamily(hit.name)) continue;
      if (seen.has(refFen.split(' ')[0])) continue;
      // Replay the two moves from the named board; they must land here.
      let r: Chess;
      try { r = new Chess(refFen); } catch { continue; }
      let s1: string; let s2: string;
      try { s1 = r.move({ from: b.from, to: b.to }).san; s2 = r.move({ from: a.from, to: a.to }).san; } catch { continue; }
      if (r.fen().split(' ')[0] !== fen.split(' ')[0]) continue;
      if (best && best.name.length >= hit.name.length) continue;
      const proof = legalLineProof(refFen, [s1, s2], true);
      if (!proof) continue;
      const w = toMove === 'w' ? s1 : s2;
      const bl = toMove === 'w' ? s2 : s1;
      const text = rotateStem([
        `This is the ${hit.name} with ${w} and …${bl} thrown in.`,
        `Take back ${w} and …${bl} and this is the ${hit.name}.`,
      ], stemKeyOf(fen));
      best = { kind: 'inserted', name: hit.name, text, proof, squares: [b.from, b.to, a.from, a.to], inserted: [s1, s2] };
    }
  }
  return best;
}
