// WHAT A MOVE STOPS (gap B2, David 2026-11-12: "I want the gap filled").
// Theory says it constantly — "controlling g4, so …Bg4 cannot pin", "stops
// …Bb4", "rules out Bb5+". Computed, never read: the opponent's useful moves
// on the board before the move (a pin, a kick, a fork — `theirWantedMoves` —
// and a check that lands safely) that no longer work after it. A stop that
// only moves the threatened piece out of the way is that piece's rescue, said
// by the move's job, so it is not a stop here.
//
// Pure (chess.js + the SEE reader). Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { theirWantedMoves } from './prophylaxis';
import { sideToMoveAs } from './threatOut';
import { legalSeeGainFor } from './positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';

export interface MoveStop {
  kind: 'pin' | 'kick' | 'fork' | 'check';
  /** Their move it stops, as they would have played it (SAN). */
  san: string;
  /** "would pin your knight on c3 against your queen" — from the mover's seat. */
  would: string;
  squares: string[];
}

const NAME = PIECE_NAMES as Readonly<Record<string, string>>;

/** Their checks that land safely on `fen` (they to move via a pass). */
function safeChecks(fen: string, me: Color): Array<{ san: string; from: Square; to: Square; piece: string }> {
  const them: Color = me === 'w' ? 'b' : 'w';
  const f = sideToMoveAs(fen, them);
  if (!f) return [];
  let b: Chess;
  try { b = new Chess(f); } catch { return []; }
  if (b.inCheck()) return [];
  const out: Array<{ san: string; from: Square; to: Square; piece: string }> = [];
  for (const m of b.moves({ verbose: true })) {
    if (!m.san.includes('+') || m.captured) continue;
    b.move(m);
    const safe = legalSeeGainFor(b.fen(), m.to, me) <= 0;
    b.undo();
    if (safe) out.push({ san: m.san, from: m.from, to: m.to, piece: m.piece });
  }
  return out;
}

/** The opponent's ideas the move `san` on `fenBefore` takes away. `mine`:
 *  the student moved (words in the student's seat). */
export function moveStops(fenBefore: string, san: string, mine: boolean): MoveStop[] {
  let me: Color;
  let fenAfter: string;
  let moved: { from: string };
  try { const c = new Chess(fenBefore); me = c.turn(); const mv = c.move(san); moved = { from: mv.from }; fenAfter = c.fen(); } catch { return []; }
  const own = mine ? 'your' : 'their';
  const dot = (s: string): string => (me === 'w' ? `…${s}` : s);
  const out: MoveStop[] = [];
  const after = theirWantedMoves(fenAfter, me);
  const still = (from: string, to: string): boolean => after.some((w) => w.from === from && w.to === to);
  for (const w of theirWantedMoves(fenBefore, me)) {
    if (still(w.from, w.to)) continue;
    // The threatened piece walked away: its rescue, not a stop.
    if (w.hit.some((h) => h.square === moved.from)) continue;
    const [v, ...rest] = w.hit;
    const piece = (h: { square: string; piece: string }): string => `${own} ${NAME[h.piece] ?? 'piece'} on ${h.square}`;
    const would = w.kind === 'pin' ? `would pin ${piece(v)}${rest[0] ? ` against ${piece(rest[0])}` : ''}`
      : w.kind === 'fork' ? `would fork ${[v, ...rest].map(piece).join(' and ')}`
        : `would hit ${piece(v)}`;
    out.push({ kind: w.kind, san: dot(w.san), would, squares: [w.to, ...w.hit.map((h) => h.square)] });
  }
  const checksAfter = safeChecks(fenAfter, me);
  for (const c of safeChecks(fenBefore, me)) {
    if (checksAfter.some((x) => x.from === c.from && x.to === c.to)) continue;
    // A check is a stop worth saying when it would come with a threat: the
    // checking piece is a minor or major landing near the king.
    if (c.piece === 'p') continue;
    out.push({ kind: 'check', san: dot(c.san), would: `would give check from ${c.to}`, squares: [c.to] });
  }
  return out;
}
