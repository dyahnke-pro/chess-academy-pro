/**
 * Level 1 · Middlegame · TAKE THE FREE PIECE, STAY AHEAD — the board check
 * (WO-MISSIONS-02). LIVE and PURE: chess.js and the legal SEE only, no engine.
 *
 * The coach plants ONE free piece (`plantFreePiece`); the runner hands its ply
 * and square in `context.planted`. Walking the game, judging no ply before the
 * card's `startPly`:
 *   PLANT  — trusted only when, after the coach's move at `planted.ply`, a coach
 *            knight, bishop or rook stands on `planted.square` and the student
 *            wins at least 3 by taking it (legal SEE). Otherwise there is no
 *            plant and the card stays pending — a defended "free" piece is
 *            never the plant (the fail twin).
 *   MISS a) `missed-free-piece` — the student's move right after the plant does
 *            not capture on the planted square. Shows that capture.
 *   MISS b) `gave-back-material` — once the piece is taken and the student is
 *            at least +2, a student move that leaves the coach a capture
 *            winning 3 or more (legal SEE) and dropping the lead below +2.
 *            Shows the first engine candidate that leaves no such capture.
 *   PASS   — the piece taken, and at the first student move where the board is
 *            an ending by material (`isEndgameByMaterial`), the game is over
 *            (they mated), or at the student's 40th move, the lead is at least +2.
 *   EXEMPT — losing a pawn or an even trade (the coach wins back less than 3,
 *            or the lead stays at +2 or more); a give-back with no way out
 *            (every legal move at that decision gives it back — a miss needs a
 *            choice); a ply the student chose to play on from (`forgiven`).
 *            After a forgiven missed capture, taking the piece later still
 *            counts while it stands on its square.
 *   OVER   — an ending (or the game's end on the student's move) reached
 *            without the pass: `incomplete`. (No plant by the coach's 8th move
 *            of the card, or the game ended on the coach's move: the runner
 *            closes it.)
 * Lead = the student's material minus the coach's, P1 N3 B3 R5 Q9.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { isEndgameByMaterial } from '../../services/gamePhaseService';
import type { MissionGame, MissionStatus, ShownMove } from '../missionCard';

/** The student's move number at which the card is judged if no ending came. */
export const FREE_PIECE_CLOSES_AT_MOVE = 40;
/** The lead the student must hold. */
const LEAD_BAR = 2;
/** What counts as giving material back (a pawn never does). */
const GIVE_BACK = 3;

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PLANTABLE: ReadonlySet<PieceSymbol> = new Set<PieceSymbol>(['n', 'b', 'r']);

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

/** The student's capture on `square` from `fenBefore`: the cheapest legal capturer. */
function captureOn(fenBefore: string, square: string): ShownMove | null {
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return null; }
  const caps = board.moves({ verbose: true }).filter((m) => m.to === square && m.captured);
  if (caps.length === 0) return null;
  caps.sort((a, b) => VALUE[a.piece] - VALUE[b.piece]);
  return { from: caps[0].from, to: caps[0].to };
}

interface Walk {
  status: MissionStatus;
  taken: boolean;
  lead: number;
}

function walk(game: MissionGame): Walk {
  const me = game.studentColor;
  const them: Color = me === 'w' ? 'b' : 'w';
  const planted = game.context?.planted;
  const board = new Chess();
  let plantStands = false;
  let taken = false;
  for (let ply = 0; ply < game.sans.length; ply++) {
    const fenBefore = board.fen();
    let move;
    try { move = board.move(game.sans[ply]); } catch { break; }
    if (ply < game.startPly) continue;
    if (planted && ply === planted.ply) {
      const piece = board.get(planted.square as Square);
      plantStands = move.color === them && !!piece && piece.color === them && PLANTABLE.has(piece.type)
        && legalSeeGainFor(board.fen(), planted.square as Square, me) >= GIVE_BACK;
      continue;
    }
    if (move.color !== me) continue;
    if (plantStands && planted && !taken && ply > planted.ply) {
      if (move.to === planted.square && move.captured) taken = true;
      else if (ply === planted.ply + 1 && !game.forgiven.has(ply)) {
        const show = captureOn(fenBefore, planted.square);
        return { status: { state: 'miss', ply, reason: 'missed-free-piece', ...(show ? { showMove: show } : {}) }, taken, lead: materialLead(board, me) };
      }
    }
    // A move after a forgiven miss: the piece no longer on its square is gone for good.
    if (plantStands && planted && !taken) {
      const piece = board.get(planted.square as Square);
      if (!piece || piece.color !== them) plantStands = false;
    }
    if (taken && !game.forgiven.has(ply) && givesBack(board, me) && keepingMoves(fenBefore, me).length > 0) {
      return { status: { state: 'miss', ply, reason: 'gave-back-material' }, taken, lead: materialLead(board, me) };
    }
    const lead = materialLead(board, me);
    // The game ending on the student's move (their mate, a stalemate) ends the phase too.
    const ending = isEndgameByMaterial(board.fen()) || board.isGameOver();
    const moveNumber = Math.floor(ply / 2) + 1;
    if (ending || moveNumber >= FREE_PIECE_CLOSES_AT_MOVE) {
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
