/**
 * Level 1 · Endgame · CHECKMATE WITH KING AND QUEEN — the board check
 * (WO-CAMPAIGN-MASTER Lane A). LIVE and PURE: chess.js and the legal SEE only,
 * no engine.
 *
 * The phase starts from a curated K+Q vs K board (scenario `kq-vs-k`,
 * `src/missions/scenarios/`); the runner hands it as `startFen` and the moves
 * count from it. Without one (the scenario never loaded) the check walks the
 * live game from the standard start and judges the same things. Judging only
 * the student's own moves, no ply before `startPly`:
 *   PASS   — the student's move checkmates.
 *   MISS a) `stalemate` — the student's move leaves the coach no legal move and
 *            no check. Shows the first engine candidate that neither
 *            stalemates nor loses the queen.
 *   MISS b) `lost-the-queen` — after the student's move the coach can take a
 *            student queen and net 5 or more (legal SEE): the queen goes for a
 *            minor piece or less. Against a lone king that is the queen for
 *            nothing — the king can only take a queen nothing guards.
 *   EXEMPT — a miss needs a choice: when every legal move at that decision
 *            stalemates or loses the queen, none is a miss. A ply the student
 *            chose to play on from (`forgiven`) is walked past. A queen traded
 *            for a queen or a rook is not lost.
 *   OVER   — the game drawn on the student's move any other way (threefold,
 *            fifty moves, bare kings) or a forgiven stalemate: `incomplete`.
 *            A queen taken on the coach's move ends the game there; the runner
 *            closes the card. Still pending 40 of the student's moves after the
 *            card went live, the runner closes it `incomplete`
 *            (`closesAfterMoves`).
 */
import { Chess, type Color, type Square } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import type { MissionBriefing, MissionGame, MissionStatus, ShownMove } from '../missionCard';

declare module '../missionCard' {
  interface MissionIdMap { 'kq-mate': true }
  interface MissReasonMap {
    /** The student's move left the coach no legal move and no check — a draw. */
    stalemate: true;
    /** The student's move let the coach take a queen for a minor piece or less. */
    'lost-the-queen': true;
  }
}

/** The student's moves the card stays live for before it closes `incomplete`. */
export const KQ_MATE_CLOSES_AFTER_MOVES = 40;
/** What the coach must net by taking a queen for it to count as lost. */
const QUEEN_LOSS = 5;

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;

function after(fen: string, uci: string): Chess | null {
  try {
    const b = new Chess(fen);
    b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return b;
  } catch { return null; }
}

/** Can the coach take one of the student's queens and net QUEEN_LOSS or more? */
function losesQueen(board: Chess, me: Color): boolean {
  const coach: Color = me === 'w' ? 'b' : 'w';
  const fen = board.fen();
  for (const row of board.board()) for (const cell of row) {
    if (cell && cell.color === me && cell.type === 'q' && legalSeeGainFor(fen, cell.square, coach) >= QUEEN_LOSS) return true;
  }
  return false;
}

/** The student's moves from `fenBefore` that neither stalemate nor lose the
 *  queen, mating moves first, then chess.js order. */
export function kqMateSafeMovesUci(fenBefore: string, me: Color): string[] {
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return []; }
  if (board.turn() !== me) return [];
  const mates: string[] = [];
  const rest: string[] = [];
  for (const m of board.moves({ verbose: true })) {
    const uci = uciOf(m);
    const b = after(fenBefore, uci);
    if (!b || b.isStalemate() || losesQueen(b, me)) continue;
    (b.isCheckmate() ? mates : rest).push(uci);
  }
  return [...mates, ...rest];
}

/** Every move that mates at once (the briefing's try answers). */
export function mateInOneUci(fen: string): string[] {
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  return board.moves({ verbose: true }).map(uciOf).filter((uci) => after(fen, uci)?.isCheckmate() === true);
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
    if (board.isCheckmate()) return { status: { state: 'pass', ply }, board };
    if (!game.forgiven.has(ply)) {
      const reason = board.isStalemate() ? 'stalemate' : losesQueen(board, me) ? 'lost-the-queen' : null;
      if (reason && kqMateSafeMovesUci(fenBefore, me).length > 0) return { status: { state: 'miss', ply, reason }, board };
    }
    if (board.isGameOver()) return { status: { state: 'incomplete', ply }, board };
  }
  return { status: { state: 'pending' }, board };
}

