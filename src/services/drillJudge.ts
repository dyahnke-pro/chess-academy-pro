/**
 * THE DRILL'S JUDGE: a move off the answer key, judged by the ONE price.
 *
 * The key and the student's move are scored in one search from the board
 * before them (`priceAgainstKey`), so the verdict compares two numbers from
 * the same tree. It used to read the two boards after each move separately,
 * 0.9 s each, and two shallow reads of different boards disagree by more than
 * the drill's 50-centipawn band: the replay drill refused …Qh5 as worse than
 * …Rxc1, a centipawn apart at depth 14 (prod record 2026-10-23).
 *
 * A mate on the board has no centipawn price: then, and only then, the two
 * boards' reads judge — their mate scores carry it (the one exception
 * `mateSwingCostCp` names). The reply line after the student's move is read
 * only for a move the drill refuses: it is what the refusal says.
 */
import { stockfishEngine } from './stockfishEngine';
import { COACH_TURN_DEPTH, MATE_EVAL_THRESHOLD } from './engineConstants';
import { priceAgainstKey } from './playedMoveGrade';
import { uciOfSan, type MovePrice } from './moveCost';
import { judgeAlternative } from './drillReasons';
import { Chess } from 'chess.js';

type DrillVerdict = ReturnType<typeof judgeAlternative>;

interface DrillJudgement {
  verdict: DrillVerdict;
  /** White-POV scores of the student's move and the key. */
  evals: { wrong: number; best: number };
  /** The engine's line after the student's move (the reply first), for the refusal. */
  wrongPv?: string[];
}

export interface DrillJudgeReads {
  price: (fenBefore: string, playedUci: string, keyUci: string) => Promise<MovePrice | null>;
  read: (fen: string) => Promise<{ evaluation: number; pv?: string[] }>;
}

const READ_BUDGET_MS = 900;

const LIVE_READS: DrillJudgeReads = {
  price: (fenBefore, playedUci, keyUci) => priceAgainstKey(fenBefore, playedUci, keyUci, COACH_TURN_DEPTH),
  read: async (fen) => {
    const r = await stockfishEngine.analyzeWithBudget(fen, COACH_TURN_DEPTH, READ_BUDGET_MS);
    return { evaluation: r.evaluation, pv: r.topLines?.[0]?.moves };
  },
};

function after(fen: string, san: string): string | null {
  try { const c = new Chess(fen); return c.move(san) ? c.fen() : null; } catch { return null; }
}

/** Null when the engine could judge neither way (the caller's board read then
 *  speaks — never a guessed verdict). */
export async function judgeDrillMove(fenBefore: string, wrongSan: string, keySan: string, reads: DrillJudgeReads = LIVE_READS): Promise<DrillJudgement | null> {
  const wrongFen = after(fenBefore, wrongSan);
  const keyFen = after(fenBefore, keySan);
  const wrongUci = uciOfSan(fenBefore, wrongSan);
  const keyUci = uciOfSan(fenBefore, keySan);
  if (!wrongFen || !keyFen || !wrongUci || !keyUci) return null;
  const price = await reads.price(fenBefore, wrongUci, keyUci).catch(() => null);
  if (price?.scores) {
    const evals = { wrong: price.scores.playedWhiteCp, best: price.scores.bestWhiteCp };
    const verdict = judgeAlternative({ fenBefore, evalAfterWrong: evals.wrong, evalAfterBest: evals.best });
    if (verdict === 'accept') return { verdict, evals };
    const pv = await reads.read(wrongFen).then((r) => r.pv).catch(() => undefined);
    return { verdict, evals, ...(pv ? { wrongPv: pv } : {}) };
  }
  // No price: a mate either way, or no search. Only a mate is judged off the
  // two boards' reads; anything else is no verdict.
  let w: { evaluation: number; pv?: string[] };
  let b: { evaluation: number; pv?: string[] };
  try { [w, b] = await Promise.all([reads.read(wrongFen), reads.read(keyFen)]); } catch { return null; }
  if (Math.abs(w.evaluation) < MATE_EVAL_THRESHOLD && Math.abs(b.evaluation) < MATE_EVAL_THRESHOLD) return null;
  const evals = { wrong: w.evaluation, best: b.evaluation };
  return { verdict: judgeAlternative({ fenBefore, evalAfterWrong: evals.wrong, evalAfterBest: evals.best }), evals, ...(w.pv ? { wrongPv: w.pv } : {}) };
}
