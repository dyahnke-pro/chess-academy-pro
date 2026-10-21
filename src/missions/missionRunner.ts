/**
 * THE MISSION RUNNER — one state machine plays any card (WO-MISSIONS-01/02,
 * WO-CAMPAIGN-MASTER Phase 0).
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
 * counts toward graduating the habit. A card whose `rewinds` dial is `none`
 * misses silently: no pause, no word, outcome `missed`.
 *
 * ONE CARD PER PHASE, ONE LIVE AT A TIME. A game starts with the phase cards
 * (`phaseCards`) and the graduated cards running as SILENT WATCHERS. When a
 * phase's card resolves (pass, miss-shown, missed or incomplete) the next
 * phase begins on the very next ply: its card goes live, shows its briefing,
 * loads its scenario when it has one, and announces itself. A phase with no
 * card of its own is WATCHED in silence and hands on when its watchers are
 * done. `phase-boundary` lets the board end a phase early. A card that plants
 * a free piece counts the coach's moves: it is armed on the coach's 2nd–8th
 * move of the card, and with no plant by the 8th the card closes `incomplete`.
 *
 * Watchers never speak and never pause: each writes ONE row per game
 * (`watcher: true`) — held (`pass-first-try`), `missed` or `incomplete`.
 *
 * A takeback past a later card's start does not bring the earlier card back:
 * that one is already resolved and recorded. A game that ends with a card
 * unresolved closes it `incomplete`; the phases after it never start; the
 * recap carries every phase's result.
 */
import type {
  CoachDials,
  MissReason,
  MissionCard,
  MissionContext,
  MissionGame,
  MissionId,
  MissionOutcome,
  MissionPhase,
  PlantScan,
  ScenarioId,
  ShownMove,
} from './missionCard';
import { Chess } from 'chess.js';
import { PLANT_WINDOW } from './plantFreePiece';

export const PHASES: readonly MissionPhase[] = ['opening', 'middlegame', 'endgame'];
const PHASE_INDEX: Record<MissionPhase, number> = { opening: 0, middlegame: 1, endgame: 2 };

export type RunnerPhase =
  | 'idle'
  /** A card is live: its check runs on every student move. */
  | 'live'
  /** A miss waits for "Try again" / "Play on". */
  | 'paused'
  /** The current phase has no card of its own; its watchers run silently. */
  | 'watching'
  /** Every phase is done (or the game ended). */
  | 'resolved';

export type PhaseCards = Record<MissionPhase, MissionCard | null>;

export interface RunnerState {
  /** The current phase's card — or, once everything is done, the last one. */
  card: MissionCard | null;
  phase: RunnerPhase;
  /** A Campaign game is under way (from `start` until `stop`). */
  started: boolean;
  /** The game has ended (the recap was sent). */
  over: boolean;
  /** The game's phase now. */
  currentPhase: MissionPhase;
  phaseCards: PhaseCards;
  /** Graduated cards running silently this game. */
  watchers: readonly MissionCard[];
  /** Watchers that have written their row this game. */
  watchersDone: ReadonlySet<MissionId>;
  /** The ply each phase began on this game. */
  phaseStart: Partial<Record<MissionPhase, number>>;
  /** How each phase's card ended this game (the recap). */
  results: Partial<Record<MissionPhase, MissionOutcome>>;
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
  /** The ply this card went live. */
  startPly: number;
  /** A scenario phase's curated position (plies count from it). */
  startFen: string | null;
  context: MissionContext;
  /** Why no free piece was planted yet, summed over the coach's turns. */
  plantReasons: PlantScan;
}

const NO_CARDS: PhaseCards = { opening: null, middlegame: null, endgame: null };

export const IDLE: RunnerState = {
  card: null, phase: 'idle', started: false, over: false, currentPhase: 'opening', phaseCards: NO_CARDS,
  watchers: [], watchersDone: new Set(), phaseStart: {}, results: {},
  forgiven: new Set(), missesAt: new Map(), clean: true,
  outcome: null, resolvedAtPly: null, pause: null, progress: '',
  startPly: 0, startFen: null, context: {}, plantReasons: {},
};

