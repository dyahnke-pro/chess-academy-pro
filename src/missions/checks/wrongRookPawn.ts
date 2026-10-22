/**
 * Level 22 · Endgame · THE WRONG ROOK PAWN — the board check (Lane R,
 * 2026-10-22). LIVE and PURE: chess.js plus the scenario library's verdicts,
 * no engine.
 *
 * The student DEFENDS. The coach has king, bishop and a rook pawn, and the
 * bishop is the WRONG colour: it can never cover the pawn's promotion square.
 * The phase starts from a curated board (scenario `wrong-rook-pawn`,
 * `src/missions/scenarios/wrongRookPawn.json`): the student's bare king is to
 * move, two or three steps from that corner, in a race the coach's king can
 * still win.
 *
 * THE FORTRESS — once the student's king stands on the promotion square the
 * coach can never win: nothing can ever check it there (the bishop is the
 * wrong colour, the pawn is on the edge file, a king may not come next to
 * it), and from the squares beside it the king can always step back. Proved
 * EXHAUSTIVELY on every placement, all four orientations, with and without
 * the bishop (`scripts/scenarios/prove-wrong-rook-pawn-fortress.mjs`, run
 * 2026-10-22: 33,912 placements and 524,145 coach moves per orientation,
 * zero failures), sampled again in the test suite, and seen on every library
 * node (every step into the corner draws).
 *
 * THE VERDICTS — the lichess tablebase, exact; Stockfish reads every start
 * the same way. The library holds the drawing moves at the student's FIRST
 * decision, and at the SECOND after EVERY coach reply to each drawing first
 * move. So:
 *   PASS   — the student's king steps onto the coach pawn's promotion square
 *            while the board poses the question (the student has a bare king;
 *            the coach a king, one pawn on a rook file, and at most bishops
 *            that cannot cover that square).
 *   MISS   `lost-the-corner-race` — at a decision the library holds, a move
 *            that is not one of its drawing moves: the tablebase says it
 *            loses. Shows the drawing move nearest the corner.
 *   EXEMPT — a decision the library does not hold (the third and later; a
 *            board off the library, or a silent watcher over a live game):
 *            only the pass is judged there — the check cannot know the result
 *            of anything else, and says nothing. A move the student chose to
 *            play on from (`forgiven`) is walked past; the corner still passes.
 *   OVER   — the game drawn on the student's move without the corner (their
 *            pawn taken, a repetition): `incomplete` — the draw held, the habit
 *            was not shown. Still pending 12 of the student's moves after the
 *            card went live, the runner closes it `incomplete`.
 */
import { Chess, type Color, type Square } from 'chess.js';
import library from '../scenarios/wrongRookPawn.json';
import type { MissionBriefing, MissionGame, MissionStatus, ShownMove } from '../missionCard';

declare module '../missionCard' {
  interface MissionIdMap { 'wrong-rook-pawn': true }
  interface MissReasonMap {
    /** The student's king move lost the race to the corner — the tablebase says the coach now wins. */
    'lost-the-corner-race': true;
  }
  interface ScenarioIdMap {
    /** King, wrong-colour bishop and rook pawn against the student's bare king (Level 22 endgame). */
    'wrong-rook-pawn': true;
  }
}

export const WRONG_ROOK_PAWN_CLOSES_AFTER_MOVES = 12;

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** One library board: the drawing moves at the first decision (nearest the
 *  corner first), the natural wrong move the engine confirmed, and the
 *  second decision's drawing moves after each first move and coach reply. */
export interface CornerBoard {
  fen: string;
  draws: readonly string[];
  wrong: string;
  tree: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
}
interface CornerLibrary {
  w: readonly CornerBoard[];
  b: readonly CornerBoard[];
  briefing: { demoFen: string; demoSans: readonly string[]; tryFen: string; tryAnswersUci: readonly string[] };
}
const LIBRARY = library as unknown as CornerLibrary;

const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;
const fileOf = (s: string): number => s.charCodeAt(0) - 97;
const rankOf = (s: string): number => Number(s[1]);
const isLight = (s: string): boolean => (fileOf(s) + rankOf(s) - 1) % 2 === 1;
const steps = (a: string, b: string): number => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

let starts: Map<string, CornerBoard> | null = null;
/** The library's start boards (the side to move is in the key). */
export function cornerBoardAt(fen: string): CornerBoard | null {
  if (!starts) {
    starts = new Map();
    for (const row of [...LIBRARY.w, ...LIBRARY.b]) starts.set(key(row.fen), row);
  }
  return starts.get(key(fen)) ?? null;
}

let nodes: Map<string, readonly string[]> | null = null;
/** Every board the library holds a verdict for → its drawing moves. Built on
 *  first use (only the shown move after a second miss needs it). */
function drawsAt(fen: string): readonly string[] | null {
  if (!nodes) {
    nodes = new Map();
    for (const row of [...LIBRARY.w, ...LIBRARY.b]) {
      nodes.set(key(row.fen), row.draws);
      for (const [m1, branch] of Object.entries(row.tree)) {
        const b1 = new Chess(row.fen);
        b1.move({ from: m1.slice(0, 2), to: m1.slice(2, 4) });
        for (const [r, d2] of Object.entries(branch)) {
          const b2 = new Chess(b1.fen());
          b2.move({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: r[4] });
          nodes.set(key(b2.fen()), d2);
        }
      }
    }
  }
  return nodes.get(key(fen)) ?? null;
}

