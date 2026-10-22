/**
 * Level 21 · Endgame · TRIANGULATION — the board check (Campaign intermediate
 * track, lane KP). LIVE and PURE: chess.js and the exact king-and-pawn
 * verdicts (`kpEndings.ts`), no engine.
 *
 * The phase starts from a curated board (scenario `kp-triangulation`,
 * `src/missions/scenarios/kpTriangulation.json`) on one of the library's pawn
 * structures (`structures` in the JSON) — the skeleton of the app's own
 * triangulation lesson, your pawns b5 + c4 against theirs on b6 — on either
 * wing. The student wins, and the defender would
 * already be lost if it were THEIR move — but it is the student's, and no pawn
 * move or capture wins: the direct approach lets their king meet yours. The way
 * is to hand them the move — three king steps round a triangle, back to the
 * same square, while their king can only go there and back.
 *
 * The structure was SOLVED EXACTLY (`scripts/scenarios/kp-slice.mjs`: every
 * placement of the two kings, both sides to move, by retrograde analysis, each
 * pawn move and capture out of it read from the K+P tables or Syzygy) and ships
 * as slices in `kpTables.json`; every library board was checked again by
 * Syzygy (the board and every child) and by Stockfish
 * (`build-kp-triangulation.mjs`, rule in `kp-tri-rule.mjs`).
 *
 * THE DECISION BOARD (`triangulationDecision`), read live: one of the library's
 * structures (either wing, either colour), the student to move and winning, the
 * same board with the defender to move a win too (they are in zugzwang), every
 * winning move a king move that captures nothing, and some move that does not
 * win. (The library adds what needs a deeper read: the direct approach draws
 * and the triangle is on the board.)
 *
 * Judging only the student's own moves, no ply before `startPly`, from the
 * library board on (a scenario) or from the first decision board on (a live
 * game or a silent watcher):
 *   PASS   — the student breaks through: a capture or a pawn move after which
 *            the student still wins (exact verdict). Handing over the move is
 *            what makes the break possible; the card closes on it.
 *   MISS a) `no-triangle` — on a decision board the move lets the win slip
 *            (exact verdict after it: a draw or a loss).
 *   MISS b) `kp-win-slipped` — on any other won board the move lets the win
 *            slip. On the library board a miss shows the board's key move.
 *   EXEMPT — a forgiven ply; a board the shipped verdicts do not cover (the
 *            defender broke the structure somewhere the build did not solve);
 *            the coach's moves. A won board always has a winning move.
 *   OVER   — the game ends on the student's move otherwise (repetition, fifty
 *            moves): `incomplete`. Still pending 40 of the student's moves
 *            after the card went live, the runner closes it `incomplete`.
 *   FOUND  — the student's king is back on the square it left a decision board
 *            from, the same board on again with the defender to move: the move
 *            has been handed over (`foundAt`).
 */
import { Chess, type Color } from 'chess.js';
import type { MissionBriefing, MissionGame, MissionStatus, ShownMove } from '../missionCard';
import library from '../scenarios/kpTriangulation.json';
import {
  boardKey,
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
  interface MissionIdMap { 'kp-triangulation': true }
  interface MissReasonMap {
    /** On a board where only handing over the move wins, the student's move did not keep the win. */
    'no-triangle': true;
  }
  interface ScenarioIdMap {
    /** A won pawn ending where the student must hand the defender the move (Level 21). */
    'kp-triangulation': true;
  }
}

/** The student's moves the card stays live for before it closes `incomplete`. */
export const KP_TRIANGULATION_CLOSES_AFTER_MOVES = 40;

const libraryBoard = indexLibrary(library);

const mirrorFile = (sq: string): string => `${'hgfedcba'['abcdefgh'.indexOf(sq[0])]}${sq[1]}`;
const flipRank = (sq: string): string => `${sq[0]}${9 - Number(sq[1])}`;
const pawnsKey = (mine: readonly string[], theirs: readonly string[]): string => `${[...mine].sort().join(',')}/${[...theirs].sort().join(',')}`;
/** The library's structures from the student's side — this wing and the
 *  other — for each colour. */
const STRUCTURES: Record<Color, ReadonlySet<string>> = (() => {
  const white = new Set<string>();
  const black = new Set<string>();
  for (const { white: w, black: b } of library.structures) {
    for (const [mine, theirs] of [[w, b], [w.map(mirrorFile), b.map(mirrorFile)]]) {
      white.add(pawnsKey(mine, theirs));
      black.add(pawnsKey(mine.map(flipRank), theirs.map(flipRank)));
    }
  }
  return { w: white, b: black };
})();