export type RunnerEvent =
  /** A game begins: at most one card per phase, plus the silent watchers. */
  /** `owned`: the game is the Campaign's even with nothing to teach or watch
   *  (a boss game) — it stays silent rather than falling to the classic voice. */
  | { kind: 'start'; cards: readonly MissionCard[]; watchers?: readonly MissionCard[]; owned?: boolean }
  | { kind: 'stop' }
  /** The student moved: `game` includes the move. `fenBefore` is the board
   *  they moved from and `candidatesUci` the engine's read of it, best first
   *  (for the move a second miss shows). */
  | { kind: 'moved'; game: Pick<MissionGame, 'sans' | 'studentColor'>; fenBefore: string; candidatesUci: readonly string[] }
  /** The coach's reply landed at `ply`; `planted` is the square of the free
   *  piece it planted, and `scan` why it found none, when it looked. */
  | { kind: 'coach-moved'; ply: number; planted?: string; scan?: PlantScan }
  /** The board entered `phase`; `ply` is that phase's first ply. */
  | { kind: 'phase-boundary'; phase: MissionPhase; ply: number }
  /** A scenario's curated position is on the board; plies count from it. */
  | { kind: 'scenario-loaded'; fen: string }
  | { kind: 'try-again' }
  | { kind: 'play-on' }
  /** Moves were taken back to `plies` long. */
  | { kind: 'rewind'; plies: number }
  /** The game ended (mate, a draw, a resignation). */
  | { kind: 'game-over' };

export type RunnerEffect =
  | { kind: 'say'; line: 'announce' | 'miss' | 'pass'; text: string }
  | { kind: 'celebrate'; firstTry: boolean }
  | { kind: 'record'; card: MissionCard; outcome: MissionOutcome; missPly?: number; reason?: MissReason; plantFound?: boolean; scenario?: boolean; watcher?: boolean }
  /** The plant window closed with no free piece: why, turn by turn. */
  | { kind: 'plant-none'; card: MissionCard; reasons: PlantScan }
  /** A card with a briefing is about to go live: the UI may show it first. */
  | { kind: 'briefing'; card: MissionCard }
  /** A scenario card is about to go live: put its curated position on the
   *  board, then answer with `scenario-loaded`. The coach does not reply to
   *  the move that ended the last phase. */
  | { kind: 'load-position'; scenarioId: ScenarioId; card: MissionCard }
  /** The game ended: every phase's result, for the recap screen. */
  | { kind: 'recap'; results: Partial<Record<MissionPhase, MissionOutcome>> }
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

/** Is this card's miss rewound? (`mission-only` waits on David's definition
 *  and rewinds like `every-miss` until then.) */
function rewinds(card: MissionCard): boolean {
  return card.coachDials.rewinds !== 'none';
}

/** The coach's move number within the card for the coach ply `ply` (1-based).
 *  The first coach ply of a card is `startPly` or `startPly + 1`. */
function coachMoveOfCard(state: RunnerState, ply: number): number {
  return Math.floor((ply - state.startPly) / 2) + 1;
}

/** The student's move number at which a pending card closes, for a card
 *  that went live at `startPly`. */
export function closingMove(card: MissionCard, startPly: number): number {
  return card.closesAfterMoves !== undefined
    ? Math.floor(startPly / 2) + 1 + card.closesAfterMoves
    : card.closesAtMove;
}

function nextPhase(phase: MissionPhase): MissionPhase | null {
  const i = PHASE_INDEX[phase] + 1;
  return i < PHASES.length ? PHASES[i] : null;
}

function watchersOf(state: RunnerState, phase: MissionPhase): MissionCard[] {
  return state.watchers.filter((w) => w.phase === phase);
}

/** Nothing left to start or watch at or after `phase`. */
function nothingFrom(state: RunnerState, phase: MissionPhase): boolean {
  return PHASES.slice(PHASE_INDEX[phase]).every((p) =>
    !state.phaseCards[p] && watchersOf(state, p).every((w) => state.watchersDone.has(w.id)));
}

/**
 * The game moves into `phase` at `ply`: its card goes live (briefing, then its
 * scenario, then the announce) — or, with no card, the phase is watched — or,
 * with nothing at all from here on, the runner rests on its last card.
 */
