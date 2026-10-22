/**
 * Level 19 · Endgame · OUTFLANKING — the board check (Campaign intermediate
 * track, lane KP). LIVE and PURE: chess.js and the exact king-and-pawn
 * verdicts (`kpEndings.ts`), no engine.
 *
 * The phase starts from a curated board (scenario `kp-outflanking`,
 * `src/missions/scenarios/kpOutflanking.json`): a won king-and-pawn ending —
 * K+P vs K, or a blocked pawn pair — where the kings face each other (same
 * file, their king two ranks in front of yours) with the student to move, and
 * ONLY a king sidestep keeps the win: the head-on tries, the retreats and the
 * pawn run all let them draw. Every library board was chosen by the exact
 * tables and checked by Syzygy and Stockfish (`build-kp-outflanking.mjs`).
 *
 * THE DECISION BOARD (`outflankDecision`) is that rule read live: the student
 * to move and winning, the kings facing each other, and every winning move a
 * sidestep (same rank, one file across, not a capture) with some move that
 * does not win.
 *
 * Judging only the student's own moves, no ply before `startPly`, from the
 * library board on (a scenario) or from the first decision board on (a live
 * game or a silent watcher):
 *   PASS   — the student promotes to a queen or a rook and the new piece wins:
 *            the lone king can neither take it nor is stalemated (the K+Q /
 *            K+R rule, proved exact).
 *   MISS a) `faced-the-king` — on a decision board the move lets the win slip
 *            (exact verdict after it: a draw or a loss).
 *   MISS b) `kp-win-slipped` — on any other won board the move lets the win
 *            slip. On the library board a miss shows the board's key sidestep.
 *   EXEMPT — a forgiven ply; a board the tables do not solve; the coach's
 *            moves. A won board always has a winning move — no forced miss.
 *   OVER   — the game ends on the student's move otherwise (repetition, fifty
 *            moves, bare kings): `incomplete`. Still pending 40 of the
 *            student's moves after the card went live, the runner closes it
 *            `incomplete` (`closesAfterMoves`).
 *   FOUND  — the ply the student answers a decision board with a winning
 *            sidestep (`found.at`): the find pays at once; the pass comes at
 *            the promotion.
 */
import { Chess, type Color } from 'chess.js';
import type { MissionBriefing, MissionGame, MissionStatus, ShownMove } from '../missionCard';
import library from '../scenarios/kpOutflanking.json';
import {
  exactWinner,
  indexLibrary,
  kpProgressLine,
  kpShowMove,
  walkKpEnding,
  winnerAfter,
  winningMovesUci,
  type KpCardSpec,
} from './kpEndings';

declare module '../missionCard' {
  interface MissionIdMap { 'kp-outflanking': true }
  interface MissReasonMap {
    /** On a board where only a king sidestep wins, the student's move did not. */
    'faced-the-king': true;
  }
  interface ScenarioIdMap {
    /** A won king-and-pawn ending, the kings facing each other, only a sidestep wins (Level 19). */
    'kp-outflanking': true;
  }
}

/** The student's moves the card stays live for before it closes `incomplete`. */
export const KP_OUTFLANKING_CLOSES_AFTER_MOVES = 40;

const libraryBoard = indexLibrary(library);

/** Is this board the outflanking decision for `me` (to move, winning)? */
export function outflankDecision(board: Chess, me: Color): boolean {
  if (board.turn() !== me || exactWinner(board) !== me) return false;
  const kings = board.board().flat().filter((c) => c && c.type === 'k');
  const mine = kings.find((k) => k?.color === me);
  const theirs = kings.find((k) => k && k.color !== me);
  if (!mine || !theirs) return false;
  const ahead = me === 'w' ? 2 : -2;
  if (mine.square[0] !== theirs.square[0] || Number(theirs.square[1]) - Number(mine.square[1]) !== ahead) return false;
  const fen = board.fen();
  let someDraw = false;
  for (const m of board.moves({ verbose: true })) {
    const wins = winnerAfter(fen, `${m.from}${m.to}${m.promotion ?? ''}`) === me;
    if (!wins) { someDraw = true; continue; }
    const sidestep = m.piece === 'k' && !m.captured && m.from[1] === m.to[1];
    if (!sidestep) return false;
  }
  return someDraw;
}

const SPEC: KpCardSpec = {
  decision: outflankDecision,
  decisionReason: 'faced-the-king',
  libraryBoard,
  passes: (move, after, me) => (move.promotion === 'q' || move.promotion === 'r') && after === me,
};

export function checkKpOutflanking(game: MissionGame): MissionStatus {
  return walkKpEnding(game, SPEC).status;
}

export function kpOutflankingFoundAt(game: MissionGame): number | null {
  return walkKpEnding(game, SPEC).foundPly;
}

export function kpOutflankingProgress(game: MissionGame): string {
  if (game.sans.length === 0 && !game.startFen) return 'Go around their king';
  return kpProgressLine(walkKpEnding(game, SPEC).board, game.studentColor, 'Go around their king');
}

export function kpOutflankingShowMove(fenBefore: string, studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  return kpShowMove(fenBefore, studentColor, candidatesUci, libraryBoard(fenBefore)?.key[0] ?? null);
}

/** The briefing's demo: a library board and its exact line — the student
 *  fastest, the defender slowest — to the queen (built and stored by
 *  `build-kp-outflanking.mjs`; replayed and re-judged in the test). */
export const KP_OUTFLANKING_DEMO_FEN: string = library.demo.fen;
export const KP_OUTFLANKING_DEMO_SANS: readonly string[] = library.demo.sans;
/** The try: the kings face each other in front of your pawn — step to the
 *  side; stepping back lets them draw. A library board. */
export const KP_OUTFLANKING_TRY_FEN = '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1';

export const KP_OUTFLANKING_BRIEFING: MissionBriefing = {
  novel: true,
  idea: "When the kings face each other and it's your move, step to the side and go around their king.",
  demoFen: KP_OUTFLANKING_DEMO_FEN,
  demoSans: KP_OUTFLANKING_DEMO_SANS,
  tryFen: KP_OUTFLANKING_TRY_FEN,
  // Computed, never typed: every move that keeps the win there.
  tryAnswersUci: winningMovesUci(KP_OUTFLANKING_TRY_FEN, 'w'),
};
