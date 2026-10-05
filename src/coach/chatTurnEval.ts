// chatTurnEval — the OFFLINE half of ONE-CHAT's switch (FINAL §5: "switched on
// measured accuracy, ≥95% on real questions + held-out phrasings").
//
// The shadow (`chatTurnEvents`) measures agreement on REAL questions as people
// ask them. This measures the reader on HELD-OUT phrasings — wordings no
// routing test or detector was written against: typos, other languages,
// indirect asks. Both halves must clear the bar before the runtime flag
// (`setServeParsedRoute`) is turned on; the eval never turns it on itself.
//
// PURE: cases in, a score out. The live run (`chatTurnEval.live.test.ts`) is
// opt-in and is the only thing that calls a model.
import type { ChatKind } from './chatTurn';

/** The one accuracy bar for serving the parsed route (ONE-CHAT FINAL §5). */
export const CHAT_TURN_SERVE_BAR = 0.95;

export interface ChatTurnEvalCase {
  text: string;
  /** Every kind that is a RIGHT reading (an ask can honestly be two kinds:
   *  "what should I play?" is `what-should-i-play` or `best-move`). */
  expect: readonly ChatKind[];
  /** What the case probes — reported with its miss so a failure reads. */
  probe: 'plain' | 'typo' | 'indirect' | 'language' | 'follow-up' | 'referent';
}

export interface ChatTurnEvalResult {
  case: ChatTurnEvalCase;
  /** The reader's kind; null when it failed or timed out. */
  kind: ChatKind | null;
}

export interface ChatTurnEvalScore {
  total: number;
  correct: number;
  accuracy: number;
  /** Clears `CHAT_TURN_SERVE_BAR`. */
  passes: boolean;
  /** Per probe class, so "fine in English, lost in Spanish" is visible. */
  byProbe: Record<ChatTurnEvalCase['probe'], { total: number; correct: number }>;
  /** Every wrong reading, in input order. A failed read counts as wrong. */
  misses: Array<{ text: string; expected: readonly ChatKind[]; got: ChatKind | null; probe: ChatTurnEvalCase['probe'] }>;
}

export function scoreChatTurnEval(results: readonly ChatTurnEvalResult[]): ChatTurnEvalScore {
  const byProbe: ChatTurnEvalScore['byProbe'] = {
    plain: { total: 0, correct: 0 }, typo: { total: 0, correct: 0 }, indirect: { total: 0, correct: 0 },
    language: { total: 0, correct: 0 }, 'follow-up': { total: 0, correct: 0 }, referent: { total: 0, correct: 0 },
  };
  const misses: ChatTurnEvalScore['misses'] = [];
  let correct = 0;
  for (const r of results) {
    const ok = r.kind !== null && r.case.expect.includes(r.kind);
    byProbe[r.case.probe].total += 1;
    if (ok) {
      correct += 1;
      byProbe[r.case.probe].correct += 1;
    } else {
      misses.push({ text: r.case.text, expected: r.case.expect, got: r.kind, probe: r.case.probe });
    }
  }
  const total = results.length;
  const accuracy = total === 0 ? 0 : correct / total;
  return { total, correct, accuracy, passes: total > 0 && accuracy >= CHAT_TURN_SERVE_BAR, byProbe, misses };
}
