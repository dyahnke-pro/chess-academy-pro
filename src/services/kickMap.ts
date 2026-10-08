// THE KICK MAP (batch 1, "order and timing") — his "take on e5 so their
// knight retakes there, then chase it": which of their pieces can be hit by a
// pawn with tempo, and WHERE IT LANDS when it runs. The capture is chosen for
// the square it drags their recapturing piece onto.
//
// Pure: chess.js plus the one pin-aware exchange count. The prospective read
// (the student to move) is proven by the engine's own line handed in — capture,
// their recapture, the pawn kick — so the plan is the engine's, never a guess;
// the landing squares are counted on the board.
import { Chess, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface Kick {
  /** The student's pawn push that hits the piece, SAN. */
  kick: string;
  /** The square their piece stands on. */
  square: string;
  /** Its type ('n', 'b', 'q', 'r'). */
  piece: string;
  /** The squares it can go to without simply losing it — the landing map. */
  landings: string[];
}

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Can the student, to move on `fen`, hit their piece on `square` with a pawn
 *  push that does not simply lose the pawn? Returns the push and the piece's
 *  safe landing squares once hit. */
export function kickOn(fen: string, square: string): Kick | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const me = board.turn();
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const target = board.get(square as Square);
  if (!target || target.color !== them || !(target.type in NAME)) return null;
  for (const m of board.moves({ verbose: true })) {
    if (m.piece !== 'p' || m.captured || m.promotion) continue;
    const after = new Chess(fen);
    after.move(m.san);
    if (!after.attackers(square as Square, me).includes(m.to)) continue;
    // The pawn must survive: their best exchange on it gains nothing — a
    // capture of the pawn BY THE KICKED PIECE counts, so a pawn it can just
    // take is no kick.
    if (legalSeeGainFor(after.fen(), m.to, them) > 0) continue;
    const landings: string[] = [];
    for (const r of after.moves({ verbose: true })) {
      if (r.from !== square) continue;
      const land = new Chess(after.fen());
      land.move(r.san);
      // A landing is safe when the student wins nothing by taking there.
      if (legalSeeGainFor(land.fen(), r.to, me) <= 0) landings.push(r.to);
    }
    return { kick: m.san, square, piece: target.type, landings: [...new Set(landings)] };
  }
  return null;
}

function landingClause(k: Kick): string {
  if (k.landings.length === 0) return `and it has no safe square to go to`;
  if (k.landings.length <= 3) return `and it has only ${andList(k.landings)} to go to`;
  return `and it has to find a new square`;
}

const sanFromUci = (fen: string, uci: string | undefined): string | null => {
  if (!uci || uci.length < 4) return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
};

export interface KickLine {
  text: string;
  /** Capture, their recapture, the kick — SAN, from `fen`. */
  sans: [string, string, string];
  squares: string[];
  kick: Kick;
}

/**
 * The engine's best line from `fen` (UCI, the student to move) reads:
 * the student captures on S, their non-pawn piece takes back ON S, and the
 * student's next move is a pawn push hitting it there. The capture is chosen
 * for the square it drags their piece to — the kick map.
 */
export function kickLine(fen: string, pvUci: readonly string[]): Omit<KickLine, 'text'> | null {
  if (pvUci.length < 3) return null;
  const c = sanFromUci(fen, pvUci[0]);
  if (!c) return null;
  const b1 = new Chess(fen);
  const cm = b1.move(c);
  if (!cm.captured) return null;
  const r = sanFromUci(b1.fen(), pvUci[1]);
  if (!r) return null;
  const rm = b1.move(r);
  if (!rm.captured || rm.to !== cm.to || rm.piece === 'p' || rm.piece === 'k') return null;
  const k = sanFromUci(b1.fen(), pvUci[2]);
  if (!k) return null;
  const kick = kickOn(b1.fen(), cm.to);
  if (!kick || kick.kick.replace(/[+#]$/, '') !== k.replace(/[+#]$/, '')) return null;
  // A kick that is just a trade on equal terms is not the point.
  if (VAL[rm.piece] <= 1) return null;
  const km = new Chess(b1.fen()).move(k);
  return { sans: [c, r, k], squares: [cm.to, km.from, km.to, ...kick.landings], kick };
}

/** THE PROSPECTIVE READ — said where the move may be named. */
export function kickLineRead(fen: string, pvUci: readonly string[]): KickLine | null {
  const l = kickLine(fen, pvUci);
  if (!l) return null;
  const name = NAME[l.kick.piece];
  const sq = l.kick.square;
  const them = new Chess(fen).turn() === 'w' ? 'b' : 'w';
  const r = them === 'b' ? `…${l.sans[1]}` : l.sans[1];
  const text = rotateStem([
    `Take on ${sq} with ${l.sans[0]}: their ${name} takes back there with ${r}, and ${l.sans[2]} chases it — ${landingClause(l.kick)}.`,
    `${l.sans[0]} drags their ${name} to ${sq}, where ${l.sans[2]} hits it with tempo — ${landingClause(l.kick)}.`,
  ], stemKeyOf(fen));
  return { ...l, text };
}

/**
 * THE STUDENT'S CAPTURE, AFTER THEIR RECAPTURE (Learn / review): the student
 * took on S, their reply took back on S with a piece, and the engine's line
 * from before the capture continues with the pawn kick. Said after their
 * reply, on the board where the kick is the student's next move.
 */
export function kickAfterRecapture(fenBefore: string, san: string, reply: string | null, bestPvUci: readonly string[]): KickLine | null {
  if (!reply || !san.includes('x') || !reply.includes('x')) return null;
  const l = kickLine(fenBefore, bestPvUci);
  if (!l) return null;
  const strip = (x: string): string => x.replace(/^…/, '').replace(/[+#]$/, '');
  if (strip(l.sans[0]) !== strip(san) || strip(l.sans[1]) !== strip(reply)) return null;
  const name = NAME[l.kick.piece];
  const text = rotateStem([
    `Their ${name} took back on ${l.kick.square}, right where ${l.sans[2]} kicks it — ${landingClause(l.kick)}.`,
    `That capture brought their ${name} to ${l.kick.square}, and now ${l.sans[2]} chases it with tempo — ${landingClause(l.kick)}.`,
  ], stemKeyOf(fenBefore));
  return { ...l, text };
}
