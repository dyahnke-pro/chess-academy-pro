// THE ANSWERING MOVE (Coach Build Board, "computers just built"): when the side
// to move faces a threat, every natural answer is tried — move the attacked
// piece, guard it, take the attacker, block the line — and the answer is said
// only when every other one fails: "Only Nd2 holds the knight: every other
// answer loses it." A threat with several answers is no lesson here; a threat
// with none is the error computer's.
//
// "Fails" is counted the one way: after the answer, the other side's best
// immediate win (a mate, or the best legal capture) is a piece's worth or
// more — or more than it was before the threat. PURE: chess.js and the legal
// exchange count.
import { Chess, type Color, type Square } from 'chess.js';
import { legalSeeGain } from './positionReadingService';
import { flipSideToMove } from './threatOut';

export interface AnsweringMove {
  /** The one move that holds, SAN. */
  san: string;
  from: string;
  to: string;
  /** The piece the threat is on. */
  target: { square: string; piece: string };
  /** How many natural answers were tried and failed. */
  failed: number;
  /** The proof: a natural answer that fails, and the win it allows. */
  refuted: { san: string; win: string } | null;
}

/** What the side to move can win now: mate (99), else the best legal capture. */
function winNow(c: Chess): { gain: number; san: string | null } {
  let best = { gain: 0, san: null as string | null };
  for (const m of c.moves({ verbose: true })) {
    const b = new Chess(c.fen()); b.move(m.san);
    if (b.isCheckmate()) return { gain: 99, san: m.san };
    // A promotion they cannot take back at once is a queen won.
    if (m.promotion && b.attackers(m.to as Square, b.turn()).length === 0 && 8 > best.gain) best = { gain: 8, san: m.san };
    if (!m.captured) continue;
    const g = legalSeeGain(c.fen(), m.to);
    if (g > best.gain) best = { gain: g, san: m.san };
  }
  return best;
}

/** THE ONE ANSWER to the threat the side to move faces on `fen`, or null. */
export function answeringMove(fen: string): AnsweringMove | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck() || c.isGameOver()) return null;
  const me = c.turn(); const them: Color = me === 'w' ? 'b' : 'w';
  // THE THREAT: what they would win if it were their move now.
  const passFen = flipSideToMove(fen);
  if (!passFen) return null;
  const threat = winNow(new Chess(passFen));
  if (threat.gain < 2 || !threat.san) return null;
  const tm = new Chess(passFen).move(threat.san);
  const target = c.get(tm.to as Square);
  if (!target || target.color !== me) return null;
  const attackers = c.attackers(tm.to as Square, them);
  // THE NATURAL ANSWERS: move the piece, guard it, take an attacker, block.
  const natural = c.moves({ verbose: true }).filter((m) => {
    if (m.from === tm.to) return true;
    if (m.captured && attackers.includes(m.to as Square)) return true;
    const b = new Chess(fen); b.move(m.san);
    if (b.attackers(tm.to as Square, me).length > c.attackers(tm.to as Square, me).length) return true;
    // A block: the attacker no longer reaches the square.
    return b.attackers(tm.to as Square, them).length < attackers.length;
  });
  const holds: typeof natural = [];
  let refuted: AnsweringMove['refuted'] = null;
  for (const m of natural) {
    const b = new Chess(fen); b.move(m.san);
    const w = winNow(b);
    if (w.gain < 2) holds.push(m);
    else if (!refuted && w.san) refuted = { san: m.san, win: w.san };
  }
  // Said only when every natural answer but one fails — and no quiet move
  // elsewhere holds either (a counter-threat would be another answer).
  if (holds.length !== 1 || natural.length < 2) return null;
  const others = c.moves({ verbose: true }).filter((m) => m.san !== holds[0].san && !natural.includes(m));
  for (const m of others) {
    const b = new Chess(fen); b.move(m.san);
    if (b.inCheck()) return null; // a check is an answer of its own
    if (winNow(b).gain < 2) return null;
  }
  return { san: holds[0].san, from: holds[0].from, to: holds[0].to, target: { square: tm.to, piece: target.type }, failed: natural.length - 1, refuted };
}
