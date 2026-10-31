/**
 * gameStory — ONE per-game story state (WO-STORY-MATRIX-01 P1-8, design
 * docs/plans/2026-10-30-story-matrix-phase1.md §3.8). Pure: no Dexie, no React.
 *
 * Commit 8a moves the SAY-ONCE family in: one claim map and one sentence-key
 * map, each storing the ply a key was first said. What it replaced, on Learn:
 * `standingFactMemory`, the page's `positionalSaidRef`, `fundamentalSeenRef`,
 * `threatSaidRef` and `drilledSaidRef`, learnMemory's `spokenKeys`,
 * `conceptTaught`, `principleTaught`, `spokenThreatLines`, `lastThreatKey`,
 * `loudAlarms`, `spokenTacticLines`, `saidExplainers` and `pieceQualitySaid`,
 * and usePhaseNarration's own ledger — fourteen memories, two "the board went
 * backwards" detectors, two reset doors, and no rewind at all (a takeback
 * either kept everything said after the board it returned to, or, across a
 * full-move boundary, forgot the whole game).
 *
 * Commit 8b moves the PLANS in: the threads (each side's plans, keyed by their
 * goal — the plan-aim key) and the state the plan computers step. What it
 * replaced: Learn's `learnMemory.planThread`, the page's `planArcRef` and
 * `planToldBoardsRef`; Review's `planT`, `passerPlanFiles`, `convertTaughtPly`
 * and `lastRaceVerdict`; and the positional read's `plan:<id>#<n>` keys, which
 * kept the structure's plan as a count hidden in the say-once set. Three
 * stores, three identity vocabularies and three hold rules for one plan
 * (plans map "Overlaps" 1–8), none of them rewound by a takeback and none of
 * them carried into a rebuilt review.
 *
 * THE RULES, each made by the shape rather than a convention:
 *  - WRITES HAPPEN AT THE DOOR. A computer that produces a line OFFERS its
 *    say-once keys (and its thread) on the turn's board (`offer`); the rest of
 *    that turn reads them as said, so two producers never offer one idea, but
 *    the GAME remembers them only when the door keeps the line (`commitKept`).
 *    Marked at compute time, a line the door held was "said" and never came
 *    back (prod Learn 2026-10-16: 19 of 21 behaviours held, every idea lost).
 *  - REWIND TAKES BACK WHAT THE UNDONE PLIES SAID: every entry said after the
 *    board a takeback returns to is forgotten, and the plan computers' state
 *    goes back to its checkpoint at that board.
 *  - `newGame` IS THE ONE RESET. The surface's game memory calls it from every
 *    path that starts a game.
 *  - ONE CHECKPOINT (`serialize` / `restore`): a rebuilt review starts the
 *    plies ahead from what the walk had said, plans included.
 *
 * Commit 8c moves the EVENTS in: what happened in the game and what the coach
 * said about it as a whole — the phase boundaries crossed, the opening read,
 * queued and named, its identity said, the position's character switching,
 * the verdict word, the ideas promised and paid off, the student's slips, the
 * model game cited and (Review) the game's turning point. What it replaced: on
 * Learn the page's `phaseStateRef` (never reset in a mount — a second game
 * crossed into the middlegame in silence), `characterRef` and
 * `openingBreakRef`, and learnMemory's `identitySaid`, `spokenOpeningName`,
 * `queuedOpeningName`, `detectedOpeningName`, `promises` and `slipsThisGame`;
 * in Review `spokenOpening`, `announcedOpeningNames` / `Families`,
 * `lastAnnouncedOpeningName`, `storyShown`, `endgameAnnounced`,
 * `lastVerdictWord` and the slip tally — none of them rewound by a takeback,
 * and Review's never carried into a rebuilt or explored line. A cause chain
 * said is a claim in the one claim map (`causalChainKey`), the same key on
 * both surfaces.
 */
import { positionOf } from '../utils/samePosition';
import type { PlanThread } from './planThread';
import type { ArcState } from './planArc';
import type { CoachFact, FactSeat } from './coachFact';
import type { Character, CharacterState } from './positionCharacter';
import type { Thesis } from './teachingSelector';

