// THE POSITIONS EACH MOTIF READER WAS PROVEN ON (WO-MOTIFS-01 M3/M4) — one
// list, read by the classifier's tests (each must be named as stated) AND by
// the record-rev gate (`recordRevs.gate.test.ts` fingerprints their names), so
// a reader change that renames them cannot ship without its rev moving.
//
// Why a list and not only the first puzzles of each theme: the gate's theme
// sample reads the first three Lichess puzzles per theme, and the first three
// discovered-check puzzles are all mates — the discovered-check reader could be
// deleted with the gate still green. Add a reader's proving position HERE,
// never only inline in its test, and the gate widens with it.
import type { TacticType } from '../types';

export interface MotifReaderCase {
  /** The Lichess puzzle id (CC0), or a description when hand-built. */
  id: string;
  /** The solver's position (after the puzzle's set-up move). */
  fen: string;
  /** The solution line from `fen`, UCI, starting with the move to classify. */
  line: string[];
  named: TacticType;
  why: string;
}

export const MOTIF_READER_CASES: readonly MotifReaderCase[] = [
  {
    id: 'pawn run (0Pipw-shaped)', fen: '8/8/7P/8/8/8/k7/2K5 w - - 0 1', line: ['h6h7', 'a2a3', 'h7h8q'], named: 'promotion',
    why: 'a pawn the first move pushes queens later in the line',
  },
  {
    id: '0JsjX', fen: 'rnb2rk1/1pp2ppp/p2p4/8/3q4/3B4/PPP2PPP/R2Q1RK1 w - - 0 12', line: ['d3h7', 'g8h7', 'd1d4'], named: 'discovered_attack',
    why: 'Bxh7+ unmasks the queen on d1; the payoff is a plain capture two moves later',
  },
  {
    id: '0C6oG', fen: 'r5k1/1bp2pp1/1p3qnp/pP6/Q3P3/P1PP1B1P/5PP1/R3K2R b KQ - 1 20', line: ['f6c3', 'e1f1', 'c3a1'], named: 'fork',
    why: '…Qxc3+ forks the king and the a1 rook; the later skewer does not rename it',
  },
  {
    id: '06DeN', fen: '6k1/R4pp1/3pq2p/6r1/1P6/P3P2Q/3R1PP1/6K1 b - - 0 32', line: ['e6h3', 'a7a8', 'g8h7'], named: 'pin',
    why: '…Qxh3 — g2 cannot take back, the g5 rook pins it',
  },
  {
    id: '07z5g', fen: '8/8/8/r3kPR1/1p6/3K4/8/8 w - - 0 56', line: ['f5f6', 'e5f6', 'g5a5'], named: 'discovered_check',
    why: 'f6+ unmasks the g5 rook on the king; Kxf6 Rxa5',
  },
  {
    id: '0PkCr', fen: 'r4r2/6bk/pqP3pp/1pp1p3/P3Pp2/1QN2P2/1P4PP/2R2RK1 b - - 0 23', line: ['c5c4', 'g1h1', 'c4b3'], named: 'discovered_check',
    why: '…c4+ unmasks the b6 queen on g1 and hits the b3 queen; Kh1 cxb3',
  },
  {
    id: '0B7rf', fen: '2k5/pppn2p1/6n1/8/5p2/3PrPqN/PPP2QBR/4R1K1 b - - 1 21', line: ['e3e1', 'f2e1', 'g3e1'], named: 'x_ray',
    why: '…Rxe1+ Qxe1 Qxe1+ — the g3 queen took through where the f2 queen stood',
  },
  {
    id: '05adP', fen: '4r1k1/5bp1/p4pBp/1p1p3P/8/4R3/PPP3P1/1K6 w - - 1 35', line: ['e3e8', 'f7e8', 'g6e8'], named: 'x_ray',
    why: 'Rxe8+ Bxe8 Bxe8 — the g6 bishop took through where the f7 bishop stood',
  },
  {
    id: '0J33L', fen: 'r7/2k3pp/2pq4/p1Q5/1r1n1P2/6P1/P6P/3RR2K w - - 1 32', line: ['e1e7', 'd6e7', 'c5e7'], named: 'x_ray',
    why: 'Rxe7+ Qxe7 Qxe7+ — the c5 queen took through where the d6 queen stood',
  },
];
