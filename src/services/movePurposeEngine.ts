// The engine-reading half of `movePurpose` — for a surface that holds no reads
// (the chat's "why did they play that?"). Kept out of `movePurpose.ts` so the
// pure computers that import it never pull in the engine.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { nullMoveFen, type MoveIntent } from './moveIntent';
import { intentWithFallback } from './movePurpose';
import { stockfishEngine } from './stockfishEngine';

const DEPTH = 14;
const BUDGET_MS = 900;

/** The purpose of `san`, reading every position it needs. Null on any engine
 *  failure — a surface that asked gets the rest of its answer. */
export async function movePurpose(fenBefore: string, san: string, seat: 'student' | 'opponent'): Promise<MoveIntent | null> {
  let fenAfter: string;
  try { const c = new Chess(fenBefore); if (!c.move(san)) return null; fenAfter = c.fen(); } catch { return null; }
  const read = async (fen: string | null): Promise<AnalysisLine[]> => {
    if (!fen) return [];
    try { return (await stockfishEngine.analyzeWithBudget(fen, DEPTH, BUDGET_MS)).topLines ?? []; } catch { return []; }
  };
  const before = await read(fenBefore);
  const after = await read(fenAfter);
  if (!before.length || !after.length) return null;
  const passBefore = await read(nullMoveFen(fenBefore));
  const passAfter = await read(nullMoveFen(fenAfter));
  return intentWithFallback(fenBefore, san, { before, after, passBefore, passAfter }, seat);
}