/**
 * The corner this board asks the student to reach — the coach's rook pawn's
 * promotion square — or null when the board does not pose the question: the
 * student must have a bare king; the coach its king, exactly one pawn on a
 * rook file, and nothing else but bishops that cannot cover that square.
 */
export function wrongRookPawnCorner(board: Chess, me: Color): Square | null {
  let pawn: string | null = null;
  const bishops: string[] = [];
  for (const row of board.board()) for (const cell of row) {
    if (!cell || cell.type === 'k') continue;
    if (cell.color === me) return null;
    if (cell.type === 'p') { if (pawn) return null; pawn = cell.square; }
    else if (cell.type === 'b') bishops.push(cell.square);
    else return null;
  }
  if (!pawn || (pawn[0] !== 'a' && pawn[0] !== 'h')) return null;
  const corner = `${pawn[0]}${me === 'w' ? 1 : 8}` as Square;
  return bishops.every((b) => isLight(b) !== isLight(corner)) ? corner : null;
}

function kingOf(board: Chess, color: Color): Square | null {
  for (const row of board.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === color) return cell.square;
  return null;
}

function walk(game: MissionGame): { status: MissionStatus; board: Chess } {
  const me = game.studentColor;
  let board: Chess;
  try { board = new Chess(game.startFen ?? START); } catch { return { status: { state: 'pending' }, board: new Chess() }; }
  const entry = game.startFen ? cornerBoardAt(game.startFen) : null;
  let decision = 0;
  let m1: string | null = null;
  let r1: string | null = null;
  for (let ply = 0; ply < game.sans.length; ply++) {
    const corner = wrongRookPawnCorner(board, me);
    let move;
    try { move = board.move(game.sans[ply]); } catch { break; }
    if (ply < game.startPly) continue;
    const uci = uciOf(move);
    if (move.color !== me) {
      if (decision === 1 && r1 === null) r1 = uci;
      continue;
    }
    // A first move the library has no branch for (a losing one, played on
    // from) leaves the second decision unjudged.
    const branch: Readonly<Record<string, readonly string[]>> | undefined = entry && m1 !== null ? entry.tree[m1] : undefined;
    const second: readonly string[] | undefined = r1 !== null ? branch?.[r1] : undefined;
    const draws = !entry ? null
      : decision === 0 ? entry.draws
        : decision === 1 ? second ?? null
          : null;
    if (decision === 0) m1 = uci;
    decision++;
    if (corner && move.piece === 'k' && move.to === corner) return { status: { state: 'pass', ply }, board };
    if (draws && draws.length > 0 && !game.forgiven.has(ply) && !draws.includes(uci)) {
      const show = draws[0];
      return { status: { state: 'miss', ply, reason: 'lost-the-corner-race', showMove: { from: show.slice(0, 2), to: show.slice(2, 4) } }, board };
    }
    if (board.isGameOver()) return { status: { state: 'incomplete', ply }, board };
  }
  return { status: { state: 'pending' }, board };
}

export function checkWrongRookPawn(game: MissionGame): MissionStatus {
  return walk(game).status;
}

/** The banner's read: how far the student's king is from the corner. Never names a move. */
export function wrongRookPawnProgress(game: MissionGame): string {
  if (game.sans.length === 0 && !game.startFen) return 'Get your king to the corner';
  const { board } = walk(game);
  const corner = wrongRookPawnCorner(board, game.studentColor);
  const king = kingOf(board, game.studentColor);
  if (!corner || !king) return 'Get your king to the corner';
  const n = steps(king, corner);
  return n === 0 ? 'In the corner' : `The corner: ${n} ${n === 1 ? 'step' : 'steps'} away`;
}

/** The move a second miss shows: the drawing move nearest the corner (the
 *  engine's first candidate among the drawing moves when they tie on that). */
export function wrongRookPawnShowMove(fenBefore: string, _studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  const draws = drawsAt(fenBefore);
  if (!draws || draws.length === 0) return null;
  const board = new Chess(fenBefore);
  const corner = wrongRookPawnCorner(board, board.turn());
  const near = corner ? Math.min(...draws.map((u) => steps(u.slice(2, 4), corner))) : null;
  const best = draws.filter((u) => !corner || steps(u.slice(2, 4), corner) === near);
  const pick = candidatesUci.find((u) => best.includes(u)) ?? best[0];
  return { from: pick.slice(0, 2), to: pick.slice(2, 4) };
}

/** The briefing (`scripts/scenarios/build-lane-r-briefings.mjs`, never
 *  typed): the demo is a library board two steps out — the corner-ward move,
 *  the coach's king racing for the corner, the student's king in the corner,
 *  every position a tablebase draw. The try is another library board; its
 *  answers are that board's drawing moves. */
export const WRONG_ROOK_PAWN_BRIEFING: MissionBriefing = {
  novel: true,
  idea: "Their bishop can't cover the corner square — get your king there and they can never win.",
  demoFen: LIBRARY.briefing.demoFen,
  demoSans: LIBRARY.briefing.demoSans,
  tryFen: LIBRARY.briefing.tryFen,
  tryAnswersUci: LIBRARY.briefing.tryAnswersUci,
};
