/**
 * THE MISSION RUNNER — one state machine plays any card (WO-MISSIONS-01/02).
 *
 * Pure: an event in, the next state and the EFFECTS out. The hook
 * (`useMissionRunner`) applies the effects — speak, celebrate, record, undo,
 * show a move, let the coach reply — so every transition is testable without
 * a board, a voice or a database.
 *
 * The coach speaks to do three things and nothing else:
 *   1. announce the mission once, at the start of its phase;
 *   2. rewind a miss with the card's FIXED phrase for that reason — paused
 *      BEFORE the coach replies, so "Try again" undoes the student's move only;
 *   3. celebrate a pass.
 * A second miss at the same decision shows the move and plays on. A mission
 * still pending at the card's closing move ends `incomplete`, silently.
 * Only a pass with no miss on the way is `pass-first-try` — the only kind that
 * counts toward graduating the habit.
 *
 * ONE LIVE CARD AT A TIME. A game starts with one card per phase queued; when
 * a card resolves (pass, miss-shown or incomplete) the next goes live on the
 * very next ply and announces itself. A card that plants a free piece counts
 * the coach's moves: it is armed on the coach's 2nd–8th move of the card, and
 * with no plant by the 8th the card closes `incomplete`.
 *
 * A takeback past a later card's start does not bring the earlier card back:
 * that one is already resolved and recorded. A game that ends with a card
 * unresolved closes it `incomplete`; the cards after it never start.
 */
import type {
  CoachDials,
  MissReason,
  MissionCard,
  MissionContext,
  MissionGame,
  MissionOutcome,
  PlantScan,
  ShownMove,
} from './missionCard';
import { PLANT_WINDOW } from './plantFreePiece';

export type RunnerPhase = 'idle' | 'live' | 'paused' | 'resolved';

export interface RunnerState {
  card: MissionCard | null;
  phase: RunnerPhase;
  /** Plies the student chose to play on from — the check walks past them. */
  forgiven: ReadonlySet<number>;
  /** Misses at each decision (the student move's ply). */
  missesAt: ReadonlyMap<number, number>;
  /** No miss so far on this card. */
  clean: boolean;
  outcome: MissionOutcome | null;
  /** The ply the card resolved on. */
  resolvedAtPly: number | null;
  /** The miss waiting for "Try again" / "Play on". */
  pause: { ply: number; reason: MissReason } | null;
  /** The banner's read of the student's progress. */
  progress: string;
  /** The cards for the phases after this one, in order. */
  queue: readonly MissionCard[];
  /** The ply this card went live. */
  startPly: number;
  context: MissionContext;
  /** Why no free piece was planted yet, summed over the coach's turns. */
  plantReasons: PlantScan;
}

export const IDLE: RunnerState = {
  card: null, phase: 'idle', forgiven: new Set(), missesAt: new Map(), clean: true,
  outcome: null, resolvedAtPly: null, pause: null, progress: '',
  queue: [], startPly: 0, context: {}, plantReasons: {},
};

export type RunnerEvent =
  /** A game begins: one card per phase, in order. */
  | { kind: 'start'; cards: readonly MissionCard[] }
  | { kind: 'stop' }
  /** The student moved: `game` includes the move. `fenBefore` is the board
   *  they moved from and `candidatesUci` the engine's read of it, best first
   *  (for the move a second miss shows). */
  | { kind: 'moved'; game: Pick<MissionGame, 'sans' | 'studentColor'>; fenBefore: string; candidatesUci: readonly string[] }
  /** The coach's reply landed at `ply`; `planted` is the square of the free
   *  piece it planted, and `scan` why it found none, when it looked. */
  | { kind: 'coach-moved'; ply: number; planted?: string; scan?: PlantScan }
  | { kind: 'try-again' }
  | { kind: 'play-on' }
  /** Moves were taken back to `plies` long. */
  | { kind: 'rewind'; plies: number }
  /** The game ended (mate, a draw, a resignation) with a card unresolved. */
  | { kind: 'game-over' };

export type RunnerEffect =
  | { kind: 'say'; line: 'announce' | 'miss' | 'pass'; text: string }
  | { kind: 'celebrate'; firstTry: boolean }
  | { kind: 'record'; card: MissionCard; outcome: MissionOutcome; missPly?: number; reason?: MissReason; plantFound?: boolean }
  /** The plant window closed with no free piece: why, turn by turn. */
  | { kind: 'plant-none'; card: MissionCard; reasons: PlantScan }
  | { kind: 'undo' }
  | { kind: 'show'; move: ShownMove }
  /** The coach may reply to the student's move now. */
  | { kind: 'reply' }
  /** The coach waits: the student answers the rewind first. */
  | { kind: 'hold' };