function onTheStructure(board: Chess, me: Color): boolean {
  const pawns = board.board().flat().filter((c) => c && c.type === 'p');
  const mine = pawns.filter((p) => p?.color === me).map((p) => p?.square ?? '');
  const theirs = pawns.filter((p) => p?.color !== me).map((p) => p?.square ?? '');
  return STRUCTURES[me].has(pawnsKey(mine, theirs));
}

/** The board with the other side to move, or null when that is illegal (the
 *  side that would then not be moving stands in check). */
function passTheMove(board: Chess): Chess | null {
  const [placement, turn] = board.fen().split(' ');
  const mover = turn as Color;
  const other: Color = mover === 'w' ? 'b' : 'w';
  try {
    const flipped = new Chess(`${placement} ${other} - - 0 1`);
    const king = flipped.board().flat().find((c) => c && c.type === 'k' && c.color === mover);
    if (!king || flipped.isAttacked(king.square, other)) return null;
    return flipped;
  } catch { return null; }
}

/** Is this board the triangulation decision for `me` (to move, winning)? */
export function triangulationDecision(board: Chess, me: Color): boolean {
  if (board.turn() !== me || !onTheStructure(board, me) || exactWinner(board) !== me) return false;
  const passed = passTheMove(board);
  if (!passed || exactWinner(passed) !== me) return false;
  const fen = board.fen();
  let someDraw = false;
  for (const m of board.moves({ verbose: true })) {
    const wins = winnerAfter(fen, `${m.from}${m.to}${m.promotion ?? ''}`) === me;
    if (!wins) { someDraw = true; continue; }
    if (m.piece !== 'k' || m.captured) return false;
  }
  return someDraw;
}

const SPEC: KpCardSpec = {
  decision: triangulationDecision,
  decisionReason: 'no-triangle',
  libraryBoard,
  passes: (move, after, me) => (move.piece === 'p' || move.captured !== undefined) && after === me,
};

export function checkKpTriangulation(game: MissionGame): MissionStatus {
  return walkKpEnding(game, SPEC).status;
}

/** The ply the student's king returns to the square it left a decision board
 *  from, with that board on again and the defender to move — the move handed
 *  over. Null until then. */
export function kpTriangulationFoundAt(game: MissionGame): number | null {
  const me = game.studentColor;
  let board: Chess;
  try { board = new Chess(game.startFen); } catch { return null; }
  const decisions = new Set<string>();
  for (let ply = 0; ply < game.sans.length; ply++) {
    const mine = ply >= game.startPly && board.turn() === me;
    if (mine && triangulationDecision(board, me)) decisions.add(boardKey(board.fen()).split(' ')[0]);
    try { board.move(game.sans[ply]); } catch { return null; }
    if (mine && decisions.has(boardKey(board.fen()).split(' ')[0]) && exactWinner(board) === me) return ply;
  }
  return null;
}

export function kpTriangulationProgress(game: MissionGame): string {
  if (game.sans.length === 0 && !game.startFen) return 'Hand them the move';
  return kpProgressLine(walkKpEnding(game, SPEC).board, game.studentColor, 'Hand them the move');
}

export function kpTriangulationShowMove(fenBefore: string, studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  return kpShowMove(fenBefore, studentColor, candidatesUci, libraryBoard(fenBefore)?.key[0] ?? null);
}

/** The briefing's demo: the app's own lesson board (Ke4 + b5, c4 against
 *  Kc7 + b6) — the triangle e4–e5–d5–e4 while their king goes c7–d7–c7, then
 *  the exact line to the break (built and stored by
 *  `build-kp-triangulation.mjs`; replayed and re-judged in the test). */
export const KP_TRIANGULATION_DEMO_FEN: string = library.demo.fen;
export const KP_TRIANGULATION_DEMO_SANS: readonly string[] = library.demo.sans;
/** The try: another library board — hand them the move. */
export const KP_TRIANGULATION_TRY_FEN: string = library.demo.tryFen;

export const KP_TRIANGULATION_BRIEFING: MissionBriefing = {
  novel: true,
  idea: 'When they would lose if it were their move, walk your king around a triangle and hand them the move.',
  demoFen: KP_TRIANGULATION_DEMO_FEN,
  demoSans: KP_TRIANGULATION_DEMO_SANS,
  tryFen: KP_TRIANGULATION_TRY_FEN,
  // Computed, never typed: every move that keeps the win there.
  tryAnswersUci: winningMovesUci(KP_TRIANGULATION_TRY_FEN, 'w'),
};
