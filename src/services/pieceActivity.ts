// pieceActivity — WHOSE PIECES ARE IN PLAY (WO-DANYA-READS-01 #2, 2026-11-18).
//
// Danya explains an evaluation by the pieces far more often than by the count:
// "my pieces are beautifully coordinated, and White's own army is terribly
// passive", "the bishop on h6 is stranded", "Black's queen is somewhat
// misplaced". The board read said "material even, nothing decided" instead,
// because no computer compared the two armies.
//
// Every officer (knight, bishop, rook, queen) of both sides is read off the
// board: the squares it can go to that it would not lose there (the legal
// exchange, `legalSeeGainFor`), whether it is still at home, stuck (one safe
// square or none), stranded (stuck inside the other half), a poor piece the
// board names (`findPieceQuality`: the rim knight, the bishop hemmed in by its
// own pawns) or a strong one (an outpost, the seventh, an open file). The two
// armies are then compared: a side is the more active one when the other has
// clearly more idle pieces, or clearly less room per piece. The comparison
// names the pieces — never a bare "your pieces are more active".
//
// PURE: chess.js and the board's own readers. Dual use: the same read that
// explains an engine's verdict is the one that tells a student their rook on
// a8 has not moved.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { isMinorAtHome } from './development';
import { findPieceQuality, legalSeeGainFor, type PieceQualityKind } from './positionReadingService';
import { andList } from '../utils/andList';
import { isPinnedPiece } from './nextPlans';

export type OfficerState =
  /** A knight or bishop still on its starting square. */
  | 'home'
  /** One safe square or none, in its own half. */
  | 'stuck'
  /** One safe square or none, inside the other side's half. */
  | 'stranded'
  /** The board's own poor piece: the knight on the rim, the bishop behind its pawns. */
  | 'poor'
  /** The board's own good piece: an outpost, the seventh, an open or half-open file. */
  | 'strong'
  /** Pinned to its own king, with no move at all. */
  | 'pinned'
  | 'normal';

export interface Officer {
  square: Square;
  piece: Exclude<PieceSymbol, 'p' | 'k'>;
  color: Color;
  /** The squares it can move to (captures included), legal for its side. */
  moves: number;
  /** Of those, the squares it would not lose there by the legal exchange. */
  safe: number;
  state: OfficerState;
  /** The board's note behind `poor` / `strong`. */
  quality: PieceQualityKind | null;
}

export interface SideActivity {
  officers: Officer[];
  /** Safe squares, summed over the officers. */
  room: number;
  /** Officers at home, stuck, stranded or poor — the ones not in play. */
  idle: Officer[];
  /** Officers the board calls strong. */
  strong: Officer[];
}

export type PieceActivity = Record<Color, SideActivity>;

const OFFICERS = new Set<PieceSymbol>(['n', 'b', 'r', 'q']);
const IDLE_STATES: ReadonlySet<OfficerState> = new Set<OfficerState>(['home', 'stuck', 'stranded', 'poor', 'pinned']);

/** `fen` with `color` to move, en passant cleared — the way a piece's squares
 *  are counted whoever is on move. Null when the other king is in check (that
 *  board cannot exist). */
function asMover(fen: string, color: Color): string | null {
  const parts = fen.split(' ');
  if (parts[1] === color) return fen;
  try { if (new Chess(fen).inCheck()) return null; } catch { return null; }
  parts[1] = color;
  parts[3] = '-';
  return parts.join(' ');
}

