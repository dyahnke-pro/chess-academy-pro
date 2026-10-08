/**
 * THE ANSWER TABLE (answers rebuild, step 3 — SHADOW ONLY).
 *
 * The reader says what KIND of question this is; the table says which lanes
 * may answer that kind. Today's routing still picks the lane, but a lane
 * outside the kind's set is a wrong-topic answer by construction ("the best
 * move is e4" to "what are my weaknesses?"), so it is refused: the first
 * allowed lane that fires answers instead, and with none the coach asks back.
 *
 * `Record<AskKind, …>`: a new kind fails to compile until it names its lanes.
 */
import type { FastPathLane } from '../chatTurn';
import type { AskKind } from './readQuestion';

export const KIND_LANES: Record<AskKind, ReadonlySet<FastPathLane>> = {
  command: new Set(['command', 'stop', 'training-request', 'settings', 'hint']),
  move: new Set([
    'retrospective-move', 'move-rating', 'why-best-move', 'opponent-move', 'last-move',
    'compare-moves', 'candidate-move', 'alternatives', 'piece-options', 'last-game-mistake',
    'master-play',
  ]),
  board: new Set([
    'best-move', 'plan', 'tactics', 'positional', 'position-assessment', 'hint', 'mate',
    'draw', 'whose-turn', 'live-colour', 'endgame', 'candidate-move', 'piece-options',
    'opponent-move', 'why-best-move', 'alternatives', 'opening-traps',
  ]),
  record: new Set([
    'record-vs', 'strengths', 'stats', 'opening-accuracy', 'review-due', 'weakness-lifecycle',
    'weakness-briefing', 'mistakes', 'errors-by-situation', 'misconceptions', 'tactics-profile',
    'phase-profile', 'repertoire-gap', 'accuracy', 'consistency', 'time-trouble', 'last-game',
    'converting', 'color', 'records', 'puzzle-stats', 'transfer-gap', 'skill-radar', 'trend',
    'progress', 'opening-profile', 'endgame-weakness', 'last-game-mistake', 'training-request',
  ]),
  opening: new Set([
    'counter-repertoire', 'theory', 'opening-traps', 'opening-identity', 'opening-existence',
    'name-opening', 'concept', 'master-play', 'plan',
  ]),
  learning: new Set(['method', 'teaching-method', 'training-request', 'concept', 'weakness-briefing']),
  app: new Set(['app-help', 'settings', 'teaching-method']),
  smalltalk: new Set(['conversational-reply', 'none']),
  followup: new Set(['conversational-reply', 'why-best-move', 'alternatives', 'none']),
  unclear: new Set(['none']),
  knowledge: new Set(['concept', 'theory', 'name-opening']),
  outside: new Set(['player-games', 'none']),
};

export type TableVerdict =
  | { lane: FastPathLane; via: 'kept' | 'allowed-fallback' }
  | { lane: null; via: 'ask-back' };

/** Keep today's lane if the kind allows it; else the first allowed lane that fires. */
export function laneForKind(kind: AskKind, todays: FastPathLane, firing: readonly FastPathLane[]): TableVerdict {
  const allowed = KIND_LANES[kind];
  if (allowed.has(todays)) return { lane: todays, via: 'kept' };
  const next = firing.find((l) => allowed.has(l));
  if (next) return { lane: next, via: 'allowed-fallback' };
  return { lane: null, via: 'ask-back' };
}
