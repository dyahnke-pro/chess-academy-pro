// KING ATTACK (census #2, 518 of his lines): "the rook to c1 — bringing a piece
// into the attack", "you capture on f7 — eliminating one of the pawns that
// form their kingside foundation", "first the queen to e1 — rerouting the
// queen to g3", "the g7-pawn is pitiful cover, so the rook to g3".
//
// One counter, shared with chat's "do I have an attack?" (`countKingAttack`):
// the mover's pieces bearing on the enemy king and its neighbours against the
// pieces defending them, pin-aware. The move is an attacking move when it
//   · takes a pawn from in front of their castled king;
//   · takes off a defender for good (not a trade they simply recapture);
//   · rips open a file next to their king, or opens lines so two more pieces
//     bear on it;
//   · brings a piece over (quietly) to bear on it, the attack at least two;
//   · heads there: one more quiet move of that piece lands it, safely, on a
//     square bearing on their king — where from its old square it could not.
// Only against a CASTLED king for the quiet kinds (an uncastled king in the
// centre is a different lesson), only with a queen or two attackers already,
// never on a mating move (that has its own sentence).
//
// Measured on 80 of his speedrun games: 0.6 lines a game.
import { sideToMoveAs } from './threatOut';
import { Chess, type Square } from 'chess.js';
import { countKingAttack, shelterSquares } from './kingSafety';
import { CAPTURE_VALUE } from './pieceValues';

export interface KingAttackPoint {
  kind: 'strips-shelter' | 'removes-defender' | 'adds-attacker' | 'heads-for-king' | 'opens-lines' | 'opens-file';
  text: string;
  squares: string[];
  attackers: number;
  defenders: number;
  /** heads-for-king: the move that lands the piece. */
  next?: { san: string; uci: string };
}

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** `c` with `color` to move and no en-passant square — to ask where a piece
 *  could go next. */
function withTurn(c: Chess, color: 'w' | 'b'): Chess | null {
  // The one null-move rule (threatOut.sideToMoveAs, census 2026-10-10).
  const f = sideToMoveAs(c.fen(), color);
  return f ? new Chess(f) : null;
}

/** The piece on `from` moved to `to`: does it bear on the enemy king, and
 *  can it live there (not taken by a cheaper piece, not taken undefended)? */
function bearsSafelyFrom(c: Chess, from: string, to: string, me: 'w' | 'b'): boolean {
  const p = withTurn(c, me);
  if (!p) return false;
  try { p.move({ from: from as Square, to: to as Square, promotion: 'q' }); } catch { return false; }
  const k = countKingAttack(p, me);
  if (!k || !k.attackers.has(to)) return false;
  const piece = p.get(to as Square);
  if (!piece) return false;
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const hit = p.attackers(to as Square, them);
  if (!hit.length) return true;
  const cheaper = hit.some((s) => CAPTURE_VALUE[p.get(s)?.type ?? 'k'] < CAPTURE_VALUE[piece.type]);
  return !cheaper && p.attackers(to as Square, me).length > 0;
}

function quietNextMoves(c: Chess, sq: string, me: 'w' | 'b'): { to: string; san: string }[] {
  const p = withTurn(c, me);
  if (!p) return [];
  try {
    return p.moves({ square: sq as Square, verbose: true }).filter((m) => !m.captured).map((m) => ({ to: m.to, san: m.san }));
  } catch { return []; }
}