/** Every officer of both sides, read. Null on an unreadable FEN. */
export function pieceActivity(fen: string): PieceActivity | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  // A side in check has one job, and its pieces' squares are the check's,
  // not their own: no read.
  if (board.inCheck()) return null;
  const quality = new Map(findPieceQuality(fen).map((n) => [n.square, n] as const));
  const out = {} as PieceActivity;
  for (const color of ['w', 'b'] as const) {
    const enemy: Color = color === 'w' ? 'b' : 'w';
    const moverFen = asMover(fen, color);
    let moves: Move[] = [];
    let probe: Chess | null = null;
    let xray: Chess | null = null;
    try {
      probe = moverFen ? new Chess(moverFen) : null;
      xray = moverFen ? new Chess(moverFen) : null;
      moves = probe ? probe.moves({ verbose: true }) : [];
    } catch { moves = []; }
    const officers: Officer[] = [];
    for (const row of board.board()) for (const cell of row) {
      if (!cell || cell.color !== color || !OFFICERS.has(cell.type)) continue;
      const sq = cell.square;
      const own = moves.filter((m) => m.from === sq);
      let safe = 0;
      for (const m of own) {
        if (!probe || !xray) break;
        try {
          // Nothing of theirs hits the square once the piece has left its own
          // (a slider behind it counts): safe without an exchange read.
          xray.remove(m.from);
          const hit = xray.attackers(m.to, enemy).length > 0;
          xray.put({ type: m.piece, color }, m.from);
          if (!hit) { safe += 1; continue; }
          probe.move({ from: m.from, to: m.to, promotion: m.promotion });
          const lost = legalSeeGainFor(probe.fen(), m.to, enemy) > 0;
          probe.undo();
          if (!lost) safe += 1;
        } catch { /* an unplayable move is not a square */ }
      }
      const note = quality.get(sq);
      const rank = Number(sq[1]);
      const theirHalf = color === 'w' ? rank >= 5 : rank <= 4;
      let state: OfficerState = 'normal';
      if (isMinorAtHome(cell.type, color, sq)) state = 'home';
      else if (note?.quality === 'bad') state = 'poor';
      else if (note?.quality === 'good') state = 'strong';
      // Stuck (one safe square or none) is a minor's or a queen's away from
      // home, and a piece of any kind cut off inside the other half
      // (stranded); a rook behind its own pawns is where rooks wait for a
      // file (the worst-piece finder's own rule).
      else if (moverFen && own.length === 0 && isPinnedPiece(board, sq, color)) state = 'pinned';
      else if (moverFen && safe <= 1) {
        if (theirHalf) state = 'stranded';
        else if (cell.type !== 'r' && !(cell.type === 'q' && sq === (color === 'w' ? 'd1' : 'd8'))) state = 'stuck';
      }
      officers.push({ square: sq, piece: cell.type as Officer['piece'], color, moves: own.length, safe, state, quality: note?.kind ?? null });
    }
    out[color] = {
      officers,
      room: officers.reduce((n, o) => n + o.safe, 0),
      idle: officers.filter((o) => IDLE_STATES.has(o.state)),
      strong: officers.filter((o) => o.state === 'strong'),
    };
  }
  return out;
}

const NOUN: Record<Officer['piece'], string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** The idle piece in players' words, after "their"/"your": "bishop on c8,
 *  still at home". */
function idleWords(o: Officer): string {
  const at = `${NOUN[o.piece]} on ${o.square}`;
  switch (o.state) {
    case 'home': return `${at} hasn't moved`;
    case 'stranded': return `${at} is stranded with ${o.safe === 0 ? 'no safe square' : 'one safe square'}`;
    case 'pinned': return `${at} is pinned to its king`;
    case 'stuck': return `${at} has ${o.safe === 0 ? 'no safe square' : 'one safe square'}`;
    case 'poor': return o.quality === 'rim-knight' ? `${at} is stuck on the rim` : `${at} is hemmed in by its own pawns`;
    default: return at;
  }
}

function strongWords(o: Officer): string {
  const at = `${NOUN[o.piece]} on ${o.square}`;
  switch (o.quality) {
    case 'outpost': return `${at} sits on an outpost`;
    case 'seventh-rank': return `${at} is on the seventh`;
    case 'open-file': return `${at} holds the open ${o.square[0]}-file`;
    case 'semi-open-file': return `${at} works on the half-open ${o.square[0]}-file`;
    default: return at;
  }
}