/** A PLAN'S THREAD: whose plan it is and what it is aimed at — the plan-aim
 *  key (`nextPlans.planAimKey`: `plan-aim:passer:a`, `plan-aim:outpost:d5`,
 *  `plan-aim:file:c`, `plan-aim:king-attack`; the plan arc's aims are the same
 *  ids), or one of the goals in `PLAN_GOAL`. One plan, one key, on every
 *  surface: the plan thread's statement, the arc's announcement and the
 *  structure's trump join on it. */
export type ThreadKey = `${FactSeat}|plan-aim:${string}`;

export function threadKey(seat: FactSeat, aim: string): ThreadKey {
  return `${seat}|plan-aim:${aim.replace(/^plan-aim:/, '')}`;
}

/** The goals with no square to key on: the structure's own plan (one at a
 *  time — which one is its `variant`), converting extra material, and a pawn
 *  race (its verdict is the `variant`). */
export const PLAN_GOAL = {
  structure: 'plan-aim:structure',
  convert: 'plan-aim:convert',
  race: 'plan-aim:race',
} as const;

/** One line of a thread the door kept. */
export interface ThreadSaid {
  readonly ply: number;
  /** `stated`: the line said the plan ("the plan from here is…", "your
   *  passed pawn on c5 wants to run"); `step`: a fact on it (a move that made
   *  the passer, a step toward the outpost). */
  readonly kind: 'stated' | 'step';
  /** Which plan of the goal it said, when the goal holds more than one (the
   *  structure's plan id, the race's verdict). */
  readonly variant: string | null;
  /** The board it was said on, when it was said BEFORE the student moved
   *  from it (placement and side to move): a move from that board was
   *  prompted for the plan (P4 honesty: being told is not proving). */
  readonly board: string | null;
}

/** A thread's story so far: every line of it the door kept, in order. */
export interface ThreadState {
  readonly said: readonly ThreadSaid[];
}

/** THE PLAN COMPUTERS' OWN STATE, as the step functions keep it — they stay
 *  calculators (`planThreadTurn`, `stepArc`, `stepCharacter`); the story only
 *  holds what they carry from move to move, checkpointed by ply so a takeback
 *  restores it. */
export interface PlanDesk {
  /** The student's structural plan across the game (`planThread`). */
  readonly thread: PlanThread;
  /** Each side's plan followed across the game (`planArc`): the student's
   *  and the opponent's. */
  readonly arc: Readonly<Record<FactSeat, ArcState>>;
  /** What the position is ABOUT and the read waiting to confirm a switch
   *  (`positionCharacter`, P1-8c) — the main idea the game's plans serve. */
  readonly character: CharacterState;
}

/** An idea the coach voiced, with the student move that would pay it off and
 *  the line that closes the loop — computed when the idea is said (G0). One
 *  shape for every producer and for the story that holds it (P1-8c: it lived
 *  on `learnMemory.promises`). */
export interface GamePromise {
  /** Identity: one open promise per key per game. */
  key: string;
  /** The piece the paying move moves ('p', 'n', …, 'k' for castling). */
  piece: string;
  /** Where it lands. */
  square: string;
  /** The paying move must take something there. */
  takes?: boolean;
  /** The closing line, spoken when the student pays it off. */
  say: string;
  /** What the paying move must hit, checked on the board it lands on — a line
   *  computed moves earlier is said only while it is still true. */
  hits?: { square: string; type: string };
}

/** A phase boundary the game crossed, by the phase it entered. */
export type PhaseEdge = 'middlegame' | 'endgame';

/** An opening name's three stages: READ off the board (context — which
 *  opening this is, what the curated-beat selector and the opening's break
 *  read), QUEUED for the voice (one queue per name per game — re-queueing the
 *  same name every turn spoke "This game is now the Caro-Kann Defense." on two
 *  consecutive plies, Learn walk 2026-09-23), NAMED (the student heard it).
 *  🚨 SPENT BY SPEAKING, NEVER BY QUEUEING (2026-09-18): one field once did
 *  "detected" and "said" both, marked itself done the instant it was queued,
 *  and a dropped announcement never retried — measured on prod, game 2's
 *  opening was computed five times and spoken zero. Only a door that kept the
 *  `opening` fact writes NAMED. */
