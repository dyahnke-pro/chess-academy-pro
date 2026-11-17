// queenChased — THE QUEEN THAT CAME OUT EARLY, CHASED (David 2026-11-17, the
// tie-everything build; Danya's speedruns: "You develop the knight to c3 with
// tempo, hitting the queen on d5 and gaining a free move" · "Ng5 hits the
// queen … a lead in development buys you that liberty").
//
// In the opening (the first twelve moves), a move that is not a capture hits
// the other side's queen off its home square with a real tempo — the kick
// test the record already uses (`principleAttribution.tempoTargets`: taking
// the hitter does not pay, and nothing bigger is left to grab instead), while
// that side has fewer than three knights and bishops out. Said with the time
// count, computed: how many moves that queen has made (`pieceTrips`, the one
// tracker of a piece's trips) against the pieces its side has developed
// (`developedMinorCount`). Both seats: your move that chases their queen, or
// their move that chases yours (the warning).
//
// A queen still on its home square is no early queen; a queen hit by a queen
// is a trade offer; a check or a capture is its own idea.
//
// PURE: chess.js, the one kick test and the one piece tracker.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { tempoTargets } from './principleAttribution';
import { pieceTrips } from './pieceMovedAgain';
import { developedMinorCount, isMinorAtHome, isOnHomeSquare } from './development';
import { PIECE_NAMES } from '../types/tacticTypes';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

/** Past this move the game is no longer the opening the rule is about. */
const OPENING_MOVES = 12;
/** With this many knights and bishops out, an early queen is no longer behind. */
const DEVELOPED_ENOUGH = 3;

export interface QueenChased {
  /** The side whose queen is chased. */
  queenSide: Color;
  /** Where the queen stands, hit. */
  queen: Square;
  /** The piece that hits it, where it landed. */
  hitter: { piece: Move['piece']; square: Square; from: Square };
  /** How many moves the queen has made so far. */
  queenMoves: number;
  /** The queen's side's knights and bishops off their first squares. */
  developed: number;
  /** The hitter left its first square (a knight or bishop) — a piece out with
   *  the hit — or is a pawn. */
  develops: boolean;
  key: string;
}

/**
 * The move `san` played after `history` (every move from the start position)
 * chases the other side's early queen with tempo — or null.
 */
export function queenChased(history: readonly string[], san: string): QueenChased | null {
  const trips = pieceTrips(history);
  if (!trips) return null;
  const { board, pieces } = trips;
  if (board.moveNumber() > OPENING_MOVES) return null;
  const before = new Chess(board.fen());
  let mv: Move;
  try { mv = board.move(san.replace(/[!?]+$/, '')); } catch { return null; }
  if (mv.captured || mv.piece === 'q' || mv.piece === 'k') return null;
  if (board.inCheck()) return null;
  const queenSide: Color = mv.color === 'w' ? 'b' : 'w';
  const queen = board.findPiece({ type: 'q', color: queenSide }).find((sq) => !isOnHomeSquare('q', queenSide, sq));
  if (!queen) return null;
  if (!board.attackers(queen, mv.color).includes(mv.to)) return null;
  // THE ONE KICK TEST: the queen is newly hit and has to answer it.
  if (!tempoTargets(before, mv, mv.color).includes(queen)) return null;
  const developed = developedMinorCount(board, queenSide);
  if (developed >= DEVELOPED_ENOUGH) return null;
  const queenMoves = pieces.get(queen)?.moves ?? 0;
  if (queenMoves < 1) return null;
  const develops = mv.piece === 'p' || isMinorAtHome(mv.piece, mv.color, mv.from);
  return {
    queenSide, queen, hitter: { piece: mv.piece, square: mv.to, from: mv.from }, queenMoves, developed, develops,
    key: `queen-chased:${queenSide}:${queenMoves}`,
  };
}

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times'];
const piecesOut = (n: number): string => `${COUNT[n] ?? String(n)} ${n === 1 ? 'piece' : 'pieces'}`;

/** The chase in words, from the student's seat: `queenOwn` is whose queen it
 *  is. Names the queen and the hitter, the queen's moves against the pieces
 *  out; never re-names the move just played. */
export function queenChasedLine(q: QueenChased, queenOwn: 'your' | 'their', fenAfter: string): string {
  const key = stemKeyOf(fenAfter);
  const hitterOwn = queenOwn === 'your' ? 'their' : 'your';
  const Q = openSentence(queenOwn);
  const H = openSentence(hitterOwn);
  const they = queenOwn === 'your' ? 'you' : 'they';
  const hitter = `${PIECE_NAMES[q.hitter.piece]} on ${q.hitter.square}`;
  const count = q.queenMoves === 1
    ? rotateStem([
      `${Q} queen came out early to ${q.queen}, and ${they} have ${piecesOut(q.developed)} developed.`,
      `${Q} queen is out on ${q.queen} already, with ${piecesOut(q.developed)} developed behind it.`,
    ], key)
    : rotateStem([
      `${Q} queen on ${q.queen} has moved ${TIMES[q.queenMoves] ?? `${q.queenMoves} times`}, and ${they} have ${piecesOut(q.developed)} out.`,
      `${openSentence(COUNT[q.queenMoves] ?? String(q.queenMoves))} moves for ${queenOwn} queen, now on ${q.queen}, and ${q.developed === 0 ? 'not one piece' : `only ${piecesOut(q.developed)}`} developed.`,
    ], key);
  const hit = rotateStem([
    `${H} ${hitter} hits it, so it has to move again.`,
    `${H} ${hitter} attacks it, and it must move again.`,
  ], key);
  // The time gained: the hitter is a piece out (or a pawn's step forward),
  // the queen's next move is not.
  const gain = !q.develops ? null
    : queenOwn === 'their'
      ? rotateStem([
        `You gain a move: your ${PIECE_NAMES[q.hitter.piece]} is in the game, and their queen only runs.`,
        `Every move the queen spends running is one you spend developing.`,
      ], key)
      : rotateStem([
        `They gain a move: their ${PIECE_NAMES[q.hitter.piece]} is in the game, and your queen only runs.`,
        `Every move your queen spends running is one they spend developing.`,
      ], key);
  return [count, hit, ...(gain ? [gain] : [])].join(' ');
}
