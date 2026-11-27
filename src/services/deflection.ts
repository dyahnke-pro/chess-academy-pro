// deflection — THE GUARD PULLED OFF ITS JOB, READ ON THE BOARD (computers work
// list 5, tactics; WO-MOTIFS-01's missing half: "their deflection" had no
// reader, so the record could never file it).
//
// `tacticGeometry.decoyDeflection` names the student's own deflection off the
// engine's line. Nothing read a deflection without the engine, and nothing
// read THEIRS coming. This read is pure (chess.js and the legal exchange, G0),
// for the side to move:
//   · a forcing move (a capture or a check, not a mate) that a piece of the
//     other side can take back on its square;
//   · after that recapture, a capture on a square the recapturing piece
//     guarded before the move wins material there, where before the move the
//     same square was held (the legal exchange on it won nothing);
//   · and EVERY legal answer to the forcing move leaves the side two pawns up
//     or more against the board before it — what it took, less what the answer
//     took, plus its best capture after (a mate counts as everything). Proven
//     against every reply, not only the recapture.
// The line is the move, the recapture, the capture that lands.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { materialBalance } from './pieceValues';

export interface Deflection {
  /** The side that deflects (the side to move on the board read). */
  side: Color;
  /** The forcing move (SAN) and the square of the bait. */
  move: string;
  bait: Square;
  /** The guard pulled off: its piece and the square it guarded from. */
  defender: { piece: PieceSymbol; from: Square };
  /** What it guarded, and the capture that lands there (SAN). */
  target: { piece: PieceSymbol; square: Square };
  follow: string;
  /** The least the side is up, in pawns, against every answer. */
  gain: number;
  line: [string, string, string];
}

/** The win the side demands against every answer, in pawns. */
const DEFLECT_GAIN = 2;
/** A mate after the answer counts as winning everything. */
const MATE_VALUE = 100;

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** The side to move's best immediate win on `fen`: a mate in one, else the
 *  best legal exchange on any piece of the other side's it attacks. */
function bestWin(fen: string, side: Color): { gain: number; move: Move | null } {
  let c: Chess;
  try { c = new Chess(fen); } catch { return { gain: 0, move: null }; }
  if (c.turn() !== side) return { gain: 0, move: null };
  let best = 0; let bestMove: Move | null = null;
  const tried = new Set<string>();
  for (const m of c.moves({ verbose: true })) {
    if (m.san.endsWith('#')) return { gain: MATE_VALUE, move: m };
    if (!m.captured || tried.has(m.to)) continue;
    tried.add(m.to);
    const g = legalSeeGainFor(fen, m.to, side);
    if (g > best) { best = g; bestMove = m; }
  }
  return { gain: best, move: bestMove };
}

/** The deflection for the side to move on `fen`, or null. */
export function deflectionOn(fen: string): Deflection | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const them = other(side);
  const sign = side === 'w' ? 1 : -1;
  const base = materialBalance(fen) * sign;
  for (const m of c.moves({ verbose: true })) {
    if (m.san.endsWith('#') || !(m.captured || m.san.includes('+'))) continue;
    const b1 = new Chess(fen);
    b1.move(m);
    const replies = b1.moves({ verbose: true });
    const recaps = replies.filter((r) => r.to === m.to && r.captured && r.piece !== 'k');
    if (recaps.length === 0) continue;
    // The recapture first: the deflection is found or the move is dropped there.
    let found: Omit<Deflection, 'gain'> | null = null;
    for (const r of recaps) {
      const b2 = new Chess(b1.fen());
      b2.move(r);
      const w = bestWin(b2.fen(), side);
      if (!w.move || w.move.to === m.to || w.gain >= MATE_VALUE) continue;
      const t = w.move.to;
      // The square was held before the move, and the recapturing piece held it.
      if (!c.attackers(t, them).includes(r.from)) continue;
      if (legalSeeGainFor(fen, t, side) > 0) continue;
      const target = c.get(t);
      if (!target || target.color !== them) continue;
      found = { side, move: m.san, bait: m.to, defender: { piece: r.piece, from: r.from }, target: { piece: target.type, square: t }, follow: w.move.san, line: [m.san, r.san, w.move.san] };
      break;
    }
    if (!found) continue;
    // Every answer loses: what the side holds after it, plus its best win.
    let least = Infinity;
    for (const r of replies) {
      const b2 = new Chess(b1.fen());
      b2.move(r);
      const v = materialBalance(b2.fen()) * sign - base + bestWin(b2.fen(), side).gain;
      if (v < least) least = v;
      if (least < DEFLECT_GAIN) break;
    }
    if (least < DEFLECT_GAIN) continue;
    return { ...found, gain: Math.min(least, MATE_VALUE) };
  }
  return null;
}
