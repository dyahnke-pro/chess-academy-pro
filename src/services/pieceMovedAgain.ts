// pieceMovedAgain — ONE PIECE MOVED AGAIN AND AGAIN WHILE THE OTHERS WAIT AT
// HOME (Danya's speedruns, 2026-11-17: "White's bishop has moved five times for
// nothing; your pawn kicks move his pieces while you develop" · "moving one
// knight again and again instead of developing, until it hangs" · "Bd7 then
// Bg4 spends two moves on one bishop; that lost tempo is what let White get
// Qb3 in").
//
// Read off the game's own moves, either seat, on a quiet move (a capture wins
// or wins back something, which is its own reason):
//   • THE DETOUR: a piece's second move lands on a square it could have gone
//     to straight from where it started, safely, on the board it first moved
//     from — two moves spent where one would do.
//   • BACK AGAIN: a piece returns to a square it already stood on.
//   • THE COUNT: a piece's third move or more in the opening while two or
//     more of its side's knights and bishops still stand on their first
//     squares — and that side is not ahead in development, where bending the
//     rule is how the lead is used.
//
// PURE: chess.js and the one capture count (`legalSeeGainFor`).
import { openSentence } from '../utils/openSentence';
import { minorsAtHome } from './development';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

/** Past this ply the game is no longer the opening the rule is about. */
const OPENING_PLIES = 30;
/** Under this cost (cp) the engine calls the move fine: its trip is not this
 *  move's lesson, unless a kick sent it. */
const FINE_CP = 30;

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

export type MovedAgainKind = 'detour' | 'back' | 'count';

export interface MovedAgain {
  kind: MovedAgainKind;
  key: string;
  text: string;
  squares: string[];
  mover: Color;
}

export interface Tracked {
  /** Where the piece started (its identity). */
  origin: string;
  moves: number;
  /** Every square it has stood on, its first included. */
  stood: string[];
  /** The board just before its first move. */
  firstFen: string | null;
}

/** Minor pieces of `c` still on their first squares. */
function homeMinors(b: Chess, c: Color): string[] {
  // The one table of starting squares (`development`).
  // Knights first, then bishops, each by file: "their knight on g1 and bishop on c1".
  return minorsAtHome(b, c).sort((x, y) => (x.type === y.type ? x.square.localeCompare(y.square) : x.type === 'n' ? -1 : 1)).map((m) => m.square);
}

function placement(fen: string): string {
  return fen.split(' ')[0];
}

/** EVERY PIECE'S TRIPS SO FAR, read off the game's own moves from the start:
 *  each piece keyed by the square it stands on now, with where it started,
 *  how many moves it has made and every square it has stood on. The one
 *  tracker — the piece moved again and the queen chased in the opening
 *  (`queenChased`) count with it. Null when the moves do not play. */
export function pieceTrips(history: readonly string[]): { board: Chess; pieces: Map<string, Tracked> } | null {
  const board = new Chess();
  const pieces = new Map<string, Tracked>();
  const track = (mv: Move, fenBefore: string): void => {
    let t = pieces.get(mv.from);
    if (!t) { t = { origin: mv.from, moves: 0, stood: [mv.from], firstFen: null }; }
    pieces.delete(mv.from);
    if (t.moves === 0) t.firstFen = fenBefore;
    t.moves += 1;
    t.stood.push(mv.to);
    pieces.set(mv.to, t);
  };
  try {
    for (const s of history) {
      const fen = board.fen();
      const mv = board.move(s);
      if (mv.captured) pieces.delete(mv.isEnPassant() ? `${mv.to[0]}${mv.from[1]}` : mv.to);
      track(mv, fen);
      if (mv.isKingsideCastle() || mv.isQueensideCastle()) {
        const r = mv.color === 'w' ? (mv.isKingsideCastle() ? ['h1', 'f1'] : ['a1', 'd1']) : (mv.isKingsideCastle() ? ['h8', 'f8'] : ['a8', 'd8']);
        const rt = pieces.get(r[0]) ?? { origin: r[0], moves: 0, stood: [r[0]], firstFen: null };
        pieces.delete(r[0]);
        rt.moves += 1; rt.stood.push(r[1]);
        pieces.set(r[1], rt);
      }
    }
  } catch { return null; }
  return { board, pieces };
}

/** The read on the move `san` played after `history` (every move from the
 *  start position), or null. `student` seats the words; `costCp` is what
 *  the move cost its mover against the best move, null when unknown. */
