/**
 * learnMemory — ONE per-game memory for the Learn producer.
 *
 * The Phase 4 finding (docs/plans/2026-09-17-computer-unification.md §6):
 * `computeInstantTeaching` closes over EIGHTEEN refs, fifteen of them say-once
 * memory, and that — not the line count — is why no other surface can call it.
 * Its state lives in Learn's React tree.
 *
 * 🚨 IT IS ALSO A LIVE BUG, which is why this lands before the lift. There were
 * TWO "fresh game" resets, in two places, with two different membership lists
 * and two different triggers:
 *
 *   `startOpeningPlay`  (a guided game starts)   cleared 4 refs
 *   the reply handler   (`history.length <= 2`)  cleared a DIFFERENT 8
 *
 * and TEN were cleared by neither, for the life of the mount — a first census
 * of this file said six, and undercounted, because it read the two lists rather
 * than deriving the orphans from the code. `learnMemory.test.ts` derives them.
 *
 * The clearest proof that a hand-maintained reset list rots: `engineReadSaidRef`
 * is declared four lines below `planSaidRef` with the comment "Same contract as
 * `planSaidRef`" — and got the OPPOSITE treatment, because the author updated
 * the sibling and not the list.
 *
 * And the curated beats' and the explainers' said-sets were never reset, so
 * a beat said in game 1 was suppressed in games 2, 3 and 4 of the same
 * session — the coach mute for the rest of a session after one mention.
 *
 * Site A's comment even said "Both said-sets are per-GAME" while clearing four —
 * the comment had already drifted from the code it described.
 *
 * THE RULE, stated once: this memory is PER GAME. `newGame()` forgets
 * everything it holds, and every "fresh game" site calls it instead of
 * hand-listing refs — so a slot added here cannot be forgotten-to-forget.
 *
 * It grows: each Phase-4 slice moves more of the remaining refs in, and
 * `learnMemory.test.ts` holds the count still OUTSIDE as a shrink-only ceiling.
 * `behaviorScheduler` is deliberately NOT here — it is a rate-matcher whose
 * stride tracks the corpus over the long run, not a say-once set, and moving it
 * would change the behaviour distribution rather than fix a silence. Nor is
 * `taughtGemIds`: it is scoped to the trap MENU by opening, not to a game, and
 * forgetting it would re-offer a trap the coach just taught.
 */

/** "No think-aloud has fired yet." Far enough below any real ply that the
 *  first gap test passes. */
import type { Proof } from './proof';
import type { LooseSpells } from './conceptKey';
import { createStoryStore, type StoryStore } from './gameStory';

export const NEVER_FIRED = -999;

