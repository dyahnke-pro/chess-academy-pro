// forkTrick — the THREE-move threat: give a piece, take it back with a fork
// (re-walk 1380, 2026-09-25: 7.Bb3 said nothing; its point was the fork trick
// …Nxe4 Nxe4 d5, which hits the bishop on c4 and the knight on e4 at once).
//
// THE GAP IT FILLS. `detectNewThreat` sees a threat ONE move away, and its fork
// only counts a king, queen or rook as a victim. The fork trick is neither: a
// capture that gives material, the forced recapture, then a fork of two MINOR
// pieces — usually by a pawn — that wins the material back. No computer saw
// it, so no surface could say why a move sidestepped it.
//
// BOARD-PROVEN, no engine (G0): every recapture the defender has on the
// capture square is tried, and the trick counts only if EVERY one of them
// walks into a safe fork that wins back at least what was given. Declining
// the recapture just leaves the attacker ahead, so it never saves the
// defender. The fork's win is its LESSER victim — the defender saves the
// bigger one.
//
// SEAT-NEUTRAL. `forkTrickFor(fen, by)` reads the trick `by` has with `by` to
// move; `trickSidestepped` asks whether a move took the OTHER side's trick off
// the board. Both seats call it: the student's Bb3 sidestepping theirs, and
// their reply sidestepping the student's.
import { Chess } from 'chess.js';
import { landingIsSafe } from './positionReadingService';
import { flipSideToMove } from './threatOut';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface ForkTrick {
  /** The capture that gives material. */
  capture: string;
  /** The defender's recapture (the first, when several all lose). */
  recapture: string;
  /** The fork that wins it back. */
  fork: string;
  forkSquare: string;
  /** The fork's victims, named from the board after the recapture. */
  victims: Array<{ square: string; piece: string }>;
  /** The fork gives check — the king is the other victim. */
  hitsKing: boolean;
}

function forkAfter(board: Chess, by: 'w' | 'b', owed: number): Omit<ForkTrick, 'capture' | 'recapture'> | null {
  const foe: 'w' | 'b' = by === 'w' ? 'b' : 'w';
  for (const mv of board.moves({ verbose: true })) {
    if (mv.captured) continue; // the fork is a quiet move; a capture is a different combination
    const sim = new Chess(board.fen());
    try { sim.move(mv.san); } catch { continue; }
    const forkerValue = VALUE[mv.piece] ?? 0;
    const hit: Array<{ square: string; piece: string }> = [];
    let hitsKing = false;
    for (const row of sim.board()) {
      for (const cell of row) {
        if (!cell || cell.color !== foe) continue;
        if (!sim.attackers(cell.square, by).includes(mv.to)) continue;
        if (cell.type === 'k') { hitsKing = true; continue; }
        if (VALUE[cell.type] > forkerValue) hit.push({ square: cell.square, piece: cell.type });
      }
    }
    const count = hit.length + (hitsKing ? 1 : 0);
    if (count < 2 || hit.length === 0) continue;
    // Safety last — it is the costly check, and most moves fork nothing.
    if (!landingIsSafe(sim.fen(), mv.to)) continue;
    // The defender saves the bigger piece; the fork wins the lesser.
    const wins = hitsKing ? Math.max(...hit.map((h) => VALUE[h.piece])) : Math.min(...hit.map((h) => VALUE[h.piece]));
    if (wins < owed) continue;
    return { fork: mv.san, forkSquare: mv.to, victims: hit, hitsKing };
  }
  return null;
}

/** The fork trick `by` has in `fen` with `by` to move, or null. */
export function forkTrickFor(fen: string, by: 'w' | 'b'): ForkTrick | null {
  // Fails CLOSED: a composer calls this every ply, and a board chess.js
  // refuses must cost a fact, never the whole narration.
  try { return findTrick(fen, by); } catch { return null; }
}

function findTrick(fen: string, by: 'w' | 'b'): ForkTrick | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== by || c.inCheck() || c.isGameOver()) return null;
  for (const cap of c.moves({ verbose: true })) {
    if (!cap.captured || cap.captured === 'k' || cap.promotion) continue;
    const given = (VALUE[cap.piece] ?? 0) - (VALUE[cap.captured] ?? 0);
    if (given <= 0) continue; // a capture that already wins or trades is not a trick
    const s1 = new Chess(fen);
    try { s1.move(cap.san); } catch { continue; }
    if (s1.inCheck()) continue; // a check is its own story
    const recaptures = s1.moves({ verbose: true }).filter((m) => m.to === cap.to);
    if (recaptures.length === 0) continue; // nothing to take back — that is a plain win
    let first: Omit<ForkTrick, 'capture' | 'recapture'> | null = null;
    let every = true;
    for (const r of recaptures) {
      const s2 = new Chess(s1.fen());
      try { s2.move(r.san); } catch { every = false; break; }
      const got = forkAfter(s2, by, given);
      if (!got) { every = false; break; }
      first ??= got;
    }
    if (!every || !first) continue;
    return { capture: cap.san, recapture: recaptures[0].san, ...first };
  }
  return null;
}

export interface TrickSidestep {
  trick: ForkTrick;
  text: string;
  squares: string[];
}

/**
 * The move `san` (played by `moverWB` from `fenBefore`) took the OTHER side's
 * fork trick off the board: the trick stood if they had had the move before,
 * and it no longer works now that they do.
 */
export function trickSidestepped(
  fenBefore: string,
  san: string,
  moverWB: 'w' | 'b',
  /** REQUIRED — whose trick it was, so the sentence names the right seat. */
  trickOwner: 'their' | 'your',
): TrickSidestep | null {
  // A capture's point is the capture, and a check's is the check — "the point
  // of Bxb4 is that it kills the fork trick" is false in the Evans Gambit.
  // Only a QUIET move is credited with sidestepping.
  if (/x|\+|#/.test(san)) return null;
  const foe: 'w' | 'b' = moverWB === 'w' ? 'b' : 'w';
  const flipped = flipSideToMove(fenBefore);
  if (!flipped) return null;
  const trick = forkTrickFor(flipped, foe);
  if (!trick) return null;
  const after = new Chess(fenBefore);
  try { if (!after.move(san)) return null; } catch { return null; }
  if (forkTrickFor(after.fen(), foe)) return null;
  const bare = san.replace(/[+#]+$/, '');
  // Victims by PIECE, never by square: the fork lives in a line that has not
  // happened, so its squares are wrong on the live board — the piece that just
  // sidestepped has left its square, and the recapturing knight "on e4" is a
  // pawn there today (the board-truth sweep, Kasparov–Karpov 1985, Nab1).
  // The victims belong to the side the trick is aimed at.
  const whose = trickOwner === 'their' ? 'your' : 'their';
  const kinds = trick.victims.map((v) => NAME[v.piece]);
  const pieces = trick.hitsKing ? ['king', ...kinds] : kinds;
  const victims = `${whose} ${pieces.length === 2 && pieces[0] === pieces[1] ? `two ${pieces[0]}s` : pieces.join(' and ')}`;
  const line = `${trick.capture}, ${trick.recapture}, ${trick.fork}`;
  const text = rotateStem([
    `${bare} sidesteps ${trickOwner} fork trick: ${line} would hit ${victims} and win the piece back.`,
    // Never "the point of X": the board proves the trick is gone, not that
    // this was why the move was played.
    `${bare} also defuses ${trickOwner} fork trick — ${line} would have forked ${victims}.`,
  ], stemKeyOf(fenBefore));
  return { trick, text, squares: [trick.forkSquare] };
}