function enterPhase(state: RunnerState, phase: MissionPhase, ply: number): Step {
  const phaseStart = { ...state.phaseStart, [phase]: state.phaseStart[phase] ?? ply };
  const card = state.phaseCards[phase];
  const base = { ...state, currentPhase: phase, phaseStart };
  if (card) {
    const effects: RunnerEffect[] = [];
    if (card.briefing) effects.push({ kind: 'briefing', card });
    if (card.scenario) effects.push({ kind: 'load-position', scenarioId: card.scenario.providerId, card });
    effects.push({ kind: 'say', line: 'announce', text: card.announce });
    return {
      state: {
        ...base, card, phase: 'live', forgiven: new Set(), missesAt: new Map(), clean: true,
        outcome: null, resolvedAtPly: null, pause: null, startPly: ply, startFen: null,
        context: {}, plantReasons: {},
        progress: card.progress({ sans: [], studentColor: 'w', forgiven: new Set(), startPly: ply }),
      },
      effects,
    };
  }
  if (nothingFrom(base, phase)) return { state: { ...base, phase: 'resolved' }, effects: [] };
  // A phase with neither a card nor a watcher is passed straight through.
  const next = nextPhase(phase);
  if (watchersOf(base, phase).length === 0 && next) return enterPhase(base, next, ply);
  return { state: { ...base, phase: 'watching' }, effects: [] };
}

function recordOf(state: RunnerState, card: MissionCard, outcome: MissionOutcome, extra: { missPly?: number; reason?: MissReason } = {}): RunnerEffect {
  return {
    kind: 'record', card, outcome, ...extra,
    ...(plantsFreePiece(card) ? { plantFound: !!state.context.planted } : {}),
    ...(card.scenario ? { scenario: state.startFen !== null } : {}),
  };
}

/** The current card resolved at `ply`: the next phase begins on the next ply.
 *  `tail` (the reply) runs last — unless the next card loads a new board. */
/** Is the game over on the board the moves made? A card resolved by the
 *  game's last move hands on to nothing: no next card — above all no
 *  scenario — over a finished game (gate 1: a mate that passed the free-piece
 *  card started the K+Q board on top of it). */
function gameEnded(startFen: string | null, sans: readonly string[]): boolean {
  try {
    const board = startFen ? new Chess(startFen) : new Chess();
    for (const san of sans) board.move(san);
    return board.isGameOver();
  } catch {
    return false;
  }
}

function settle(state: RunnerState, outcome: MissionOutcome, ply: number, progress: string, effects: RunnerEffect[], tail: RunnerEffect[], handOn: boolean): Step {
  const done: RunnerState = {
    ...state, outcome, resolvedAtPly: ply, pause: null, progress,
    results: state.card ? { ...state.results, [state.card.phase]: outcome } : state.results,
  };
  const next = nextPhase(state.currentPhase);
  if (!next || !handOn) return { state: { ...done, phase: 'resolved' }, effects: [...effects, ...tail] };
  const entered = enterPhase(done, next, ply + 1);
  if (!entered.state.card || entered.state.card === state.card) {
    // Nothing new went live: rest on the resolved card (the banner keeps it).
    return { state: { ...entered.state, card: state.card, outcome, resolvedAtPly: ply }, effects: [...effects, ...tail] };
  }
  const replaced = entered.effects.some((e) => e.kind === 'load-position');
  return { state: entered.state, effects: [...effects, ...entered.effects, ...(replaced ? [] : tail)] };
}

/** Each unfinished watcher whose phase has begun reads the game, silently;
 *  one row each, once per game. */
function stepWatchers(state: RunnerState, game: Pick<MissionGame, 'sans' | 'studentColor'>): { state: RunnerState; effects: RunnerEffect[] } {
  const effects: RunnerEffect[] = [];
  let done = state.watchersDone;
  const ply = game.sans.length - 1;
  for (const w of state.watchers) {
    if (done.has(w.id)) continue;
    const start = state.phaseStart[w.phase];
    if (start === undefined || ply < start) continue;
    const status = w.check({ ...game, forgiven: new Set(), startPly: start, ...(state.startFen ? { startFen: state.startFen } : {}), context: {} });
    const closes = status.state === 'pending' && Math.floor(ply / 2) + 1 >= closingMove(w, start);
    if (status.state === 'pending' && !closes) continue;
    const outcome: MissionOutcome = status.state === 'pass' ? 'pass-first-try' : status.state === 'miss' ? 'missed' : 'incomplete';
    effects.push({ kind: 'record', card: w, outcome, watcher: true, ...(status.state === 'miss' ? { missPly: status.ply, reason: status.reason } : {}) });
    done = new Set(done).add(w.id);
  }
  return { state: done === state.watchersDone ? state : { ...state, watchersDone: done }, effects };
}

