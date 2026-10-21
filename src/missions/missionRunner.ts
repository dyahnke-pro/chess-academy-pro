/**
 * THE MISSION RUNNER — one state machine plays any card (WO-MISSIONS-01).
 *
 * Pure: an event in, the next state and the EFFECTS out. The hook
 * (`useMissionRunner`) applies the effects — speak, celebrate, record, undo,
 * show a move, let the coach reply — so every transition is testable without
 * a board, a voice or a database.
 *
 * The coach speaks to do three things and nothing else:
 *   1. announce the mission once, at the start of its phase;
 *   2. rewind a miss with the card's FIXED phrase — paused BEFORE the coach
 *      replies, so "Try again" undoes the student's move only;
 *   3. celebrate a pass.
 * A second miss at the same decision shows the move and plays on. A mission
 * still pending at the card's closing move ends `incomplete`, silently.
 * Only a pass with no miss on the way is `pass-first-try` — the only kind that
 * counts toward graduating the habit.
 */
import type { CoachDials, MissReason, MissionCard, MissionGame, MissionOutcome, ShownMove } from './missionCard';

export type RunnerPhase = 'idle' | 'live' | 'paused' | 'resolved';

export interface RunnerState {
  card: MissionCard | null;
  phase: RunnerPhase;
  /** Plies the student chose to play on from — the check walks past them. */
  forgiven: ReadonlySet<number>;
  /** Misses at each decision (the student move's ply). */
  missesAt: ReadonlyMap<number, number>;
  /** No miss so far this game. */
  clean: boolean;
  outcome: MissionOutcome | null;
  /** The student move the mission resolved on. */
  resolvedAtPly: number | null;
  /** The miss waiting for "Try again" / "Play on". */
  pause: { ply: number; reason: MissReason } | null;
  /** The banner's read of the student's progress. */
  progress: string;
}

export const IDLE: RunnerState = {
  card: null, phase: 'idle', forgiven: new Set(), missesAt: new Map(), clean: true,
  outcome: null, resolvedAtPly: null, pause: null, progress: '',
};

export type RunnerEvent =
  | { kind: 'start'; card: MissionCard }
  | { kind: 'stop' }
  /** The student moved: `game` includes the move. `fenBefore` is the board
   *  they moved from and `candidatesUci` the engine's read of it, best first
   *  (for the move a second miss shows). */
  | { kind: 'moved'; game: Omit<MissionGame, 'forgiven'>; fenBefore: string; candidatesUci: readonly string[] }
  | { kind: 'try-again' }
  | { kind: 'play-on' }
  /** Moves were taken back to `plies` long. */
  | { kind: 'rewind'; plies: number };

export type RunnerEffect =
  | { kind: 'say'; line: 'announce' | 'miss' | 'pass'; text: string }
  | { kind: 'celebrate'; firstTry: boolean }
  | { kind: 'record'; outcome: MissionOutcome; missPly?: number; reason?: MissReason }
  | { kind: 'undo' }
  | { kind: 'show'; move: ShownMove }
  /** The coach may reply to the student's move now. */
  | { kind: 'reply' }
  /** The coach waits: the student answers the rewind first. */
  | { kind: 'hold' };

export interface Step { state: RunnerState; effects: RunnerEffect[] }

const at = (m: ReadonlyMap<number, number>, ply: number): number => m.get(ply) ?? 0;

export function stepMission(state: RunnerState, event: RunnerEvent): Step {
  switch (event.kind) {
    case 'start': {
      const card = event.card;
      const progress = card.progress({ sans: [], studentColor: 'w', forgiven: new Set() });
      return {
        state: { ...IDLE, card, phase: 'live', progress },
        effects: [{ kind: 'say', line: 'announce', text: card.announce }],
      };
    }
    case 'stop':
      return { state: IDLE, effects: [] };
    case 'rewind': {
      if (!state.card) return { state, effects: [] };
      const forgiven = new Set([...state.forgiven].filter((p) => p < event.plies));
      const unpause = state.pause && state.pause.ply >= event.plies;
      return { state: { ...state, forgiven, ...(unpause ? { phase: 'live' as const, pause: null } : {}) }, effects: [] };
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
    case 'moved': {
      const card = state.card;
      // A move while the rewind is unanswered waits with it (the board is
      // locked then; this is the backstop, never the lock).
      if (card && state.phase === 'paused') return { state, effects: [{ kind: 'hold' }] };
      if (!card || state.phase !== 'live') return { state, effects: [{ kind: 'reply' }] };
      const game: MissionGame = { ...event.game, forgiven: state.forgiven };
      const ply = game.sans.length - 1;
      const status = card.check(game);
      const progress = card.progress(game);
      if (status.state === 'pass') {
        const outcome: MissionOutcome = state.clean ? 'pass-first-try' : 'pass-retry';
        return {
          state: { ...state, phase: 'resolved', outcome, resolvedAtPly: ply, progress },
          effects: [
            { kind: 'celebrate', firstTry: state.clean },
            { kind: 'say', line: 'pass', text: card.passLine },
            { kind: 'record', outcome },
            { kind: 'reply' },
          ],
        };
      }
      if (status.state === 'miss') {
        const misses = new Map(state.missesAt).set(status.ply, at(state.missesAt, status.ply) + 1);
        if (at(misses, status.ply) >= 2) {
          const show = card.showMove(event.fenBefore, game.studentColor, event.candidatesUci);
          return {
            state: { ...state, missesAt: misses, clean: false, phase: 'resolved', outcome: 'miss-shown', resolvedAtPly: ply, progress },
            effects: [
              { kind: 'say', line: 'miss', text: card.missPhrase },
              ...(show ? [{ kind: 'show' as const, move: show }] : []),
              { kind: 'record', outcome: 'miss-shown', missPly: status.ply, reason: status.reason },
              { kind: 'reply' },
            ],
          };
        }
        return {
          state: { ...state, missesAt: misses, clean: false, phase: 'paused', pause: { ply: status.ply, reason: status.reason }, progress },
          effects: [{ kind: 'say', line: 'miss', text: card.missPhrase }, { kind: 'hold' }],
        };
      }
      // Pending: the phase closes at the card's move, silently.
      const moveNumber = Math.floor(ply / 2) + 1;
      if (moveNumber >= card.closesAtMove) {
        return {
          state: { ...state, phase: 'resolved', outcome: 'incomplete', resolvedAtPly: ply, progress },
          effects: [{ kind: 'record', outcome: 'incomplete' }, { kind: 'reply' }],
        };
      }
      return { state: { ...state, progress }, effects: [{ kind: 'reply' }] };
    }
  }
}

/** Is this student move's turn silent? While a mission is live or paused,
 *  every producer waits; the move that resolves it speaks only the mission's
 *  own line. After that the old voice resumes. */
export function missionSilentTurn(state: RunnerState, studentPly: number): boolean {
  if (!state.card) return false;
  if (state.phase === 'live' || state.phase === 'paused') return true;
  return state.phase === 'resolved' && state.resolvedAtPly === studentPly;
}

/** The dials the coach plays under right now — the live card's, or none. */
export function missionDials(state: RunnerState): CoachDials | null {
  return state.card && (state.phase === 'live' || state.phase === 'paused') ? state.card.coachDials : null;
}
