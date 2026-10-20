// A test engine's `searchmoves` answer, built from the same per-position reads
// the test already mocks: the best move scores the read before, the played move
// scores the read after it. So a harness written for "before minus after" keeps
// its cost while the code under test prices the move in ONE search
// (#2 root cause 4, 2026-10-20). White-POV evaluations, as the engine returns.
import { Chess } from 'chess.js';

interface Read { evaluation: number; isMate?: boolean; mateIn?: number | null }

export async function oneSearchFromReads(
  fen: string,
  searchmoves: string,
  read: (fen: string) => Promise<Read> | Read,
): Promise<{ evaluation: number; bestMove: string; isMate: boolean; mateIn: null; depth: number; topLines: Array<{ rank: number; moves: string[]; evaluation: number; mate: number | null }> }> {
  const [best, played] = searchmoves.split(' ');
  const before = await read(fen);
  let afterEval = before.evaluation;
  try {
    const c = new Chess(fen);
    c.move({ from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4] });
    afterEval = (await read(c.fen())).evaluation;
  } catch { /* an illegal move scores as the read before */ }
  return {
    evaluation: before.evaluation, bestMove: best, isMate: false, mateIn: null, depth: 99,
    topLines: [
      { rank: 1, moves: [best], evaluation: before.evaluation, mate: null },
      { rank: 2, moves: [played], evaluation: afterEval, mate: null },
    ],
  };
}
