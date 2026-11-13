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
import { seatPieceWords } from './pieceRef';

export interface MoveStop {
  /** `square`: a development square taken from their knight. `break`: their
   *  masters' pawn break, which would now lose material. */
  kind: 'pin' | 'kick' | 'fork' | 'check' | 'square' | 'break';
  /** Their move it stops, as they would have played it (SAN). */
  san: string;
  /** "would pin your knight on c3 against your queen" — from the mover's seat. */
  would: string;
  /** What the move does, said after the move: "stops …Bg4, which would pin
   *  your knight on f3 against your queen on d1". */
  clause: string;
  squares: string[];
}

const NAME = PIECE_NAMES as Readonly<Record<string, string>>;

interface WinningCheck { san: string; from: Square; to: Square; hit: { square: Square; piece: string } }

/** Their checks that land safely on `fen` (they to move via a pass) AND win
 *  something: once the king steps aside, the checking piece takes a piece of
 *  `me`'s that the trade on its square loses. A check that only checks is
 *  answered by a block or a king step and stops nothing worth teaching (Nc3
 *  against an early queen led with "it stops …Qe4+" over "develops with
 *  tempo, hitting the queen" — 2026-11-12). */
function winningChecks(fen: string, me: Color): WinningCheck[] {
  const them: Color = me === 'w' ? 'b' : 'w';
  const f = sideToMoveAs(fen, them);
  if (!f) return [];
  let b: Chess;
  try { b = new Chess(f); } catch { return []; }
  if (b.inCheck()) return [];
  const out: WinningCheck[] = [];
  for (const m of b.moves({ verbose: true })) {
    if (!m.san.includes('+') || m.captured || m.piece === 'p') continue;
    b.move(m);
    let hit: WinningCheck['hit'] | null = null;
    if (legalSeeGainFor(b.fen(), m.to, me) <= 0) {
      const again = sideToMoveAs(b.fen(), them);
      if (again) {
        try {
          for (const x of new Chess(again).moves({ square: m.to, verbose: true })) {
            if (!x.captured || x.captured === 'k') continue;
            if (legalSeeGainFor(b.fen(), x.to, them) > 0) { hit = { square: x.to, piece: x.captured }; break; }
          }
        } catch { /* no board with them to move again: no second hit */ }
      }
    }
    b.undo();
    if (hit) out.push({ san: m.san, from: m.from, to: m.to, hit });
  }
  return out;
}

/** The opponent's ideas the move `san` on `fenBefore` takes away. `mine`:
 *  the student moved (words in the student's seat). */