export type OpeningStage = 'read' | 'queued' | 'named';

/** WHAT HAPPENED IN THE GAME (P1-8c), each at the ply it happened. A board
 *  event (a phase crossed, an opening read, a slip, a promise paid) is noted
 *  when the board shows it; a said event (an opening named, a switch, a
 *  verdict, a promise made) is written when the door keeps its line. */
export type StoryEvent =
  /** The game crossed into a phase (`detectPhaseTransition`'s edge; Review's
   *  endgame named). */
  | { readonly kind: 'phase'; readonly ply: number; readonly edge: PhaseEdge }
  | { readonly kind: 'opening'; readonly ply: number; readonly stage: OpeningStage; readonly name: string }
  /** The opening's identity paragraph heard (its claim key). */
  | { readonly kind: 'identity'; readonly ply: number; readonly claim: string }
  /** The break the opening is played for, read in the opening (the summary
   *  says whether it came). */
  | { readonly kind: 'opening-break'; readonly ply: number; readonly san: string; readonly square: string }
  /** The position's character switch said. */
  | { readonly kind: 'character'; readonly ply: number; readonly to: Character }
  /** The positional verdict word said. */
  | { readonly kind: 'verdict'; readonly ply: number; readonly word: string }
  | { readonly kind: 'promise'; readonly ply: number; readonly promise: GamePromise }
  /** The student's move paid a promise off (said or not, it is spent). */
  | { readonly kind: 'paid'; readonly ply: number; readonly key: string }
  /** A slip of the student's, by fundamental. */
  | { readonly kind: 'slip'; readonly ply: number; readonly id: string }
  /** A master game cited as the story of the opening. */
  | { readonly kind: 'model-game'; readonly ply: number; readonly citation: string }
  /** The game's turning point and its thesis (Review): where the game turned,
   *  read once by the build and stated when the walk reaches the end. */
  | { readonly kind: 'turn'; readonly ply: number; readonly thesis: Thesis };

/** An event as a writer hands it in — the store stamps the ply. */
export type StoryEventInput = StoryEvent extends infer E ? (E extends StoryEvent ? Omit<E, 'ply'> : never) : never;

export interface GameStory {
  readonly gameId: string;
  /** The board's ply as the story last saw it — the watermark a later board
   *  is compared with to tell a new game from the next move. */
  readonly ply: number;
  /** Claim → the ply it was first said. */
  readonly said: ReadonlyMap<string, number>;
  /** Spoken-sentence key (the voice package's `spokenSentenceKeys`) → the ply
   *  it was first said. */
  readonly sentences: ReadonlyMap<string, number>;
  /** Each plan the game has said, by its thread. */
  readonly threads: ReadonlyMap<ThreadKey, ThreadState>;
  /** What happened in the game, in order (P1-8c). */
  readonly events: readonly StoryEvent[];
}

/** What one door kept: claims and sentence keys. */
export interface StorySaid {
  readonly claims?: Iterable<string>;
  readonly sentences?: Iterable<string>;
}

/** A thread line, as a producer offers it or a door commits it. */
export interface ThreadLine {
  readonly key: ThreadKey;
  readonly kind: ThreadSaid['kind'];
  readonly variant?: string | null;
  /** Said before the student's move from the board it is said on. */
  readonly told?: boolean;
}

/** A line a computer produced on a board, with the keys saying it would
 *  spend. `text` is matched against what the door kept (which may have
 *  trimmed it), the same way `rememberKeptClauses` matches clauses. */
export interface TurnOffer {
  readonly text: string;
  readonly claims?: readonly string[];
  readonly sentences?: readonly string[];
  /** The plan thread the line is on, written when the door keeps it. */
  readonly thread?: ThreadLine;
  /** What the line makes happen in the game's story (a switch said, an idea
   *  promised), written when the door keeps it. */
  readonly events?: readonly StoryEventInput[];
}

