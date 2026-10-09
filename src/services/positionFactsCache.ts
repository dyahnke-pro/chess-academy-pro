/**
 * THE COMPUTED FACTS, KEPT FOR THE QUESTION THAT FOLLOWS (David 2026-10-09:
 * "Isn't the shorter path to route it from computed facts to chat?").
 *
 * Every surface's narration already runs `computePositionFacts` on the board
 * in front of the student. Chat used to answer a board question from a few
 * hand-picked computers instead, so it could miss — or contradict — what the
 * narration had just computed. Now `computePositionFacts` stores its result
 * here, keyed by the position and the student's seat, and chat reads it: one
 * computation, the same facts in the voice and in the answer.
 *
 * A leaf: no Dexie, no engine. Bounded so a long game cannot grow it.
 */
import type { PositionFactsResult } from './positionFacts';
import type { SurfacePosture } from './coachDecider';

interface Entry { result: PositionFactsResult; posture: SurfacePosture; at: number }

const MAX = 24;
const cache = new Map<string, Entry>();

const key = (fen: string, student: 'w' | 'b'): string => `${fen.split(' ').slice(0, 4).join(' ')}|${student}`;

export function rememberPositionFacts(fen: string, student: 'w' | 'b', posture: SurfacePosture, result: PositionFactsResult): void {
  const k = key(fen, student);
  cache.delete(k);
  cache.set(k, { result, posture, at: Date.now() });
  while (cache.size > MAX) { const oldest = cache.keys().next().value; if (oldest === undefined) break; cache.delete(oldest); }
}

export function cachedPositionFacts(fen: string, student: 'w' | 'b'): { result: PositionFactsResult; posture: SurfacePosture } | null {
  const e = cache.get(key(fen, student));
  return e ? { result: e.result, posture: e.posture } : null;
}

/** Tests only. */
export function clearPositionFactsCache(): void { cache.clear(); }
