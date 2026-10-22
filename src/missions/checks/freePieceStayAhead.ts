/**
 * Level 1 · Middlegame · TAKE THE FREE PIECE, STAY AHEAD — the board check
 * (WO-MISSIONS-02, the earned piece docs/CAMPAIGN.md §6a). LIVE and PURE:
 * chess.js and the legal SEE only, no engine.
 *
 * The coach plays ONE slip — nothing hangs after it, but the student has a
 * forcing line that wins a knight, bishop or rook (`earnedSlip`). The runner
 * hands its ply, the line (student first, ending on the capture) and the
 * square in `context.planted`. Walking the game, judging no ply before the
 * card's `startPly`:
 *   PLANT  — trusted only when the coach's move at `planted.ply` leaves nothing
 *            hanging and the line still wins a piece from the board it leaves.
 *            Otherwise there is no plant and the card stays pending.
 *   LINE   — while the plant stands, every move must be the line's. The student
 *            playing the line's last move (the capture) has won the piece.
 *   MISS a) `missed-free-piece` — a student move OFF the line before the piece
 *            falls, which does not win a piece outright either, and is not
 *            one of the line's equal first moves (`alts`). Shows the line's
 *            move. A forgiven one (Play on) leaves the line: from then a
 *            piece counts as won once the student is a piece up on the slip.
 *   MISS b) `gave-back-material` — once the piece is won and the student is
 *            at least +2, a student move that leaves the coach a capture
 *            winning 3 or more (legal SEE) and dropping the lead below +2.
 *            Shows the first engine candidate that leaves no such capture.
 *   PASS   — the piece won, and at the first student move where the board is
 *            an ending by material (`isEndgameByMaterial`), the game is over
 *            (they mated), or at the student's 40th move, the lead is at least +2.
 *   EXEMPT — losing a pawn or an even trade; a give-back with no way out (every
 *            legal move at that decision gives it back — a miss needs a choice);
 *            a ply the student chose to play on from (`forgiven`).
 *   OVER   — an ending (or the game's end on the student's move) reached
 *            without the pass: `incomplete`. (The card's closing move with no
 *            slip, or the game ended on the coach's move: the runner closes
 *            it. The coach looks for its slip until it lands — no deadline.)
 * Lead = the student's material minus the coach's, P1 N3 B3 R5 Q9.
 */
import { Chess, type Color, type PieceSymbol } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { lineWin, nothingHangs, slipTook } from '../earnedSlip';
import { isEndgameByMaterial } from '../../services/gamePhaseService';
import type { MissionGame, MissionStatus, ShownMove } from '../missionCard';

/** The student's move number at which the card is judged if no ending came. */
export const FREE_PIECE_CLOSES_AT_MOVE = 40;
/** The lead the student must hold. */
const LEAD_BAR = 2;
/** What counts as giving material back (a pawn never does). */
const GIVE_BACK = 3;

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** The student's material minus the coach's. */
export function materialLead(board: Chess, me: Color): number {
  let lead = 0;
  for (const row of board.board()) for (const cell of row) {
    if (cell) lead += cell.color === me ? VALUE[cell.type] : -VALUE[cell.type];
  }
  return lead;
}

/** The most the coach wins by one capture on this board (legal SEE). */
function coachWinBack(board: Chess, me: Color): number {
  const coach: Color = me === 'w' ? 'b' : 'w';
  const fen = board.fen();
  let best = 0;
  for (const row of board.board()) for (const cell of row) {
    if (!cell || cell.color !== me || cell.type === 'k') continue;
    best = Math.max(best, legalSeeGainFor(fen, cell.square, coach));
  }
  return best;
}

/** Does this board (the student just moved) hand material back? */
function givesBack(board: Chess, me: Color): boolean {
  const lead = materialLead(board, me);
  if (lead < LEAD_BAR) return false;
  const gain = coachWinBack(board, me);
  return gain >= GIVE_BACK && lead - gain < LEAD_BAR;
}

function after(fen: string, uci: string): Chess | null {
  try {
    const b = new Chess(fen);
    b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return b;
  } catch { return null; }
}

/** The legal moves from `fenBefore` that do NOT hand material back, in
 *  chess.js order. */
function keepingMoves(fenBefore: string, me: Color): string[] {
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return []; }
  return board.moves({ verbose: true })
    .map((m) => `${m.from}${m.to}${m.promotion ?? ''}`)
    .filter((uci) => { const b = after(fenBefore, uci); return !!b && !givesBack(b, me); });
}

