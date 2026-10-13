// guardRemoval — REMOVE THE GUARD, read from either seat (David 2026-10-13:
// "Make sure the coach can also identify when a removal of guard can work for
// the user as well. All computers MUST work both ways.").
//
// A piece held by ONE defender falls the moment that defender is gone. Two
// ways to make it go, both computed here:
//   • CAPTURE the guard (the tactic detector's `removal_of_guard`);
//   • CHASE it — attack the guard with a cheaper piece (or attack an
//     undefended guard), so it must move and leave its post. Game A of the loop
//     audit (nHdi6Qpx, 17…Qf5): the bishop on d3 was held by the queen alone,
//     Rc5 hit the queen, and the bishop fell — and no computer named it, so the
//     mistake reached the record unnamed.
//
// DUAL-USE, like `pinPressure`: with `holder` the student it is the chance
// ("their bishop on d3 has one guard, and it can be chased"); with `holder`
// the opponent it is the threat the student walked into. One computer, one
// answer, read from either seat.
//
// HONEST BY CONSTRUCTION: a removal is claimed only when, after the removing
// move, EVERY legal reply still leaves the target winnable (legal SEE) — a
// target that can step away, a guard that can retreat to another square still
// guarding it, or a reply with a bigger threat makes it silent. The removing
// move itself must not just lose the piece that makes it. PURE: chess.js + SEE.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export type GuardRemovalKind = 'capture' | 'chase';

export interface GuardRemovalMove {
  san: string;
  from: Square;
  to: Square;
  kind: GuardRemovalKind;
}

export interface GuardRemoval {
  /** The side that removes the guard (and is to move). */
  side: Color;
  /** The piece that falls, and its only defender. */
  target: Square;
  targetPiece: PieceSymbol;
  guard: Square;
  guardPiece: PieceSymbol;
  /** Every move that removes the guard and wins the target, captures first. */
  moves: GuardRemovalMove[];
}

/** The principle, in the coach's words (rotated by the caller). */
export const GUARD_REMOVAL_PRINCIPLE = [
  'A piece with one guard is only as safe as that guard — take it or chase it, and what it guarded falls.',
  'Remove the guard: when one piece holds another, attack the holder.',
] as const;

/** …and said against the student (rotated by the caller). */
export const GUARD_REMOVAL_WARNING = [
  'A piece with a single guard is a target — if they can chase the guard, give it a second defender or move it.',
  'Count your guards: a piece held by one defender falls the moment that defender is chased away.',
] as const;

function withMover(fen: string, color: Color): string {
  const parts = fen.split(' ');
  if (parts[1] === color) return fen;
  parts[1] = color;
  parts[3] = '-';
  return parts.join(' ');
}

/** Material of `me` minus material of the other side. */
function balance(c: Chess, me: Color): number {
  let n = 0;
  for (const row of c.board()) for (const p of row) {
    if (!p || p.type === 'k') continue;
    n += p.color === me ? VALUE[p.type] : -VALUE[p.type];
  }
  return n;
}

/** A "piece" in the net: a minor for a pawn is +2. */
const LOSES_A_PIECE = 2;

/** After `m`, does EVERY legal reply lose them a piece — counting what `m`
 *  already took? A guard that runs must leave its target to fall; a guard that
 *  stands must itself fall (the chase hits it); a target that runs must leave
 *  the guard to fall, or have paid for it already (the capture form). Any reply
 *  that saves both — a retreat still guarding, a new defender, a check — and
 *  the removal is not claimed. */
