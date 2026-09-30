// mastersPlanRead — THE OPENING'S KEY IDEA, COMPUTED FROM MASTER GAMES
// (WO-TEACH-GAPS P2 #0, David 2026-09-30: "I do not want to rely on the hand
// written notes. I want to accomplish the ideas via computer.").
//
// The hand-written beat said "the plan here is …c5". This says it from the
// data: walk the masters database forward from the board, weighting every
// branch by how often masters chose it, and count the PAWN BREAKS each side
// actually plays — a pawn move that captures a pawn or lands attacking one.
// The break the games go for most is the plan; its share is the evidence.
//
// Deterministic (a fixed walk over a fixed file), grounded (every move is a
// master move with a game count, G3), and it names nothing it cannot count.
import { Chess } from 'chess.js';
import type { LocalDbMove } from './masterPlayLookup';

export type MovesAt = (fen: string) => readonly LocalDbMove[] | null;

export interface PlanBreak {
  /** The break in SAN as first played on the walk ("c5", "f4", "exd5"). */
  san: string;
  /** The square the pawn lands on — the anchor for arrows and claims. */
  square: string;
  /** From where it was played (for the arrow). */
  from: string;
  /** Share of the weighted master games from here that play it, 0..1. */
  share: number;
}

export interface PieceHome {
  /** Piece letter (n, b, r, q). */
  piece: string;
  from: string;
  to: string;
  san: string;
  share: number;
}

export interface MastersPlanRead {
  /** Master games at the starting position. */
  games: number;
  white: PlanBreak | null;
  black: PlanBreak | null;
  /** Where each side's pieces most often go, one per side at most. */
  whitePiece: PieceHome | null;
  blackPiece: PieceHome | null;
  /** The side master games castle to, with its share. */
  whiteCastle: { side: 'short' | 'long'; share: number } | null;
  blackCastle: { side: 'short' | 'long'; share: number } | null;
}

/** A position with fewer master games than this says nothing about "usually". */
export const MIN_ROOT_GAMES = 100;
/** A branch below this share of its parent's games is not followed. */
const BRANCH_SHARE = 0.1;
/** A child position below this many games ends the walk down that branch. */
const MIN_NODE_GAMES = 20;
/** How far forward the walk reads, in plies. */
const DEPTH = 12;
/** A break played in fewer than this share of games is not "the plan". */
export const MIN_BREAK_SHARE = 0.4;
/** A piece placement said as "usually" needs a clear majority. */
export const MIN_PIECE_SHARE = 0.5;

const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** Is this pawn move a break — does it take a pawn, or land hitting one? */
function isBreak(c: Chess, m: { piece: string; captured?: string; to: string; color: 'w' | 'b' }): boolean {
  if (m.piece !== 'p') return false;
  if (m.captured === 'p') return true;
  const f = m.to.charCodeAt(0);
  const r = Number(m.to[1]) + (m.color === 'w' ? 1 : -1);
  if (r < 1 || r > 8) return false;
  for (const df of [-1, 1]) {
    const nf = f + df;
    if (nf < 97 || nf > 104) continue;
    const p = c.get(`${String.fromCharCode(nf)}${r}` as never);
    if (p && p.type === 'p' && p.color !== m.color) return true;
  }
  return false;
}