/** What a board's turn may treat as said: the game's ledger plus what this
 *  turn has offered so far. */
export interface StoryHeard {
  has(claim: string): boolean;
  readonly claims: ReadonlySet<string>;
  readonly sentences: ReadonlySet<string>;
}

export interface StoryStore {
  current(): GameStory;
  /** Record what a door kept (or a line spoken outside the door), said at `ply`. */
  commit(ply: number, said: StorySaid): void;
  /** Record the thread lines a door kept, said at `ply` (the board each was
   *  told on, when `told`). */
  commitThreads(ply: number, lines: readonly ThreadLine[], board?: string | null): void;
  /** Record the thread of every fact a door kept — a fact on a plan thread is
   *  a step on it; a fact about the move alone (`{ none: 'local' }`) is not. */
  commitFacts(ply: number, kept: ReadonlyArray<Pick<CoachFact, 'thread'>>): void;
  /** Record events at `ply`: a board event when the board shows it, a said
   *  event where the line is said (a door's commit, a line said outright). */
  note(ply: number, events: readonly StoryEventInput[]): void;
  /** Offer a line's keys on `board`'s turn. A different board starts a new turn. */
  offer(board: string, offer: TurnOffer): void;
  /** The game's ledger plus `board`'s offers (none when `board` is not this turn's). */
  heard(board: string | null): StoryHeard;
  /** Commit the offers on `board` whose line the door kept. */
  commitKept(ply: number, board: string, kept: ReadonlyArray<{ text: string }>): void;
  /** Commit the thread of each line a wave handed its door, when the door kept
   *  the line (a wave that offers nothing ahead of its door: the phase turn). */
  commitKeptThreads(ply: number, board: string, lines: ReadonlyArray<{ text: string; thread?: ThreadLine }>, kept: ReadonlyArray<{ text: string }>): void;
  /** The plan computers' state now — a copy, to step and hand back. */
  plans(): PlanDesk;
  /** Hand back the plan computers' state after a step at `ply`. */
  setPlans(ply: number, desk: PlanDesk): void;
  /** The board is at `ply` now (the next move, never a takeback). */
  reach(ply: number): void;
  /** A takeback to `ply`: everything said after it is forgotten, and the plan
   *  computers go back to their state at that board. */
  rewind(ply: number): void;
  /** A new board inside the same game (a scenario phase): everything said
   *  stays said, as of `ply` on the new board. */
  jump(ply: number): void;
  /** A new game: everything forgotten, under its own id. */
  newGame(gameId: string): void;
  /** The whole story as one string — the checkpoint a rebuilt review starts
   *  the plies ahead from (`restore`). */
  serialize(): string;
  /** Take up a checkpoint `serialize` wrote; `null` is the empty story. */
  restore(checkpoint: string | null): void;
}

/** The say-once keys' namespaces in the one claim map. Unprefixed keys are the
 *  board ideas every lane shares (the positional read's, the composer's, the
 *  behaviours', a definition's `definitionKey`); each memory merged in 8a that
 *  had its own vocabulary keeps it under its own prefix. (The alert lanes'
 *  namespaces live with the alert lanes, which are their only writers and
 *  readers — `CoachTeachPage`'s `ALERT_KEY`.) */
export const STORY_KEY = {
  /** An opening principle taught (the door's `principle:` claims). */
  principle: (id: string): string => `principle:${id}`,
  /** A fundamental named in full (its short stem after). */
  fundamental: (id: string): string => `fundamental-seen:${id}`,
  /** A commentary moral (`buildPlayCommentary`'s explainers). */
  explainer: (key: string): string => `explainer:${key}`,
  /** The piece-quality read's once-a-phase keys. */
  pieceQuality: (key: string): string => `piece-quality-once:${key}`,
} as const;

/** The keys under one prefix, the prefix taken off — a merged memory read back
 *  in its own vocabulary. */
