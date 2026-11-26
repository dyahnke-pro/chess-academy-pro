// causeReaders — THE MISSING CAUSE READERS (docs/plans/2026-11-23-learn-
// mistakes-only.md, "Missing items"). Each reads why a costly move cost when
// the material reasons (`costReason`) found nothing: a fact, never words (the
// one renderer words it). PURE: chess.js and the existing readers.
//
//   minorRetreat        — a minor piece walks back to its back rank, unforced
//                         (the tempo it spent coming out is thrown away).
//   missedTempo         — a quiet move where the better move came with tempo
//                         (a check, or a new threat they must answer).
//   pawnLetGo           — the reply line wins a centre pawn of the mover's
//                         that the better line keeps.
//   rookActivityLost    — a rook leaves an open or half-open file for a worse
//                         one while the better move keeps it there.
//   wrongOrder          — the played move is the better line's own third ply:
//                         the forcing move had to come first.
//   freedSquare         — the chase sends their piece off a square another
//                         piece of theirs needed to get out.
//   defenderHit         — the better move hits the one guard of a piece of
//                         theirs, and the line wins that piece.
//   (the bishop shut in by its own pawn is `theirMoveCost.bishopShutBy`, the
//   hanging pawns `nextPlans.hangingPawns` — one reader each, both seats.)
import { Chess, type Color, type Square } from 'chess.js';
import { computeMustDefend, newThreat } from './threatOut';
import { findOpenFiles } from './positionReadingService';
import { isPassedPawnAt } from './boardStructure';
import { CAPTURE_VALUE } from './pieceValues';

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function playSan(fen: string, san: string): { c: Chess; m: ReturnType<Chess['move']> } | null {
  try { const c = new Chess(fen); const m = c.move(san); return m ? { c, m } : null; } catch { return null; }
}

function playUci(fen: string, uci: readonly string[], plies: number): Chess | null {
  try {
    const c = new Chess(fen);
    for (const u of uci.slice(0, plies)) {
      if (!c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) break;
    }
    return c;
  } catch { return null; }
}

// ── 1. A minor piece walks back to its back rank ────────────────────────────

export interface MinorRetreat { piece: 'n' | 'b'; from: string; to: string }

/** A knight or bishop of the mover's steps back onto its own back rank with
 *  queens on: no capture, no check, the piece was not under attack (the
 *  must-defend read before the move does not hold it), and the move guards
 *  nothing that was loose (the must-defend read after holds no fewer of the
 *  mover's units). Then the retreat is a tempo thrown away — kind
 *  `tempo-wasted`. */
export function minorRetreat(fenBefore: string, san: string): MinorRetreat | null {
  const r = playSan(fenBefore, san);
  if (!r) return null;
  const { c, m } = r;
  if ((m.piece !== 'n' && m.piece !== 'b') || m.captured || c.inCheck()) return null;
  const home = m.color === 'w' ? '1' : '8';
  if (m.to[1] !== home || m.from[1] === home) return null;
  if (!c.board().flat().some((x) => x?.type === 'q')) return null;
  const before = computeMustDefend(fenBefore, m.color).pieces;
  if (before.some((p) => p.square === m.from)) return null;
  const after = computeMustDefend(c.fen(), m.color).pieces;
  if (after.length < before.length) return null;
  return { piece: m.piece, from: m.from, to: m.to };
}

// ── 3. A quiet move where the better move came with tempo ───────────────────

export interface MissedTempo { bestSan: string; how: 'check' | 'threat'; target: string | null }

/** The played move neither checks nor makes a new threat (`newThreat`), and
 *  the better move does: a check, or a piece of theirs newly en prise / a mate
 *  threat. `target`: the enemy piece the better move puts en prise, when it
 *  does. Kind `tempo-wasted`. */
