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
 *            falls, which does not win material outright (+2 HELD after the
 *            coach's best capture — a capture that leaves an equal piece to be
 *            taken back wins nothing) either, and is not
 *            one of the line's equal first moves (`alts`). Shows the line's
 *            move. A forgiven one (Play on) leaves the line: from then a
 *            piece counts as won once the student holds +2 over the slip's
 *            board after the coach's best capture.
 *   MISS b) `gave-back-material` — once the piece is won, holding +2 coming
 *            into the decision, a student move that leaves less than +2
 *            after the coach's best capture (legal SEE) when another move
 *            would have held +2, by a difference of 2 or more: a piece left
 *            for a pawn, the exchange, a piece outright, a recapture not
 *            made (`givesBack`, 2026-10-22: the bar was a capture of 3, so a
 *            bishop left for a pawn and a queen not taken back both passed
 *            with no word).
 *            Shows the first engine candidate that leaves no such capture.
 *   PASS   — the piece won, and at the first student move where the board is
 *            an ending by material (`isEndgameByMaterial`), the game is over
 *            (they mated), or at the student's 40th move, the lead is at least +2.
 *   EXEMPT — losing a pawn, or an even trade; a give-back with no way out (no
 *            legal move at that decision keeps +2 after the coach's best
 *            capture — a miss needs a choice);
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
/** What counts as giving material back: a net 2 — a piece for a pawn, the
 *  exchange. A pawn alone never does. */
const GIVE_BACK = 2;
/** Material won outright (off the line) and HELD after the coach's best
 *  capture: the exchange or more — the card's own +2 bar. */
const WON_BAR = LEAD_BAR;

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

/** The lead this board (the student just moved) HOLDS: the material lead
 *  after the coach's best single capture (legal SEE). */
function heldLead(board: Chess, me: Color): number {
  return materialLead(board, me) - coachWinBack(board, me);
}

/** The most the student could capture on this board (their move): an upper
 *  bound on how far one move can raise the lead — so a decision with no way
 *  back to +2 is skipped without reading every move. */
function bestCaptureValue(fen: string): number {
  let board: Chess;
  try { board = new Chess(fen); } catch { return 0; }
  let best = 0;
  for (const m of board.moves({ verbose: true })) {
    const v = (m.captured ? VALUE[m.captured] : 0) + (m.promotion ? VALUE[m.promotion] - VALUE.p : 0);
    if (v > best) best = v;
  }
  return best;
}

/** THE GIVE-BACK, one test (2026-10-22). Holding the lead coming into this
 *  decision, the student's move leaves less than +2 after the coach's best
 *  capture, another move would have held +2, and the difference is a real
 *  one (2 or more — a pawn alone never counts). That covers a piece left to
 *  be taken AND a recapture not made: the prod gate game let …Qxg6 stand
 *  (Ne4 instead of Rxg6) and fell from +9 to 0 with no word, because the old
 *  test only looked at what a move left hanging. */
function givesBack(fenBefore: string, board: Chess, me: Color, wasAhead: boolean): boolean {
  if (!wasAhead) return false;
  const held = heldLead(board, me);
  if (held >= LEAD_BAR) return false;
  const leadBefore = materialLead(new Chess(fenBefore), me);
  if (leadBefore + bestCaptureValue(fenBefore) < LEAD_BAR) return false;
  let best = -Infinity;
  let pos: Chess;
  try { pos = new Chess(fenBefore); } catch { return false; }
  for (const m of pos.moves({ verbose: true })) {
    const b = after(fenBefore, `${m.from}${m.to}${m.promotion ?? ''}`);
    if (b) best = Math.max(best, heldLead(b, me));
  }
  return best >= LEAD_BAR && best - held >= GIVE_BACK;
}

function after(fen: string, uci: string): Chess | null {
  try {
    const b = new Chess(fen);
    b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return b;
  } catch { return null; }
}

/** Does this board (the student just moved) still hold the lead — at least
 *  +2 after the coach's best single capture? */
function holdsLead(board: Chess, me: Color): boolean {
  return heldLead(board, me) >= LEAD_BAR;
}

