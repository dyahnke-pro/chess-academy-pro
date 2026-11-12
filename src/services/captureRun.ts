// captureRun — THE ONE THREAD of captures on a square (2026-10-28). A leaf:
// chess.js and piece values only, so the chat's fact computers
// (`groundedAnswer`, a leaf itself) and the engine-path replays read the same
// run. Every copy that read one move back called …Nxb4 "taking back the pawn"
// after cxb4 axb4 — the move that wins it.
import { Chess } from 'chess.js';
import { MATERIAL_VALUE, materialBalance } from './pieceValues';
import type { CaptureLeadsTo } from '../utils/captureWords';

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

/** A TAKE-BACK THAT COMES OUT AHEAD, said — THE ONE WORDING, read by every
 *  producer that says what a capture on the run's square wins (the move's
 *  reason, `deliberation.materialWhy`, and the briefing's aspects,
 *  `reviewMoveBriefing.moveAspects`).
 *
 *  When what the other side netted on the run is ONE piece, the capture wins
 *  its own piece for that one (prod focus audit 2026-11-09: …Qxf2+ took a
 *  rook, Kxf2 took the queen — "wins a queen for a rook", never "wins a queen,
 *  and nothing can take back"). When it is not (Scotch Göring …Nxe5 Nxe5
 *  dxe5: they netted a knight for a pawn), the piece the capture takes is the
 *  other half of a trade, and what the mover is up is the run's NET — "dxe5
 *  wins a knight" was said of a move that completes a trade a pawn up.
 *  `read.net` is what the mover nets over the run once this capture is in
 *  (what the surface counts, take-backs still to come off it); `fenAfter`
 *  the board the capture leaves, read for whether the net only pays back
 *  material the mover was down when the run began — the board before the move
 *  is mid-trade (Göring: Black "down" a knight for two pawns until dxe5), so
 *  it is the board after that says it: a mover still not ahead won it back;
 *  `final` that nothing can take back on the square. Null when this is not
 *  such a capture. */
export function takeBackAhead(
  prev: PrevCaptureContext | null,
  mv: { to: string; captured?: string | null },
  read: { net: number; fenAfter: string; final: boolean },
): CaptureLeadsTo | null {
  if (!prev?.square || !mv.captured || prev.square !== mv.to || prev.net <= 0) return null;
  if ((MATERIAL_VALUE[mv.captured] ?? 0) <= prev.net || read.net < 1) return null;
  const gave = ONE_PIECE[prev.net];
  if (gave) return { kind: 'nets', captured: mv.captured, free: false, gave };
  const lead = materialBalance(read.fenAfter) * (mover(read.fenAfter) === 'w' ? 1 : -1);
  return { kind: 'take-back-net', net: read.net, back: lead <= 0, final: read.final };
}
/** A run net that is one piece (three: a knight or a bishop — the run keeps
 *  values, so it is "a piece"). */
/** The side that made the move the board `fen` follows (the side NOT to move). */
const mover = (fen: string): 'w' | 'b' => (fen.split(' ')[1] === 'w' ? 'b' : 'w');
const ONE_PIECE: Record<number, string> = { 1: 'p', 3: 'piece', 5: 'r', 9: 'q' };

/** THE LAST MOVE OF A GAME'S MOVES and the board before it, replayed from the
 *  standard start — the `prior` a line read from the board after it needs
 *  (`exchangeLedger.moverLineProof`). Null on no moves, when one does not
 *  play, or when they do not end on `fen` (a surface whose board is not the
 *  end of its history gets no prior, never a move that did not lead here). */
export function lastMoveOfHistory(sans: readonly string[] | undefined, fen: string): { fenBefore: string; san: string } | null {
  if (!sans || sans.length === 0) return null;
  try {
    const c = new Chess();
    for (const san of sans.slice(0, -1)) c.move(san);
    const fenBefore = c.fen();
    const m = c.move(sans[sans.length - 1]);
    if (c.fen().split(' ')[0] !== fen.split(' ')[0]) return null;
    return { fenBefore, san: m.san };
  } catch { return null; }
}

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
