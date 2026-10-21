/**
 * PATTERN · KNIGHT FORK — the side has a knight move that forks.
 *
 * The fork rule is the app's own (`tacticsDetector.findForks`), applied to the
 * knight's landing square — the same rule that TEACHES a fork is the one that
 * CATCHES a student walking past one. `findForks` is private and runs inside
 * the whole detector (~24 ms a board, too slow for every knight move of a
 * mined game), so the rule is restated here clause for clause and
 * `knight-fork.test.ts` holds it to `detectTactics` on real boards: if either
 * side drifts, that test fails.
 *
 * PRESENT for `side` when ALL hold:
 *   1. it is `side`'s move;
 *   2. some legal knight move lands on a square from which the knight (read as
 *      if it were its move again, so a pinned knight attacks nothing) can
 *      capture TWO or more enemy pieces worth a knight or more — the king
 *      counts;
 *   3. at least TWO of them are winnable — the king (a check forces the
 *      answer), a piece worth more than the knight (rook, queen), or a piece
 *      no enemy piece defends (the defender, to move, can save only one);
 *   4. the defender, to move, cannot win the knight (legal SEE nets 0).
 * NOT counted: forks of pawns; a "fork" of two defended minor pieces (it wins
 *   nothing); a knight that is simply taken.
 *
 * NEAR MISSES (one condition short):
 *   `knight-lost`     — a knight move with two winnable targets, but the
 *                       defender wins the knight;
 *   `wins-nothing`    — a safe knight move that attacks two or more pieces
 *                       worth a knight, fewer than two of them winnable;
 *   `not-their-move`  — the fork move exists, but it is the enemy's move.
 */
import type { Color, PieceSymbol, Square } from 'chess.js';
import { asIfToMove, capturesWinMaterial } from '../../services/positionReadingService';
import { codes, knightJumps, load, memo, other, pieces, turnedTo, VALUE, type PatternProbe } from './board';

interface ForkRead {
  targets: Array<{ square: Square; type: PieceSymbol }>;
  winnable: number;
  safe: boolean;
}

/** `findForks`' reading of the knight on `sq`, the board as it stands. */
export function readKnightFork(fenAfter: string, sq: Square, forker: Color): ForkRead | null {
  const after = load(fenAfter);
  if (!after) return null;
  const piece = after.get(sq);
  if (!piece || piece.type !== 'n' || piece.color !== forker) return null;
  const flipped = turnedTo(fenAfter, forker);
  if (!flipped) return null;
  const defender = other(forker);
  const targets: ForkRead['targets'] = [];
  for (const m of flipped.moves({ square: sq, verbose: true })) {
    const victim = after.get(m.to);
    if (victim && victim.color === defender && VALUE[victim.type] >= 3) targets.push({ square: m.to, type: victim.type });
  }
  const winnable = targets.filter((t) => t.type === 'k'
    || VALUE[t.type] > VALUE.n
    || after.attackers(t.square, defender).filter((d) => d !== t.square).length === 0).length;
  const safe = after.turn() === forker || !capturesWinMaterial(fenAfter, sq, defender);
  return { targets, winnable, safe };
}

const reads = memo<ForkRead[]>(64);

/** Every knight move of `side` (its move) that lands a jump from two or more
 *  enemy pieces worth a knight, with its fork read. The geometric gate runs on
 *  the board BEFORE the move: the move only empties the knight's own square
 *  and takes on the landing square, so the ENEMY pieces a jump from the
 *  landing square are the same before and after. */
function knightMoves(fen: string, side: Color): ForkRead[] {
  return reads(`${fen}|${side}`, () => {
    const board = load(fen);
    if (!board || board.turn() !== side) return [];
    const enemy = other(side);
    const out: ForkRead[] = [];
    for (const knight of pieces(board).filter((p) => p.color === side && p.type === 'n')) {
      for (const m of board.moves({ square: knight.square, verbose: true })) {
        const hits = knightJumps(m.to).filter((sq) => {
          const at = board.get(sq);
          return !!at && at.color === enemy && VALUE[at.type] >= 3;
        }).length;
        if (hits < 2) continue;
        board.move(m);
        const fenAfter = board.fen();
        board.undo();
        const read = readKnightFork(fenAfter, m.to, side);
        if (read) out.push(read);
      }
    }
    return out;
  });
}

const isFork = (r: ForkRead): boolean => r.targets.length >= 2 && r.winnable >= 2 && r.safe;

function present(fen: string, side: Color): boolean {
  return knightMoves(fen, side).some(isFork);
}

function nearMisses(fen: string, side: Color): readonly string[] {
  if (fen.split(' ')[1] !== side) {
    const asIf = asIfToMove(fen, side);
    return asIf && present(asIf, side) ? ['not-their-move'] : [];
  }
  const all = knightMoves(fen, side);
  if (all.some(isFork)) return [];
  const out: string[] = [];
  for (const r of all) {
    if (r.targets.length < 2) continue;
    if (r.winnable >= 2 && !r.safe) out.push('knight-lost');
    if (r.winnable < 2 && r.safe) out.push('wins-nothing');
  }
  return codes(out);
}

export const KNIGHT_FORK: PatternProbe = {
  id: 'knight-fork',
  present,
  nearMisses,
  nearMissCodes: ['knight-lost', 'not-their-move', 'wins-nothing'],
  failTwins: [
    '4q2k/2r1r1pn/4P2p/p1p2R2/P2pQ2P/1P1B1R2/6P1/6K1 b - - 8 37',
    'r4k2/2Rn1p2/p2r2p1/3p4/1P3P1p/3B1K2/P3R1PP/8 b - - 1 28',
    '2r1r3/5pk1/6bp/8/Np1qnRP1/1P1n2P1/3Q2BP/1N1R3K w - - 5 34',
    '8/6p1/4k3/2Rbp3/1B1p2P1/5PK1/1n6/8 w - - 16 54',
    'rnbqk2r/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R b KQkq - 4 5',
    'r1b2k2/r4ppp/p4n2/2NpR3/1P6/3B1P2/P5PP/R5K1 b - - 2 21',
  ],
};