interface Walk {
  status: MissionStatus;
  taken: boolean;
  lead: number;
}

function uciOf(m: { from: string; to: string; promotion?: string }): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

function walk(game: MissionGame): Walk {
  const me = game.studentColor;
  const them: Color = me === 'w' ? 'b' : 'w';
  const planted = game.context?.planted;
  const board = (() => { try { return game.startFen ? new Chess(game.startFen) : new Chess(); } catch { return new Chess(); } })();
  let plantStands = false;
  let taken = false;
  /** On the line: how many of its moves have been played. */
  let onLine = true;
  let at = 0;
  /** The lead on the board BEFORE the slip — a piece above it is a piece won. */
  let startLead = 0;
  for (let ply = 0; ply < game.sans.length; ply++) {
    const fenBefore = board.fen();
    let move;
    try { move = board.move(game.sans[ply]); } catch { break; }
    if (ply < game.startPly) continue;
    if (planted && ply === planted.ply) {
      const after = board.fen();
      // A slip that captured (…Bxd6) is measured from the board BEFORE it:
      // the student's recapture wins back, it does not win a piece.
      const took = slipTook(move.captured);
      plantStands = move.color === them && nothingHangs(after, took) && lineWin(after, planted.line, took) !== null;
      startLead = materialLead(board, me) + took;
      continue;
    }
    if (plantStands && planted && !taken && ply > planted.ply) {
      const wonOutright = move.color === me && materialLead(board, me) - startLead >= GIVE_BACK;
      if (onLine) {
        if (uciOf(move) === planted.line[at]) {
          at += 1;
          if (at === planted.line.length) taken = true;
        } else if (move.color === me) {
          if (wonOutright) taken = true;
          // Another first move the engine rates as good as the line's: the
          // student found a way in. From here the piece counts once it is won.
          else if (at === 0 && planted.alts.includes(uciOf(move))) onLine = false;
          else if (!game.forgiven.has(ply)) {
            const want = planted.line[at];
            return { status: { state: 'miss', ply, reason: 'missed-free-piece', showMove: { from: want.slice(0, 2), to: want.slice(2, 4) } }, taken, lead: materialLead(board, me) };
          } else onLine = false;
        } else onLine = false;
      } else if (wonOutright) taken = true;
    }
    if (move.color !== me) continue;
    if (taken && !game.forgiven.has(ply) && givesBack(board, me) && keepingMoves(fenBefore, me).length > 0) {
      return { status: { state: 'miss', ply, reason: 'gave-back-material' }, taken, lead: materialLead(board, me) };
    }
    const lead = materialLead(board, me);
    // The game ending on the student's move (their mate, a stalemate) ends the phase too.
    const ending = isEndgameByMaterial(board.fen()) || board.isGameOver();
    const moveNumber = Math.floor(ply / 2) + 1;
    // Mid-line the card waits: the line's own captures can reach an ending.
    const midLine = plantStands && !taken && onLine && at > 0;
    if (!midLine && (ending || moveNumber >= FREE_PIECE_CLOSES_AT_MOVE)) {
      if (taken && lead >= LEAD_BAR) return { status: { state: 'pass', ply }, taken, lead };
      if (ending) return { status: { state: 'incomplete', ply }, taken, lead };
    }
  }
  return { status: { state: 'pending' }, taken, lead: materialLead(board, me) };
}

export function checkFreePieceStayAhead(game: MissionGame): MissionStatus {
  return walk(game).status;
}

/** The banner's read — never names the free piece (finding it is the mission). */
export function freePieceStayAheadProgress(game: MissionGame): string {
  const w = walk(game);
  if (!w.taken) return 'Win material when the chance comes';
  const lead = w.lead;
  return lead >= LEAD_BAR ? `Ahead by ${lead} — keep it` : `Ahead by ${lead}`;
}

/**
 * The move shown after a second give-back at one decision: the first engine
 * candidate that keeps the lead; with no read, the first legal move that does
 * (chess.js order). A second missed capture shows the capture itself — the
 * check carries it on the miss.
 */
export function freePieceStayAheadShowMove(fenBefore: string, studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  const keeping = keepingMoves(fenBefore, studentColor);
  const keep = new Set(keeping);
  const pick = candidatesUci.find((u) => keep.has(u)) ?? (keeping.length > 0 ? keeping[0] : null);
  return pick ? { from: pick.slice(0, 2), to: pick.slice(2, 4) } : null;
}