export function keysUnder(keys: Iterable<string>, prefix: string): Set<string> {
  const out = new Set<string>();
  for (const k of keys) if (k.startsWith(prefix)) out.add(k.slice(prefix.length));
  return out;
}

// ── THE THREADS, READ ───────────────────────────────────────────────────────

/** The ply a plan was first STATED this game, or null. */
export function threadStated(story: GameStory, key: ThreadKey): number | null {
  return story.threads.get(key)?.said.find((s) => s.kind === 'stated')?.ply ?? null;
}

/** Which plan of a goal was stated last (the structure's plan, the race's
 *  verdict), or null. */
export function threadVariant(story: GameStory, key: ThreadKey): string | null {
  const said = story.threads.get(key)?.said ?? [];
  for (let k = said.length - 1; k >= 0; k -= 1) if (said[k].kind === 'stated') return said[k].variant;
  return null;
}

/** The boards a seat's plan was told on before the student moved from them. */
export function toldBoards(story: GameStory, seat: FactSeat): Set<string> {
  const out = new Set<string>();
  for (const [key, t] of story.threads) {
    if (!key.startsWith(`${seat}|`)) continue;
    for (const s of t.said) if (s.board) out.add(s.board);
  }
  return out;
}

// ── THE EVENTS, READ (P1-8c) ────────────────────────────────────────────────

/** Has the game crossed into this phase? */
export function phaseCrossed(story: GameStory, edge: PhaseEdge): boolean {
  return story.events.some((e) => e.kind === 'phase' && e.edge === edge);
}

/** The opening name at a stage, as last recorded (null: none yet). */
export function openingAt(story: GameStory, stage: OpeningStage): string | null {
  for (let k = story.events.length - 1; k >= 0; k -= 1) {
    const e = story.events[k];
    if (e.kind === 'opening' && e.stage === stage) return e.name;
  }
  return null;
}

/** Every opening name the student heard, in the order heard. */
export function openingsNamed(story: GameStory): string[] {
  return story.events.flatMap((e) => (e.kind === 'opening' && e.stage === 'named' ? [e.name] : []));
}

/** Record an opening name at a stage — once per change: a board that reads
 *  the same opening as last time adds nothing. */
export function noteOpening(store: StoryStore, ply: number, stage: OpeningStage, name: string): void {
  if (openingAt(store.current(), stage) !== name) store.note(ply, [{ kind: 'opening', stage, name }]);
}

/** The opening identity the student heard last (its claim key), or null. */
export function identityHeard(story: GameStory): string | null {
  for (let k = story.events.length - 1; k >= 0; k -= 1) {
    const e = story.events[k];
    if (e.kind === 'identity') return e.claim;
  }
  return null;
}

/** The break the opening is played for, as read in the opening, with the ply
 *  it was read on — or null. */
export function openingBreak(story: GameStory): { san: string; square: string; ply: number } | null {
  const e = story.events.find((x): x is Extract<StoryEvent, { kind: 'opening-break' }> => x.kind === 'opening-break');
  return e ? { san: e.san, square: e.square, ply: e.ply } : null;
}

/** How many switches INTO each character were said — the switch's words
 *  rotate on it, so the second turn to "sharp" never repeats the first. */
export function switchesSaid(story: GameStory): Record<Character, number> {
  const out: Record<Character, number> = { tactical: 0, positional: 0, conversion: 0, defence: 0 };
  for (const e of story.events) if (e.kind === 'character') out[e.to] += 1;
  return out;
}

/** The verdict word said last, or null. */
export function lastVerdict(story: GameStory): string | null {
  for (let k = story.events.length - 1; k >= 0; k -= 1) {
    const e = story.events[k];
    if (e.kind === 'verdict') return e.word;
  }
  return null;
}

/** The promises still open at `ply`: made, not paid, and younger than
 *  `window` plies. One per key — the first made, until it is paid or ages
 *  out; a key made again after that opens a new one. */
