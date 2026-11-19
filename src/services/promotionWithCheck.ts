// promotionWithCheck — DRIVE THE KING TO THE PROMOTION RANK FIRST (Danya have-check, 2026-11-19).
//
// Danya on the Mitrofanov study: "1.b6+ drives the king to the eighth rank so
// every White promotion later comes with check." A check that pushes the
// defending king onto the rank where your pawn will queen turns the promotion
// into a check — a tempo the race needs. Nothing read it: the promotion reads
// see a queen appear, never the order that makes it arrive with check.
//
// The read, chess.js only, on a checking move: after every legal king reply
// that steps onto your promotion rank (or the engine's own reply when given),
// one of your passed pawns on its sixth or seventh rank has a clear path, and
// its promotion square sees that king along the rank with nothing between (a
// square beside the king counts only when something of yours guards it).
import { Chess, type Color, type Square } from 'chess.js';

export interface PromotionWithCheck { check: string; kingTo: Square; pawn: Square; queens: Square; text: string; squares: Square[] }

const FILES = 'abcdefgh';

function clearRank(c: Chess, from: Square, to: Square): boolean {
  if (from[1] !== to[1]) return false;
  const a = FILES.indexOf(from[0]); const b = FILES.indexOf(to[0]);
  for (let f = Math.min(a, b) + 1; f < Math.max(a, b); f++) if (c.get(`${FILES[f]}${from[1]}` as Square)) return false;
  return true;
}

function passed(c: Chess, sq: Square, col: Color): boolean {
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  for (const df of [-1, 0, 1]) {
    const ff = f + df; if (ff < 0 || ff > 7) continue;
    for (let rr = 1; rr <= 8; rr++) {
      if (col === 'w' ? rr <= r : rr >= r) continue;
      const p = c.get(`${FILES[ff]}${rr}` as Square);
      if (p && p.type === 'p' && p.color !== col) return false;
    }
  }
  return true;
}

/** A check that puts their king on the rank your pawn queens on, so the promotion comes with check; or null. */
export function promotionWithCheck(fen: string, san: string, reply: string | null): PromotionWithCheck | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  let m;
  try { m = c.move(san); } catch { return null; }
  if (!c.inCheck()) return null;
  const me = m.color;
  const promoRank = me === 'w' ? '8' : '1';
  const replies = c.moves({ verbose: true }).filter((r) => (reply ? r.san === reply || `${r.from}${r.to}` === reply : true));
  if (!replies.length || replies.some((r) => r.piece !== 'k' || r.to[1] !== promoRank)) return null;
  const r0 = replies[0];
  c.move(r0.san);
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.type !== 'p' || p.color !== me) continue;
      const rel = me === 'w' ? Number(p.square[1]) : 9 - Number(p.square[1]);
      if (rel < 6 || !passed(c, p.square, me)) continue;
      const queens = `${p.square[0]}${promoRank}` as Square;
      let path = true;
      for (let rr = Number(p.square[1]) + (me === 'w' ? 1 : -1); me === 'w' ? rr <= 8 : rr >= 1; rr += me === 'w' ? 1 : -1) {
        if (c.get(`${p.square[0]}${rr}` as Square)) { path = false; break; }
      }
      if (!path || !clearRank(c, queens, r0.to)) continue;
      // A new queen beside the king is taken at once unless something guards it.
      const touching = Math.abs(FILES.indexOf(queens[0]) - FILES.indexOf(r0.to[0])) <= 1;
      if (touching && !c.attackers(queens, me).length) continue;
      const text = `${san} drives their king to ${r0.to}, onto the rank your ${p.square[0]}-pawn queens on — so when it promotes on ${queens}, it promotes with check, and you win the tempo the race needs.`;
      return { check: san, kingTo: r0.to, pawn: p.square, queens, text, squares: [m.to, r0.to, p.square, queens] };
    }
  }
  return null;
}