export interface Step { state: RunnerState; effects: RunnerEffect[] }

const at = (m: ReadonlyMap<number, number>, ply: number): number => m.get(ply) ?? 0;

/** The card's fixed phrase for this miss. */
export function missPhraseOf(card: MissionCard, reason: MissReason): string {
  return card.missPhraseFor?.[reason] ?? card.missPhrase;
}

function plantsFreePiece(card: MissionCard): boolean {
  return card.coachDials.plantFreePiece === 'on';
}

/** The coach's move number within the card for the coach ply `ply` (1-based).
 *  The first coach ply of a card is `startPly` or `startPly + 1`. */
function coachMoveOfCard(state: RunnerState, ply: number): number {
  return Math.floor((ply - state.startPly) / 2) + 1;
}

function live(card: MissionCard, queue: readonly MissionCard[], startPly: number): RunnerState {
  return {
    ...IDLE, card, phase: 'live', queue, startPly,
    progress: card.progress({ sans: [], studentColor: 'w', forgiven: new Set(), startPly }),
  };
}

function recordOf(state: RunnerState, card: MissionCard, outcome: MissionOutcome, extra: { missPly?: number; reason?: MissReason } = {}): RunnerEffect {
  return {
    kind: 'record', card, outcome, ...extra,
    ...(plantsFreePiece(card) ? { plantFound: !!state.context.planted } : {}),
  };
}

/** The card resolved at `ply`: the next queued card goes live on the next ply
 *  and announces itself; `tail` (the reply) runs last. */
function settle(state: RunnerState, outcome: MissionOutcome, ply: number, progress: string, effects: RunnerEffect[], tail: RunnerEffect[]): Step {
  if (state.queue.length === 0) {
    return { state: { ...state, phase: 'resolved', outcome, resolvedAtPly: ply, pause: null, progress }, effects: [...effects, ...tail] };
  }
  const [next, ...rest] = state.queue;
  return {
    state: live(next, rest, ply + 1),
    effects: [...effects, { kind: 'say', line: 'announce', text: next.announce }, ...tail],
  };
}