export function pieceMovedAgain(history: readonly string[], san: string, student: Color, costCp: number | null): MovedAgain | null {
  if (history.length >= OPENING_PLIES) return null;
  const trips = pieceTrips(history);
  if (!trips) return null;
  const { board, pieces } = trips;
  const fenBefore = board.fen();
  let mv: Move;
  try { mv = board.move(san); } catch { return null; }
  // A capture wins or wins back something, a check makes them answer: each is
  // the move's own reason.
  if (mv.captured || mv.san.includes('+') || mv.san.includes('#')) return null;
  if (mv.piece !== 'n' && mv.piece !== 'b' && mv.piece !== 'q') return null;
  const prior = pieces.get(mv.from);
  const t: Tracked = prior
    ? { origin: prior.origin, moves: prior.moves + 1, stood: [...prior.stood, mv.to], firstFen: prior.firstFen }
    : { origin: mv.from, moves: 1, stood: [mv.from, mv.to], firstFen: fenBefore };
  if (t.moves < 2) return null;
  const mover = mv.color;
  const fenAfter = board.fen();
  const mine = mover === student;
  const whose = mine ? 'your' : 'their';
  const name = PIECE_NAMES[mv.piece];
  const nth = ORDINAL[t.moves - 1] ?? `${t.moves}th`;
  const rot = stemKeyOf(`${placement(fenAfter)}:${mv.to}`);
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  // Its side's minors still on their first squares — never the piece itself.
  const home = homeMinors(board, mover).filter((sq) => sq !== mv.to);
  const homeWords = andList(home.map((sq) => `${PIECE_NAMES[board.get(sq as Square)?.type ?? 'n']} on ${sq}`));
  const atHome = (n: number): string => (n > 1 ? 'are' : 'is');
  // CHASED: an enemy pawn attacked it where it stood — its trip is the kick's
  // doing ("your pawn kicks move his pieces while you develop").
  const before = new Chess(fenBefore);
  const kicker = before.attackers(mv.from, enemy).find((sq) => before.get(sq)?.type === 'p') ?? null;
  const chased = kicker !== null || before.attackers(mv.from, enemy).length > 0;
  // A MOVE WITH A JOB: it now hits something it can win, or the engine calls
  // it fine — then the trip is not the lesson of this move.
  const fine = !chased && costCp !== null && costCp < FINE_CP;
  // Chased or not: a piece that lands where it hits something it can win (a
  // fork, gotham-jelena 11…Bc6) made a move with a job, not a wasted trip.
  for (const row of board.board()) for (const p of row) {
    if (!p || p.color !== enemy || p.type === 'k') continue;
    if (board.attackers(p.square, mover).includes(mv.to) && legalSeeGainFor(fenAfter, p.square, mover) > 0) return null;
  }

  // THE DETOUR — the second move lands where the first could have gone.
  if (t.moves === 2 && t.firstFen && !chased) {
    const first = new Chess(t.firstFen);
    const direct = first.moves({ square: t.origin as Square, verbose: true }).find((m) => m.to === mv.to && !m.captured);
    if (direct) {
      const there = new Chess(t.firstFen);
      there.move({ from: direct.from, to: direct.to });
      if (legalSeeGainFor(there.fen(), mv.to, enemy) <= 0) {
        return {
          kind: 'detour', mover, key: `moved-again:detour:${mover}${t.origin}`,
          squares: [t.origin, t.stood[1], mv.to],
          text: rotateStem([
            `Two moves to get ${whose} ${name} to ${mv.to}: it could have gone there straight from ${t.origin}.`,
            `That's ${whose} ${name}'s second move to reach ${mv.to}, a square it could have reached from ${t.origin} in one.`,
          ], rot),
        };
      }
    }
  }

  if (fine) return null;
  const kick = kicker ? ` after the pawn on ${kicker} kicked it` : '';
  // BACK AGAIN — a third trip or more, onto a square it already stood on.
  if (t.moves >= 3 && t.stood.slice(0, -1).includes(mv.to) && home.length >= 1) {
    const homeTail = ` ${cap(whose)} ${homeWords} ${atHome(home.length)} still at home.`;
    return {
      kind: 'back', mover, key: `moved-again:back:${mover}${t.origin}:${t.moves}`,
      squares: [mv.to, ...home, ...(kicker ? [kicker] : [])],
      text: rotateStem([
        `${cap(whose)} ${name} is back on ${mv.to}${kick}, its ${nth} move.${homeTail}`,
        `That's ${whose} ${name}'s ${nth} move, and it's back on ${mv.to}${kick}.${homeTail}`,
      ], rot),
    };
  }

  const developedOf = (c: Color): number => 4 - homeMinors(board, c).length;
  const ahead = developedOf(mover) > developedOf(enemy);
  // THE COUNT — a third move or more with two minors still at home, or one
  // and the king not castled.
  const kingHome = board.get((mover === 'w' ? 'e1' : 'e8') as Square)?.type === 'k';
  if (t.moves >= 3 && (home.length >= 2 || (home.length === 1 && kingHome)) && !ahead) {
    return {
      kind: 'count', mover, key: `moved-again:count:${mover}${t.origin}:${t.moves}`,
      squares: [mv.to, ...home, ...(kicker ? [kicker] : [])],
      text: rotateStem(home.length > 1 ? [
        `That's ${whose} ${name}'s ${nth} move${kick}, and ${whose} ${homeWords} still haven't moved.`,
        `${cap(whose)} ${name} moves for the ${nth} time${kick}, while ${whose} ${homeWords} wait at home.`,
      ] : [
        `That's ${whose} ${name}'s ${nth} move${kick}, with ${whose} ${homeWords} still at home and ${whose} king not castled.`,
        `${cap(whose)} ${name} moves for the ${nth} time${kick}, while ${whose} ${homeWords} waits at home and ${whose} king is still in the middle.`,
      ], rot),
    };
  }
  return null;
}

function cap(s: string): string {
  return openSentence(s);
}