export function promisesOpen(story: GameStory, ply: number, window: number): Array<GamePromise & { ply: number }> {
  const open = new Map<string, GamePromise & { ply: number }>();
  for (const e of story.events) {
    if (e.kind === 'promise') {
      const was = open.get(e.promise.key);
      if (!was || e.ply - was.ply > window) open.set(e.promise.key, { ...e.promise, ply: e.ply });
    } else if (e.kind === 'paid') {
      open.delete(e.key);
    }
  }
  return [...open.values()].filter((q) => ply - q.ply <= window);
}

/** How many times the student slipped on this fundamental this game. */
export function slipCount(story: GameStory, id: string): number {
  return story.events.filter((e) => e.kind === 'slip' && e.id === id).length;
}

/** Was a master game cited this game? */
export function modelGameCited(story: GameStory): boolean {
  return story.events.some((e) => e.kind === 'model-game');
}

/** The game's turning point and its thesis (Review), or null. */
export function storyTurn(story: GameStory): { ply: number; thesis: Thesis } | null {
  for (let k = story.events.length - 1; k >= 0; k -= 1) {
    const e = story.events[k];
    if (e.kind === 'turn') return { ply: e.ply, thesis: e.thesis };
  }
  return null;
}

/** The story a checkpoint holds (`StoryStore.serialize`), read without a
 *  store of one's own; null is the empty story. */
export function storyOf(checkpoint: string | null): GameStory {
  const s = createStoryStore('checkpoint');
  s.restore(checkpoint);
  return s.current();
}

/** A fact's thread, when it is on one. */
function threadOf(f: Pick<CoachFact, 'thread'>): ThreadKey | null {
  return typeof f.thread === 'string' ? f.thread : null;
}

/** The board as a told-board key: placement and side to move. */
function boardKey(fen: string): string {
  return fen.split(' ').slice(0, 2).join(' ');
}

/** Does a kept fact carry this offer's line? Matched as `rememberKeptClauses`
 *  matches clauses: the door may have trimmed either side. */
function keptCarries(kept: ReadonlyArray<{ text: string }>, text: string): boolean {
  if (!text) return false;
  return kept.some((f) => !!f.text && (f.text === text || f.text.includes(text) || text.includes(f.text)));
}

// THE PLAN STATE'S OWN VALUES live with the state (the story holds it; the
// step functions only step it): a fresh thread and the copy a turn is tried on
// exist here only (`planThread` keeps no constructor of its own), and
// `planArc.EMPTY_ARC` reads the empty arc, so one empty value and one copy exist.

/** A plan thread with nothing stated yet. */
export function emptyPlanThread(): PlanThread {
  return { stated: null, stoppedInRow: 0, wasStopped: false, lastStatedPly: null, howSaid: new Set<string>(), methodSaid: false, whyAsked: new Set<string>() };
}

/** A copy to step: its sets are its own. */
export function copyPlanThread(t: PlanThread): PlanThread {
  return { ...t, howSaid: new Set(t.howSaid), whyAsked: new Set(t.whyAsked) };
}

/** An arc that has followed nothing yet. (An arc state is never mutated — a
 *  step returns a new one — so a copy may share it.) */
export const EMPTY_ARC_STATE: ArcState = { entries: {}, done: [], emerged: 0 };

/** A game whose character nothing has read yet: the first read settles it
 *  silently. (Never mutated — a step returns a new one.) */
export const EMPTY_CHARACTER_STATE: CharacterState = { current: null, pending: null };

const emptyDesk = (): PlanDesk => ({ thread: emptyPlanThread(), arc: { student: EMPTY_ARC_STATE, opponent: EMPTY_ARC_STATE }, character: EMPTY_CHARACTER_STATE });
const copyDesk = (d: PlanDesk): PlanDesk => ({ thread: copyPlanThread(d.thread), arc: { student: d.arc.student, opponent: d.arc.opponent }, character: d.character });

/** The serialized shape. A PlanThread's Sets travel as arrays. v2 (P1-8c)
 *  carries the events and the character; a v1 checkpoint has neither and is
 *  read as the empty story (the narration cache's rev moved with it). */
