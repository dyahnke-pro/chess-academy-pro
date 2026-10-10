// trappedPiece — IS THIS PIECE TRAPPED? One computer for the question every
// "a pawn hits a piece" and "trapped" reading asks (contract 2026-10-10: b4
// trapped the knight on a5 — no safe square — and every surface said only
// "kicks their knight off a5, gaining time"). A leaf: chess.js and the legal
// static exchange, nothing that imports the coach.
import { Chess, type Color, type Square } from 'chess.js';
import { legalSeeGainOn } from './positionReadingService';

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** After the owner's move, can the opponent still win the piece on `sq`? */
function stillWinnable(afterOppToMove: Chess, sq: string, side: Color, val: number): boolean {
  const cell = afterOppToMove.get(sq as Square);
  if (!cell || cell.color !== side) return false;
  const caps = afterOppToMove.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (caps.length === 0) return false;
  if (caps.some((m) => (VAL[afterOppToMove.get(m.from)?.type ?? 'k'] ?? 99) < val)) return true;
  return afterOppToMove.attackers(sq as Square, side).length === 0;
}

/**
 * The piece on `sq` is TRAPPED: attacked so that staying loses it, every move
 * of its own loses it, and no other move of its side saves it (capturing the
 * attacker, blocking, adding a guard). Board fact, read on `fen` whoever is to
 * move — the owner is handed the move to look for a way out. Null when it is
 * not trapped (or nothing stands there).
 */
export function trappedAt(fen: string, sq: string): { attackerSquare: string } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const piece = chess.get(sq as Square);
  if (!piece || piece.type === 'k' || piece.type === 'p') return null;
  const side = piece.color;
  const enemy: Color = side === 'w' ? 'b' : 'w';
  const val = VAL[piece.type];
  const attackers = chess.attackers(sq as Square, enemy);
  if (attackers.length === 0) return null;
  const cheapAtk = attackers.find((a) => (VAL[chess.get(a)?.type ?? 'k'] ?? 99) < val);
  const defended = chess.attackers(sq as Square, side).length > 0;
  if (!cheapAtk && defended) return null;
  const parts = chess.fen().split(' ');
  parts[1] = side; parts[3] = '-';
  let probe: Chess;
  try { probe = new Chess(parts.join(' ')); } catch { return null; }
  if (probe.inCheck()) return null;
  for (const m of probe.moves({ verbose: true }).filter((x) => x.from === sq)) {
    const after = new Chess(parts.join(' '));
    after.move(m.san);
    if (m.captured) {
      if (legalSeeGainOn(after, m.to) - (VAL[m.captured] ?? 0) < 1) return null;
    } else {
      const atk = after.attackers(m.to, enemy);
      if (atk.length === 0) return null;
      const cheaper = atk.some((a) => (VAL[after.get(a)?.type ?? 'k'] ?? 99) < val);
      if (!cheaper && after.attackers(m.to, side).length > 0) return null;
    }
  }
  for (const m of probe.moves({ verbose: true })) {
    if (m.from === sq) continue;
    const after = new Chess(parts.join(' '));
    try { after.move(m.san); } catch { continue; }
    if (!stillWinnable(after, sq, side, val)) return null;
  }
  return { attackerSquare: cheapAtk ?? attackers[0] };
}

/**
 * THE PIECE A PAWN MOVE HITS — and whether it is a kick (it has a safe square
 * to go to) or a trap (it has none). `fenAfter` is the board after the pawn
 * move. The most valuable minor or heavy piece the pawn now attacks.
 */
export function pawnHit(fenAfter: string, mv: { piece: string; to: string; color: Color; captured?: string }): { square: string; type: string; trapped: boolean } | null {
  if (mv.piece !== 'p') return null;
  let after: Chess;
  try { after = new Chess(fenAfter); } catch { return null; }
  const dir = mv.color === 'w' ? 1 : -1;
  const f = mv.to.charCodeAt(0);
  const r = Number(mv.to[1]) + dir;
  let hit: { square: string; type: string } | null = null;
  for (const df of [-1, 1]) {
    const file = String.fromCharCode(f + df);
    if (file < 'a' || file > 'h' || r < 1 || r > 8) continue;
    const square = `${file}${r}`;
    const c = after.get(square as Square);
    if (!c || c.color === mv.color || !['n', 'b', 'r', 'q'].includes(c.type)) continue;
    if (!hit || VAL[c.type] > VAL[hit.type]) hit = { square, type: c.type };
  }
  return hit ? { ...hit, trapped: !!trappedAt(fenAfter, hit.square) } : null;
}

/** Does the engine's line take the piece standing on `square`, following it
 *  wherever it runs? "Trapped — coming off the board" is an OUTCOME, so it is
 *  what the line does (WO-OUTCOME-01), never a mobility count alone. */
export function lineTakesPiece(fen: string, square: string, lineUci: readonly string[]): boolean {
  let c: Chess;
  try { c = new Chess(fen); } catch { return false; }
  const owner = c.get(square as Square)?.color;
  if (!owner) return false;
  let sq = square;
  for (const u of lineUci) {
    let mv;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return false; }
    if (!mv) return false;
    if (mv.color === owner && mv.from === sq) sq = mv.to;
    else if (mv.color !== owner && mv.to === sq && mv.captured) return true;
  }
  return false;
}