export interface ActivityEdge {
  /** The side whose pieces are the more active. */
  side: Color;
  /** The other side's idle pieces, every one. */
  idle: Officer[];
  /** The more active side's strong pieces, every one. */
  strong: Officer[];
  /** The more active side's own idle pieces (0: all in play). */
  activeIdle: number;
  /** Safe squares per officer, the active side against the other. */
  perPiece: [number, number];
  squares: Square[];
}

/** The more active army, when the board clearly says so: the other side has
 *  at least two more idle pieces, or one more and a third less room per piece.
 *  Null when the two armies are about as active (or a side has no officers —
 *  an ending of kings and pawns is not read by its pieces). */
export function activityEdge(fen: string): ActivityEdge | null {
  const a = pieceActivity(fen);
  if (!a) return null;
  if (a.w.officers.length === 0 || a.b.officers.length === 0) return null;
  const per = (c: Color): number => a[c].room / a[c].officers.length;
  for (const side of ['w', 'b'] as const) {
    const other: Color = side === 'w' ? 'b' : 'w';
    const idleGap = a[other].idle.length - a[side].idle.length;
    const roomy = per(side) >= per(other) * 1.5;
    if (idleGap >= 2 || (idleGap >= 1 && roomy)) {
      return {
        side, idle: a[other].idle, strong: a[side].strong, activeIdle: a[side].idle.length,
        perPiece: [per(side), per(other)],
        squares: [...a[other].idle.map((o) => o.square), ...a[side].strong.map((o) => o.square)],
      };
    }
  }
  return null;
}

/** The edge said from the student's seat, leading with the pieces: "Their
 *  rook on a8 and bishop on c8 haven't moved, and their knight on a5 is stuck
 *  on the rim." / "Your bishop on h6 is stranded, with no safe square." The
 *  idle pieces carry the claim; a strong piece of the active side follows
 *  when there is one. */
export function activityEdgeLine(e: ActivityEdge, student: Color): string {
  const passive = e.side === student ? 'their' : 'your';
  const active = e.side === student ? 'your' : 'their';
  const Cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
  // Pieces still at home share one verb ("their rook on a8 and bishop on c8
  // haven't moved"); every other idle piece says its own reason.
  const home = e.idle.filter((o) => o.state === 'home');
  const rest = e.idle.filter((o) => o.state !== 'home');
  const clauses: string[] = [];
  if (home.length === 1) clauses.push(`${passive} ${idleWords(home[0])}`);
  else if (home.length > 1) clauses.push(`${passive} ${andList(home.map((o) => `${NOUN[o.piece]} on ${o.square}`))} haven't moved`);
  for (const o of rest) clauses.push(`${passive} ${idleWords(o)}`);
  let text = `${Cap(andList(clauses))}.`;
  if (e.strong.length > 0) {
    // Rooks on one file share the sentence ("your rooks on f1 and f2 work on
    // the half-open f-file").
    const said = new Set<Officer>();
    const parts: string[] = [];
    for (const o of e.strong) {
      if (said.has(o)) continue;
      const mates = e.strong.filter((p) => p.piece === 'r' && o.piece === 'r' && p.quality === o.quality && p.square[0] === o.square[0] && (o.quality === 'open-file' || o.quality === 'semi-open-file'));
      if (mates.length > 1) {
        for (const m of mates) said.add(m);
        parts.push(`rooks on ${andList(mates.map((m) => m.square))} ${o.quality === 'open-file' ? `hold the open ${o.square[0]}-file` : `work on the half-open ${o.square[0]}-file`}`);
      } else { said.add(o); parts.push(strongWords(o)); }
    }
    text += ` ${Cap(active)} ${andList(parts)}.`;
  }
  else if (e.activeIdle === 0) text += ` ${Cap(active)} pieces are all in play.`;
  return text;
}