interface Checkpoint {
  v: 2;
  gameId: string;
  ply: number;
  said: Array<[string, number]>;
  sentences: Array<[string, number]>;
  threads: Array<[ThreadKey, ThreadSaid[]]>;
  events: StoryEvent[];
  plans: { ply: number; thread: Omit<PlanThread, 'howSaid' | 'whyAsked'> & { howSaid: string[]; whyAsked: string[] }; arc: Record<FactSeat, ArcState>; character: CharacterState } | null;
}

export function createStoryStore(gameId: string): StoryStore {
  let id = gameId;
  let ply = 0;
  let said = new Map<string, number>();
  let sentences = new Map<string, number>();
  let threads = new Map<ThreadKey, { said: ThreadSaid[] }>();
  let events: StoryEvent[] = [];
  /** The plan computers' state after each ply that changed it, oldest first. */
  let plans: Array<{ ply: number; desk: PlanDesk }> = [];
  let turn: { board: string; offers: TurnOffer[] } | null = null;

  const put = (map: Map<string, number>, keys: Iterable<string> | undefined, at: number): void => {
    if (!keys) return;
    for (const k of keys) if (k && !map.has(k)) map.set(k, at);
  };
  const putThread = (line: ThreadLine, at: number, board: string | null): void => {
    const t = threads.get(line.key) ?? { said: [] };
    t.said.push({ ply: at, kind: line.kind, variant: line.variant ?? null, board: line.told && board ? boardKey(board) : null });
    threads.set(line.key, t);
  };
  const putEvents = (list: readonly StoryEventInput[] | undefined, at: number): void => {
    for (const e of list ?? []) events.push({ ...e, ply: at } as StoryEvent);
  };
  const offersOn = (board: string | null): readonly TurnOffer[] =>
    board && turn && positionOf(turn.board) === positionOf(board) ? turn.offers : [];
  const dropAfter = (map: Map<string, number>, target: number): void => {
    for (const [k, at] of map) if (at > target) map.delete(k);
  };
  const latest = (): PlanDesk => plans[plans.length - 1]?.desk ?? emptyDesk();

  const store: StoryStore = {
    current: (): GameStory => ({ gameId: id, ply, said, sentences, threads, events }),
    commit(at: number, s: StorySaid): void {
      put(said, s.claims, at);
      put(sentences, s.sentences, at);
    },
    commitThreads(at: number, lines: readonly ThreadLine[], board: string | null = null): void {
      for (const l of lines) putThread(l, at, board);
    },
    commitFacts(at: number, kept: ReadonlyArray<Pick<CoachFact, 'thread'>>): void {
      for (const f of kept) {
        const key = threadOf(f);
        if (key) putThread({ key, kind: 'step' }, at, null);
      }
    },
    note(at: number, list: readonly StoryEventInput[]): void {
      putEvents(list, at);
    },
    offer(board: string, o: TurnOffer): void {
      if (!turn || positionOf(turn.board) !== positionOf(board)) turn = { board, offers: [] };
      turn.offers.push(o);
    },
    heard(board: string | null): StoryHeard {
      const offers = offersOn(board);
      const claims = new Set(said.keys());
      const spoken = new Set(sentences.keys());
      for (const o of offers) {
        for (const c of o.claims ?? []) claims.add(c);
        for (const k of o.sentences ?? []) spoken.add(k);
      }
      return { has: (c: string): boolean => claims.has(c), claims, sentences: spoken };
    },
    commitKept(at: number, board: string, kept: ReadonlyArray<{ text: string }>): void {
      const spent = new Set<TurnOffer>();
      // One line offered twice on the board (its producer ran again, the door
      // held it the first time) makes its events happen once.
      const happened = new Map<string, StoryEventInput>();
      for (const o of offersOn(board)) {
        if (!keptCarries(kept, o.text)) continue;
        put(said, o.claims, at);
        put(sentences, o.sentences, at);
        if (o.thread) putThread(o.thread, at, board);
        for (const e of o.events ?? []) happened.set(JSON.stringify(e), e);
        spent.add(o);
      }
      putEvents([...happened.values()], at);
      // A KEPT OFFER IS SPENT (P1-8c): a second door on the same board (the
      // late wave after the instant one) must not write its thread or its
      // events again — a switch said once would count twice. Its claims are
      // the game's now, so the turn still reads them as heard.
      if (turn && spent.size > 0) turn.offers = turn.offers.filter((o) => !spent.has(o));
    },
    commitKeptThreads(at: number, board: string, lines: ReadonlyArray<{ text: string; thread?: ThreadLine }>, kept: ReadonlyArray<{ text: string }>): void {
      for (const l of lines) if (l.thread && keptCarries(kept, l.text)) putThread(l.thread, at, board);
    },
    plans: (): PlanDesk => copyDesk(latest()),
    setPlans(at: number, desk: PlanDesk): void {
      // One state per ply: a later step on the same ply replaces it. The ply
      // only grows inside a game (a takeback rewinds first), so the list stays
      // in order.
      const last = plans[plans.length - 1];
      const entry = { ply: Math.max(at, last?.ply ?? 0), desk: copyDesk(desk) };
      if (last && last.ply === entry.ply) plans[plans.length - 1] = entry;
      else plans.push(entry);
    },
    reach(at: number): void {
      ply = Math.max(0, at);
    },
    rewind(target: number): void {
      const to = Math.max(0, target);
      dropAfter(said, to);
      dropAfter(sentences, to);
      for (const [k, t] of threads) {
        t.said = t.said.filter((s) => s.ply <= to);
        if (t.said.length === 0) threads.delete(k);
      }
      events = events.filter((e) => e.ply <= to);
      plans = plans.filter((p) => p.ply <= to);
      ply = Math.min(ply, to);
      turn = null;
    },
    jump(at: number): void {
      const to = Math.max(0, at);
      for (const map of [said, sentences]) for (const [k, p] of map) if (p > to) map.set(k, to);
      for (const t of threads.values()) t.said = t.said.map((s) => (s.ply > to ? { ...s, ply: to } : s));
      events = events.map((e) => (e.ply > to ? { ...e, ply: to } : e));
      const desk = plans[plans.length - 1]?.desk;
      plans = desk ? [{ ply: to, desk }] : [];
      ply = to;
      turn = null;
    },
    newGame(next: string): void {
      id = next;
      ply = 0;
      said = new Map();
      sentences = new Map();
      threads = new Map();
      events = [];
      plans = [];
      turn = null;
    },
    serialize(): string {
      const last = plans[plans.length - 1];
      const cp: Checkpoint = {
        v: 2, gameId: id, ply,
        said: [...said], sentences: [...sentences], threads: [...threads].map(([k, t]) => [k, t.said]),
        events: [...events],
        plans: last ? {
          ply: last.ply,
          thread: { ...last.desk.thread, howSaid: [...last.desk.thread.howSaid], whyAsked: [...last.desk.thread.whyAsked] },
          arc: { student: last.desk.arc.student, opponent: last.desk.arc.opponent },
          character: last.desk.character,
        } : null,
      };
      return JSON.stringify(cp);
    },
    restore(checkpoint: string | null): void {
      let cp: Checkpoint | null = null;
      try { cp = checkpoint ? JSON.parse(checkpoint) as Checkpoint : null; } catch { cp = null; }
      if (!cp || cp.v !== 2) { store.newGame(id); return; }
      id = cp.gameId;
      ply = cp.ply;
      said = new Map(cp.said);
      sentences = new Map(cp.sentences);
      threads = new Map(cp.threads.map(([k, said]) => [k, { said }]));
      events = [...cp.events];
      plans = cp.plans ? [{
        ply: cp.plans.ply,
        desk: { thread: { ...cp.plans.thread, howSaid: new Set(cp.plans.thread.howSaid), whyAsked: new Set(cp.plans.thread.whyAsked) }, arc: cp.plans.arc, character: cp.plans.character },
      }] : [];
      turn = null;
    },
  };
  return store;
}
