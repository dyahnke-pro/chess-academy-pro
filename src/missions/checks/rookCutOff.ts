/**
 * Level 24 · Endgame · CUT THE KING OFF — the board check (Lane R,
 * 2026-10-22). LIVE and PURE: chess.js plus the scenario library's verdicts,
 * no engine.
 *
 * The phase starts from a curated rook-and-pawn-against-rook board (scenario
 * `rook-cut-off`, `src/missions/scenarios/rookCutOff.json`); the runner hands
 * it as `startFen` and the moves count from it. On every library board the
 * student (rook and pawn) is to move, the defending king is not yet cut off,
 * and — the lichess tablebase, exact — the ONLY moves that keep the win are
 * rook moves that cut the king off from the pawn (the rook's file strictly
 * between the king's and the pawn's, and nothing of theirs attacking the
 * rook: the king cannot cross that file), every such rook move wins, and
 * pushing the pawn at once draws. Stockfish reads the same on every board (after the cut ≥ +2, after
 * the push 0.00 — the builder rejects any board it does not). So the verdict
 * of every first move is KNOWN, and the check reads it, never guesses it:
 *
 *   PASS   — the student's move from a library board is one of its winning
 *            cuts.
 *   MISS a) `pushed-before-the-cut` — a pawn move instead: the win is gone.
 *   MISS b) `king-not-cut-off` — any other move: the win is gone, and the
 *            king is still not cut off (every move that cuts it off wins —
 *            the builder rejects a board where one draws — so the phrase is
 *            always true).
 *            Both show the cut (`rookCutOffShowMove`: the engine's first
 *            candidate among the winning cuts; else the tablebase's best).
 *   EXEMPT — a move from a board the library does not hold (the scenario
 *            never loaded, or the card runs as a silent watcher over a live
 *            game): the check cannot know the result there and judges
 *            nothing. The runner closes the card `incomplete`
 *            (`closesAfterMoves`).
 *   OVER   — the decision played on from (`forgiven`): it is gone, and the
 *            card closes `incomplete` there. The game over on a student's move
 *            before a decision: `incomplete`.
 */
import { Chess, type Color, type Square } from 'chess.js';
import library from '../scenarios/rookCutOff.json';
import type { MissionBriefing, MissionGame, MissionStatus, ShownMove } from '../missionCard';

declare module '../missionCard' {
  interface MissionIdMap { 'rook-cut-off': true }
  interface MissReasonMap {
    /** The student pushed the pawn before cutting the defending king off — the win is gone. */
    'pushed-before-the-cut': true;
    /** The student's move left the defending king free to reach the pawn — the win is gone. */
    'king-not-cut-off': true;
  }
  interface ScenarioIdMap {
    /** Rook and pawn against rook, the student to cut the king off first (Level 24 endgame). */
    'rook-cut-off': true;
  }
}

/** The student's moves the card stays live for before it closes `incomplete`
 *  (the decision is the first one; this only closes a board the library does
 *  not hold). */
export const ROOK_CUT_OFF_CLOSES_AFTER_MOVES = 2;

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** A library board's verdict: the moves that keep the win, best first. */
interface CutBoard { fen: string; wins: readonly string[] }

const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

let index: Map<string, CutBoard> | null = null;
/** The library by board (both colours — the side to move is in the key). */
function boards(): Map<string, CutBoard> {
  if (index) return index;
  index = new Map();
  for (const row of [...library.w, ...library.b]) index.set(key(row.fen), row);
  return index;
}

/** The verdict for the board `fen`, or null when the library does not hold it. */
export function cutBoardAt(fen: string): CutBoard | null {
  return boards().get(key(fen)) ?? null;
}

const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;

/** Is the defending king cut off from the student's pawn by the student's rook
 *  — the rook's file strictly between the king's file and the pawn's, and
 *  nothing of theirs attacking the rook (a rook they can take cuts nothing
 *  off)? The banner's read, and the builder's rule (`cutOff` in
 *  scripts/scenarios/build-rook-cut-off.mjs). */
export function kingCutOff(board: Chess, me: Color): boolean {
  let rook: string | null = null; let pawn: string | null = null; let king: string | null = null;
  for (const row of board.board()) for (const cell of row) {
    if (!cell) continue;
    if (cell.color === me && cell.type === 'r') rook = cell.square;
    else if (cell.color === me && cell.type === 'p') pawn = cell.square;
    else if (cell.color !== me && cell.type === 'k') king = cell.square;
  }
  if (!rook || !pawn || !king) return false;
  const f = (s: string): number => s.charCodeAt(0) - 97;
  return Math.min(f(king), f(pawn)) < f(rook) && f(rook) < Math.max(f(king), f(pawn))
    && !board.isAttacked(rook as Square, me === 'w' ? 'b' : 'w');
}

function walk(game: MissionGame): { status: MissionStatus; board: Chess } {
  const me = game.studentColor;
  let board: Chess;
  try { board = new Chess(game.startFen ?? START); } catch { return { status: { state: 'pending' }, board: new Chess() }; }
  for (let ply = 0; ply < game.sans.length; ply++) {
    const fenBefore = board.fen();
    let move;
    try { move = board.move(game.sans[ply]); } catch { break; }
    if (ply < game.startPly || move.color !== me) continue;
    const verdict = cutBoardAt(fenBefore);
    if (verdict) {
      if (game.forgiven.has(ply)) return { status: { state: 'incomplete', ply }, board };
      const uci = uciOf(move);
      if (verdict.wins.includes(uci)) return { status: { state: 'pass', ply }, board };
      return { status: { state: 'miss', ply, reason: move.piece === 'p' ? 'pushed-before-the-cut' : 'king-not-cut-off' }, board };
    }
    if (board.isGameOver()) return { status: { state: 'incomplete', ply }, board };
  }
  return { status: { state: 'pending' }, board };
}

export function checkRookCutOff(game: MissionGame): MissionStatus {
  return walk(game).status;
}

/** The banner's read: whether their king is cut off yet. Never names a move. */
export function rookCutOffProgress(game: MissionGame): string {
  if (game.sans.length === 0 && !game.startFen) return 'Cut their king off, then push';
  const { board } = walk(game);
  return kingCutOff(board, game.studentColor) ? 'Their king: cut off' : 'Their king: not cut off yet';
}

/** The move a second miss shows: the engine's first candidate among the
 *  board's winning cuts; else the tablebase's best. */
export function rookCutOffShowMove(fenBefore: string, _studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  const verdict = cutBoardAt(fenBefore);
  if (!verdict || verdict.wins.length === 0) return null;
  const pick = candidatesUci.find((u) => verdict.wins.includes(u)) ?? verdict.wins[0];
  return { from: pick.slice(0, 2), to: pick.slice(2, 4) };
}

/** The briefing (`scripts/scenarios/build-lane-r-briefings.mjs`, never
 *  typed): the demo is a library board, its winning cut, then a
 *  tablebase-winning line — the student pushes whenever a push still wins,
 *  the defence is the tablebase's longest. The try is another library board;
 *  its answers are that board's winning cuts. */
export const ROOK_CUT_OFF_BRIEFING: MissionBriefing = {
  novel: true,
  idea: 'Put your rook on a file between their king and your pawn — cut it off, then push.',
  demoFen: library.briefing.demoFen,
  demoSans: library.briefing.demoSans,
  tryFen: library.briefing.tryFen,
  tryAnswersUci: library.briefing.tryAnswersUci,
};