export function stepMission(state: RunnerState, event: RunnerEvent): Step {
  switch (event.kind) {
    case 'start': {
      if (event.cards.length === 0) return { state: IDLE, effects: [] };
      const [first, ...rest] = event.cards;
      return { state: live(first, rest, 0), effects: [{ kind: 'say', line: 'announce', text: first.announce }] };
    }
    case 'stop':
      return { state: IDLE, effects: [] };
    case 'rewind': {
      if (!state.card) return { state, effects: [] };
      const forgiven = new Set([...state.forgiven].filter((p) => p < event.plies));
      const unpause = state.pause && state.pause.ply >= event.plies;
      const planted = state.context.planted;
      const context = planted && planted.ply >= event.plies ? {} : state.context;
      return { state: { ...state, forgiven, context, ...(unpause ? { phase: 'live' as const, pause: null } : {}) }, effects: [] };
    }
    case 'try-again': {
      if (state.phase !== 'paused' || !state.pause) return { state, effects: [] };
      return { state: { ...state, phase: 'live', pause: null }, effects: [{ kind: 'undo' }] };
    }
    case 'play-on': {
      if (state.phase !== 'paused' || !state.pause) return { state, effects: [] };
      const forgiven = new Set(state.forgiven).add(state.pause.ply);
      return { state: { ...state, phase: 'live', pause: null, forgiven }, effects: [{ kind: 'reply' }] };
    }
    case 'game-over': {
      // The live card closes `incomplete`, silently; no later card starts —
      // a phase the game never reached has no result to write.
      const card = state.card;
      if (!card || (state.phase !== 'live' && state.phase !== 'paused')) return { state, effects: [] };
      const over = { ...state, queue: [] };
      return settle(over, 'incomplete', state.startPly, state.progress, [recordOf(over, card, 'incomplete')], []);
    }
    case 'coach-moved': {
      const card = state.card;
      if (!card || state.phase !== 'live' || !plantsFreePiece(card) || state.context.planted || event.ply < state.startPly) {
        return { state, effects: [] };
      }
      const plantReasons: PlantScan = { ...state.plantReasons };
      for (const [r, n] of Object.entries(event.scan ?? {}) as [keyof PlantScan, number][]) plantReasons[r] = (plantReasons[r] ?? 0) + n;
      if (event.planted) {
        return { state: { ...state, plantReasons, context: { planted: { ply: event.ply, square: event.planted } } }, effects: [] };
      }
      if (coachMoveOfCard(state, event.ply) < PLANT_WINDOW.last) return { state: { ...state, plantReasons }, effects: [] };
      // The window closed empty: the card is over, silently.
      const closed = { ...state, plantReasons };
      return settle(closed, 'incomplete', event.ply, state.progress,
        [{ kind: 'plant-none', card, reasons: plantReasons }, recordOf(closed, card, 'incomplete')], []);
    }
    case 'moved': {
      const card = state.card;
      // A move while the rewind is unanswered waits with it (the board is
      // locked then; this is the backstop, never the lock).
      if (card && state.phase === 'paused') return { state, effects: [{ kind: 'hold' }] };
      if (!card || state.phase !== 'live') return { state, effects: [{ kind: 'reply' }] };
      const game: MissionGame = { ...event.game, forgiven: state.forgiven, startPly: state.startPly, context: state.context };
      const ply = game.sans.length - 1;
      const status = card.check(game);
      const progress = card.progress(game);
      if (status.state === 'pass') {
        const outcome: MissionOutcome = state.clean ? 'pass-first-try' : 'pass-retry';
        return settle(state, outcome, ply, progress, [
          { kind: 'celebrate', firstTry: state.clean },
          { kind: 'say', line: 'pass', text: card.passLine },
          recordOf(state, card, outcome),
        ], [{ kind: 'reply' }]);
      }
      if (status.state === 'miss') {
        const misses = new Map(state.missesAt).set(status.ply, at(state.missesAt, status.ply) + 1);
        const phrase = missPhraseOf(card, status.reason);
        if (at(misses, status.ply) >= 2) {
          const show = status.showMove ?? card.showMove(event.fenBefore, game.studentColor, event.candidatesUci);
          const missed = { ...state, missesAt: misses, clean: false };
          return settle(missed, 'miss-shown', ply, progress, [
            { kind: 'say', line: 'miss', text: phrase },
            ...(show ? [{ kind: 'show' as const, move: show }] : []),
            recordOf(missed, card, 'miss-shown', { missPly: status.ply, reason: status.reason }),
          ], [{ kind: 'reply' }]);
        }
        return {
          state: { ...state, missesAt: misses, clean: false, phase: 'paused', pause: { ply: status.ply, reason: status.reason }, progress },
          effects: [{ kind: 'say', line: 'miss', text: phrase }, { kind: 'hold' }],
        };
      }
      // Over on the board, or pending at the card's closing move: incomplete, silently.
      const moveNumber = Math.floor(ply / 2) + 1;
      if (status.state === 'incomplete' || moveNumber >= card.closesAtMove) {
        return settle(state, 'incomplete', ply, progress, [recordOf(state, card, 'incomplete')], [{ kind: 'reply' }]);
      }
      return { state: { ...state, progress }, effects: [{ kind: 'reply' }] };
    }
  }
}

/** Does a mission own this game's voice? In The Campaign it owns EVERY turn,
 *  before and after each phase's mission resolves: only the missions' own
 *  lines speak (David 2026-10-21: the classic Learn voice is set aside, not
 *  deleted — it still runs on /coach/teach). A game the mission was stopped
 *  for (a walkthrough, a drill, a named opening the student asked for) speaks
 *  as before. */
export function missionOwnsGame(state: RunnerState): boolean {
  return state.card !== null;
}

/** The dials the coach plays under right now — the live card's, or none. */
export function missionDials(state: RunnerState): CoachDials | null {
  return state.card && (state.phase === 'live' || state.phase === 'paused') ? state.card.coachDials : null;
}

/** May the coach plant the free piece with its move at `ply`? Only on the
 *  coach's 2nd–8th move of a live card that plants, and only once. */
export function plantArmed(state: RunnerState, ply: number): boolean {
  if (!state.card || state.phase !== 'live' || !plantsFreePiece(state.card) || state.context.planted || ply < state.startPly) return false;
  const n = coachMoveOfCard(state, ply);
  return n >= PLANT_WINDOW.first && n <= PLANT_WINDOW.last;
}