export function kingAttack(fenBefore: string, san: string): KingAttackPoint | null {
  let before: Chess; let after: Chess; let mv;
  try {
    before = new Chess(fenBefore);
    after = new Chess(fenBefore);
    mv = after.move(san);
    if (!mv) return null;
  } catch { return null; }
  if (after.isCheckmate()) return null;
  const me = mv.color;
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const b = countKingAttack(before, me);
  const a = countKingAttack(after, me);
  if (!b || !a) return null;
  const hasQueen = after.board().flat().some((x) => x?.type === 'q' && x.color === me);
  if (!hasQueen && a.attackers.size < 2) return null;
  const shelter = shelterSquares(a.king, them);
  const dot = me === 'b' ? '…' : '';
  const played = `${dot}${mv.san}`;
  const tally = a.attackers.size >= 2 && a.attackers.size >= a.defenders.size
    ? ` — ${a.attackers.size} of your pieces on it against ${a.defenders.size} defender${a.defenders.size === 1 ? '' : 's'}`
    : '';
  const out = (kind: KingAttackPoint['kind'], text: string, squares: string[]): KingAttackPoint =>
    ({ kind, text, squares: [...new Set([...squares, a.king])], attackers: a.attackers.size, defenders: a.defenders.size });

  if (mv.captured === 'p' && shelter?.includes(mv.to)) {
    return out('strips-shelter', `${played} takes away one of the pawns in front of their king — the cover is coming apart${tally}.`, [mv.to]);
  }
  // A DEFENDER STANDS BY THE KING (walk 2026-09-30: "…Rxe4 takes off a
  // defender of their king" of a rook three squares away, that had just taken
  // on e4 — a recapture, not an attack). Within two squares of it.
  const nearKing = Math.max(Math.abs(mv.to.charCodeAt(0) - a.king.charCodeAt(0)), Math.abs(Number(mv.to[1]) - Number(a.king[1]))) <= 2;
  if (mv.captured && mv.captured !== 'p' && shelter && nearKing && b.defenders.has(mv.to) && a.defenders.size < b.defenders.size
    && after.attackers(mv.to, them).length === 0 && a.attackers.size >= 2) {
    return out('removes-defender', `${played} takes off a defender of their king${tally}.`, [mv.to]);
  }
  if (mv.piece === 'p') {
    const kf = a.king.charCodeAt(0);
    const files = [kf - 1, kf, kf + 1].filter((f) => f >= 97 && f <= 104).map((f) => String.fromCharCode(f));
    const pawnsOn = (c: Chess, file: string): number => c.board().flat().filter((x) => x?.type === 'p' && x.square[0] === file).length;
    const opened = files.find((f) => pawnsOn(before, f) > 0 && pawnsOn(after, f) === 0);
    if (opened && shelter) return out('opens-file', `${played} rips open the ${opened}-file next to their king.`, [`${opened}${a.king[1]}`]);
    if (a.attackers.size - b.attackers.size >= 2) {
      return out('opens-lines', `${played} opens lines at their king${tally || ` — ${a.attackers.size} of your pieces now bear on it`}.`, [mv.to]);
    }
    return null;
  }
  // Bringing a piece over is a quiet move; a capture is about the material.
  if (mv.piece === 'k' || !shelter || mv.captured) return null;
  if (a.attackers.has(mv.to) && !b.attackers.has(mv.from) && a.attackers.size > b.attackers.size && a.attackers.size >= 2) {
    return out('adds-attacker', `${played} brings your ${NAME[mv.piece]} into the attack on their king${tally}.`, [mv.to]);
  }
  if (!a.attackers.has(mv.to) && !b.attackers.has(mv.from) && a.attackers.size >= 1) {
    const kf = a.king.charCodeAt(0);
    const onWing = (sq: string): boolean => Math.abs(sq.charCodeAt(0) - kf) <= 2;
    const next = quietNextMoves(after, mv.to, me).find((n) => onWing(n.to) && bearsSafelyFrom(after, mv.to, n.to, me));
    const could = quietNextMoves(before, mv.from, me).some((n) => onWing(n.to) && bearsSafelyFrom(before, mv.from, n.to, me));
    if (next && !could) {
      return {
        ...out('heads-for-king', `${played} heads for their king — ${dot}${next.san} next brings the ${NAME[mv.piece]} to bear.`, [mv.to, next.to]),
        next: { san: next.san, uci: `${mv.to}${next.to}` },
      };
    }
  }
  return null;
}
