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
import type { AskKind, AskMoment, AskReading } from './readQuestion';

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

/** Lanes that answer anything — when one of these is today's pick for a
 *  question the reader cannot place, it is a guess, not an answer. */
const CATCH_ALL = new Set<FastPathLane>(['none', 'best-move', 'position-assessment', 'concept', 'plan', 'tactics', 'positional']);

/** The question each kind is steered to when no lane of its own fires — a
 *  canonical phrasing the right lane already answers in code. */
const KIND_DEFAULT_ASK: Partial<Record<AskKind, string>> = {
  record: 'what are my weaknesses?',
  learning: 'what should I be thinking about?',
  app: 'what can you do?',
};

/** What the coach says back when it cannot place the question (never a guess). */
export const KIND_ASK_BACK: Record<AskKind, string> = {
  command: "I can't do that from the chat. I can teach or play an opening, review a game, or set up a drill — which would you like?",
  move: 'Which move do you mean? Name it, like "Nf3", or play it on the board.',
  board: 'Which position do you mean? Open it on the board and ask me again.',
  record: 'Do you mean your weaknesses, your openings, or your recent games?',
  opening: 'Which opening do you mean?',
  learning: 'What would you like to get better at — calculation, tactics, openings or endgames?',
  app: 'What would you like to do in the app?',
  smalltalk: 'I am not sure what you mean. Could you say it another way?',
  followup: 'Which move do you mean?',
  unclear: 'I am not sure what you mean. Could you say it another way?',
  knowledge: "I don't have an answer for that one yet. Ask me about a move, an opening or your games.",
  outside: 'I only know the games in this app and the openings it teaches, not other players\' records.',
};

export type Steer =
  | { action: 'keep' }
  | { action: 'rewrite'; ask: string }
  | { action: 'ask-back'; text: string };

/**
 * The table's decision for one turn. `todays` is the lane today's routing
 * would take, `firing` every lane that fires. Today's lane stands when the
 * kind allows it; a kind whose own lanes are silent is steered to its
 * canonical question; anything else is asked back — never answered off-topic.
 */
export function steerForKind(
  reading: AskReading,
  todays: FastPathLane,
  firing: readonly FastPathLane[],
  moment: AskMoment,
): Steer {
  const { kind } = reading;
  if (kind === 'smalltalk' || kind === 'followup') return { action: 'keep' };
  if (kind === 'unclear') {
    if (!CATCH_ALL.has(todays)) return { action: 'keep' };
    return { action: 'ask-back', text: reading.clarify ?? KIND_ASK_BACK.unclear };
  }
  const allowed = KIND_LANES[kind];
  if (allowed.has(todays)) return { action: 'keep' };
  if (firing.some((l) => allowed.has(l))) return { action: 'keep' };
  const fallback = KIND_DEFAULT_ASK[kind];
  if (fallback) return { action: 'rewrite', ask: fallback };
  if (kind === 'board' && !moment.hasBoard) return { action: 'ask-back', text: KIND_ASK_BACK.board };
  if (!CATCH_ALL.has(todays)) return { action: 'keep' };
  if (kind === 'board') return { action: 'keep' };
  return { action: 'ask-back', text: reading.clarify ?? KIND_ASK_BACK[kind] };
}

/**
 * Before dispatch: a record / learning / app question whose own lanes are all
 * silent is rewritten to that kind's canonical question, so it reaches the
 * lane that answers it instead of the board default. Every other kind is left
 * alone here — the real dispatch has paths the lane list cannot see.
 */
export function rewriteBeforeDispatch(reading: AskReading, firing: readonly FastPathLane[]): string | null {
  const fallback = KIND_DEFAULT_ASK[reading.kind];
  if (!fallback) return null;
  const allowed = KIND_LANES[reading.kind];
  return firing.some((l) => allowed.has(l)) ? null : fallback;
}

/**
 * At the catch-all: the dispatch found no lane and is about to read the board
 * or serve the stock line. That is right for a question about the board or a
 * move ON a board, and wrong for anything else — which is asked back instead.
 * Returns null to let the catch-all answer.
 */
export function fallThroughForKind(reading: Pick<AskReading, 'kind' | 'clarify'>, hasBoard: boolean): string | null {
  const { kind } = reading;
  if (kind === 'followup') return null;
  if ((kind === 'board' || kind === 'move') && hasBoard) return null;
  if (kind === 'smalltalk') return null;
  return reading.clarify ?? KIND_ASK_BACK[kind];
}
