/**
 * THE DEFENDER'S CHECKS, RUN OUT (F3, the Saavedra: after c7 the engine's own
 * line is …Kb1, but the human defence is …Rd6+ Kb5 Rd5+ Kb4 Rd4+ Kb3 Rd3+
 * Kc2 and then …Rd4!). After the best move, every legal check of the
 * defending side is a try, read whether or not the engine prefers it; the
 * run follows the defender's best-scored check and the engine's answer until
 * the defender has no check left (or a board repeats — a perpetual, the
 * repeating-checks computer's). Where the run ends, the defender's best move
 * is played and the board the student then faces is read by the promotion
 * computer (`promotionChoicesOn`): a queen that stalemates, a rook that wins.
 *
 * Pure but for `read` (the engine, injected). Every move chess.js-validated.
 */
import { Chess, type Color } from 'chess.js';
import { seatCp } from './winChance';
import { promotionChoicesOn, promotionChoiceLine, type PromotionChoice } from './promotionChoice';
import type { AnalysisLine } from '../types';

export interface CheckRun {
  /** The defender's checks and the student's answers, SAN, from the board after the best move. */
  sans: string[];
  /** Every check the defender had at each step (uci), each read. */
  checksRead: string[];
  /** The defender's move where the checks ran out (SAN), and the promotion choice it leaves. */
  then: string | null;
  promotion: PromotionChoice | null;
  text: string;
}

type Read = (fen: string) => Promise<readonly AnalysisLine[] | null>;
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

export async function defenderCheckRun(fen: string, best: string, student: Color, read: Read): Promise<CheckRun | null> {
  const b = new Chess(fen);
  try { b.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }); } catch { return null; }
  const defender: Color = student === 'w' ? 'b' : 'w';
  const sans: string[] = [];
  const checksRead: string[] = [];
  const seen = new Set<string>();
  for (;;) {
    if (b.isGameOver() || seen.has(key(b.fen()))) break;
    seen.add(key(b.fen()));
    const checks = b.moves({ verbose: true }).filter((m) => m.san.includes('+'));
    if (checks.length === 0) break;
    let pick: { san: string; reply: string; cp: number } | null = null;
    for (const m of checks) {
      const after = new Chess(b.fen());
      after.move(m.san);
      checksRead.push(m.lan);
      const lines = after.isGameOver() ? null : await read(after.fen());
      const top = lines?.[0];
      if (!top || !top.moves[0]) continue;
      // A check answered by taking the checker is no check left to give: it
      // only hands the piece over (…Rd2+ Kxd2).
      if (top.moves[0].slice(2, 4) === m.to) continue;
      const cp = seatCp(top, defender);
      if (!pick || cp > pick.cp) pick = { san: m.san, reply: top.moves[0], cp };
    }
    if (!pick) break;
    const m = b.move(pick.san);
    let r;
    try { r = b.move({ from: pick.reply.slice(0, 2), to: pick.reply.slice(2, 4), promotion: pick.reply[4] }); } catch { break; }
    sans.push(m.san, r.san);
  }
  if (sans.length === 0) return null;
  // Where the checks run out: the defender's best move, then the student's board.
  let then: string | null = null;
  let promotion: PromotionChoice | null = null;
  if (!b.isGameOver() && b.turn() === defender) {
    // THE DEFENDER'S RESOURCE where the checks end: a move that leaves the
    // student a promotion where the queen fails (…Rd4!, so c8=Q? Rc4! is
    // stalemate) — read by the promotion computer, pure — else its best.
    const trick = b.moves({ verbose: true }).find((m) => {
      const t = new Chess(b.fen()); t.move(m.san);
      return promotionChoicesOn(t.fen(), null, null).some((pc) => pc.side === student && (pc.reason.kind === 'queen-trap' || pc.reason.kind === 'queen-stalemates'));
    });
    const lines = trick ? null : await read(b.fen());
    const u = trick ? trick.lan : lines?.[0]?.moves[0];
    if (u) {
      try { then = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { then = null; }
      if (then && !b.isGameOver()) {
        const next = await read(b.fen());
        promotion = promotionChoicesOn(b.fen(), next?.[0]?.moves[0] ?? null, next ?? null)[0] ?? null;
      }
    }
  }
  const moves = sans.map((s, k) => (k % 2 === 0 ? `${defender === 'b' ? '…' : ''}${s}` : `${defender === 'b' ? '' : '…'}${s}`));
  const pairs: string[] = [];
  for (let k = 0; k < moves.length; k += 2) pairs.push(`${moves[k]} ${moves[k + 1]}`);
  const escape = sans[sans.length - 1];
  const piece = ({ R: 'rook', Q: 'queen', B: 'bishop', N: 'knight', K: 'king' } as Record<string, string>)[sans[0][0]] ?? 'pawn';
  const run = `Their ${piece} checks: ${pairs.join(', ')}, and your king escapes the checks with ${escape}.`;
  const tail = then ? ` Then ${defender === 'b' ? '…' : ''}${then}.` : '';
  const promo = promotion ? ` ${promotionChoiceLine(promotion, student, false)}` : '';
  return { sans, checksRead, then, promotion, text: `${run}${tail}${promo}` };
}