export function checkKqMate(game: MissionGame): MissionStatus {
  return walk(game).status;
}

/**
 * The coach king's BOX: the squares it could reach, walking only through
 * squares the student does not attack (its own square counts). Read with the
 * king lifted off the board, so a square behind it on a queen's line counts
 * as attacked — it cannot step back along the line.
 */
export function kingBox(board: Chess, me: Color): number | null {
  const coach: Color = me === 'w' ? 'b' : 'w';
  const king = board.board().flat().find((c) => c && c.type === 'k' && c.color === coach);
  if (!king) return null;
  const lifted = new Chess(board.fen());
  lifted.remove(king.square);
  const seen = new Set<string>([king.square]);
  const queue: string[] = [king.square];
  while (queue.length > 0) {
    const sq = queue.shift() as string;
    const f = sq.charCodeAt(0) - 97; const r = Number(sq[1]);
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
      const nf = f + df; const nr = r + dr;
      if ((!df && !dr) || nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
      const next = `${String.fromCharCode(97 + nf)}${nr}` as Square;
      if (seen.has(next)) continue;
      const piece = lifted.get(next);
      if ((piece && piece.color === coach) || lifted.isAttacked(next, me)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen.size;
}

/** The banner's read: how small the coach king's box is. Never names a move. */
export function kqMateProgress(game: MissionGame): string {
  if (game.sans.length === 0 && !game.startFen) return 'Checkmate with king and queen';
  const { board } = walk(game);
  const hasQueen = board.board().flat().some((c) => c && c.type === 'q' && c.color === game.studentColor);
  const box = kingBox(board, game.studentColor);
  if (!hasQueen || box === null) return 'Checkmate the king';
  return `Their king's box: ${box} ${box === 1 ? 'square' : 'squares'}`;
}

/**
 * The move shown after a second miss at one decision: the first engine
 * candidate that neither stalemates nor loses the queen; with no such read,
 * a mating move, else the first safe move in chess.js order.
 */
export function kqMateShowMove(fenBefore: string, studentColor: 'w' | 'b', candidatesUci: readonly string[]): ShownMove | null {
  const safe = kqMateSafeMovesUci(fenBefore, studentColor);
  const ok = new Set(safe);
  const pick = candidatesUci.find((u) => ok.has(u)) ?? (safe.length > 0 ? safe[0] : null);
  return pick ? { from: pick.slice(0, 2), to: pick.slice(2, 4) } : null;
}

/** The briefing's demo: king and queen on their home squares against a king
 *  in the centre, mate in 7 played perfectly — the queen settles a knight's
 *  move from the king (d7 against e5, e7 against g6), the king walks up, mate.
 *  Chosen from the exact K+Q vs K table and confirmed by Stockfish (mate 7) by
 *  `scripts/scenarios/build-kq-vs-k.mjs --demo`; chess.js-checked in the test. */
export const KQ_MATE_DEMO_FEN = '8/8/8/4k3/8/8/8/3QK3 w - - 0 1';
export const KQ_MATE_DEMO_SANS: readonly string[] = [
  'Qd7', 'Ke4', 'Ke2', 'Ke5', 'Ke3', 'Kf6', 'Kf4', 'Kg6', 'Qe7', 'Kh6', 'Kf5', 'Kh5', 'Qg5#',
];
/** The try: the box closed — queen a knight's move from the king, the student's
 *  king beside it. Three moves mate; a waiting king move (Kf6) stalemates. */
export const KQ_MATE_TRY_FEN = '7k/5K2/6Q1/8/8/8/8/8 w - - 0 1';

export const KQ_MATE_BRIEFING: MissionBriefing = {
  novel: true,
  idea: "Box the king with your queen a knight's move away, bring your king, then mate.",
  demoFen: KQ_MATE_DEMO_FEN,
  demoSans: KQ_MATE_DEMO_SANS,
  tryFen: KQ_MATE_TRY_FEN,
  // Computed, never typed: every move that mates there.
  tryAnswersUci: mateInOneUci(KQ_MATE_TRY_FEN),
};