/** The legal moves from `fenBefore` that KEEP the lead (`holdsLead`), in
 *  chess.js order — the choice a give-back miss needs. A move that is merely
 *  not a give-back because the lead is already gone is no choice at all: the
 *  2026-10-22 prod gate game, already behind, found Rg8+ Qxg8 Bxg8 (winning
 *  the queen back) and was missed for "giving back" the bishop, because every
 *  other move left it further behind and so counted as "keeping". */
function keepingMoves(fenBefore: string, me: Color): string[] {
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return []; }
  return board.moves({ verbose: true })
    .map((m) => `${m.from}${m.to}${m.promotion ?? ''}`)
    .filter((uci) => { const b = after(fenBefore, uci); return !!b && holdsLead(b, me); });
}

interface Walk {
  status: MissionStatus;
  taken: boolean;
  /** The ply the extra piece was won on, or null. */
  takenAt: number | null;
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
  let takenAt: number | null = null;
  /** On the line: how many of its moves have been played. */
  let onLine = true;
  let at = 0;
  /** The lead on the board BEFORE the slip — a piece above it is a piece won. */
  let startLead = 0;
  /** The lead after the student's previous move — were they holding it? */
  let prevLead = materialLead(board, me);
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
      // A piece WON is a piece that stays won: measured after the coach's best
      // capture, so taking the knight and leaving a bishop to be taken back
      // is not "Extra piece won!" (prod gate game 2026-10-22: …bxc6 when the
      // line was Bh2+ first, paid the find and the give-back on one move).
      const wonOutright = move.color === me && heldLead(board, me) - startLead >= WON_BAR;
      if (onLine) {
        if (uciOf(move) === planted.line[at]) {
          at += 1;
          if (at === planted.line.length) { taken = true; takenAt = ply; }
        } else if (move.color === me) {
          if (wonOutright) { taken = true; takenAt = ply; }
          // Another first move the engine rates as good as the line's: the
          // student found a way in. From here the piece counts once it is won.
          else if (at === 0 && planted.alts.includes(uciOf(move))) onLine = false;
          else if (!game.forgiven.has(ply)) {
            const want = planted.line[at];
            return { status: { state: 'miss', ply, reason: 'missed-free-piece', showMove: { from: want.slice(0, 2), to: want.slice(2, 4) } }, taken, takenAt, lead: materialLead(board, me) };
          } else onLine = false;
        } else onLine = false;
      } else if (wonOutright) { taken = true; takenAt = ply; }
    }
    if (move.color !== me) continue;
    const wasAhead = Math.max(prevLead, materialLead(board, me)) >= LEAD_BAR;
    prevLead = materialLead(board, me);
    if (taken && !game.forgiven.has(ply) && givesBack(fenBefore, board, me, wasAhead)) {
      return { status: { state: 'miss', ply, reason: 'gave-back-material' }, taken, takenAt, lead: materialLead(board, me) };
    }
    const lead = materialLead(board, me);
    // The game ending on the student's move (their mate, a stalemate) ends the phase too.
    const ending = isEndgameByMaterial(board.fen()) || board.isGameOver();
    const moveNumber = Math.floor(ply / 2) + 1;
    // Mid-line the card waits: the line's own captures can reach an ending.
    const midLine = plantStands && !taken && onLine && at > 0;
    if (!midLine && (ending || moveNumber >= FREE_PIECE_CLOSES_AT_MOVE)) {
      if (taken && lead >= LEAD_BAR) return { status: { state: 'pass', ply }, taken, takenAt, lead };
      if (ending) return { status: { state: 'incomplete', ply }, taken, takenAt, lead };
    }
  }
  return { status: { state: 'pending' }, taken, takenAt, lead: materialLead(board, me) };
}

export function checkFreePieceStayAhead(game: MissionGame): MissionStatus {
  return walk(game).status;
}

/** The ply the extra piece was won on, or null (the card's `found.at`). */
export function freePieceFoundAt(game: MissionGame): number | null {
  return walk(game).takenAt;
}

/** The banner's read — never names the free piece (finding it is the mission). */
export function freePieceStayAheadProgress(game: MissionGame): string {
  const w = walk(game);
  if (!w.taken) return 'Win an extra piece when the chance comes';
  const lead = w.lead;
  return lead >= LEAD_BAR ? `Ahead by ${lead} — maintain the advantage to the end` : `Ahead by ${lead}`;
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