export interface LearnMemory {
  /** THE GAME'S STORY (WO-STORY-MATRIX-01 P1-8): everything said this game,
   *  each with the ply it was said — every say-once memory this object and the
   *  page used to hold — and each side's plans with the state the plan
   *  computers step (the student's plan thread, the plan arcs), checkpointed
   *  by ply (gameStory.ts). Renewed by `newGame()`, rewound by `rewind()`; the
   *  game's id and its ply watermark live in it. */
  readonly story: StoryStore;
  /** How many times each rotated reason formula has been said this game — the
   *  rotation key (David 2026-10-14: no reason formula more than twice a
   *  game). A move number collided: three alerts on moves with the same
   *  residue got the same wording. */
  readonly stemCounts: Map<string, number>;
  /** The move held back at a deciding moment (David 2026-10-02), the board it
   *  belongs to, and whether "Show me" already said it — resolved when the
   *  student moves from that board. */
  heldMove: (import('./deliberation').HeldVerdict & { fen: string; shown: boolean }) | null;
  /** The move their quiet move PREPARES (theirIntent), and the board the
   *  student moves from — so a move from that board that takes it away is
   *  credited as the prevention it is (A-plan P2). */
  theirPrep: { uci: string; fen: string } | null;
  /** The board the opponent's slip left the student, after the coach said
   *  "look for it" — and the slip itself (SAN), so a capture back on its
   *  square reads as a recapture. Resolved when the student moves from it:
   *  "you found it" or the answer with its point (David 2026-10-02). */
  slipAnswer: { fen: string; theirSan: string } | null;
  /** The coach's last reply, when the STUDENT dictated it (its SAN) — so
   *  "that was a mistake from me" would be false (hand walk 2026-09-24). */
  lastReplyDictated: string | null;
  /** The last computed line, so two consecutive plies never repeat it. */
  lastComputed: string;
  /** The proof behind the last conclusion the coach SPOKE — what "Why?" says
   *  in full (proof.ts). Null until a proof-bearing conclusion is spoken. */
  lastProof: Proof | null;
  /** The tactic lane's last spoken KEY, so a standing tactic alerts once, not
   *  every ply (its words, and the threat lane's key and words, are the story's
   *  — `STORY_KEY`). This lived as a hand ref on the page, cleared inside ONE
   *  intent branch — so a second game in the same mount reached the same board,
   *  produced the identical line, and was told it had already said it
   *  (`audit-second-game-memory-prod`, 2026-09-19). */
  lastTacticKey: string;
  /** The student's pieces loose now, each with the ply its spell began —
   *  `looseClaim` reads it to say a loose piece once, then once "still". */
  looseSpells: LooseSpells;
  /** Tactic motif → the move number it was first taught (S6 transfer). */
  /** Structurally `MotifLedger` — this module imports nothing (pure memory). */
  readonly motifLastSpoken: Map<string, { move: number; instance: string; seen: number }>;
  /** The opening name already QUEUED for the voice this game. Queueing is not
   *  saying (see `spokenOpeningName`), but re-queueing the SAME name every turn
   *  spoke "This game is now the Caro-Kann Defense." on two consecutive plies
   *  (Learn walk 2026-09-23). One queue per name per game. */
  queuedOpeningName: string | null;
  /** The opening-identity paragraph the student has HEARD this game (its claim
   *  key) — what the opening provokes/aims for is said ONCE per game, after the
   *  name. Set by the voice (`markOpeningFactsSpoken`), never by the queue: a
   *  held paragraph marked at queue time was never retried (2026-10-14, offered
   *  twice and held twice in one game, never heard). */
  identitySaid: string | null;
  /**
   * The opening name the student has actually HEARD. Per game: a second game of
   * the same line must be named again, because the student is being told what
   * they are now playing, not being reminded of a fact they already hold.
   *
   * 🚨 SPENT BY SPEAKING, NEVER BY QUEUEING (found reading the code, 2026-09-18).
   * This was ONE field doing TWO jobs — "the opening we have detected" and "the
   * opening we have said" — and the announcement marked itself done the instant
   * it was QUEUED. It then had to survive a delivery path that could discard it,
   * and on any turn where the instant package said something substantive it did
   * not: `pendingVoiceRef` was nulled wholesale. The name was already marked
   * announced, so it never retried, and the fallback site guarded on the same
   * field so it could never fire either. Measured on prod: game 2's opening was
   * computed FIVE times and spoken ZERO.
   *
   * So the two jobs are two fields. A reader asking "what opening is this" reads
   * `detectedOpeningName`; only real delivery writes this one. An announcement
   * that is dropped is therefore re-queued next turn, which is the honest
   * behaviour: it keeps trying because it has not yet succeeded.
   */
  spokenOpeningName: string | null;
  /** What the detector last resolved, set the moment it resolves. This is
   *  CONTEXT — which opening the board is in — and is what the curated-beat
   *  selector and the refrain lane want. It says nothing about what was said. */
  detectedOpeningName: string | null;
  /**
   * Note how many plies are on the board. Forgets everything when the board
   * has gone BACKWARDS — a new or rewound game. Returns true when it forgot.
   * The watermark it compares with is the story's `ply`.
   *
   * 🚨 THIS, not the call sites, is what makes the reset reliable. The two
   * hand-placed "fresh game" sites are PATH-DEPENDENT, and a second game
   * reaches the board by paths neither covers — measured on prod 2026-09-17,
   * with two games of the same line in one mount playing an IDENTICAL first
   * fourteen plies: the opening was announced four times in game 1 and ZERO
   * times in game 2. One reset ran on `historyAfterReply.length <= 2`, which
   * is never true on the first coach reply of a game the student plays as
   * Black (`e4 d5 exd5` is already 3); the other hangs off one intent branch.
   *
   * The board cannot be fooled by any of that. Without it a second game
   * inherits the first game's silence, and rewinding is the safe direction to
   * be wrong in: forgetting makes the coach repeat itself, suppressing makes it
   * mute for a reason nobody can trace. It is the ONE board detector: the
   * standing-fact ledger's own full-move detector went with it into the story
   * (P1-8a).
   *
   * 🔒 IT READS THE LIVE BOARD, NEVER A NUMBER HANDED IN (gate-1 audit
   * 2026-10-21). It used to take `plies` from the caller, and its one caller
   * passed the turn's own `historyAfterReply.length`. The instant wave can run
   * up to a verdict hold after its move, so when the student moved again inside
   * that hold the older turn reported a SHORTER history after the newer one —
   * "the board went backwards" — and the game was re-minted mid-play. Every
   * Campaign game on prod was filed under three ids, one per phase. The board
   * itself is read now (`livePlies`, given at creation), so a stale turn has no
   * number to pass.
   */
  observe(): boolean;
  /** A TAKEBACK, not a new game: the board went backwards on purpose, so the
   *  game keeps its id and everything said up to the board it returns to
   *  (attack round 2026-10-07: a takeback re-announced the opening and re-said
   *  every definition, and split the game's evidence across two ids). What was
   *  said AFTER that board is forgotten — it was said about moves that are no
   *  longer on it — and the plans go back to their state at it
   *  (`story.rewind`). Lowers the watermark `observe` compares against; never
   *  raises it. */
  rewind(plies: number): void;
  /** A NEW BOARD INSIDE THE GAME (a scenario phase): the game and everything
   *  said stay; the watermark restarts at the new board's ply. */
  jump(plies: number): void;
  /** Forget everything. Every "a new game starts" site calls THIS. */
  newGame(): void;
  /**
   * THE GAME'S OWN ID — minted here, re-minted by `newGame()`.
   *
   * The comment on `observe` above says "neither surface has a game id" and
   * treats that as a constraint to work around. It was also a DATA defect: the
   * coach's live capture (`captureMisconception`) has a `sourceGameId` field
   * and had nothing to put in it, so every slip the coach recorded during a
   * Learn game — the richest signal in the app, the student's own reasoning —
   * stored WHAT they got wrong and threw away WHERE. The weakness spine fills
   * those rows' provenance with a bare `origin: 'game'` for exactly this
   * reason, and no surface can say "you met this against X thirteen days ago".
   *
   * It lives HERE rather than in another ref because this object is already
   * the thing that knows when a game begins, by the one mechanism that cannot
   * be fooled — the board going backwards. A hand-placed `useRef` would be
   * path-dependent in precisely the way `observe` exists to fix.
   *
   * The SAVED `GameRecord` uses this same id, so the slips captured mid-game
   * and the game they happened in join without a lookup. Held by the story
   * (`story.current().gameId`), which `newGame()` renews under a new one.
   */
  readonly gameId: string;
  /** THE STUDENT'S SLIPS THIS GAME, by fundamental id — so the coach can say
   *  "that's the second time this game" (David 2026-10-06: a coach reacts to
   *  the student, it does not narrate each move in isolation). */
  slipsThisGame: Map<string, number>;
  /** IDEAS THE COACH SAID THIS GAME, with the move that pays them off — the
   *  thread across moves: when the board pays an idea off, the coach closes
   *  the loop instead of moving on as if it had never spoken. */
  promises: Map<string, GamePromise & { ply: number }>;
}