function everyReplyLosesAPiece(fen: string, m: Move, target: Square, guard: Square, me: Color): boolean {
  const start = balance(new Chess(fen), me);
  const after = new Chess(fen);
  try { after.move(m.san); } catch { return false; }
  if (after.isGameOver()) return false;
  const replies = after.moves({ verbose: true });
  if (replies.length === 0) return false;
  const guardNow: Square | null = m.to === guard ? null : guard;
  for (const r of replies) {
    const b = new Chess(after.fen());
    try { b.move(r.san); } catch { return false; }
    if (b.inCheck()) return false;                                  // a check answers first — not proven
    const theirs = (sq: Square | null): boolean => { const p = sq ? b.get(sq) : null; return !!p && p.color !== me; };
    const gain = (sq: Square | null): number => (sq && theirs(sq) ? Math.max(0, legalSeeGainFor(b.fen(), sq, me)) : 0);
    const net = balance(b, me) - start;
    // The guard ran: the removal is proven only if what it held now falls.
    if (guardNow && r.from === guardNow) {
      if (!theirs(target) || net + gain(target) < LOSES_A_PIECE) return false;
      continue;
    }
    if (net + Math.max(gain(target), gain(guardNow)) < LOSES_A_PIECE) return false;
  }
  return true;
}

/**
 * Every guard `holder` can remove to win a piece; [] when none. Defaults to
 * the side to move; a non-moving holder is read with a null move (the threat
 * view, as `findPinPressure` does).
 */
export function findGuardRemovals(fen: string, holder?: Color): GuardRemoval[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  if (holder && chess.turn() !== holder) {
    try { chess = new Chess(withMover(fen, holder)); } catch { return []; }
    if (chess.inCheck()) return [];
    fen = chess.fen();
  }
  if (chess.inCheck()) return [];
  const me = chess.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const out: GuardRemoval[] = [];
  const mine = chess.moves({ verbose: true });
  for (const row of chess.board()) {
    for (const t of row) {
      if (!t || t.color !== them || t.type === 'k' || VALUE[t.type] < 3) continue;
      const target = t.square;
      // We bear on it, and exactly one piece of theirs (not the king) guards it.
      if (chess.attackers(target, me).length === 0) continue;
      const guards = chess.attackers(target, them);
      if (guards.length !== 1) continue;
      const guard = guards[0];
      const g = chess.get(guard);
      if (!g || g.type === 'k') continue;
      // Already winnable as it stands — that is a hanging piece, not a removal.
      if (legalSeeGainFor(fen, target, me) >= VALUE[t.type]) continue;
      const moves: GuardRemovalMove[] = [];
      for (const m of mine) {
        if (m.to === target) continue;                                   // taking the target is not removing its guard
        let kind: GuardRemovalKind | null = null;
        if (m.to === guard) kind = 'capture';
        else {
          const a = new Chess(fen);
          try { a.move(m.san); } catch { continue; }
          const hitsGuard = a.attackers(guard, me).includes(m.to);
          if (!hitsGuard) continue;
          // A chase forces the guard away only when standing still costs it:
          // a cheaper attacker, or no defender of the guard.
          const guardDefended = a.attackers(guard, them).length > 0;
          if (VALUE[m.piece] >= VALUE[g.type] && guardDefended) continue;
          // The chaser is not just lost where it lands.
          if (legalSeeGainFor(a.fen(), m.to, them) >= VALUE[m.piece] && VALUE[m.piece] >= 3) continue;
          kind = 'chase';
        }
        if (kind === 'capture') {
          // Taking a guard that is recaptured must not cost more than it wins.
          const net = legalSeeGainFor(fen, guard, me);
          if (net < 0) continue;
        }
        if (!everyReplyLosesAPiece(fen, m, target, guard, me)) continue;
        moves.push({ san: m.san, from: m.from, to: m.to, kind });
      }
      if (moves.length === 0) continue;
      moves.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'capture' ? -1 : 1));
      out.push({ side: me, target, targetPiece: t.type, guard, guardPiece: g.type, moves });
    }
  }
  return out;
}

/** Whether a played move removes a guard on this board — by COORDINATES. */
export function isGuardRemovalMove(fen: string, from: string, to: string): boolean {
  return findGuardRemovals(fen).some((r) => r.moves.some((m) => m.from === from && m.to === to));
}