/** Close every unfinished watcher (`incomplete`, silently). */
function closeWatchers(state: RunnerState, phases?: ReadonlySet<MissionPhase>): { state: RunnerState; effects: RunnerEffect[] } {
  const open = state.watchers.filter((w) => !state.watchersDone.has(w.id) && (!phases || phases.has(w.phase)));
  if (open.length === 0) return { state, effects: [] };
  const done = new Set(state.watchersDone);
  for (const w of open) done.add(w.id);
  return {
    state: { ...state, watchersDone: done },
    effects: open.map((w) => ({ kind: 'record' as const, card: w, outcome: 'incomplete' as const, watcher: true })),
  };
}

export function stepMission(state: RunnerState, event: RunnerEvent): Step {
  switch (event.kind) {
    case 'start': {
      const phaseCards: PhaseCards = { ...NO_CARDS };
      for (const c of event.cards) if (!phaseCards[c.phase]) phaseCards[c.phase] = c;
      const watchers = (event.watchers ?? []).filter((w) => phaseCards[w.phase]?.id !== w.id);
      if (event.cards.length === 0 && watchers.length === 0 && !event.owned) return { state: IDLE, effects: [] };
      const begun: RunnerState = { ...IDLE, started: true, phaseCards, watchers };
      return enterPhase(begun, 'opening', 0);
    }
    case 'stop':
      return { state: IDLE, effects: [] };
    case 'rewind': {
      if (!state.started) return { state, effects: [] };
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
    case 'scenario-loaded': {
      if (!state.started) return { state, effects: [] };
      // The earlier phases' moves are gone from the board: their watchers end.
      const earlier = new Set(PHASES.filter((p) => PHASE_INDEX[p] < PHASE_INDEX[state.currentPhase]));
      const closed = closeWatchers(state, earlier);
      return {
        state: { ...closed.state, startFen: event.fen, startPly: 0, phaseStart: { ...closed.state.phaseStart, [state.currentPhase]: 0 } },
        effects: closed.effects,
      };
    }
    case 'phase-boundary': {
      if (!state.started || state.over || PHASE_INDEX[event.phase] <= PHASE_INDEX[state.currentPhase]) return { state, effects: [] };
      // Everything before the new phase ends here: its watchers, and a card
      // still live (incomplete). Cards of skipped phases never start.
      const closed = closeWatchers(state, new Set(PHASES.filter((p) => PHASE_INDEX[p] < PHASE_INDEX[event.phase])));
      let s = closed.state;
      const effects: RunnerEffect[] = [...closed.effects];
      const card = s.card;
      if (card && (s.phase === 'live' || s.phase === 'paused')) {
        effects.push(recordOf(s, card, 'incomplete'));
        s = { ...s, outcome: 'incomplete', resolvedAtPly: event.ply - 1, pause: null, results: { ...s.results, [card.phase]: 'incomplete' } };
      }
      const entered = enterPhase(s, event.phase, event.ply);
      return { state: entered.state, effects: [...effects, ...entered.effects] };
    }
    case 'game-over': {
      if (!state.started || state.over) return { state, effects: [] };
      const closed = closeWatchers(state);
      let s = closed.state;
      const effects: RunnerEffect[] = [...closed.effects];
      const card = s.card;
      if (card && (s.phase === 'live' || s.phase === 'paused')) {
        effects.push(recordOf(s, card, 'incomplete'));
        s = { ...s, outcome: 'incomplete', pause: null, results: { ...s.results, [card.phase]: 'incomplete' } };
      }
      return { state: { ...s, phase: 'resolved', over: true }, effects: [...effects, { kind: 'recap', results: s.results }] };
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
        [{ kind: 'plant-none', card, reasons: plantReasons }, recordOf(closed, card, 'incomplete')], [], true);
    }
    case 'moved': {
      if (state.phase === 'paused') return { state, effects: [{ kind: 'hold' }] };
      if (!state.started || state.phase === 'idle') return { state, effects: [{ kind: 'reply' }] };
      const watched = stepWatchers(state, event.game);
      const card = watched.state.card;
      const ply = event.game.sans.length - 1;
      const handOn = !gameEnded(state.startFen, event.game.sans);
      if (watched.state.phase === 'watching') {
        // A phase with no card hands on once its watchers are done.
        const phaseWatchers = watchersOf(watched.state, watched.state.currentPhase);
        if (phaseWatchers.every((w) => watched.state.watchersDone.has(w.id))) {
          const next = nextPhase(watched.state.currentPhase);
          if (next && handOn) {
            const entered = enterPhase(watched.state, next, ply + 1);
            const replaced = entered.effects.some((e) => e.kind === 'load-position');
            return {
              state: entered.state.card ? entered.state : { ...entered.state, card: watched.state.card },
              effects: [...watched.effects, ...entered.effects, ...(replaced ? [] : [{ kind: 'reply' as const }])],
            };
          }
          return { state: { ...watched.state, phase: 'resolved' }, effects: [...watched.effects, { kind: 'reply' }] };
        }
        return { state: watched.state, effects: [...watched.effects, { kind: 'reply' }] };
      }
      if (!card || watched.state.phase !== 'live') return { state: watched.state, effects: [...watched.effects, { kind: 'reply' }] };
      const s = watched.state;
      const game: MissionGame = {
        ...event.game, forgiven: s.forgiven, startPly: s.startPly, context: s.context,
        ...(s.startFen ? { startFen: s.startFen } : {}),
      };
      const status = card.check(game);
      const progress = card.progress(game);
      const lead = watched.effects;
      if (status.state === 'pass') {
        const outcome: MissionOutcome = s.clean ? 'pass-first-try' : 'pass-retry';
        return settle(s, outcome, ply, progress, [
          ...lead,
          { kind: 'celebrate', firstTry: s.clean },
          { kind: 'say', line: 'pass', text: card.passLine },
          recordOf(s, card, outcome),
        ], [{ kind: 'reply' }], handOn);
      }
      if (status.state === 'miss') {
        if (!rewinds(card)) {
          // No rewind on this card: the miss is recorded, silently, and play goes on.
          const missed = { ...s, clean: false };
          return settle(missed, 'missed', ply, progress, [
            ...lead, recordOf(missed, card, 'missed', { missPly: status.ply, reason: status.reason }),
          ], [{ kind: 'reply' }], handOn);
        }
        const misses = new Map(s.missesAt).set(status.ply, at(s.missesAt, status.ply) + 1);
        const phrase = missPhraseOf(card, status.reason);
        if (at(misses, status.ply) >= 2) {
          const show = status.showMove ?? card.showMove(event.fenBefore, game.studentColor, event.candidatesUci);
          const missed = { ...s, missesAt: misses, clean: false };
          return settle(missed, 'miss-shown', ply, progress, [
            ...lead,
            { kind: 'say', line: 'miss', text: phrase },
            ...(show ? [{ kind: 'show' as const, move: show }] : []),
            recordOf(missed, card, 'miss-shown', { missPly: status.ply, reason: status.reason }),
          ], [{ kind: 'reply' }], handOn);
        }
        return {
          state: { ...s, missesAt: misses, clean: false, phase: 'paused', pause: { ply: status.ply, reason: status.reason }, progress },
          effects: [...lead, { kind: 'say', line: 'miss', text: phrase }, { kind: 'hold' }],
        };
      }
      // Over on the board, or pending at the card's closing move: incomplete, silently.
      const moveNumber = Math.floor(ply / 2) + 1;
      if (status.state === 'incomplete' || moveNumber >= closingMove(card, s.startPly)) {
        return settle(s, 'incomplete', ply, progress, [...lead, recordOf(s, card, 'incomplete')], [{ kind: 'reply' }], handOn);
      }
      return { state: { ...s, progress }, effects: [...lead, { kind: 'reply' }] };
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
  return state.started;
}

/** The dials the coach plays under right now — the live card's, or none. */
export function missionDials(state: RunnerState): CoachDials | null {
  return state.card && (state.phase === 'live' || state.phase === 'paused') ? state.card.coachDials : null;
}

/** The card being played now (live or paused on its rewind), or none. */
export function liveCard(state: RunnerState): MissionCard | null {
  return state.phase === 'live' || state.phase === 'paused' ? state.card : null;
}

/** Does the runner read the student's moves now? (A live card, a paused
 *  rewind, or a phase watched in silence.) */
export function runnerReadsMoves(state: RunnerState): boolean {
  return state.phase === 'live' || state.phase === 'paused' || state.phase === 'watching';
}

/** May the coach plant the free piece with its move at `ply`? Only on the
 *  coach's 2nd–8th move of a live card that plants, and only once. */
export function plantArmed(state: RunnerState, ply: number): boolean {
  if (!state.card || state.phase !== 'live' || !plantsFreePiece(state.card) || state.context.planted || ply < state.startPly) return false;
  const n = coachMoveOfCard(state, ply);
  return n >= PLANT_WINDOW.first && n <= PLANT_WINDOW.last;
}
