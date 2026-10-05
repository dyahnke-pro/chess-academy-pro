// thinkingLessonEvents — ONE leaf signal per answered "Learn how to think"
// question (CLAUDE.md: every algo-based build ships with an audit tool — emit
// the decision, and an audit asserts on the rows).
//
// Imports NOTHING (same shape as coachDecisionEvents): the lesson emits, a
// subscriber in appAuditor forwards. Rows are distributions, never prose: which
// step, which stage, how big the key was, how it was answered, where the board
// came from.

export interface ThinkingLessonRow {
  step: string;
  stage: 'show' | 'guide' | 'solo';
  /** 'game' = the student's own game, 'puzzle' = the CC0 pool. */
  origin: 'game' | 'puzzle';
  keySize: number;
  foundCount: number;
  wrongCount: number;
  /** 'held' = found everything unhelped; 'helped'; 'shown' (a Show beat, no
   *  question asked). */
  outcome: 'held' | 'broken' | 'helped' | 'shown';
  help: 'none' | 'nudge' | 'hint' | 'show' | 'dont-know';
  msToFirst: number | null;
  /** Follow-up links answered clean, in a row from the first (plan C1);
   *  0 for a Show beat or no chain. */
  chainDepth: number;
}

type Listener = (row: ThinkingLessonRow) => void;
const listeners = new Set<Listener>();

export function onThinkingLesson(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function emitThinkingLesson(row: ThinkingLessonRow): void {
  for (const cb of listeners) {
    try { cb(row); } catch { /* a subscriber never breaks the lesson */ }
  }
}

export function resetThinkingLessonListeners(): void {
  listeners.clear();
}
