// THE DISCOVERED ATTACK, PROVEN (Coach Build Board, "computers just built"):
// a move that uncovers a line piece onto a target while the moving piece makes
// its own threat — said only when EVERY reply still loses material, with the
// line as proof (the move, their best defence, the capture that wins).
//
// Both seats: read for the side to move on `fen` (the student's chance), or on
// the board handed to the other side (`threatOut.flipSideToMove`) for their
// threat. PURE: chess.js and the legal exchange count.
import { Chess, type Color, type Square } from 'chess.js';
import { legalSeeGain } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';

export interface DiscoveredAttack {
  /** The discovering move, SAN. */
  san: string;
  from: string;
  to: string;
  /** The line piece uncovered, and what it now hits. */
  uncovered: { square: string; piece: string };
  target: { square: string; piece: string };
  /** The proof: the move, their best defence, the capture that wins. */
  line: string[];
  /** What it wins against their best defence, pawns (or mate). */
  gain: number;
  mate: boolean;
}

const LINE: Record<string, Array<[number, number]>> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
};
const sqOf = (f: number, r: number): Square | null => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? (`${String.fromCharCode(97 + f)}${r}` as Square) : null);

/** The first piece along a ray from `from`, on the board. */
function firstOnRay(c: Chess, from: string, df: number, dr: number): { square: Square; piece: { type: string; color: Color } } | null {
  let f = from.charCodeAt(0) - 97 + df; let r = Number(from[1]) + dr;
  for (let s = sqOf(f, r); s; s = sqOf(f += df, r += dr)) {
    const p = c.get(s);
    if (p) return { square: s, piece: p };
  }
  return null;
}

/** The best the side to move can win now: mate, or the best legal capture. */
function bestWin(c: Chess): { gain: number; san: string | null; mate: boolean } {
  let best = { gain: 0, san: null as string | null, mate: false };
  for (const m of c.moves({ verbose: true })) {
    const b = new Chess(c.fen());
    b.move(m.san);
    if (b.isCheckmate()) return { gain: 99, san: m.san, mate: true };
    if (!m.captured) continue;
    const g = legalSeeGain(c.fen(), m.to);
    if (g > best.gain) best = { gain: g, san: m.san, mate: false };
  }
  return best;
}

/** THE DISCOVERED ATTACKS of the side to move on `fen` that win by force. */
export function discoveredAttacks(fen: string): DiscoveredAttack[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  if (c.inCheck()) return [];
  const me = c.turn(); const them: Color = me === 'w' ? 'b' : 'w';
  // What is already there to take: the discovery must win more than that.
  const already = bestWin(c);
  const out: DiscoveredAttack[] = [];
  for (const m of c.moves({ verbose: true })) {
    // The uncovered line: a line piece of mine behind `m.from`, an enemy
    // target in front of it once the piece has gone.
    let found: { uncovered: { square: Square; piece: string }; target: { square: Square; piece: string } } | null = null;
    for (const [df, dr] of LINE.q) {
      const back = firstOnRay(c, m.from, -df, -dr);
      if (!back || back.piece.color !== me) continue;
      const slides = LINE[back.piece.type];
      if (!slides?.some(([a, b]) => a === df && b === dr)) continue;
      const after = new Chess(fen); after.move(m.san);
      const front = firstOnRay(after, back.square, df, dr);
      if (!front || front.piece.color !== them || front.square === m.to) continue;
      if (front.piece.type !== 'k' && (MATERIAL_VALUE[front.piece.type] ?? 0) < 3) continue;
      found = { uncovered: { square: back.square, piece: back.piece.type }, target: { square: front.square, piece: front.piece.type } };
      break;
    }
    if (!found) continue;
    const after = new Chess(fen); after.move(m.san);
    // EVERY REPLY STILL LOSES MATERIAL: their best defence is the reply after
    // which my best win is smallest; it must still win a piece's worth (or mate).
    let worst: { gain: number; reply: string; win: string | null; mate: boolean } | null = null;
    const replies = after.moves({ verbose: true });
    if (replies.length === 0) continue;
    for (const r of replies) {
      const b = new Chess(after.fen()); b.move(r.san);
      // Their reply's own capture counts against the win.
      const back = r.captured ? (MATERIAL_VALUE[r.captured] ?? 0) : 0;
      const w = bestWin(b);
      // The discovering move's own capture is part of what it wins.
      const took = m.captured ? (MATERIAL_VALUE[m.captured] ?? 0) : 0;
      const net = w.mate ? 99 : took + w.gain - back;
      if (!worst || net < worst.gain) worst = { gain: net, reply: r.san, win: w.san, mate: w.mate };
      if (worst.gain < 2) break;
    }
    if (!worst || worst.gain < 2 || (!worst.win && !m.captured) || (!worst.mate && worst.gain <= already.gain)) continue;
    out.push({ san: m.san, from: m.from, to: m.to, uncovered: found.uncovered, target: found.target, line: [m.san, worst.reply, ...(worst.win ? [worst.win] : [])], gain: worst.mate ? 99 : worst.gain, mate: worst.mate });
  }
  return out.sort((a, b) => b.gain - a.gain);
}