export function mastersPlanRead(fen: string, movesAt: MovesAt): MastersPlanRead | null {
  const root = movesAt(fen);
  const rootGames = root?.reduce((n, m) => n + m.games, 0) ?? 0;
  if (!root || rootGames < MIN_ROOT_GAMES) return null;
  // side → break key → { weight, san, square, from }
  const tally: Record<'w' | 'b', Map<string, { weight: number; san: string; square: string; from: string }>> = { w: new Map(), b: new Map() };
  const pieces: Record<'w' | 'b', Map<string, { weight: number; piece: string; from: string; to: string; san: string }>> = { w: new Map(), b: new Map() };
  const castles: Record<'w' | 'b', Record<'short' | 'long', number>> = { w: { short: 0, long: 0 }, b: { short: 0, long: 0 } };
  const seen = new Set<string>();
  const walk = (at: string, weight: number, depth: number, found: Set<string>, lastCaptureOn: string | null): void => {
    if (depth >= DEPTH) return;
    const moves = movesAt(at);
    const total = moves?.reduce((n, m) => n + m.games, 0) ?? 0;
    if (!moves || total < MIN_NODE_GAMES) return;
    // A transposition reached twice is read once, by its heavier path first.
    const k = `${key(at)}|${[...found].sort().join(',')}`;
    if (seen.has(k)) return;
    seen.add(k);
    for (const mv of moves) {
      const share = mv.games / total;
      if (share < BRANCH_SHARE) continue;
      const c = new Chess(at);
      let m;
      try { m = c.move(mv.san); } catch { continue; }
      if (!m) continue;
      const w = weight * share;
      let next = found;
      // A pawn taking back on the square just captured on is a recapture, not
      // a break (QGD: …exd5 after cxd5).
      const recapture = !!m.captured && m.to === lastCaptureOn;
      // A capture on the next two plies is the move in hand, not a plan
      // ("their break is exd5 (98%)" the move after …d5).
      const immediate = !!m.captured && depth < 2;
      if (!recapture && !immediate && isBreak(new Chess(at), m)) {
        // Counted once per path: the same break reached again down a line is
        // the same plan, not a second vote.
        const id = `${m.color}:${m.from}${m.to}`;
        if (!found.has(id)) {
          const cur = tally[m.color].get(id) ?? { weight: 0, san: m.san, square: m.to, from: m.from };
          cur.weight += w;
          tally[m.color].set(id, cur);
          next = new Set(found); next.add(id);
        }
      }
      if (m.san.startsWith('O-O')) castles[m.color][m.san === 'O-O-O' ? 'long' : 'short'] += w;
      // A piece placed, not a capture or a recapture: where the games put it.
      // Only a placement WITH A PURPOSE: not the move in hand, and a queen or
      // rook, or a piece crossing to the fourth rank or beyond — "the knight
      // goes to f3" is development, not a plan.
      else if (m.piece !== 'p' && m.piece !== 'k' && !m.captured && depth >= 2
        && ('qr'.includes(m.piece) || (m.color === 'w' ? Number(m.to[1]) >= 4 : Number(m.to[1]) <= 5))
        && !found.has(`${m.color}:piece:${m.from}`)) {
        const id = `${m.color}:piece:${m.from}`;
        const pid = `${m.from}${m.to}`;
        const cur = pieces[m.color].get(pid) ?? { weight: 0, piece: m.piece, from: m.from, to: m.to, san: m.san };
        cur.weight += w;
        pieces[m.color].set(pid, cur);
        next = new Set(next); next.add(id);
      }
      walk(c.fen(), w, depth + 1, next, m.captured ? m.to : null);
    }
  };
  walk(fen, 1, 0, new Set(), null);
  const top = (side: 'w' | 'b'): PlanBreak | null => {
    const best = [...tally[side].values()].sort((a, b) => b.weight - a.weight)[0];
    if (!best || best.weight < MIN_BREAK_SHARE) return null;
    return { san: best.san, square: best.square, from: best.from, share: Math.min(1, best.weight) };
  };
  const white = top('w'); const black = top('b');
  const piece = (side: 'w' | 'b'): PieceHome | null => {
    const best = [...pieces[side].values()].sort((a, b) => b.weight - a.weight)[0];
    return best && best.weight >= MIN_PIECE_SHARE ? { piece: best.piece, from: best.from, to: best.to, san: best.san, share: Math.min(1, best.weight) } : null;
  };
  const castle = (side: 'w' | 'b'): { side: 'short' | 'long'; share: number } | null => {
    const { short, long } = castles[side];
    const pick = short >= long ? { side: 'short' as const, share: short } : { side: 'long' as const, share: long };
    return pick.share >= MIN_BREAK_SHARE ? { side: pick.side, share: Math.min(1, pick.share) } : null;
  };
  const read = { games: rootGames, white, black, whitePiece: piece('w'), blackPiece: piece('b'), whiteCastle: castle('w'), blackCastle: castle('b') };
  if (!white && !black && !read.whitePiece && !read.blackPiece) return null;
  return read;
}

/** The sentence, from the student's seat. Null when neither side has a break
 *  master games agree on. */
export function mastersPlanLine(read: MastersPlanRead | null, student: 'w' | 'b'): { text: string; squares: string[]; arrows: Array<{ from: string; to: string }> } | null {
  if (!read) return null;
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const mine = student === 'w' ? read.white : read.black;
  const theirs = student === 'w' ? read.black : read.white;
  const myPiece = student === 'w' ? read.whitePiece : read.blackPiece;
  const myCastle = student === 'w' ? read.whiteCastle : read.blackCastle;
  const pct = (share: number): string => `${Math.round(share * 100)}%`;
  const dot = (san: string, side: 'w' | 'b'): string => `${side === 'b' ? '…' : ''}${san}`;
  const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
  const parts: string[] = [];
  const squares: string[] = [];
  const arrows: Array<{ from: string; to: string }> = [];
  if (mine) {
    parts.push(`your break is ${dot(mine.san, student)} — masters from here play it in about ${pct(mine.share)} of games`);
    squares.push(mine.square); arrows.push({ from: mine.from, to: mine.square });
  } else if (myPiece) {
    parts.push(`your ${NAME[myPiece.piece] ?? 'piece'} on ${myPiece.from} usually goes to ${myPiece.to} (${dot(myPiece.san, student)}, about ${pct(myPiece.share)} of master games)${myCastle ? `, and you castle ${myCastle.side}` : ''}`);
    squares.push(myPiece.to); arrows.push({ from: myPiece.from, to: myPiece.to });
  }
  if (theirs) {
    parts.push(`${parts.length ? 'theirs is' : 'their break is'} ${dot(theirs.san, them)} (${pct(theirs.share)})`);
    squares.push(theirs.square); arrows.push({ from: theirs.from, to: theirs.square });
  }
  if (!parts.length) return null;
  return { text: `The plan in this structure: ${parts.join(', and ')}.`, squares, arrows };
}