export function moveStops(fenBefore: string, san: string, mine: boolean): MoveStop[] {
  let me: Color;
  let fenAfter: string;
  let moved: { from: string; to: string };
  try { const c = new Chess(fenBefore); me = c.turn(); const mv = c.move(san); moved = { from: mv.from, to: mv.to }; fenAfter = c.fen(); } catch { return []; }
  const own = mine ? 'your' : 'their';
  const dot = (s: string): string => (me === 'w' ? `…${s}` : s);
  const out: MoveStop[] = [];
  const after = theirWantedMoves(fenAfter, me);
  const still = (from: string, to: string): boolean => after.some((w) => w.from === from && w.to === to);
  const pawnHits = (fen: string, sq: string): Square[] => {
    try { const b = new Chess(fen); return b.attackers(sq as Square, me).filter((f) => b.get(f)?.type === 'p'); } catch { return []; }
  };
  for (const w of theirWantedMoves(fenBefore, me)) {
    if (still(w.from, w.to)) {
      // STILL THERE, BUT NOW MET BY A PAWN (his "d6 ensures White can't kick
      // the knight with e5"): the kick or pin lands on a square one of the
      // mover's pawns now takes on, so it is a trade, not a free tempo.
      const was = pawnHits(fenBefore, w.to);
      const taker = pawnHits(fenAfter, w.to).find((f) => !was.includes(f));
      if (!taker || w.hit.some((h) => h.square === moved.from)) continue;
      const [v0] = w.hit;
      const answer = `${me === 'b' ? '…' : ''}${taker[0]}x${w.to}`;
      const piece0 = seatPieceWords(fenBefore, v0.square, own, `${own} ${NAME[v0.piece] ?? 'piece'} on ${v0.square}`);
      const act = w.kind === 'pin' ? `pin ${piece0}` : w.kind === 'fork' ? 'fork your pieces' : `kick ${piece0}`;
      const act2 = mine ? act : act.replace('your pieces', 'their pieces');
      out.push({ kind: w.kind, san: dot(w.san), would: `would ${act2}, but ${answer} now answers it`, clause: `means ${answer} now answers ${dot(w.san)}, which would ${act2}`, squares: [w.to, taker, v0.square] });
      continue;
    }
    // The threatened piece walked away: its rescue, not a stop.
    if (w.hit.some((h) => h.square === moved.from)) continue;
    const [v, ...rest] = w.hit;
    const piece = (h: { square: string; piece: string }): string => seatPieceWords(fenBefore, h.square, own, `${own} ${NAME[h.piece] ?? 'piece'} on ${h.square}`);
    const would = w.kind === 'pin' ? `would pin ${piece(v)}${rest[0] ? ` against ${piece(rest[0])}` : ''}`
      : w.kind === 'fork' ? `would fork ${[v, ...rest].map(piece).join(' and ')}`
        : `would hit ${piece(v)}`;
    out.push({ kind: w.kind, san: dot(w.san), would, clause: `stops ${dot(w.san)}, which ${would}`, squares: [w.to, ...w.hit.map((h) => h.square)] });
  }
  const checksAfter = winningChecks(fenAfter, me);
  for (const c of winningChecks(fenBefore, me)) {
    if (checksAfter.some((x) => x.from === c.from && x.to === c.to)) continue;
    if (out.some((o) => o.san === dot(c.san))) continue;
    const would = `would give check from ${c.to} and win ${own} ${NAME[c.hit.piece] ?? 'piece'} on ${c.hit.square}`;
    out.push({ kind: 'check', san: dot(c.san), would, clause: `stops ${dot(c.san)}, which ${would}`, squares: [c.to, c.hit.square] });
  }
  // A SQUARE TAKEN FROM THEIR KNIGHT ("e5 prevents Nf6", "takes c6 away from
  // the knight"): a knight still at home, its natural square now hit by the
  // mover's pawn and not before. Only a pawn move takes a square for good.
  const them: Color = me === 'w' ? 'b' : 'w';
  const boardBefore = new Chess(fenBefore);
  const boardNow = new Chess(fenAfter);
  // The pawn must stay where it went: one they win straight back (dxe4, Nxe4)
  // takes no square for good.
  if (boardBefore.get(moved.from as Square)?.type === 'p' && legalSeeGainFor(fenAfter, moved.to as Square, them) <= 0) {
    for (const [home, sq] of KNIGHT_SQUARES[them]) {
      const k = boardNow.get(home as Square);
      if (!k || k.type !== 'n' || k.color !== them) continue;
      const on = boardNow.get(sq as Square);
      if (on && on.color === them) continue;
      if (pawnHits(fenBefore, sq).length > 0 || pawnHits(fenAfter, sq).length === 0) continue;
      const theirs = mine ? 'their' : 'your';
      out.push({ kind: 'square', san: dot(`N${sq}`), would: `takes ${sq} away from ${theirs} knight on ${home}`, clause: `takes ${sq} away from ${theirs} knight on ${home}`, squares: [sq, home] });
    }
  }
  return out;
}

/** The knights' natural squares, by their home square. */
const KNIGHT_SQUARES: Record<Color, ReadonlyArray<readonly [string, string]>> = {
  w: [['g1', 'f3'], ['b1', 'c3']],
  b: [['g8', 'f6'], ['b8', 'c6']],
};

/** THEIR BREAK, STOPPED (his "a5, stopping b4", "Nc6 hinders d4"): the pawn
 *  break their side plays in master games from here (`breakSan` on
 *  `breakSquare`) worked before the move — legal, and not losing the pawn —
 *  and after it the push is gone or now loses material. Null when it still
 *  works, or never did. */
export function stopsBreak(fenBefore: string, san: string, breakSan: string, mine: boolean): MoveStop | null {
  let me: Color; let fenAfter: string;
  try { const c = new Chess(fenBefore); me = c.turn(); c.move(san); fenAfter = c.fen(); } catch { return null; }
  const them: Color = me === 'w' ? 'b' : 'w';
  const push = (fen: string): { ok: boolean; to: string } | null => {
    const f = sideToMoveAs(fen, them);
    if (!f) return null;
    try { const b = new Chess(f); const m = b.move(breakSan.replace(/^…/, '')); if (!m) return { ok: false, to: '' }; return { ok: legalSeeGainFor(b.fen(), m.to, me) <= 0, to: m.to }; } catch { return { ok: false, to: '' }; }
  };
  const was = push(fenBefore);
  if (!was || !was.ok) return null;
  const now = push(fenAfter);
  if (!now || now.ok) return null;
  const dot = (s: string): string => (them === 'b' ? `…${s.replace(/^…/, '')}` : s.replace(/^…/, ''));
  const theirs = mine ? 'their' : 'your';
  const would = now.to ? 'would now lose a pawn' : "can't be played now";
  return { kind: 'break', san: dot(breakSan), would, clause: `stops ${dot(breakSan)}, ${theirs} break in master games from here: it ${would}`, squares: [was.to] };
}
