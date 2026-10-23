/**
 * Level 1 · Endgame · CHECKMATE THE KING — the board check (David 2026-10-23:
 * "Goal should have just been check mate the king"). LIVE and PURE: chess.js
 * only, no engine.
 *
 * The card goes live IN THE STUDENT'S OWN GAME, the ply after the middlegame
 * card resolves, and the game is played to its end. It replaces the K+Q card,
 * which jumped the board to a set-up K+Q vs K position and judged one mating
 * method — it stopped David's own game short of the mate he was playing for.
 * The card keeps the id `kq-mate`, so the record of past games still counts.
 * Judging only the student's own moves, no ply before `startPly`:
 *   PASS   — the student's move checkmates, with any pieces.
 *   MISS   `stalemate` — the student's move leaves the coach no legal move and
 *          no check, when another legal move did not. Shows a mate when one
 *          is there, else the engine's first candidate that does not
 *          stalemate.
 *   EXEMPT — a stalemate with no other choice; a ply the student chose to play
 *            on from (`forgiven`).
 *   OVER   — the game ended any other way on the student's move (a forgiven
 *            stalemate, repetition, fifty moves, bare kings): `incomplete`.
 *            The runner closes a card still pending when the game ends, or
 *            `CHECKMATE_CLOSES_AFTER_MOVES` of the student's moves after it
 *            went live.
 */
import { Chess, type Color } from 'chess.js';
import type { MissionGame, MissionStatus, ShownMove } from '../missionCard';

declare module '../missionCard' {
  interface MissionIdMap { 'kq-mate': true }
  interface MissReasonMap {
    /** The student's move left the coach no legal move and no check — a draw. */
    stalemate: true;
  }
}

/** The student's moves the card stays live for — far past any mate a won
 *  ending needs; the game's own end closes it first. */
export const CHECKMATE_CLOSES_AFTER_MOVES = 100;

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;

function after(fen: string, uci: string): Chess | null {
  try {
    const b = new Chess(fen);
    b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return b;
  } catch { return null; }
}

/** The student's moves from `fenBefore` that do not stalemate, mating moves
 *  first, then chess.js order. */
export function nonStalematingMovesUci(fenBefore: string, me: Color): string[] {
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return []; }
  if (board.turn() !== me) return [];
  const mates: string[] = [];
  const rest: string[] = [];
  for (const m of board.moves({ verbose: true })) {
    const uci = uciOf(m);
    const b = after(fenBefore, uci);
    if (!b || b.isStalemate()) continue;
    (b.isCheckmate() ? mates : rest).push(uci);
  }
  return [...mates, ...rest];
}

export function checkCheckmateKing(game: MissionGame): MissionStatus {
  const me = game.studentColor;
  let board: Chess;
  try { board = new Chess(game.startFen ?? START); } catch { return { state: 'pending' }; }
  for (let ply = 0; ply < game.sans.length; ply++) {
    const fenBefore = board.fen();
    let move;
    try { move = board.move(game.sans[ply]); } catch { break; }
    if (ply < game.startPly || move.color !== me) continue;
    if (board.isCheckmate()) return { state: 'pass', ply };
    if (board.isStalemate() && !game.forgiven.has(ply) && nonStalematingMovesUci(fenBefore, me).length > 0) {
      return { state: 'miss', ply, reason: 'stalemate' };
    }
    if (board.isGameOver()) return { state: 'incomplete', ply };
  }
  return { state: 'pending' };
}

/** The banner: the goal, the same words every move. */
export function checkmateKingProgress(): string {
  return 'Checkmate the king';
}

/**
 * The move shown after a second miss at one decision: a mate when there is
 * one, else the first engine candidate that does not stalemate, else the first
 * such move in chess.js order.
 */
export function checkmateKingShowMove(fenBefore: string, studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  const ok = nonStalematingMovesUci(fenBefore, studentColor);
  const mate = ok.find((u) => after(fenBefore, u)?.isCheckmate() === true);
  const pick = mate ?? candidatesUci.find((u) => ok.includes(u)) ?? ok.at(0) ?? null;
  return pick ? { from: pick.slice(0, 2), to: pick.slice(2, 4) } : null;
}