export function missedTempo(fenBefore: string, playedSan: string, bestSan: string | null): MissedTempo | null {
  if (!bestSan) return null;
  const p = playSan(fenBefore, playedSan);
  const b = playSan(fenBefore, bestSan);
  if (!p || !b) return null;
  if (p.m.san.replace(/[+#]$/, '') === b.m.san.replace(/[+#]$/, '')) return null;
  const foe = other(p.m.color);
  if (p.c.inCheck() || p.m.captured || newThreat(fenBefore, p.c.fen(), foe)) return null;
  if (b.c.inCheck()) return { bestSan: b.m.san, how: 'check', target: null };
  if (b.m.captured || !newThreat(fenBefore, b.c.fen(), foe)) return null;
  const was = new Set(computeMustDefend(fenBefore, foe).pieces.map((x) => x.square));
  const hit = computeMustDefend(b.c.fen(), foe).pieces.find((x) => !was.has(x.square));
  return { bestSan: b.m.san, how: 'threat', target: hit?.square ?? null };
}

// ── 4. A pawn let go ─────────────────────────────────────────────────────────
export interface PawnLetGo { pawn: string; plies: number }
const CENTRE_FILES = new Set(['c', 'd', 'e', 'f']);
/** How far the reply line is read for the pawn it wins. */
const LET_GO_PLIES = 10;
const pawnsOf = (c: Chess, side: Color): number => c.board().flat().filter((x) => x?.type === 'p' && x.color === side).length;
/** The pawn count for `side` against the other side's — a pawn taken back
 *  is a trade, not a pawn let go. */
const pawnEdge = (c: Chess, side: Color): number => pawnsOf(c, side) - pawnsOf(c, other(side));
/** The reply line (their move first, after the played move) takes a pawn of
 *  the mover's — a centre pawn (c–f files) within `plies`, or later in the
 *  line a passed pawn of the mover's — and the mover's pawn edge (its pawns
 *  less theirs) is down there, while the better line keeps that edge to the
 *  same depth. `pawn`: the square of the pawn taken. Kind `allowed-capture`
 *  (the pawn is the material; the line is longer than the one-move capture
 *  read sees). */
export function pawnLetGo(
  fenBefore: string, playedSan: string,
  replyLineUci: readonly string[], bestLineUci: readonly string[] | null,
  plies = 4,
): PawnLetGo | null {
  const p = playSan(fenBefore, playedSan);
  if (!p || !bestLineUci?.length) return null;
  const me = p.m.color;
  const start = pawnEdge(p.c, me);
  let taken: string | null = null;
  let at = 0;
  try {
    const c = new Chess(p.c.fen());
    for (const [k, u] of replyLineUci.slice(0, LET_GO_PLIES).entries()) {
      const passed = (() => { try { return isPassedPawnAt(c.fen(), u.slice(2, 4), me); } catch { return false; } })();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      if (!taken && m.color !== me && m.captured === 'p' && (k < plies ? CENTRE_FILES.has(m.to[0]) : passed)) { taken = m.to; at = k + 1; }
      // Past `plies` the line is read on only for a passer of theirs taken.
      if (taken && k + 1 >= Math.max(plies, at)) break;
    }
    if (!taken || pawnEdge(c, me) >= start) return null;
  } catch { return null; }
  const best = playUci(fenBefore, bestLineUci, Math.max(plies, at) + 1);
  const before = new Chess(fenBefore);
  if (!best || pawnEdge(best, me) < pawnEdge(before, me)) return null;
  return { pawn: taken, plies: at };
}

// ── 5. A rook's activity lost ───────────────────────────────────────────────

export interface RookActivityLost { from: string; to: string; file: string; was: 'open' | 'half-open' }

/** How open a file is for `side`'s rook: 2 open, 1 half-open, 0 closed. */
function fileWorth(fen: string, side: Color, file: string): number {
  const f = findOpenFiles(fen);
  if (f.open.includes(file)) return 2;
  return (side === 'w' ? f.whiteSemiOpen : f.blackSemiOpen).includes(file) ? 1 : 0;
}

/** The mover's rook leaves an open or half-open file for a file worth less
 *  (open > half-open > closed), no capture and no check, while the better
 *  move keeps a rook of the mover's on the file it left. Kind `positional`
 *  (the rook's activity). */
export function rookActivityLost(fenBefore: string, playedSan: string, bestSan: string | null): RookActivityLost | null {
  if (!bestSan) return null;
  const p = playSan(fenBefore, playedSan);
  const b = playSan(fenBefore, bestSan);
  if (!p || !b) return null;
  const { m } = p;
  if (m.piece !== 'r' || m.captured || p.c.inCheck() || m.from[0] === m.to[0]) return null;
  const me = m.color;
  const was = fileWorth(fenBefore, me, m.from[0]);
  if (was === 0 || fileWorth(p.c.fen(), me, m.to[0]) >= was) return null;
  const keeps = b.c.board().flat().some((x) => x?.type === 'r' && x.color === me && x.square[0] === m.from[0]);
  if (!keeps) return null;
  return { from: m.from, to: m.to, file: m.from[0], was: was === 2 ? 'open' : 'half-open' };
}

// ── 6. The right idea in the wrong order ────────────────────────────────────
export interface WrongOrder { first: string; how: 'check' | 'capture'; played: string }
/** The played move is the better line's third ply (the mover's next move):
 *  the line's first move is a check or a capture, their answer, then the
 *  played move — it was right one move later. */
export function wrongOrder(fenBefore: string, playedSan: string, bestLineUci: readonly string[] | null): WrongOrder | null {
  if (!bestLineUci || bestLineUci.length < 3) return null;
  const p = playSan(fenBefore, playedSan);
  if (!p) return null;
  const uci = `${p.m.from}${p.m.to}${p.m.promotion ?? ''}`;
  if (bestLineUci[0] === uci || bestLineUci[2] !== uci) return null;
  try {
    const c = new Chess(fenBefore);
    const first = c.move({ from: bestLineUci[0].slice(0, 2), to: bestLineUci[0].slice(2, 4), promotion: bestLineUci[0][4] });
    if (!first) return null;
    const how = c.inCheck() ? 'check' : first.captured ? 'capture' : null;
    if (!how) return null;
    if (!c.move({ from: bestLineUci[1].slice(0, 2), to: bestLineUci[1].slice(2, 4), promotion: bestLineUci[1][4] })) return null;
    if (!c.move({ from: p.m.from, to: p.m.to, promotion: p.m.promotion })) return null;
    return { first: first.san, how, played: p.m.san };
  } catch { return null; }
}

// ── 7. A chase that frees their stuck piece ─────────────────────────────────
export interface FreedSquare { square: string; chased: string; piece: string; from: string }
/** The played move attacks a piece of theirs (not a pawn), the reply moves it
 *  off its square, and their next move puts another piece of theirs on that
 *  square — a piece the better move would have attacked more. `square`: the
 *  square the chase freed; `from`: where the freed piece came from. */
export function freedSquare(fenBefore: string, playedSan: string, replyLineUci: readonly string[], bestSan: string | null): FreedSquare | null {
  if (!bestSan || replyLineUci.length < 3) return null;
  const p = playSan(fenBefore, playedSan);
  const b = playSan(fenBefore, bestSan);
  if (!p || !b) return null;
  const me = p.m.color;
  const foe = other(me);
  const sq = replyLineUci[0].slice(0, 2);
  const chased = p.c.get(sq as Square);
  if (!chased || chased.color !== foe || chased.type === 'p' || !p.c.attackers(sq as Square, me).includes(p.m.to)) return null;
  const c = new Chess(p.c.fen());
  try {
    if (!c.move({ from: sq, to: replyLineUci[0].slice(2, 4), promotion: replyLineUci[0][4] })) return null;
    if (!c.move({ from: replyLineUci[1].slice(0, 2), to: replyLineUci[1].slice(2, 4), promotion: replyLineUci[1][4] })) return null;
    const into = c.move({ from: replyLineUci[2].slice(0, 2), to: replyLineUci[2].slice(2, 4), promotion: replyLineUci[2][4] });
    if (!into || into.to !== sq || into.color !== foe) return null;
    const was = new Chess(fenBefore).attackers(into.from, me).length;
    if (b.c.attackers(into.from, me).length <= was) return null;
    return { square: sq, chased: chased.type, piece: into.piece, from: into.from };
  } catch { return null; }
}

// ── 8. The lone guard hit ───────────────────────────────────────────────────
export interface DefenderHit { defender: string; target: string; plies: number }
/** A piece of theirs (not the king, not a pawn) that the mover attacks has
 *  exactly one guard; the better move — quiet, not the played move — attacks
 *  that guard (unattacked before and after the played move), and within three
 *  plies of the better line the mover takes the piece (worth a minor or more). */
export function defenderHit(fenBefore: string, playedSan: string, bestLineUci: readonly string[] | null): DefenderHit | null {
  if (!bestLineUci?.length) return null;
  const p = playSan(fenBefore, playedSan);
  if (!p) return null;
  const me = p.m.color;
  const foe = other(me);
  const before = new Chess(fenBefore);
  try {
    const b = new Chess(fenBefore);
    const best = b.move({ from: bestLineUci[0].slice(0, 2), to: bestLineUci[0].slice(2, 4), promotion: bestLineUci[0][4] });
    if (!best || best.captured || best.san === p.m.san) return null;
    for (const cell of before.board().flat()) {
      if (!cell || cell.color !== foe || cell.type === 'k' || cell.type === 'p') continue;
      const guards = before.attackers(cell.square, foe);
      if (guards.length !== 1 || before.attackers(cell.square, me).length === 0) continue;
      const guard = guards[0];
      if (!b.attackers(guard, me).includes(best.to) || before.attackers(guard, me).length > 0 || p.c.attackers(guard, me).length > 0) continue;
      const line = new Chess(b.fen());
      for (const [k, u] of bestLineUci.slice(1, 4).entries()) {
        const m = line.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        if (!m) break;
        if (m.color === me && m.to === cell.square && m.captured && CAPTURE_VALUE[m.captured] >= 3) return { defender: guard, target: cell.square, plies: k + 2 };
      }
    }
  } catch { return null; }
  return null;
}
