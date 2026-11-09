// captureRun — THE ONE THREAD of captures on a square (2026-10-28). A leaf:
// chess.js and piece values only, so the chat's fact computers
// (`groundedAnswer`, a leaf itself) and the engine-path replays read the same
// run. Every copy that read one move back called …Nxb4 "taking back the pawn"
// after cxb4 axb4 — the move that wins it.
import { Chess } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';

export interface PrevCaptureContext {
  /** The square the previous ply captured on (its destination), or null. */
  square: string | null;
  /** The value of the piece the previous ply captured (0 if it wasn't a capture). */
  capturedValue: number;
  /** What the side that made the previous capture has NETTED over the run of
   *  captures on `square` ending with it — its takes minus the other side's.
   *  REQUIRED, and built only by `afterCapture` (2026-10-28): every copy that
   *  read one ply back called …Nxb4 "taking back the pawn" after cxb4 axb4,
   *  when it is the move that wins it. */
  net: number;
}

export const NO_PREV_CAPTURE: PrevCaptureContext = { square: null, capturedValue: 0, net: 0 };

/** THE ONE THREAD of captures on a square: the context after `mv`, given the
 *  context before it. A capture on the square the last capture took on
 *  continues the run; anything else starts one (or ends it). */
export function afterCapture(prev: PrevCaptureContext, mv: { to: string; captured?: string | null }): PrevCaptureContext {
  if (!mv.captured) return NO_PREV_CAPTURE;
  const value = MATERIAL_VALUE[mv.captured] ?? 0;
  const continues = prev.square === mv.to && prev.capturedValue > 0;
  return { square: mv.to, capturedValue: value, net: continues ? value - prev.net : value };
}


/** THE ONE "IS THIS A RECAPTURE?" READ (2026-11-09). A capture on the run's
 *  square worth no more than what the other side has netted there takes back:
 *  the trade they started, finished. Worth more, it WINS material — the prod
 *  Learn audit heard "your f-pawn taking on e6 — it completes the trade" after
 *  Bxe6 had taken only a pawn, and the move won the bishop. Four producers
 *  each guessed this from SAN ("x on the same square"), which cannot see what
 *  was taken; every one reads this now. A null run is unknown: not a take-back. */
export function takesBack(prev: PrevCaptureContext | null, mv: { to: string; captured?: string | null }): boolean {
  if (!prev?.square || !mv.captured || prev.square !== mv.to) return false;
  return (MATERIAL_VALUE[mv.captured] ?? 0) <= prev.net;
}

/** A TAKE-BACK THAT COMES OUT AHEAD: what the other side had netted on the run's
 *  square, as a piece, when this capture there takes back more (prod focus audit
 *  2026-11-09: …Qxf2+ took a rook, Kxf2 took the queen, and the line said "it
 *  wins a queen, and nothing can take back" — the rook it cost went unsaid).
 *  A net of three is "piece" (a knight or a bishop; the run keeps values).
 *  Null when this is not such a capture. */
export function takesBackAhead(prev: PrevCaptureContext | null, mv: { to: string; captured?: string | null }): string | null {
  if (!prev?.square || !mv.captured || prev.square !== mv.to || prev.net <= 0) return null;
  if ((MATERIAL_VALUE[mv.captured] ?? 0) <= prev.net) return null;
  return NET_PIECE[prev.net] ?? 'piece';
}
const NET_PIECE: Record<number, string> = { 1: 'p', 5: 'r', 9: 'q' };

/** The run after a game's moves, replayed from `startFen` (the standard start
 *  when null). Null when a move does not play. */
export function captureRunOfMoves(startFen: string | null, sans: readonly string[]): PrevCaptureContext | null {
  try {
    const c = startFen ? new Chess(startFen) : new Chess();
    let run = NO_PREV_CAPTURE;
    for (const san of sans) run = afterCapture(run, c.move(san));
    return run;
  } catch { return null; }
}

/** The run after the first `plies` moves of a game given as PGN — its start
 *  position read from the PGN's own header, so a game set up from a position
 *  replays right. Null when the PGN does not load or is shorter. */
export function captureRunOfPgn(pgn: string, plies: number): PrevCaptureContext | null {
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const moves = c.history({ verbose: true });
    if (plies > moves.length) return null;
    let run = NO_PREV_CAPTURE;
    for (const m of moves.slice(0, plies)) run = afterCapture(run, m);
    return run;
  } catch { return null; }
}

/** The run after ONE move from `fenBefore`, continuing `prev` (a fresh run
 *  when null) — for a surface that holds only the move before. Null when the
 *  move does not play there. */
export function captureRunAfterMove(prev: PrevCaptureContext | null, fenBefore: string, san: string): PrevCaptureContext | null {
  try { return afterCapture(prev ?? NO_PREV_CAPTURE, new Chess(fenBefore).move(san)); } catch { return null; }
}