/** An idea the coach voiced, with the student move that would pay it off and
 *  the line that closes the loop — computed when the idea is said (G0). One
 *  shape for every producer and for the memory that holds it. */
export interface GamePromise {
  /** Identity: one promise per key per game. */
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

/** `teach-` prefixed to match the id shape the saved Learn `GameRecord` has
 *  always used. Random suffix because two games can start inside one
 *  millisecond (a rewind fires `newGame` synchronously). */
function mintGameId(): string {
  return `teach-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param livePlies How many plies are on the LIVE board right now — read by
 *   `observe()` at the moment it runs. Required: a memory that cannot see the
 *   board cannot tell a new game from a late turn.
 * @param onNewGame Fired AFTER every reset, from EVERY path — the explicit
 *   `newGame()` call and `observe()`'s own board-went-backwards detection. The
 *   surface passes its hand-held per-game refs' clearer here, so a fresh game
 *   cannot forget this memory's slots while the page's refs remember (found
 *   2026-09-20: `observe()` self-reset was a THIRD door, and the page's
 *   `fundamentalSeenRef` never heard about it). Never call `newGame()` from
 *   inside it — the callback forgets the CALLER's state, not this one's.
 */
export function createLearnMemory(opts: { livePlies: () => number; onNewGame?: () => void }): LearnMemory {
  const { livePlies, onNewGame } = opts;
  const story = createStoryStore(mintGameId());
  const motifLastSpoken = new Map<string, { move: number; instance: string; seen: number }>();
  const mem: LearnMemory = {
    story,
    get gameId(): string { return story.current().gameId; },
    stemCounts: new Map<string, number>(),
    lastProof: null,
    motifLastSpoken,
    lastTacticKey: '',
    looseSpells: new Map(),
    heldMove: null,
    theirPrep: null,
    slipAnswer: null,
    lastReplyDictated: null,
    lastComputed: '',
    spokenOpeningName: null,
    detectedOpeningName: null,
    queuedOpeningName: null,
    identitySaid: null,
    slipsThisGame: new Map<string, number>(),
    promises: new Map<string, GamePromise & { ply: number }>(),
    observe(): boolean {
      const plies = livePlies();
      const forgot = plies < story.current().ply;
      if (forgot) mem.newGame();
      story.reach(plies);
      return forgot;
    },
    rewind(plies: number): void {
      story.rewind(plies);
    },
    jump(plies: number): void {
      story.jump(plies);
    },
    newGame(): void {
      mem.slipsThisGame.clear();
      mem.stemCounts.clear();
      mem.promises.clear();
      mem.lastProof = null;
      motifLastSpoken.clear();
      mem.lastTacticKey = '';
      mem.looseSpells = new Map();
      mem.heldMove = null;
      mem.theirPrep = null;
      mem.slipAnswer = null;
      mem.lastReplyDictated = null;
      mem.lastComputed = '';
      mem.spokenOpeningName = null;
      mem.detectedOpeningName = null;
      mem.queuedOpeningName = null;
      mem.identitySaid = null;
      // A NEW GAME IS A NEW STORY UNDER A NEW ID — everything said, the ply
      // watermark and the id, in one call. Re-minting here (rather than at a
      // call site) is what makes it impossible to record game 2's slips
      // against game 1.
      story.newGame(mintGameId());
      // ONE SIGNAL, EVERY DOOR. Whoever decided a new game started — a caller,
      // or `observe` reading the board going backwards — the surface's own
      // per-game refs are forgotten in the same breath.
      onNewGame?.();
    },
  };
  return mem;
}

/** QUEUEING IS NOT SAYING (2026-10-14). The opening's name, its identity and its
 *  master plan are each said once per game — marked here, from what the voice
 *  actually CARRIED, so a fact the door held one turn is offered again. */
export function markOpeningFactsSpoken(
  mem: Pick<LearnMemory, 'spokenOpeningName' | 'detectedOpeningName' | 'identitySaid'>,
  kept: ReadonlyArray<{ kind?: string; claims?: readonly string[] }>,
): void {
  if (kept.some((f) => f.kind === 'opening')) mem.spokenOpeningName = mem.detectedOpeningName;
  const claims = kept.flatMap((f) => f.claims ?? []);
  const identity = claims.find((c) => c.startsWith('opening-identity:'));
  if (identity) mem.identitySaid = identity;
}

/** The next rotation index for a reason formula, counted per game. */
export function nextStem(mem: Pick<LearnMemory, 'stemCounts'>, key: string): number {
  const n = mem.stemCounts.get(key) ?? 0;
  mem.stemCounts.set(key, n + 1);
  return n;
}

/** WRITE WHAT SPOKE, NEVER WHAT WAS OFFERED (prod Learn 2026-10-16: the door
 *  held 19 of 21 behaviours, a habit and the plan method — and each had been
 *  marked said when it was produced, so it never came back). After the door,
 *  every kept fact's claims are remembered; a threat (`win-<square>`) is a
 *  claim about one turn, never an idea said once a game. */
export function rememberKeptClaims(kept: ReadonlyArray<{ claims?: readonly string[] }>, remember: (key: string) => void): void {
  for (const f of kept) for (const c of f.claims ?? []) if (!/^win-[a-h][1-8]$/.test(c)) remember(c);
}
